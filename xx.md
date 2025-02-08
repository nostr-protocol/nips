NIP-XX
======

Nostr over Reticulum
---------

`draft` `optional`

This NIP defines how to implement nostr relay connections over the Reticulum Network Stack, allowing nostr clients and relays to communicate over Reticulum networks instead of traditional WebSocket connections.

## Overview

Nostr over Reticulum (NoR) enables nostr clients and relays to operate over Reticulum's encrypted mesh networking stack while maintaining full compatibility with existing nostr protocols and NIPs. This allows nostr communications to benefit from Reticulum's features like:

- End-to-end encryption
- Multi-hop mesh routing
- Operation over various physical layers (LoRa, packet radio, WiFi, etc.)
- No requirement for traditional IP infrastructure

The only changes required are:
1. How clients discover and connect to relays
2. The transport layer between clients and relays

All nostr protocol operations (events, filters, subscriptions etc.) remain unchanged.

## Relay Addressing

Instead of WebSocket URLs, NoR relays are identified by their Reticulum destination hash. Relays MUST create a Reticulum Single destination with:

- App name: "<relay_name>"
- Aspects: ["nostr", "relay"]

Example:
```python
relay_destination = RNS.Destination(
    relay_identity,
    RNS.Destination.IN,
    RNS.Destination.SINGLE,
    "NoR",
    "nostr",
    "relay"
)
```

The resulting destination hash uniquely identifies the relay on the Reticulum network. It can be added to any nostr event where a relay URL is expected, as `reticulum://<destination_hash>`, in place of a standard `ws://<url>`.

## Client-Relay Communication

To connect to a relay:

1. The client requests a path to the relay's destination hash using Reticulum's path request mechanism
2. Once a path is known, the client establishes a Reticulum Link to the relay's destination
3. The client and relay exchange nostr protocol messages as JSON-encoded packets over the Link
4. For large messages that exceed the packet size limit, RNS.Resource is used to handle chunked transfer

### Resource Handling

When messages exceed the maximum packet size:

1. The sender creates an RNS.Resource containing the message data
2. The resource is automatically split into chunks and transferred with compression
3. The receiver reassembles the chunks and processes the complete message

## Message Format 

All nostr messages MUST be encoded as UTF-8 JSON strings. The message format remains identical to standard nostr JSON messages, following the format: `["EVENT", <subscription_id>, <event>]` etc.


## Extending Relay Info

Relays SHOULD indicate NoR support in their metadata:

```json
{
  "supported_nips": [
    // other nips
    XX
  ],
  "reticulum_destination": "<reticulum destination hash>"
  // other fields...
}
```

## Implementation Notes

While relays can run both WebSocket and NoR interfaces simultaneously, implementers should be aware that running NoR relays on low-bandwidth physical layers (like LoRa) will require careful consideration of:

1. Event size limits 
2. Subscription limits
3. Filter complexity
4. Rate limiting
5. Bandwidth allocation

It is recommended that relays operating on constrained physical layers implement appropriate limits and communicate them via the limitation object in their announcements.

For optimal performance on low-bandwidth networks, clients should:

1. Minimize subscription changes
2. Use efficient filters
3. Implement local event caching
4. Rate limit event publishing
5. Limit event content length when possible

## References

1. [Reticulum Network Stack](https://reticulum.network/manual/)