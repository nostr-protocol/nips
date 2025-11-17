NIP-XX
======

Better Lists
------------

`draft` `optional`

A list is a `kind 3xxxx` replaceable event with tags enumerating its members.

Conventions for tags are defined independently for each kind but all lists MUST have a `d` tag containing a random string representing the `list shard`.

Lists MUST be updated using the following process to avoid conflicts:

- Clients SHOULD fetch all existing events for a given list by kind and `=` tag if relevant (see [Named Lists](#named-lists) below).
- If the client has a high certainty that it has a complete set of events, it MAY modify the tags of one of the events and re-publish it using the same `d` tag.
- Otherwise, the client MAY publish a new event of the same kind, with a new `d` tag.
- If a legacy kind for the list type in question is found, it MUST be maintained in parallel with the new kind for backwards compatibility.

## Example

Below is an example which covers some degenerate cases in list management, and how this NIP solves them.

Suppose Alice has created a `kind 3` follow list on Client A with three pubkeys listed:

```jsonc
{
  "kind": 3,
  "tags": [
    ["p", "<pubkey 1>"],
    ["p", "<pubkey 2>"],
    ["p", "<pubkey 3>"]
  ],
  // other fields...
}
```

She then signs in to Client B, which attempts to fetch her current follow list and fails. Alice then follows `pubkey 4`. Before the introduction of this NIP, Client B would publish a fresh `kind 3` list with only `pubkey 4`, effectively deleting Alice's other follows. Now, Client B can instead publish a new follow shard with a fresh `d` tag:

```jsonc
{
  "kind": 33333,
  "tags": [
    ["d", "3584503"],
    ["p", "<pubkey 4>"]
  ],
  // other fields...
}
```

In this case, Client B SHOULD NOT publish an update to Alice's `kind 3`, but if it had retrieved a copy, it could. That way, Client A would have an up-to-date follows list regardless of whether it supports this NIP.

Suppose it does, however, and Alice returns to Client A, which fetches her new follow shard. It now has a complete copy of all four of Alice's follows. Alice then follows `pubkey 5`, resulting in that pubkey being added both to her `kind 3` (for compatibility) and to her existing `kind 33333`.

In the future Alice might use Client C, which successfully discovers her `kind 33333` list, but not her `kind 3`. This client will show her follows list as containing only pubkeys `4` and `5`. When Alice inevitably follows `pubkey 6`, it is added to her `kind 33333` again, resulting in a complete follow list including all 6 items when she returns to Client A.

A final scenario might occur when Alice uses Client C, an older client that doesn't yet support `kind 33333` lists. This client may fail to fetch her `kind 3` as well, and when she follows `pubkey 7`, it publishes a new `kind 3` with only that item in it. When Alice returns to Client A, she will find that even in the worst case she will still have pubkeys 4-7 in her follows list, having only lost the pubkeys added only to her `kind 3`.

Clients can further mitigate this scenario by proactively copying entries in a user's `kind 3` to a current `kind 33333` to prevent data loss.

## Named Lists

Every list kind MUST be defined as either `named` or `unnamed`. Named lists MUST contain a `=` tag containing a random string representing the `list ID`. Clients MUST consider lists including different `=` tags to be **different** lists, and MUST implement conflict resolution accordingly.

When mapping legacy list kinds to new list kinds, the `=` tag is equivalent to the `d` tag on the legacy list.

One or more of `title`, `image`, and `description` tags MAY be included, which define metadata for the `named` list.

## Unnamed List Kinds

### Follow lists

A follow list is a `kind 33333` event which represents an `unnamed` list of pubkeys the user is "following" in a social media context. Follow lists include zero or more `p` tags including a hex pubkey, a relay hint, and an optional petname.

```jsonc
{
  "kind": 33333,
  "tags": [
    ["d", "6635720"],
    ["p", "91cf9..4e5ca", "wss://alicerelay.com/", "alice"],
    ["p", "14aeb..8dad4", "wss://bobrelay.com/nostr", "bob"],
    ["p", "612ae..e610f", "ws://carolrelay.com/ws", "carol"]
  ],
  "content": "",
  // other fields...
}
```

The legacy version `kind 3` MUST be read from and kept in sync.

## Named List Kinds

### Follow Sets

A follow set is a `kind 35100` event which represents a `named` list of pubkeys the user is suggesting others "follow" in a social media context. Follow lists include zero or more `p` tags including a hex pubkey and a relay hint.

```jsonc
{
  "kind": 35100,
  "tags": [
    ["d", "2705429"],
    ["=", "9490525"],
    ["p", "91cf9..4e5ca", "wss://alicerelay.com/"],
    ["p", "14aeb..8dad4", "wss://bobrelay.com/nostr"],
    ["p", "612ae..e610f", "ws://carolrelay.com/ws"]
  ],
  "content": "",
  // other fields...
}
```

The legacy version `kind 30000` MUST be read from and kept in sync.
