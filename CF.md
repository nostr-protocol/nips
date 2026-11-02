# NIP-CF: Changes Feed

`draft` `optional`

This NIP defines an optional relay extension for sequence-based event synchronization.

## Abstract

Standard Nostr sync uses timestamp-based filters (`since`), which can miss events due to timestamp collisions or clock drift. This NIP defines a changes feed that uses monotonically increasing sequence numbers for precise, reliable synchronization.

## Motivation

Timestamp-based sync has limitations:

- **Collisions**: Multiple events can share the same second-precision timestamp
- **Clock drift**: Client and relay clocks may differ
- **Imprecise checkpointing**: "Give me events since timestamp X" is fuzzy

Sequence numbers solve these issues by providing a strict total ordering of all events stored by a relay.

## Relay Requirements

Relays implementing this NIP:

**MUST:**
- Assign a monotonically increasing sequence number to each stored event
- Support the `CHANGES` message type
- Support continuous/live changes feeds

## Capability Advertisement

Relays MUST advertise support by including this NIP in their NIP-11 `supported_nips` array.

Clients SHOULD check this before using the changes feed and fall back to timestamp-based sync if not supported.

## Protocol

### CHANGES Request (client to relay)

```json
["CHANGES", <subscription_id>, <filter>]
```

The filter object supports:

| Field | Type | Description |
|-------|------|-------------|
| `since` | integer | Return events with seq > since (default: 0) |
| `limit` | integer | Maximum number of events to return (optional) |
| `kinds` | int[] | Filter by event kinds (optional) |
| `authors` | string[] | Filter by author pubkeys (optional) |
| `#<tag>` | string[] | Filter by tag values, same as NIP-01 (optional) |
| `live` | boolean | Keep subscription open for real-time updates (optional) |

Example:

```json
["CHANGES", "sync-1", {
  "since": 0,
  "kinds": [1, 30023],
  "authors": ["<pubkey>"]
}]
```

### CHANGES EVENT (relay to client)

For each matching event, the relay sends:

```json
["CHANGES", <subscription_id>, "EVENT", <seq>, <event>]
```

- `seq`: The sequence number assigned to this event (integer)
- `event`: The full Nostr event object

Events MUST be sent in sequence order (ascending).

### CHANGES EOSE (relay to client)

After sending all stored events matching the filter:

```json
["CHANGES", <subscription_id>, "EOSE", <last_seq>]
```

- `last_seq`: The relay's current maximum sequence number

The `last_seq` value is always the global maximum, even if no events matched the filter. This allows clients to advance their checkpoint without re-querying the same range.

### CHANGES ERR (relay to client)

If the request cannot be processed:

```json
["CHANGES", <subscription_id>, "ERR", <message>]
```

After an error, the subscription is closed.

### Closing a Subscription

Clients close a changes subscription with a standard CLOSE message:

```json
["CLOSE", <subscription_id>]
```

## Live/Continuous Mode

If the client includes `"live": true` in the filter, the relay keeps the subscription open after EOSE and sends new matching events in real-time:

```
Client: ["CHANGES", "s1", {"since": 42, "kinds": [1], "live": true}]
Relay:  ["CHANGES", "s1", "EVENT", 43, {...}]
Relay:  ["CHANGES", "s1", "EVENT", 50, {...}]
Relay:  ["CHANGES", "s1", "EOSE", 50]
-- subscription stays open --
Relay:  ["CHANGES", "s1", "EVENT", 51, {...}]  (new event arrives)
Relay:  ["CHANGES", "s1", "EVENT", 52, {...}]  (another new event)
...
Client: ["CLOSE", "s1"]
```

## Client Implementation

### Sync Flow

**Initial sync:**

```javascript
// Check if relay supports changes feed (NIP-CF)
const info = await fetch(relayUrl.replace('wss', 'https'))
const nip11 = await info.json()

if (nip11.supported_nips?.includes('CF')) {
    // Use changes feed
    send(["CHANGES", "sync", { since: 0, kinds: [1234], authors: [pubkey] }])
} else {
    // Fall back to timestamp-based
    send(["REQ", "sync", { kinds: [1234], authors: [pubkey] }])
}
```

**Processing responses:**

```javascript
let checkpoint = loadCheckpoint() || 0

relay.on('message', (msg) => {
    if (msg[0] === 'CHANGES' && msg[1] === 'sync') {
        if (msg[2] === 'EVENT') {
            const seq = msg[3]
            const event = msg[4]
            processEvent(event)
        } else if (msg[2] === 'EOSE') {
            const lastSeq = msg[3]
            checkpoint = lastSeq
            saveCheckpoint(checkpoint)
        }
    }
})
```

**Incremental sync:**

```javascript
send(["CHANGES", "sync", { since: checkpoint, kinds: [1234], authors: [pubkey] }])
```

### Checkpoint Storage

Clients SHOULD persist their checkpoint (last seen sequence number) to enable efficient incremental sync across sessions.

Note: Sequence numbers are relay-specific. Clients syncing from multiple relays need separate checkpoints for each.

## Security Considerations

- Sequence numbers may reveal information about relay activity (event frequency)
- Relays SHOULD rate-limit changes feed requests like other subscriptions
- The `limit` parameter helps prevent excessive resource usage
