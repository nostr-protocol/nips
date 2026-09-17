NIP-XX
======

Relay Discovery via Distributed Hash Table
------------------------------------------

`draft` `optional`

## Abstract

This NIP defines a distributed hash table (DHT) protocol for Nostr relays to enable decentralized relay discovery. The protocol allows clients to deterministically locate relays for any participating npub without requiring shared relays, making relay discovery more decentralized. The core event type considered is NIP-65 relay lists, but the protocol supports decentralized storage and lookup of arbitrary events and can be extended to e.g. profiles or any other event type at the discretion of clients.

## Motivation

Currently, clients can only discover relay lists for npubs they encounter through shared relays. If two users do not share any common relays, discovering each other's relay preferences as defined in [NIP-65](65.md) is unreliable. This limits discoverability and creates an incentive for users to aggregate on large relays, reducing decentralization and censorship resistance.

Current methods for disseminating the relay list for an npub include:

- [NIP-01](01.md) where events can contains a relay hint.
- [NIP-65](65.md) which says clients "SHOULD spread an author's kind:10002 event to as many relays as viable".
- [NIP-05](05.md) DNS based identifiers using a web lookup to `/.well-known/nostr.json`.
- [NIP-19](19.md) nprofiles which can bundle the user's relays.
- [NIP-02](02.md) follow lists where each user can have a recommended relay URL.
- [NIP-51](51.md)/[NIP-17](17.md) DMs where users can publish relay lists where they receive DMs.
- [NIP-57](57.md) zaps which include relay hints for receiving zaps.

All of these methods suffer a chicken and egg problem where the client has to connect to a relay where the relay list has already been published to discover the relay list for an npub.

A DHT-based approach provides a deterministic, decentralized method for clients to store and retrieve relay lists for npubs without prior knowledge of any preferred relay, enabling global discoverability without centralized infrastructure.

## Overview

This Kademlia based protocol is inspired by the [BitTorrent Mainline DHT BEP-0005](https://bittorrent.org/beps/bep_0005.html), adapted for Nostr relays using WebSocket connections and Nostr-style JSON messages instead of UDP and bencode. Each relay acts as a DHT node, maintaining a routing table and responding to lookup queries.

Relay URLs serve as both node identifiers (when hashed) and storage buckets via the normal Nostr websocket protocol. Events are stored on relays whose hashed URLs are "closest" to the target ID (hashed npub) key in the DHT keyspace.

**Note**: In this document, the terms "node" and "relay" are used interchangeably, as DHT nodes are Nostr relays that implement this protocol.

### Key-Value Mapping

- **Keys**: 32-byte lowercase hex-encoded SHA-256 hashes of 1. relay URL (DHT node address) 2. npubs for which relay information is being stored 3. some other application-specific use-case string.
- **Values**: Nostr events (starting with [NIP-65](65.md) relay lists) published to the closest relays.

### Client Workflow

1. **Publishing**: A client hashes its npub, performs a recursive `DHT_FIND_RELAY` lookup to find relays closest to that hash, then publishes its [NIP-65](65.md) relay list (or any other event) to those relays.
2. **Discovery**: A client hashes a target npub, performs a recursive `DHT_FIND_RELAY` lookup to find the closest relays, then queries those relays for the target's relay list (or any other event).

## Protocol Specification

### Node Identity

Each relay in the DHT is identified by:

- **URL**: The relay's `wss://` WebSocket URL.
- **Node ID**: 32-byte lowercase hex-encoded SHA-256 hash of the relay's complete URL including protocol.
- **Distance Metric**: XOR distance between Node IDs, interpreted as unsigned integers.

```
NodeID = SHA256(RELAY_URL)  // e.g. 32-byte lowercase hex-encoded SHA-256("wss://relay.example.com")
distance(A, B) = A XOR B
```

### Routing Table

Each relay maintains a routing table consisting of "buckets," each responsible for a specific range of the 256-bit ID space. Each bucket can hold up to **K=8** nodes.

An empty table has one bucket with an ID space range of `min=0`, `max=2^256`. When a node with ID "N" is inserted into the table, it is placed within the bucket that has `min <= N < max`. Each bucket can only hold K nodes before becoming "full."

Nodes are classified by status:

- `good`: Responded to a query recently (within 2 hours).
- `questionable`: No response/activity for 2+ hours.
- `bad`: Failed to respond to 5 consecutive queries.

### DHT Messages

All DHT messages are JSON arrays sent over WebSocket connections, following the same pattern as other Nostr protocol extensions like [NIP-42](42.md) AUTH messages. Each DHT query, whether coming from a client or from a relay, requires establishing a WebSocket connection as a client. Clients and relays performing recursive lookups MUST connect to each target relay using the Nostr websocket protocol to issue the query.

#### `PING` / `PONG`

Used to verify relay availability and announce a new relay.

**Request:**
```json
["PING", <subscription_id>, <optional_relay_url>]
```

**Response:**
```json
["PONG", <subscription_id>]
```

- `subscription_id`: `<string>` - Random string to correlate request and response.
- `optional_relay_url`: `<string>` - Sender's WebSocket URL for routing table insertion.

Relays can suggest themselves for insertion into the routing table of other relays by using the `optional_relay_url` set to their own URL.

Non-relay clients MAY also use PING/PONG messages to test relay availability and responsiveness.

#### `DHT_FIND_RELAY` / `DHT_RELAYS`

Used to discover nodes closer to a target ID.

**Request:**
```json
["DHT_FIND_RELAY", <subscription_id>, <target_id>, <optional_relay_url>]
```

**Response:**
```json
["DHT_RELAYS", <subscription_id>, <relay_urls_array>]
```

- `subscription_id`: `<string>` - String identifying the lookup operation.
- `target_id`: `<32-byte lowercase hex-encoded SHA-256>` - Target ID for lookup.
- `relay_urls_array`: `<array of strings>` - Array of WebSocket URLs for the K closest known nodes.
- `optional_relay_url`: `<string>` - Sender's WebSocket URL for routing table insertion.

### Recursive Lookup Algorithm

When a client or relay wants to discover the relay set for a target ID it can perform a recursive lookup algorithm. Both relays and clients use the same lookup algorithm, connecting over websockets and querying relay nodes. Clients use it to find targets such as an npub's relay set, and relays use it when refreshing their routing table buckets.

To find nodes closest to a target ID:

1. **Initialize** shortlist with K closest nodes from local routing table, cached relay list, or bootstrap node set.
2. **Query** up to α=3 (query concurrency) closest unqueried nodes concurrently with `DHT_FIND_RELAY`.
3. **Update** shortlist with responses, maintaining K closest nodes.
4. **Close** WebSocket connections no longer required.
5. **Iterate** until all K closest nodes have been queried.
6. **Result** is the final list of K closest nodes.

A relay receiving a `DHT_FIND_RELAY` connection does not itself perform a recursive lookup. It simply returns the set of `K` closest nodes (relay URLs) to the target ID across all buckets in its own routing table.

### Routing Table Management

#### Adding Nodes

When learning about a new node from an incoming `PING` or `DHT_FIND_RELAY` where the `optional_relay_url` of the sender is supplied, the receiving relay MUST check if the URL is already in its routing table after processing the main request. If the url is not found in any bucket the relay should attempt to add it. Relays MUST verify the suggested relay URL as valid before adding it to any routing table, by initiating an outgoing websocket connection and performing a `PING`/`PONG` exchange. This prevents routing table poisoning. If the verification fails (30 second connection timeout, invalid response, or connection refused), the node MUST NOT be added to the routing table. This reverse lookup SHOULD be cached and rate limited to prevent DoS attacks.

#### Bucket Maintenance

When a bucket is full of known good nodes, no more nodes may be added unless the relay's own node ID falls within the range of the bucket. In that case, the bucket is replaced by two new buckets each with half the range of the old bucket and the nodes from the old bucket are distributed among the two new ones. For a new table with only one bucket the relay's own node ID must fall in the bucket range, so it is split into two new buckets covering the ranges 0..2^255 and 2^255..2^256.

When the bucket is full of good nodes, the new node is simply discarded. If any nodes in the bucket are known to have become bad, then one is replaced by the new node. If there are any questionable nodes in the bucket that have not been seen recently, the least recently seen node is pinged. If the pinged node responds then the next least recently seen questionable node is pinged until one fails to respond or all of the nodes in the bucket are known to be good. If a node in the bucket fails to respond to a ping, it is suggested to try once more before discarding the node and replacing it with a new good node.

#### Refreshing

Buckets not updated within 4 hours are considered stale and MUST be refreshed by performing a `DHT_FIND_RELAY` lookup for a random ID within the bucket's range.

#### Persistence

Routing tables SHOULD be persisted to disk between relay restarts to avoid requiring fresh bootstrap from known nodes on each startup. The routing table state enables faster DHT participation and reduces load on bootstrap nodes.

## Client Implementation

### Publishing Events

1. Hash the client's npub: `target_id = SHA-256(npub)`.
2. Perform recursive `DHT_FIND_RELAY` lookup for `target_id`.
3. Publish the event such as [NIP-65](65.md) relay list to the K closest relays found.

### Discovering Relays

1. Hash the target npub: `target_id = SHA-256(npub)`.
2. Perform recursive `DHT_FIND_RELAY` lookup for `target_id`.
3. Query the K closest relays with `REQ` for events such as [NIP-65](65.md) from the target npub.

## Security

#### Routing Table Poisoning Prevention

The connect-back verification requirement prevents malicious nodes from claiming to operate relays they do not control. Relays SHOULD maintain a short-term cache of recently failed verification attempts and rate limit `optional_relay_url` routing table insertion attempts to prevent denial-of-service attacks.

#### Rate Limiting

Relays MAY rate-limit `PING` requests to prevent abuse, for example by ignoring more than one `PING` every minute per WebSocket connection.

#### Client Caching

Since the global relay set changes slowly over time, clients MAY cache a list of known good relays locally. This enables faster lookups using the `K` closest known nodes, without requiring a full bootstrap process on each startup. Clients MAY evict relays from this list that don't respond to queries to keep the list fresh.

#### Cryptographic Integrity

Unlike the BitTorrent DHT this protocol benefits from Nostr's cryptographic signatures. All stored events are signed by their authors, preventing malicious nodes from forging event data such as relay lists. This eliminates the need for additional integrity mechanisms required by the BitTorrent DHT such as announce tokens.

#### Eclipse Attacks

An eclipse attack occurs when a malicious actor surrounds a target node with nodes they control, effectively isolating the target from the honest network. In the context of this DHT, an attacker could:

1. **Generate strategic relay URLs**: Create many relay URLs (e.g., `wss://attack1.evil.com`, `wss://attack2.evil.com`) and hash them until finding ones positioned around a target node ID in the keyspace.
2. **Fill routing table buckets**: With K=8 nodes per bucket, an attacker needs only 8 malicious relays to fill each bucket around a target.
3. **Control lookup results**: Direct DHT queries to attacker-controlled relays instead of honest nodes, potentially censoring DHT relay list responses or events.

This protocol includes several defenses against eclipse attacks:

- **Connect-back verification**: Prevents attackers from adding invalid relay URLs.
- **Bucket splitting constraints**: Only allows splitting when the node's own ID falls within the bucket range.
- **Multiple lookup paths**: Uses `α=3` concurrent queries rather than single-path lookups.
- **Rate limiting**: Limits routing table insertion requests to prevent rapid routing table manipulation.
- **Cryptography**: Signed events prevent an attacker generating fake values.

The remaining risks are due to the relatively small size of the Nostr relay network (~1000 nodes vs millions in the BitTorrent DHT) which make eclipse attacks more feasible:

- **Lower attack cost**: Fewer malicious relays needed to surround targets.
- **Limited routing diversity**: Fewer honest nodes provide less diverse routing paths.
- **No node ID restrictions**: Attackers can freely generate URLs to position their node IDs strategically.

However the primary mitigation against this attack is the fact that clients already have other sources for valid NIP-65 relay lists. Clients can cryptographically verify NIP-65 lists and obtain those lists from other sources, which allows them to route around any malicious DHT attack and renders such an attack fairly pointless. The DHT only improves the efficiency and decentralization of relay discovery and the network is not reliant on it.

## Bootstrap Process

New relays joining the DHT MUST bootstrap by connecting to known DHT-enabled relays. Initial bootstrap nodes MAY include [replace with initial set of implementing relays].

Relays SHOULD advertise their DHT support capability via [NIP-11](11.md) relay information document by including this NIP in `supported_nips` in their relay metadata.

## Relationship to Other NIPs

This NIP extends the relay discovery capabilities of [NIP-65](65.md) by providing a decentralized storage and lookup mechanism. While [NIP-65](65.md) defines the relay list event format, this NIP defines a way to store and retrieve such events in a decentralized manner.

The protocol can also be used to store and discover other event types, making it a general-purpose decentralized storage layer for Nostr.

## Potential future use cases

Since target ID hashes can be composed from any source data, the DHT protocol can be adapted for arbitrary uses in future.

One example is DM clients that want to decentralize and mix up the relays they use. They could compose a target ID including a time-range e.g. `target_id = SHA-256(current_unix_hour + npub1 + npub2 + shared_secret)` which would mean the shared relay set is updated and moved every hour. This could add an additional layer of security to the existing DM cryptography.

Another example is specific NIP-78 applications which could skip setting default relays, or absolve users of choosing relays, by using a target ID like `target_id = SHA-256(application_name + npub)` and writing user data to the resulting set of relays. This would create deterministic npub distribution across relays that is specific to that application and user.

## Implementation

This section provides implementation guidance for relay developers.

### Routing table Data Structure

The routing table is stored as an array of buckets (JSON example):

```json
{
  "buckets": [
    {
      "range": {
        "min": "0000000000000000000000000000000000000000000000000000000000000000",
        "max": "7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      },
      "nodes": [
        {
          "url": "wss://relay1.example.com",
          "status": "good",
          "lastSeen": "2023-10-27T10:00:00Z",
          "lastPinged": "2023-10-27T09:30:00Z",
          "consecutiveFailures": 0
        },
        {
          "url": "wss://relay2.example.com", 
          "status": "questionable",
          "lastSeen": "2023-10-27T07:45:00Z",
          "lastPinged": "2023-10-27T09:45:00Z",
          "consecutiveFailures": 1
        }
      ],
      "lastChanged": "2023-10-27T10:00:00Z"
    }
  ],
  "ownUrl": "wss://my-relay.example.com",
  "ownId": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
}
```

#### Node Status Values

- `good`: Responded within last 2 hours
- `questionable`: No response for 2+ hours but < 5 consecutive failures  
- `bad`: 5+ consecutive query failures (should be removed)

### Core Algorithms

#### 1. Node ID Calculation

A node's ID is calculated by taking the lowercase SHA-256 hash of its WebSocket URL. The distance between two IDs is their XOR distance, calculated by interpreting the hex IDs as large integers.

#### 2. Adding a Node to Routing Table

To add a node, first find the bucket where `min <= node_id < max`. If the node already exists in the bucket, its status is updated to `good`, its consecutive failure count is reset, and its `lastSeen` timestamp is updated. If the node does not exist and the bucket has fewer than K nodes, the new node is added with a `good` status. If the bucket is full, the logic for handling a full bucket is invoked.

#### 3. Handling Full Buckets

When a bucket is full of good nodes, the new node is simply discarded. If any nodes in the bucket are known to have become bad, then one is replaced by the new node. If there are any questionable nodes in the bucket, the least recently seen node is pinged. If the pinged node responds then the next least recently seen questionable node is pinged until one fails to respond or all of the nodes in the bucket are known to be good. If a node in the bucket fails to respond to a ping, it is suggested to try once more before discarding the node and replacing it with a new good node. If the relay's own node ID falls within the bucket's range, the bucket is split into two new buckets each with half the range of the old bucket.

#### 4. Recursive DHT_FIND_RELAY Lookup

The lookup process is iterative. It begins with a "shortlist" initialized with the K closest nodes from the local routing table, list of known good relays, or bootstrap nodes if the table is empty. In each round, the client concurrently sends `DHT_FIND_RELAY` queries to the `α=3` closest unqueried nodes from the shortlist. As `DHT_RELAYS` responses arrive, the new nodes are added to the shortlist, which is always kept sorted by distance to the target and trimmed to size `K`. The process terminates when a round of queries completes without discovering any nodes closer than those already known. The result is the final list of K closest nodes. In the case of a relay performing the recursive lookup, any relay that does not respond should have it's `consecutiveFailures` count incremented.

### Message Handling

#### PING Handler

When a `PING` message is received, the relay immediately sends a `PONG` response with the same subscription ID. If the `PING` included the sender's relay URL, the relay validates the URL format, checks if it is unseen in the routing table, and then initiates the connect-back verification process to confirm the sender's authenticity before attempting to add it to the routing table.

#### DHT_FIND_RELAY Handler

Upon receiving a `DHT_FIND_RELAY` request, the relay searches its routing table for the K nodes closest to the provided `targetId`. It then sends a single `DHT_RELAYS` message back to the requester, containing the subscription ID from the request and an array of the WebSocket URLs of the K closest nodes found.

If the `DHT_FIND_RELAY` included the sender's relay URL, the relay validates the URL format, checks if it is unseen in the routing table, and then initiates the connect-back verification process to confirm the sender's authenticity before attempting to add it to the routing table (following the same process as described for PING messages).

### Periodic Maintenance Tasks

#### 1. Bucket Refresh (Every 2 hours)

Every 2 hours the relay checks each bucket in its routing table. If a bucket has not been modified in over 4 hours, it is considered stale. To refresh it, the relay generates a random ID within that bucket's range and initiates a `DHT_FIND_RELAY` recursive lookup for that ID. This process helps discover new nodes and validate existing ones within that segment of the keyspace. Any nodes in the bucket that do not respond to queries have their `consecutiveFailures` count incremented.

#### 2. Routing Table Maintenance (Every 1 hour)

Every hour, the relay performs passive maintenance on its routing table. Nodes are not actively pinged during this process.

- **Status Update**: Any `good` node that has not been seen in 2 hours is demoted to `questionable`.
- **Eviction**: Any node that has accumulated 5 or more consecutive failures (from previous reactive queries) is considered `bad` and removed.

### Required Relay Message Types to Handle

1. **PING** - Respond with PONG, optionally add sender.
2. **DHT_FIND_RELAY** - Return K closest known nodes to target ID, optionally add sender.

### Required Relay Outgoing Operations

1. **Connect-back verification** - When learning new nodes from `PING` or `DHT_FIND_RELAY`.
2. **DHT_FIND_RELAY recursive lookup** - For bucket refresh.

### Bootstrap Process

When a new relay starts, it must bootstrap to join the DHT. If no persisted routing table exists, it connects to a list of known, stable, DHT-enabled relays. For each bootstrap relay, it establishes a WebSocket connection, sends a `PING` (including its own URL) to announce its presence, and then performs a `DHT_FIND_RELAY` lookup for its own ID to begin populating its routing table with nearby nodes. Connections to bootstrap relays are closed after the initial exchange unless maintained for other purposes.

### Configuration Parameters

- **K** = 8 (max nodes per bucket)
- **α** = 3 (concurrency parameter for lookups)
- **Bucket refresh interval** = 2 hours
- **Node health check & clean interval** = 1 hour
- **Ping timeout** = 30 seconds
- **Max consecutive failures** = 5
- **Rate limit** = 1 ping per minute per connection

## Implementation Notes

- Clients SHOULD fall back to traditional relay discovery methods if DHT lookup fails.
- The protocol is designed to be incrementally deployable - benefits increase as more relays implement DHT support.

## Reference Implementation

[Link to reference implementation when available]
