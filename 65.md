NIP-65
======

Relay List Metadata
-------------------

`draft` `optional`

Defines a replaceable event using `kind:10002` to advertise relays where the user generally **writes** to and relays where the user generally **reads** mentions.

The event MUST include a list of `r` tags with relay URLs as value and an optional `read` or `write` marker. If the marker is omitted, the relay is both **read** and **write**.

```jsonc
{
  "kind": 10002,
  "tags": [
    ["r", "wss://alicerelay.example.com"],
    ["r", "wss://brando-relay.com"],
    ["r", "wss://expensive-relay.example2.com", "write"],
    ["r", "wss://nostr-relay.example.com", "read"]
  ],
  "content": "",
  // other fields...
}
```

When downloading events **from** a user, clients SHOULD use the **write** relays of that user.

When downloading events **about** a user, where the user was tagged (mentioned), clients SHOULD use the user's **read** relays.

When publishing an event, clients SHOULD:

- Send the event to the **write** relays of the author
- Send the event to all **read** relays of each tagged user
- Send the author's `kind:10002` event to all relays the event was published to

### Size

Clients SHOULD guide users to keep `kind:10002` lists small (2-4 relays of each category).

### Discoverability

Clients SHOULD spread an author's `kind:10002` event to as many relays as viable, paying attention to relays that, at any moment, serve naturally as well-known public indexers for these relay lists (where most other clients and users are connecting to in order to publish and fetch those).
