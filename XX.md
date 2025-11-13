NIP-XX
======

Cluster Replication Protocol
----------------------------

`draft` `optional`

## Abstract

This NIP defines an HTTP-based pull replication protocol for relay clusters. It enables relay operators to form distributed networks where relays actively poll each other to synchronize events, providing efficient traffic patterns and improved data availability. Cluster membership is managed by designated cluster administrators who publish membership lists that relays replicate and use to update their polling targets.

## Motivation

Current Nostr relay implementations operate independently, leading to fragmented event storage across the network. Users must manually configure multiple relays to ensure their events are widely available. This creates several problems:

1. **Event Availability**: Important events may not be available on all relays a user wants to interact with
2. **Manual Synchronization**: Users must manually publish events to multiple relays
3. **Discovery Issues**: Clients have difficulty finding complete event histories
4. **Resource Inefficiency**: Relays store duplicate events without coordination
5. **Network Fragmentation**: Related events become scattered across disconnected relays

This NIP addresses these issues by enabling relay operators to form clusters that actively replicate events using efficient HTTP polling mechanisms, creating more resilient and bandwidth-efficient event distribution networks.

## Specification

### Event Kinds

This NIP defines the following new event kinds:

| Kind | Description |
|------|-------------|
| `39108` | Cluster Membership List |

### Cluster Membership List (Kind 39108)

Cluster administrators publish this replaceable event to define the current set of cluster members. All cluster relays replicate this event and update their polling lists when it changes:

```json
{
  "kind": 39108,
  "content": "{\"name\":\"My Cluster\",\"description\":\"Community relay cluster\",\"admins\":[\"npub1...\",\"npub2...\"]}",
  "tags": [
    ["d", "membership"],
    ["relay", "https://relay1.example.com/", "wss://relay1.example.com/"],
    ["relay", "https://relay2.example.com/", "wss://relay2.example.com/"],
    ["relay", "https://relay3.example.com/", "wss://relay3.example.com/"],
    ["admin", "npub1admin..."],
    ["admin", "npub1admin2..."],
    ["version", "1"]
  ],
  "pubkey": "<admin-pubkey-hex>",
  "created_at": <unix-timestamp>,
  "id": "<event-id>",
  "sig": "<signature>"
}
```

**Tags:**
- `d`: Identifier for the membership list (always "membership")
- `relay`: HTTP and WebSocket URLs of cluster member relays (comma-separated)
- `admin`: npub of cluster administrator (can have multiple)
- `version`: Protocol version number

**Content:** JSON object containing cluster metadata (name, description, admin list)

**Authorization:** Only events signed by cluster administrators (listed in `admin` tags) are valid for membership updates.

### HTTP API Endpoints

#### 1. Latest Serial Endpoint

Returns the current highest event serial number in the relay's database.

**Endpoint:** `GET /cluster/latest`

**Response:**
```json
{
  "serial": 12345678,
  "timestamp": 1640995200
}
```

**Parameters:**
- `serial`: The highest event serial number in the database
- `timestamp`: Unix timestamp when this serial was last updated

#### 2. Event IDs by Serial Range Endpoint

Returns event IDs for a range of serial numbers.

**Endpoint:** `GET /cluster/events`

**Query Parameters:**
- `from`: Starting serial number (inclusive)
- `to`: Ending serial number (inclusive)
- `limit`: Maximum number of event IDs to return (default: 1000, max: 10000)

**Response:**
```json
{
  "events": [
    {
      "serial": 12345670,
      "id": "abc123...",
      "timestamp": 1640995100
    },
    {
      "serial": 12345671,
      "id": "def456...",
      "timestamp": 1640995110
    }
  ],
  "has_more": false,
  "next_from": null
}
```

**Response Fields:**
- `events`: Array of event objects with serial, id, and timestamp
- `has_more`: Boolean indicating if there are more results
- `next_from`: Serial number to use as `from` parameter for next request (if `has_more` is true)

### Replication Protocol

#### 1. Cluster Discovery

1. Cluster administrators publish Kind 39108 events defining cluster membership
2. Relays configured with cluster admin npubs subscribe to these events
3. When membership updates are received, relays update their polling lists
4. Polling begins immediately with 5-second intervals to all listed relays

#### 2. Active Replication Process

Each relay maintains a replication state for each cluster peer:

1. **Poll Latest Serial**: Every 5 seconds, query `/cluster/latest` from each peer
2. **Compare Serials**: If peer has higher serial than local replication state, fetch missing events
3. **Fetch Event IDs**: Use `/cluster/events` to get event IDs in the serial range gap
4. **Fetch Full Events**: Use standard WebSocket REQ messages to get full event data
5. **Store Events**: Validate and store events in local database (relays MAY choose not to store every event they receive)
6. **Update State**: Record the highest successfully replicated serial for each peer

#### 3. Serial Number Management

Each relay maintains an internal serial number that increments with each stored event:

- **Serial Assignment**: Events are assigned serial numbers in the order they are stored
- **Monotonic Increase**: Serial numbers only increase, never decrease
- **Gap Handling**: Missing serials are handled gracefully
- **Peer State Tracking**: Each relay tracks the last replicated serial from each peer
- **Restart Recovery**: On restart, relays load persisted serial state and resume replication from the last processed serial

#### 4. Conflict Resolution

When fetching events that already exist locally:

1. **Serial Consistency**: If serial numbers match, events should be identical
2. **Timestamp Priority**: For conflicting events, newer timestamps take precedence
3. **Signature Verification**: Invalid signatures always result in rejection
4. **Author Authority**: Original author events override third-party copies
5. **Event Kind Rules**: Follow NIP-01 replaceable event semantics where applicable

## Message Flow Examples

### Basic Replication Flow

```
Relay A                    Relay B
   |                          |
   |--- User Event ---------->|  (Event stored with serial 1001)
   |                          |
   |                          |  (5 seconds later)
   |                          |
   |<--- GET /cluster/latest --|  (A polls B, gets serial 1001)
   |--- Response: 1001 ------->|
   |                          |
   |<--- GET /cluster/events --|  (A fetches event IDs from serial 1000-1001)
   |--- Response: [event_id] ->|
   |                          |
   |<--- REQ [event_id] ------|  (A fetches full event via WebSocket)
   |--- EVENT [event_id] ---->|
   |                          |
   |  (Event stored locally)  |
```

### Cluster Membership Update Flow

```
Admin Client              Relay A                    Relay B
     |                        |                          |
     |--- Kind 39108 -------->|  (New member added)      |
     |                        |                          |
     |                        |<--- REQ membership ----->|  (A subscribes to membership updates)
     |                        |--- EVENT membership ---->|
     |                        |                          |
     |                        |  (A updates polling list)|
     |                        |                          |
     |                        |<--- GET /cluster/latest -|  (A starts polling B)
     |                        |                          |
```

## Security Considerations

1. **Administrator Authorization**: Only cluster administrators can modify membership lists
2. **Transport Security**: HTTP endpoints SHOULD use HTTPS for secure communication
3. **Rate Limiting**: Implement rate limiting on polling endpoints to prevent abuse
4. **Event Validation**: All fetched events MUST be fully validated before storage
5. **Access Control**: HTTP endpoints SHOULD implement proper access controls
6. **Privacy**: Membership lists contain relay addresses but no sensitive user data
7. **Audit Logging**: All replication operations SHOULD be logged for monitoring
8. **Network Isolation**: Clusters SHOULD be isolated from public relay operations
9. **Serial Consistency**: Serial numbers help detect tampering or data corruption

## Implementation Guidelines

### Relay Operators

1. Configure cluster administrator npubs to monitor membership updates
2. Implement HTTP endpoints for `/cluster/latest` and `/cluster/events`
3. Set up 5-second polling intervals to all cluster peers
4. Implement peer state persistence to track last processed serials
5. Monitor replication health and alert on failures
6. Handle cluster membership changes gracefully (cleaning up removed peer state)
7. Implement proper serial number management
8. Document cluster configuration

### Client Developers

1. Clients MAY display cluster membership information for relay discovery
2. Clients SHOULD prefer cluster relays for improved event availability
3. Clients can use membership events to find additional relay options
4. Clients SHOULD handle relay failures within clusters gracefully

## Backwards Compatibility

This NIP is fully backwards compatible:

- Relays not implementing this NIP continue to operate normally
- The HTTP endpoints are optional additions to existing relay functionality
- Standard WebSocket event fetching continues to work unchanged
- Users can continue using relays without cluster participation
- Existing event kinds and message types are unchanged

## Reference Implementation

A reference implementation SHOULD include:

1. HTTP endpoint handlers for `/cluster/latest` and `/cluster/events`
2. Cluster membership subscription and parsing logic
3. Replication polling scheduler with 5-second intervals
4. Serial number management and tracking
5. Peer state persistence and recovery (last known serials stored in database)
6. Peer state management and failure handling
7. Configuration management for cluster settings

## Test Vectors

### Example Membership Event

```json
{
  "kind": 39108,
  "content": "{\"name\":\"Test Cluster\",\"description\":\"Development cluster\",\"admins\":[\"npub1testadmin1\",\"npub1testadmin2\"]}",
  "tags": [
    ["d", "membership"],
    ["relay", "https://relay1.test.com/", "wss://relay1.test.com/"],
    ["relay", "https://relay2.test.com/", "wss://relay2.test.com/"],
    ["admin", "npub1testadmin1"],
    ["admin", "npub1testadmin2"],
    ["version", "1"]
  ],
  "pubkey": "testadminpubkeyhex",
  "created_at": 1640995200,
  "id": "membership_event_id",
  "sig": "membership_event_signature"
}
```

### Example Latest Serial Response

```json
{
  "serial": 12345678,
  "timestamp": 1640995200
}
```

### Example Events Range Response

```json
{
  "events": [
    {
      "serial": 12345676,
      "id": "event_id_1",
      "timestamp": 1640995190
    },
    {
      "serial": 12345677,
      "id": "event_id_2",
      "timestamp": 1640995195
    },
    {
      "serial": 12345678,
      "id": "event_id_3",
      "timestamp": 1640995200
    }
  ],
  "has_more": false,
  "next_from": null
}
```

## Changelog

- 2025-01-XX: Initial draft

## Copyright

This document is placed in the public domain.
