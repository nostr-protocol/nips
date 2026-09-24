NIP-XX
======

Event Meta on Relays
--------------------

`draft` `optional`

This NIP defines a command similar to `REQ`, which relays can use to expose additional metadata for events.

## Message definitions

Clients may send a `META` message to relays supporting this NIP with a subscription ID and a filter as defined by [NIP 01](./01.md):

```json
["META", "1", {"ids": ["0dd58e97f6b3a7040e1dca8c3b89a12d002d5fe58191d41019e95e9c9c62f297"]}]
```

Relays MAY respond with its own `META` message, for example:

```json
["META", "1", {"first_seen": 1762475640}]
```

If the relay declines to serve metadata to the client, it may return a `META-CLOSED` message instead:

```json
["META-CLOSED", "1", "blocked: this relay doesn't serve metadata to interlopers"]
```

## Metadata fields

The following fields are defined on the metadata object returned by the relay:

- `first_seen` - a seconds-granularity unix timestamp for when the event was first seen by this relay
