NIP-101 N² Constellation Synchronization Extension
===================================================

Astroport Relay Synchronization Protocol for UPlanet
-----------------------------------------------------

`draft` `extension` `optional`

This document describes the **N² (N-squared) constellation synchronization protocol** used by UPlanet/Astroport relays to maintain a distributed, resilient network of Nostr relays with automatic event synchronization.

## Overview

The N² protocol extends [NIP-101](101.md) with a **peer-to-peer relay synchronization mechanism** that creates a "constellation" of interconnected Astroport nodes. Each relay automatically syncs **21 specific event kinds** (including NIP-58 badges) across the network, ensuring data redundancy and censorship resistance.

## Motivation

Standard Nostr relay networks:
- ❌ Require manual relay configuration per client
- ❌ Have no automatic backup mechanism
- ❌ Lack geographic coordination
- ❌ Cannot guarantee data persistence

The N² constellation protocol solves these problems by:
- ✅ Automatic peer discovery and synchronization
- ✅ Geographic hierarchical coordination (UMAP/SECTOR/REGION)
- ✅ Resilient data replication across nodes
- ✅ Zero-configuration for end users

## Architecture

### Hub-and-Satellite Model

```
Hub Central (1)
├── Coordinates 24 Satellites
├── Manages inter-satellite communication
├── Handles economic flows (Ẑen)
└── Provides global synchronization

Satellites (24)
├── Local services (MULTIPASS, ZEN Cards)
├── Geographic UMAP management
├── Bidirectional sync with Hub
└── Peer sync with other Satellites
```

**Analogy:** Like a constellation of stars, where each node (relay) can see and communicate with multiple other nodes, creating redundancy and resilience.

### N² Synchronization Matrix

For a constellation of N relays:
- Each relay maintains connections to **N-1 peers**
- Total synchronization paths: **N × (N-1) = N²**
- Example: 25 relays (1 Hub + 24 Satellites) = **600 sync paths**

## Synchronized Event Kinds

The N² protocol synchronizes **18 event types** across all constellation members:

### Core Events (NIP-01)
- **Kind 0** - Profile metadata
- **Kind 1** - Text notes
- **Kind 3** - Contact lists
- **Kind 5** - Deletion requests
- **Kind 6** - Reposts
- **Kind 7** - Reactions

### Media Events (NIP-22)
- **Kind 21** - Media attachments
- **Kind 22** - Comments (NIP-22)

### Long-Form Content (NIP-23)
- **Kind 30023** - Long-form articles
- **Kind 30024** - Draft articles

### Identity & Credentials (NIP-101)
- **Kind 30800** - DID Documents (UPlanet Identity)
- **Kind 30500** - Permit Definitions (Oracle System)
- **Kind 30501** - Permit Requests
- **Kind 30502** - Permit Attestations
- **Kind 30503** - Permit Credentials

### ORE Environmental System (NIP-101 ORE extension)
- **Kind 30312** - ORE Meeting Space (Persistent Geographic Space)
- **Kind 30313** - ORE Verification Meeting

### Video Events (NIP-71 extension)
- **Kind 34235** - Video events with IPFS integration

**Total:** 18 event kinds automatically synchronized across the constellation.

## Synchronization Protocol

### 1. Peer Discovery

Each Astroport node maintains a constellation registry:

```jsonc
{
  "constellation_id": "UPlanetV1",
  "hub": {
    "relay_url": "wss://relay.copylaradio.com",
    "ipns": "k51qzi5uqu5dgy...",
    "ipfsnodeid": "12D3KooWABC...",
    "g1pub": "5fTwfbYUtCeoaFL...",
    "role": "hub"
  },
  "satellites": [
    {
      "relay_url": "wss://satellite1.uplanet.org",
      "ipns": "k51qzi5uqu5dhj...",
      "ipfsnodeid": "12D3KooWDEF...",
      "g1pub": "7gTwfbYUtCeoaFL...",
      "role": "satellite",
      "umap": "43.60,1.44"
    }
  ],
  "sync_event_kinds": [0, 1, 3, 5, 6, 7, 8, 21, 22, 30008, 30009, 30023, 30024, 30312, 30313, 30500, 30501, 30502, 30503, 30800]
}
```

### 2. Automatic Synchronization Flow

```
1. EVENT PUBLISHED (Local Relay)
   │
   ├─ Store locally (strfry DB)
   │
   ├─ Check constellation registry
   │
   ├─ FOR EACH peer IN constellation:
   │   │
   │   ├─ IF event.kind IN sync_event_kinds:
   │   │   │
   │   │   ├─ Send EVENT to peer relay
   │   │   │
   │   │   └─ Log sync status (success/fail)
   │   │
   │   └─ ELSE: Skip (not in sync list)
   │
   └─ Update sync metrics
```

### 3. Bidirectional Sync

Each relay maintains bidirectional connections:

**Push (Outgoing):**
```bash
# Local event published
→ Push to all peers in constellation
→ Verify delivery (WebSocket ACK)
→ Retry on failure (exponential backoff)
```

**Pull (Incoming):**
```bash
# Periodic sync check (every 15 minutes)
→ Query each peer: "Give me events since <last_sync_timestamp>"
→ Filter by sync_event_kinds
→ Store missing events locally
→ Update sync timestamp
```

### 4. Geographic Hierarchical Sync

UPlanet uses **geographic coordination** to optimize sync:

```
REGION (1.0° x 1.0°) - ~10,000 km²
├── SECTOR (0.1° x 0.1°) - ~100 km²
│   ├── UMAP (0.01° x 0.01°) - ~1.2 km²
│   │   ├── Local Relay (Satellite)
│   │   └── Events tagged with ["g", "lat,lon"]
│   └── Sector Relay
└── Regional Hub
```

**Optimization:** Events tagged with geographic data are prioritized for sync to relays in the same SECTOR/REGION.

## Configuration

### Constellation Registry File

Location: `~/.zen/tmp/${IPFSNODEID}/constellation.json`

```jsonc
{
  "version": "1.0",
  "constellation_id": "UPlanetV1",
  "updated_at": "2025-11-03T12:00:00Z",
  "peers": [
    {
      "relay_url": "wss://relay.copylaradio.com",
      "role": "hub",
      "trusted": true,
      "sync_enabled": true,
      "last_sync": "2025-11-03T11:55:00Z"
    }
  ],
  "sync_config": {
    "event_kinds": [0, 1, 3, 5, 6, 7, 8, 21, 22, 30008, 30009, 30023, 30024, 30312, 30313, 30500, 30501, 30502, 30503, 30800],
    "sync_interval": 900,
    "retry_attempts": 3,
    "retry_backoff": "exponential"
  }
}
```

### Sync Script Integration

**`UPLANET.refresh.sh`** (daily cron job):
```bash
# Sync constellation events
${MY_PATH}/CONSTELLATION.sync.sh

# Sync UMAP data
${MY_PATH}/NOSTR.UMAP.refresh.sh

# Sync Oracle data
${MY_PATH}/ORACLE.refresh.sh

# Economic flows
${MY_PATH}/ZEN.ECONOMY.sh
```

## Use Cases

### 1. User Publishes a Video

```
1. Alice uploads video to satellite1 (UMAP 43.60,1.44)
2. satellite1 publishes NIP-71 video event (kind 21 or 22)
3. N² sync triggers:
   ├─ Hub receives event (immediate)
   ├─ 23 other satellites receive event (15-min cycle)
   └─ Event stored on 25 relays (100% redundancy)
4. Bob (on satellite15) can discover Alice's video
```

### 2. DID Document Update

```
1. Carol updates her DID (kind 30800)
2. Local relay stores update
3. N² sync propagates to all 24 peers
4. Carol's DID available on all constellation relays
5. Any service can resolve her identity from any relay
```

### 3. Permit Attestation (Multi-Relay Consensus)

```
1. Dave requests PERMIT_ORE_V1 (kind 30501)
2. Event synced to all constellation relays
3. 5 attesters (on different satellites) attest (kind 30502)
4. Attestations synced back to all relays
5. Oracle issues credential (kind 30503)
6. Credential available on all 25 relays
```

### 4. Geographic Content Discovery

```
1. User searches for content in UMAP 48.85,2.35 (Paris)
2. Query local relay: kind 1 WHERE ["g", "48.85,2.35"]
3. Local relay queries constellation peers in same SECTOR
4. Results aggregated from multiple sources
5. Geographic feed displays local + constellation content
```

## Performance Characteristics

### Latency
- **Hub sync:** ~1-2 seconds (immediate push)
- **Satellite sync:** ~15 minutes (periodic pull)
- **Geographic priority:** ~5 minutes (same SECTOR)

### Bandwidth
- **Per relay:** ~10-50 MB/day (18 event kinds)
- **Hub (25 relays):** ~250-1250 MB/day
- **Optimized:** Only syncs new events (incremental)

### Storage
- **Constellation redundancy:** 25x storage per event
- **Benefit:** Zero data loss even if 24 relays fail
- **Trade-off:** Higher disk usage vs resilience

## Security Considerations

### Peer Verification
- Each peer verified by **G1 public key**
- Constellation membership requires:
  - Valid `UPLANETNAME_G1` transaction (primo-transaction)
  - IPFS node ID registration
  - Trusted by Hub operator

### Event Verification
- All events cryptographically signed (Schnorr)
- Signature verified before sync
- Invalid events rejected

### Sybil Attack Prevention
- Constellation membership limited (Hub + 24 Satellites)
- Each satellite requires economic stake (machine capital)
- Ğ1 blockchain provides identity verification

### Censorship Resistance
- 25 independent relay operators
- Event replication across all nodes
- No single point of control

## Compatibility

This extension is compatible with:
- ✅ [NIP-01](01.md) - Basic protocol flow
- ✅ [NIP-11](11.md) - Relay information document
- ✅ [NIP-42](42.md) - Authentication
- ✅ [NIP-101](101.md) - UPlanet Identity & Geographic Coordination

Standard Nostr clients can use constellation relays as normal relays (no special protocol required).

## Reference Implementation

- **Sync Script:** `Astroport.ONE/RUNTIME/CONSTELLATION.sync.sh`
- **Constellation Registry:** `~/.zen/tmp/${IPFSNODEID}/constellation.json`
- **Hub Management:** `Astroport.ONE/RUNTIME/UPLANET.refresh.sh`
- **Repository:** [github.com/papiche/Astroport.ONE](https://github.com/papiche/Astroport.ONE)

## Future Enhancements

### Phase 1: Basic Sync (Current)
- ✅ 18 event kinds synchronized
- ✅ Hub-and-satellite topology
- ✅ Periodic pull-based sync

### Phase 2: Real-Time Sync
- ⏳ WebSocket-based push (instant propagation)
- ⏳ Geographic proximity routing
- ⏳ Adaptive sync intervals based on activity

### Phase 3: Mesh Network
- ⏳ Full mesh topology (N² connections)
- ⏳ Gossip protocol for event propagation
- ⏳ Dynamic peer discovery via DHT

## License

This specification is released under **AGPL-3.0**.

## Authors

- **papiche** - [github.com/papiche](https://github.com/papiche)
- **CopyLaRadio SCIC** - Cooperative implementation
- **Astroport.ONE community** - Constellation architecture

