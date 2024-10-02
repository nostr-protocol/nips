NIP-XX
======

Relay Chat
----------

`draft` `optional`

This NIP defines a standard for relay-local chat messages.

# Rooms

A `room` is identified by an arbitrary, human-readable string no longer than 30 characters and referred to using a `~` tag indicating the room id and a relay url.

Rooms on different relays with the same name SHOULD NOT be considered the same room.

# Chat Message

A relay chat message is a kind `209` event. A `~` tag MUST be included, indicating the name of the chat room and the relay url.

```json
{
  "kind": 209,
  "content": "GM",
  "tags": [
    ["~", "Good Morning", "wss://relay.example.com/"],
  ]
}
```

Replies to kind `209` MUST use [NIP-73](https://github.com/nostr-protocol/nips/pull/1233) `kind 1111` comments. Clients MAY support arbitrarily nested replies, but SHOULD encourage flat reply hierarchies. These replies MUST also include a `~` tag.

Kind `209` events MUST NOT be considered valid unless they have a `~` tag matching the current relay, or a relay specified in a `kind 30209` migration event.

Other note kinds MAY also be posted to rooms using the `~` tag.

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

# Migrations

If a conversation needs to be moved from one relay to another, the new host relay may explicitly map this relation using a `kind 30209` event indicating valid relay urls for a given room. Multiple previous urls may be supported for a single room. This event MUST be signed by the `pubkey` indicated by the relay's NIP 11 document.

```json
{
  "kind": "30209",
  "tags": [
    ["~", "Good Morning", "wss://relay.other1.com/"],
    ["~", "Good Morning", "wss://relay.other2.com/"]
  ],
}
```
