NIP-XX
=======

Invite Links
------------

This NIP defines a new bech32-encoded entity, `ninvite1` and a new event representing an invite code which
will grant access to a given relay.

## Invite entity

A `ninvite` is a bech32-encoded entity which includes one or more pubkeys, relay urls, and group ids.

```typescript
InvitePointer = {
  people?: string[]
  relays?: {
    url: string
    claim?: string
  }[]
  groups?: {
    address: string
    relay: string
    claim?: string
  }[]
}
```

The contents are a binary-encoded list of `TLV` (type-length-value), with `T` and `L` being 1 byte each (`uint8`, i.e. a
number in the range of 0-255), and `V` being a sequence of bytes of the size indicated by `L`.

These possible standardized `TLV` types are indicated here:

- `0` is _optionally_ a pubkey. This may be included multiple times.
- `1` is _optionally_ a tuple of `url` and `claim` joined using a `|`. This may be included multiple times.
- `2` is _optionally_ a tuple of `address`, `relay`, and `claim` joined using a `|`. This may be included multiple times.

Invite links MAY be shared as bare nostr links, but more often SHOULD be baked into a handler url, since that will be more
useful to users coming from a non-nostr context.

## Relay access request

User MAY request access to relays using an ephemeral `kind 28935` event sent ONLY to the relay in question. Relay access requests
MUST have a `claim` tag containing an arbitrary string. These events MUST NOT be stored or relayed to subscribers.

```json
{
  "kind": 28934,
  "content": "Optional message",
  "tags": [
    ["claim", "MYRELAY23"]
  ],
}
```

Relays MAY respond with a standard `OK` message as described in [NIP 01](./01.md) with the third argument beginning with
`access-granted:` or `access-denied:`.
