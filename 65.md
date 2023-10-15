NIP-65
======

Relay List Metadata
-------------------

`draft` `optional` `author:mikedilger` `author:vitorpamplona`

Defines a replaceable event using `kind:10002` to advertise preferred relays for discovering a user's content and receiving fresh content from others.

The event MUST include a list of `r` tags with relay URIs and a `read` or `write` marker. If the marker is omitted, the relay is used for both purposes.

The `.content` is not used.

```json
{
  "kind": 10002,
  "tags": [
    ["r", "wss://alicerelay.example.com"],
    ["r", "wss://brando-relay.com"],
    ["r", "wss://expensive-relay.example2.com", "write"],
    ["r", "wss://nostr-relay.example.com", "read"],
  ],
  "content": "",
  ...other fields
```

This NIP doesn't fully replace relay lists that are designed to configure a client's usage of relays (such as `kind:3` style relay lists). Clients MAY use other relay lists in situations where a `kind:10002` relay list cannot be found.

## When to Use Read and Write

When seeking events **from** a user, Clients SHOULD use the WRITE relays of the user's `kind:10002`

When seeking events **about** a user, where the user was tagged, Clients SHOULD use the READ relays of the user's `kind:10002` 

When broadcasting an event, Clients SHOULD:

- Broadcast the event to the WRITE relays of the author
- Broadcast the event all READ relays of each tagged user. 

## Motivation

The old model of using a fixed relay list per user centralizes in large relay operators: 

  - Most users submit their posts to the same highly popular relays, aiming to achieve greater visibility among a broader audience.
  - Many users are pulling events from a large number of relays in order to get more data at the expense of duplication
  - Events are being copied between relays, oftentimes to many different relays
  
This NIP allows Clients to connect directly with the most up-to-date relay set from each individual user, eliminating the need of broadcasting events to popular relays. 

## Final Considerations

1. Clients SHOULD guide users to keep `kind:10002` lists small (2-4 relays). 

2. Clients SHOULD spread an author's `kind:10002` events to as many relays as viable. 

3. `kind:10002` events should primarily be used to advertise the user's preferred relays to others. A user's own client may use other heuristics for selecting relays for fetching data.

4. DMs SHOULD only be broadcasted to the author's WRITE relays and to the receiver's READ relays to keep maximum privacy. 

5. If a relay signals support for this NIP in their [NIP-11](11.md) document that means they're willing to accept kind 10002 events from a broad range of users, not only their paying customers or whitelisted group.

6. Clients SHOULD deduplicate connections by normalizing relay URIs according to [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986#section-6).
