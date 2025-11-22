# NIP-28 Extension: UMAP Geographic Channels

`draft` `optional`

This extension defines how to use NIP-28 Public Chat channels with **UMAP (Universal Map)** geographic cells in the UPlanet ecosystem, enabling location-based discussion rooms tied to decentralized identities.

## Motivation

Geographic chat rooms allow users to communicate within specific physical locations without requiring centralized infrastructure. By combining NIP-28 with UMAP DIDs (NIP-101), we create persistent, decentralized chat channels anchored to geographic coordinates.

## Overview

Each UMAP cell (0.01° × 0.01° geographic area, ~1.2 km²) can have its own:
- **Decentralized Identity (DID)** - Kind 30800 event (NIP-101)
- **Public Chat Channel** - Using NIP-28 (kind 42 messages)
- **Geographic Context** - Latitude/Longitude metadata

The UMAP DID's `pubkey` or `event_id` serves as the **channel identifier** for NIP-28 messages.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              UMAP Geographic Chat Flow                   │
└─────────────────────────────────────────────────────────┘

1. UMAP DID (Kind 30800) is created for geographic cell
   ├─ Pubkey: abc123...
   ├─ Coordinates: { lat: 48.86, lon: 2.35 }
   └─ Type: "UMAPGeographicCell"

2. Channel ID is derived from UMAP DID
   └─ channelId = npub1abc123... (or hex pubkey)

3. Users send messages (Kind 42) referencing channel
   ├─ Tag: ["e", <umap_did_npub>, "", "root"]
   └─ Tag: ["g", "48.86,2.35"]  (optional geolocation)

4. Clients subscribe to messages for specific UMAP
   └─ Filter: { kinds: [42], "#e": [<umap_did_npub>] }
```

## UMAP DID Discovery

Before creating chat messages, clients must discover the UMAP DID for a geographic coordinate.

### Finding UMAP DID (Kind 30800)

```json
// REQ filter to find UMAP DID
{
  "kinds": [30800],
  "#d": ["did"],
  "#g": ["48.86,2.35"],
  "limit": 1
}
```

**Response:**
```json
{
  "id": "<event_id>",
  "pubkey": "abc123...",
  "kind": 30800,
  "created_at": 1730000000,
  "tags": [
    ["d", "did"],
    ["g", "48.86,2.35"]
  ],
  "content": "{\"@context\":[\"https://w3id.org/did/v1\"],\"id\":\"did:nostr:abc123...\",\"type\":\"UMAPGeographicCell\",\"geographicMetadata\":{\"coordinates\":{\"lat\":48.86,\"lon\":2.35}}}"
}
```

### Deriving Channel ID

From the UMAP DID event:

1. **Use `npub` encoding** (recommended):
   ```javascript
   channelId = NostrTools.nip19.npubEncode(umapDID.pubkey)
   // Result: "npub1abc123..."
   ```

2. **Or use hex pubkey directly**:
   ```javascript
   channelId = umapDID.pubkey
   // Result: "abc123..."
   ```

3. **Or use event ID** (for specific DID version):
   ```javascript
   channelId = umapDID.id
   ```

**Best Practice**: Use `npub` encoding for human readability and compatibility with NIP-19 tools.

## Sending UMAP Messages (Kind 42)

### Root Message (Starting Conversation)

```json
{
  "kind": 42,
  "created_at": 1730000100,
  "content": "Hello from Paris UMAP!",
  "tags": [
    ["e", "npub1abc123...", "", "root"],
    ["g", "48.86,2.35"]
  ]
}
```

### Reply to Message

```json
{
  "kind": 42,
  "created_at": 1730000200,
  "content": "Hi! I'm also in this UMAP",
  "tags": [
    ["e", "npub1abc123...", "", "root"],
    ["e", "<parent_message_id>", "", "reply"],
    ["p", "<parent_author_pubkey>"],
    ["g", "48.86,2.35"]
  ]
}
```

## Tag Specifications

### Required Tags

| Tag | Description | Example |
|-----|-------------|---------|
| `["e", <channel_id>, "", "root"]` | References UMAP DID as channel | `["e", "npub1abc...", "", "root"]` |

### Optional Tags

| Tag | Description | Example |
|-----|-------------|---------|
| `["g", "<lat>,<lon>"]` | Geographic coordinates | `["g", "48.86,2.35"]` |
| `["e", <msg_id>, "", "reply"]` | Reply to specific message | `["e", "xyz789...", "", "reply"]` |
| `["p", <pubkey>]` | Mention/reply to user | `["p", "def456..."]` |
| `["t", <hashtag>]` | Topic hashtag | `["t", "paris"]` |

## Client Implementation

### 1. Initialize UMAP Chat

```javascript
// 1. User provides coordinates (from GPS, profile, or manual input)
const currentLocation = { lat: 48.86, lon: 2.35 };

// 2. Search for UMAP DID
const umapKey = `${currentLocation.lat.toFixed(2)},${currentLocation.lon.toFixed(2)}`;

const filter = {
  kinds: [30800],
  '#d': ['did'],
  '#g': [umapKey],
  limit: 1
};

const sub = relay.sub([filter]);
let umapDID = null;

sub.on('event', (event) => {
  const content = JSON.parse(event.content);
  if (content.type === 'UMAPGeographicCell') {
    umapDID = event;
  }
});

sub.on('eose', () => {
  if (umapDID) {
    // Found UMAP DID - use its npub as channel ID
    channelId = NostrTools.nip19.npubEncode(umapDID.pubkey);
  } else {
    // No DID found - use fallback or create one
    channelId = `UMAP_${umapKey}`;
  }
  sub.unsub();
  loadMessages();
});
```

### 2. Subscribe to Messages

```javascript
// Subscribe to all messages in this UMAP channel
const messageSub = relay.sub([{
  kinds: [42],
  "#e": [channelId],
  limit: 50
}]);

messageSub.on('event', (event) => {
  displayMessage(event);
});
```

### 3. Send Message

```javascript
async function sendMessage(content) {
  const event = {
    kind: 42,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["e", channelId, "", "root"],
      ["g", `${currentLocation.lat.toFixed(2)},${currentLocation.lon.toFixed(2)}`]
    ],
    content: content
  };
  
  const signedEvent = await window.nostr.signEvent(event);
  await relay.publish(signedEvent);
}
```

### 4. Change UMAP (Switch Room)

```javascript
async function switchUMAP(newLat, newLon) {
  // Unsubscribe from current channel
  if (messageSub) messageSub.unsub();
  
  // Update location
  currentLocation = { lat: newLat, lon: newLon };
  
  // Re-fetch UMAP DID for new location
  await initUMAPChat();
  
  // Subscribe to new channel
  loadMessages();
}
```

## Fallback Behavior

If no UMAP DID (kind 30800) exists for a geographic cell:

1. **Generic Channel ID**: Use `UMAP_<lat>_<lon>` format
   ```javascript
   channelId = `UMAP_48.86_2.35`;
   ```

2. **Display in UI**: Indicate no DID is registered yet
   ```
   Channel ID: UMAP_48.86_2.35 (no DID yet)
   ```

3. **Future Registration**: When a DID is created, clients can migrate to the new channel ID

## Geographic Precision

UMAP coordinates use **2 decimal places** (0.01° precision):
- Latitude: -90.00 to +90.00
- Longitude: -180.00 to +180.00
- Example: `48.86,2.35` (not `48.8566,2.3522`)

This creates consistent ~1.2 km² cells worldwide.

## UI Best Practices

### Display Current UMAP

```
┌─────────────────────────────────────┐
│ 🗨️ UMAP Chat Room                   │
├─────────────────────────────────────┤
│ 📍 UMAP: 48.86, 2.35                │
│ 🔗 Channel: npub1abc...xyz          │
│ 👥 3 users                           │
│ [Change Location]                   │
├─────────────────────────────────────┤
│ Messages appear here...             │
└─────────────────────────────────────┘
```

### User Count (Optional)

Estimate active users by counting unique `pubkey` values in recent messages:

```javascript
const recentMessages = await fetchRecentMessages(channelId, 24 * 60 * 60); // Last 24h
const uniqueUsers = new Set(recentMessages.map(m => m.pubkey));
displayUserCount(uniqueUsers.size);
```

## Security Considerations

### 1. Geographic Privacy

Users reveal their approximate location when joining UMAP channels. Clients SHOULD:
- Warn users about location sharing
- Allow anonymous participation (no profile linking)
- Support VPN/Tor for relay connections

### 2. Spam Prevention

Public geographic channels may attract spam. Clients MAY:
- Implement local muting (kind 44)
- Use proof-of-work for posting
- Require MULTIPASS registration (NIP-42 authentication)

### 3. DID Ownership

UMAP DIDs are not "owned" by a single entity. The DID creator's `pubkey` is the authoritative channel reference, but:
- Anyone can send messages (kind 42) to the channel
- No central moderator controls the channel
- Clients implement their own filtering/moderation

## Integration with ORE System

UMAP chats are part of the larger ORE (Obligations Réelles Environnementales) system:

- **ORE Contracts** (Kind 30312): Reference UMAP DIDs for location-based compliance
- **ORE Verification** (Kind 30313): Discussion of environmental verification in UMAP chat
- **Flora Observations**: Plant identification events can be discussed in local UMAP

See `ORE_SYSTEM.md` for full ecosystem documentation.

## Example: Complete Chat Session

```javascript
// === Client-side JavaScript Example ===

// 1. Connect to relay
const relay = await relayInit('wss://relay.example.com');
await relay.connect();

// 2. Get user's location (example: Paris)
const location = { lat: 48.86, lon: 2.35 };

// 3. Find UMAP DID
const umapKey = "48.86,2.35";
const umapDIDs = await relay.list([{
  kinds: [30800],
  '#d': ['did'],
  '#g': [umapKey]
}]);

const umapDID = umapDIDs[0];
const channelId = NostrTools.nip19.npubEncode(umapDID.pubkey);

console.log('Connected to UMAP channel:', channelId);

// 4. Subscribe to messages
const sub = relay.sub([{
  kinds: [42],
  "#e": [channelId],
  limit: 20
}]);

sub.on('event', (event) => {
  console.log(`[${event.pubkey.slice(0, 8)}...]: ${event.content}`);
});

// 5. Send a message
const message = {
  kind: 42,
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ["e", channelId, "", "root"],
    ["g", "48.86,2.35"]
  ],
  content: "Bonjour from Paris UMAP! 🇫🇷"
};

const signedMessage = await window.nostr.signEvent(message);
await relay.publish(signedMessage);

console.log('Message sent!');
```

## Comparison with Standard NIP-28

| Feature | Standard NIP-28 | UMAP Extension |
|---------|----------------|----------------|
| Channel Creation | Kind 40 event required | Optional (uses existing UMAP DID) |
| Channel ID | Custom string/event ID | UMAP DID npub |
| Geographic Context | Not specified | Required (`g` tag) |
| Channel Discovery | Search by metadata | Search by coordinates |
| Persistence | Relay-dependent | DID-anchored (NIP-101) |
| Use Case | General chat | Location-based chat |

## References

- **NIP-28**: Public Chat - https://github.com/nostr-protocol/nips/blob/master/28.md
- **NIP-101**: UPlanet DID System - https://github.com/papiche/NIP-101
- **NIP-10**: Event References - https://github.com/nostr-protocol/nips/blob/master/10.md
- **NIP-19**: bech32 Encoding - https://github.com/nostr-protocol/nips/blob/master/19.md
- **ORE System**: `ORE_SYSTEM.md` in Astroport.ONE documentation

## License

This extension is part of the UPlanet protocol and follows the Astroport.ONE project licensing.

