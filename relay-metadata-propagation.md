
# NIP-XXXX

## Relay metadata propagation

`draft` `optional`

## Summary

This NIP proposes a simple propagation mechanism for `kind:0` (user metadata) and `kind:10002` (relay list metadata) events between relays. Relays are allowed to forward such events to their peers, improving client synchronization.

## Motivation

Users often encounter outdated profile or relay list information when switching clients or connecting to different relays. This happens because events like `kind:0` and `kind:10002` are published only to the relays known to the client at the time of submission.

This NIP aims to improve metadata consistency and discovery by allowing relays to assist in data propagation — without modifying the event structure or requiring users to publish events to multiple relays manually.

## Design

### Peer Relay Discovery

Each relay can maintain a list of peer relays, either statically configured or dynamically discovered.

### Propagation Logic

When a relay receives an event of `kind:0` or `kind:10002`, it should:

1. Check signature
2. Check whether the event is already present in its local database, using the event `id`.
3. If the event is new (or newer than the stored one), the relay:
   - Stores the event or replaces the old related one.
   - Forwards the event to all peers.
4. If the event is already known, the relay takes no action.

### Example Propagation Flow

```
User A sends a `kind:0` event to Relay A  
Relay A forwards the event to Relay B  
Relay B stores it (if unknown), 
  then forwards it to Relay A
  then forwards it to Relay C
Relay A receives the event again and does nothing because it already has it.
```

## Advantages

- Improved consistency of user profiles and relay lists across the network.
- No changes required on the client side.
- Low-complexity relay-side implementation.

## Drawbacks

- Relays must maintain a list of peer relays.
- Relays will receive the same events many times and do nothing

## Compatibility

- Fully backward-compatible with all clients and relays.
- Unaware clients will benefit from improved metadata availability without any updates.