NIP-XX
======

Rooms
-----

`draft` `optional`

# Rooms

A `room` is identified by an arbitrary, human-readable string no longer than
30 characters and referred to using a `~` tag indicating the room id and a
relay url. Rooms on different relays with the same name ARE NOT the same room.

Any event MAY be posted to a `room` using a `~` tag. Events posted to a room
MUST NOT be considered valid unless their `~` tag matches the current relay, or
a relay specified in a `kind 30209` federation event.

# Chat

A chat message is a kind `209` event with a `~` tag. Chat messages are intended
to be used as a high-frequency, informal, context-aware communication medium.

```json
{
  "kind": 209,
  "content": "GM",
  "tags": [
    ["~", "Good Morning", "wss://relay.example.com/"],
  ]
}
```

Replies to kind `209` MUST use [NIP-73](https://github.com/nostr-protocol/nips/pull/1233)
kind `1111` comments with a matching `~` tag. Clients SHOULD encourage flat reply
hierarchies.

# Threads

A thread is a kind `309` event with a `~` tag. Threads and their replies are
intended to be used as a low-frequency, more formal, context-aware communication
medium. Threads MUST include a `title` with a summary of the `content`.

```json
{
  "kind": 309,
  "content": "GM",
  "tags": [
    ["~", "Good Morning", "wss://relay.example.com/"],
    ["title", "GM"]
  ]
}
```

Replies to kind `309` MUST use [NIP-73](https://github.com/nostr-protocol/nips/pull/1233)
kind `1111` comments with a matching `~` tag. Clients SHOULD encourage flat reply
hierarchies.

# Membership

Users MAY track and optionally advertise their own group memberships using a [NIP 51](51.md) kind `10209` event. Tags MAY be either public or encrypted with [NIP 44](44.md), depending on user/client preference.

Room membership SHOULD be indicated using both an `r` tag for each relay the user is a member of, and a `~` tag for each room the user is a member of. `~` tags MUST include a relay url as the second argument.

```json
{
  "kind": "10209",
  "tags": [
    ["r", "wss://relay.other.com/"],
    ["~", "Good Morning", "wss://relay.other.com/"]
  ],
}
```

Room membership events SHOULD be sent to:

- The user's [NIP-65](./65.md) WRITE relays
- Each relay listed in the membership event
- Each relay being removed from the member list

# Federation

Relays hosting rooms MAY indicate federation with other relays for rooms
by publishing a `kind 30209` event using the key indicated by the relay's
NIP 11 document.

A relay may indicate partial federation using one or more `~` tags, or complete
federation using a `r` tag.

```json
{
  "kind": "30209",
  "tags": [
    ["r", "wss://other1.com"],
    ["~", "Good Morning", "wss://other2.com/"],
    ["~", "Good Morning", "wss://other3.com/"]
  ],
}
```

This can be useful if a conversation needs to be moved from one relay to another,
or if multiple people want to host a conversation simultaneously.
