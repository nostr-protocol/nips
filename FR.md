# NIP-FR

## Friends-Only Notes

`draft` `optional`

This NIP defines a mechanism for publishing encrypted notes visible only to a user-defined friends list using a shared nostr secret: ViewKey.

## Motivation

Users want to share content with a close circle of friends without it being publicly readable. This NIP provides a simple symmetric-key approach where a "ViewKey" encrypts notes and is distributed only to approved friends.

## Definitions

- **ViewKey**: A symmetric key used to encrypt/decrypt friends-only notes
- **Friend List**: A set of pubkeys authorized to receive the ViewKey
- **Circle**: A named group of friends (e.g., "friends", "family", "coworkers")

## Event Kinds

| Kind    | Description                           |
| ------- | ------------------------------------- |
| `44`    | ViewKey share rumor (inside giftwrap) |
| `2044`  | Friends-only encrypted note           |
| `1045`  | ViewKey share seal                    |
| `30144` | Friend list and ViewKey storage       |

## Kind 2044: Friends-Only Note

A friends-only note is a kind `2044` event with content encrypted using NIP-44 with the ViewKey as the shared secret.

```json
{
  "kind": 2044,
  "pubkey": "<author-pubkey>",
  "created_at": <timestamp>,
  "content": "<NIP-44 encrypted with ViewKey>",
  "tags": [],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

The decrypted content is the note text (equivalent to kind 1 content).

### Multiple Circles

If a user maintains multiple circles, include `["d", "<circle-id>"]` tag to indicate which circle's ViewKey to use (leaks circle id)

## Kind 30144: Friend List

A parameterized replaceable event storing the friend list and ViewKey for a circle. The content is NIP-44 encrypted to the author's own pubkey.

```json
{
  "kind": 30144,
  "pubkey": "<author-pubkey>",
  "created_at": <timestamp>,
  "content": "<NIP-44 encrypted to self>",
  "tags": [
    ["d", "<circle-id>"]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Decrypted Content

The decrypted content is a JSON-encoded tags array:

```json
[
  ["viewKey", "hex-viewkey>"],
  ["p", "<friend-pubkey-1>"],
  ["p", "<friend-pubkey-2>"]
]
```

- `viewKey`: The symmetric key used to encrypt kind 2044 notes for this circle
- `p`: Pubkeys of friends in this circle

The friend list is encrypted to preserve social graph privacy.

## ViewKey Distribution

ViewKeys are distributed using NIP-59 giftwrap with the following structure:

```
Kind 1059 (gift wrap, encrypted to recipient)
  └── Kind 1045 (seal, encrypted to recipient)
        └── Kind 44 (rumor, the ViewKey payload)
```

### Kind 44: ViewKey Share Rumor

```json
{
  "kind": 44,
  "pubkey": "<sender-pubkey>",
  "created_at": <timestamp>,
  "content": "<ViewKey>",
  "tags": [
    ["d", "<circle-id>"]
  ]
}
```

- `content`: The base64-encoded ViewKey
- `d` tag: Identifies which circle this ViewKey belongs to

### Kind 1045: ViewKey Share Seal

The kind 44 rumor is wrapped in a kind 1045 seal, encrypted to the recipient using NIP-44.

```json
{
  "kind": 1045,
  "pubkey": "<sender-pubkey>",
  "created_at": <timestamp>,
  "content": "<NIP-44 encrypted kind 44 rumor>",
  "tags": []
}
```

The seal is then wrapped in a standard NIP-59 kind 1059 gift wrap.

## Flows

### Adding a Friend

1. Add the friend's pubkey to the kind 30144 event for the circle
2. Update the 30144 event on relays
3. Gift wrap the ViewKey (kind 44 rumor) to the new friend

### Removing a Friend

1. Remove the friend's pubkey from the kind 30144 event
2. Generate a new ViewKey
3. Update the 30144 event with the new ViewKey
4. Gift wrap the new ViewKey to all remaining friends in the circle

### Manual Key Rotation

For security, users may manually rotate the ViewKey:

1. Generate a new ViewKey
2. Update the kind 30144 event with the new ViewKey
3. Gift wrap the new ViewKey to all friends in the circle

### Receiving a ViewKey

When a client receives a gift-wrapped ViewKey:

1. Decrypt the gift wrap and extract the kind 44 rumor
2. Check if sender is already in one of the user's friend lists:
   - **If yes**: Automatically accept, keep ViewKey in memory, subscribe to sender's kind 2044 events
   - **If no**: Present a friend request UI with three options:

**Friend Request Options:**

| Option                | Action                                                                            |
| --------------------- | --------------------------------------------------------------------------------- |
| **Accept**            | Add to reading list. User sees sender's posts, sender does not see user's posts.  |
| **Accept and Friend** | Add to reading list AND share user's ViewKey back with sender. Mutual friendship. |
| **Decline**           | Store sender in reject list so request isn't shown again.                         |

Note: The ViewKey is received regardless of choice - the user can technically decrypt the sender's posts. These options control the client's behavior and whether to reciprocate.

### Creating a Friends-Only Post

1. Fetch the user's own kind 30144 event for the target circle from relays
2. Decrypt the 30144 content to retrieve the ViewKey
3. Encrypt the note content using NIP-44 with the ViewKey
4. Publish as a kind 2044 event with optional `["d", "<circle-id>"]` tag

### Reading Friends-Only Posts

1. On session start, fetch giftwrapped messages (kind 1059) addressed to the user
2. Decrypt giftwraps to extract ViewKeys, keep in memory
3. Query kind 2044 events from senders whose ViewKeys were accepted
4. Decrypt each 2044 using the corresponding ViewKey from memory

## Client Behavior

### Session Initialization

1. Fetch kind 1059 (giftwrap) events addressed to the user from relays
2. Decrypt each to extract kind 44 rumor containing ViewKey, sender pubkey, and circle-id
3. Keep ViewKeys in memory, keyed by sender pubkey and circle-id

### Publishing

1. Fetch the user's kind 30144 event for the circle from relays
2. Decrypt to retrieve the ViewKey
3. Encrypt the note content using NIP-44 with the ViewKey
4. Publish as a kind 2044 event

### Reading

1. Query kind 2044 events from senders whose ViewKeys were accepted
2. Decrypt using the ViewKey from memory
3. If multiple circles exist, try ViewKeys until decryption succeeds

### Circle Naming

The `d` tag identifies circles. Clients MAY use any identifier. Suggested default: `"friends"`.

## Tradeoffs

### No Backward Secrecy

When a friend is removed and the ViewKey is rotated, they cannot decrypt **new** notes (forward secrecy). However, they may have cached the old ViewKey and can still decrypt **old** notes. This is an accepted tradeoff for simplicity.

Clients SHOULD inform users of this limitation when removing friends.

### Circle-ID Metadata Leakage

If kind 2044 notes include a `["d", "<circle-id>"]` tag for efficient decryption, the circle name is visible to anyone. This reveals which circle a post belongs to without revealing its content.
