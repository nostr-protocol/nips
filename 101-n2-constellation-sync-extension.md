NIP-101 N² Constellation Synchronization Extension
===================================================

Astroport Relay Synchronization Protocol for UPlanet
-----------------------------------------------------

`draft` `extension` `optional`

This document describes the **N² (N-squared) constellation synchronization protocol** used by UPlanet/Astroport relays. The N² refers to the **social graph synchronization** (friends + friends-of-friends) that creates a **relativistic distribution** for each user.

## Overview

The N² protocol extends [NIP-101](101.md) with three complementary synchronization mechanisms:

1. **Swarm Sync** (`_12345.sh`) - Station metadata via IPFS/IPNS bootstrap network
2. **Social Graph Sync** (`backfill_constellation.sh`) - N1+N2 event synchronization via `amisOfAmis.txt`
3. **N² Memory System** (`todo.sh`) - Collective development memory via kind 31910 events

## The Conway's Angel Game Foundation

The N² architecture is mathematically grounded in **John Conway's Angel Problem** (2006 solution):

> **"An angel of force 2 can always escape the demon."**

### Mathematical Principle
- The Angel can move to any cell within 2 squares (king's moves)
- The Demon can block one cell per turn
- With force ≥ 2, the Angel **always** has an escape path

### Application to N² Protocol
| Concept | Angel Game | N² Constellation |
|---------|-----------|------------------|
| Force 1 | Direct neighbors only | N1 = Direct friends (kind 3 contacts) |
| Force 2 | Neighbors + their neighbors | N2 = Friends of friends (amisOfAmis.txt) |
| Demon | Blocking agent | Centralization, censorship, partition |
| Escape | Always possible | Decentralized coordination always works |

**Result:** A constellation with N² social graph can **never** be partitioned or censored, because there's always an alternative path through the extended network.

## The N² Social Graph Concept

### N1 = Direct Friends
For each registered MULTIPASS user, the relay fetches their **kind 3** (contacts) events:

```bash
# nostr_get_N1.sh
./strfry scan '{"kinds":[3],"authors":["$HEX"]}' | \
    jq -r '.tags[] | select(.[0]=="p") | .[1]'
```

### N2 = Friends of Friends
When N1 contacts are shared across the swarm via `amisOfAmis.txt`, each station can see:
- Its own users' friends (N1)
- Friends collected by OTHER stations (N2 = friends of friends)

### Relativistic Distribution
Each user sees content from their **extended social network**, not a global firehose:

```
User A on Station 1
├── A's friends (N1) → collected locally
├── Friends of A's friends (N2) → via amisOfAmis.txt from other stations
└── Result: Personalized, relevant content stream
```

## Motivation

Standard Nostr relay networks:
- ❌ Show global content (information overload)
- ❌ Require manual relay configuration per client
- ❌ Have no automatic backup mechanism
- ❌ Lack geographic coordination

The N² constellation protocol solves these problems by:
- ✅ **Relativistic sync** - Each user sees their extended social network
- ✅ Automatic peer discovery and synchronization
- ✅ Geographic hierarchical coordination (UMAP/SECTOR/REGION)
- ✅ Resilient data replication across nodes

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

### Swarm IPFS Synchronization (`_12345.sh`)

Station metadata is synchronized via IPFS/IPNS:
- Each station publishes its state to `/ipns/${IPFSNODEID}`
- Bootstrap nodes are scanned for swarm updates
- `amisOfAmis.txt` files are collected from all stations

### Social Graph Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Station 1                    Station 2                      │
│  ┌─────────────────┐          ┌─────────────────┐           │
│  │ MULTIPASS Users │          │ MULTIPASS Users │           │
│  │  ├── User A     │          │  ├── User X     │           │
│  │  └── User B     │          │  └── User Y     │           │
│  └────────┬────────┘          └────────┬────────┘           │
│           │ nostr_get_N1.sh            │ nostr_get_N1.sh    │
│           ▼                            ▼                     │
│  ┌─────────────────┐          ┌─────────────────┐           │
│  │ amisOfAmis.txt  │◄────────►│ amisOfAmis.txt  │           │
│  │  (A's friends)  │  IPFS    │  (X's friends)  │           │
│  │  (B's friends)  │  Swarm   │  (Y's friends)  │           │
│  └────────┬────────┘  Sync    └────────┬────────┘           │
│           │                            │                     │
│           ▼                            ▼                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              backfill_constellation.sh                   ││
│  │  Syncs events from: local users + all amisOfAmis.txt    ││
│  │  Result: N1 (friends) + N2 (friends of friends)         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Synchronized Event Kinds

The N² protocol synchronizes **40 event types** across all constellation members:

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

### Economic Health (NIP-101 extension)
- **Kind 30850** - Station Economic Health Report (weekly)
- **Kind 30851** - Swarm Economic Aggregate (Hub only)

### Channel Events (NIP-28)
- **Kind 40** - Channel creation
- **Kind 41** - Channel metadata
- **Kind 42** - Channel messages
- **Kind 44** - Channel mute list

### File & Media (NIP-94/A0/32)
- **Kind 1063** - File metadata with provenance
- **Kind 1111** - Comments (NIP-22)
- **Kind 1222** - Voice messages
- **Kind 1244** - Voice message metadata
- **Kind 1985** - User tags (NIP-32)
- **Kind 1986** - TMDB enrichments

### Lists & Status (NIP-51/38)
- **Kind 30001** - Categorized lists
- **Kind 30005** - Playlists
- **Kind 10001** - Pin lists
- **Kind 30315** - User statuses

### Workflow & Analytics (NIP-101 extensions)
- **Kind 31900** - Cookie workflow definition
- **Kind 31901** - Cookie workflow instance
- **Kind 31902** - Cookie workflow completion
- **Kind 10000** - Decentralized analytics

### N² Memory System (NIP-101 extension)
- **Kind 31910** - N² Development Memory (AI recommendations, Captain TODOs, votes)

### Badge System (NIP-58)
- **Kind 8** - Badge awards
- **Kind 30008** - Profile badge selections
- **Kind 30009** - Badge definitions

**Total:** 44 event kinds automatically synchronized across the constellation.

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
- **Per relay:** ~10-50 MB/day (40 event kinds)
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

## N² Memory System (Kind 31910)

The N² Memory System enables **collective learning** across the constellation. AI-generated recommendations and human decisions are stored as NOSTR events, creating a shared development memory.

### Principle: "AI proposes, Human disposes"

```
┌─────────────────────────────────────────────────────────────────┐
│  Station 1 (Captain A)              Station 2 (Captain B)      │
│  ┌──────────────────┐               ┌──────────────────┐       │
│  │   todo.sh        │               │   todo.sh        │       │
│  │  ├── AI Analysis │               │  ├── AI Analysis │       │
│  │  └── Recommends  │               │  └── Recommends  │       │
│  └────────┬─────────┘               └────────┬─────────┘       │
│           │                                   │                 │
│           ▼                                   ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Kind 31910 Events (NOSTR)                  ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │ AI Rec #1   │  │ AI Rec #2   │  │ Captain TODO│         ││
│  │  │ status:prop │  │ status:acc  │  │ status:done │         ││
│  │  │ votes: 3    │  │ votes: 5    │  │ votes: 1    │         ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘         ││
│  └─────────────────────────────────────────────────────────────┘│
│           │                                   │                 │
│           ▼                                   ▼                 │
│  ┌──────────────────┐               ┌──────────────────┐       │
│  │ Captain A votes  │               │ Captain B accepts│       │
│  │ on Rec #1        │               │ Rec #2           │       │
│  └──────────────────┘               └──────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Event Structure (Kind 31910)

```jsonc
{
  "kind": 31910,
  "pubkey": "<uplanet.G1.nostr pubkey>",
  "created_at": 1736252425,
  "content": "{\"type\":\"n2_todo\",\"version\":\"2.1\",\"id\":\"ai_20260107143025_1_a3f2b1c7d4e8\",\"content\":\"Add kind 30851 sync to backfill_constellation.sh\",\"status\":\"proposed\",\"rec_type\":\"ai_recommendation\",\"priority\":\"high\",\"station\":\"12D3KooWABC...\",\"captain\":\"captain@uplanet.org\",\"votes\":0,\"created_at\":\"2026-01-07T14:30:25Z\"}",
  "tags": [
    ["d", "ai_20260107143025_1_a3f2b1c7d4e8"],
    ["t", "n2-todo"],
    ["t", "ai_recommendation"],
    ["status", "proposed"],
    ["priority", "high"],
    ["station", "12D3KooWABC..."],
    ["captain", "captain@uplanet.org"],
    ["created", "20260107"]
  ]
}
```

### Vote Event (with Reference Tag)

```jsonc
{
  "kind": 31910,
  "content": "{\"type\":\"n2_todo\",\"version\":\"2.1\",\"id\":\"vote_...\",\"rec_type\":\"vote\",\"reference_id\":\"ai_20260107143025_1_a3f2b1c7d4e8\"}",
  "tags": [
    ["d", "vote_ai_20260107143025_1_a3f2b1c7d4e8_12D3Koo_20260107"],
    ["t", "n2-todo"],
    ["t", "vote"],
    ["status", "vote"],
    ["e", "ai_20260107143025_1_a3f2b1c7d4e8", "", "reply"]  // NIP-10 compliant reference
  ]
}
```

### Status Lifecycle

```
proposed ──┬──► accepted ──► done
           │
           └──► rejected
```

### Key Setup

All stations must share the same key for constellation-wide memory:

```bash
# Generate from UPLANETNAME seed (same across all stations)
$HOME/.zen/Astroport.ONE/tools/keygen -t nostr "${UPLANETNAME}N2" "${UPLANETNAME}N2" \
    > ~/.zen/game/uplanet.G1.nostr
```

### Commands

| Command | Description |
|---------|-------------|
| `todo.sh` | Analyze Git changes, generate AI recommendations |
| `todo.sh --day` | Analyze last 24 hours |
| `todo.sh --week` | Analyze last 7 days |
| `todo.sh --last` | Analyze since last execution |
| `todo.sh --add "My idea"` | Add Captain TODO |
| `todo.sh --list` | List all N² Memory events |
| `todo.sh --accept ID` | Accept recommendation |
| `todo.sh --reject ID` | Reject recommendation |
| `todo.sh --vote ID` | Vote for recommendation (linked via ["e"] tag) |
| `todo.sh --done ID` | Mark as completed |

### Collective Decision Making

1. **AI generates recommendations** based on Git changes and N² context
2. **Each recommendation is a separate NOSTR event** (kind 31910)
3. **Captains across stations** can vote, accept, or reject
4. **Votes are aggregated** via NOSTR sync
5. **Most voted recommendations** guide development priorities

### Integration with Sync

The `backfill_constellation.sh` script synchronizes kind 31910 events, ensuring all stations share the same development memory.

## Future Integrations

### Radicle (Decentralized Code Forge)
- Replace GitHub/GitLab with sovereign code hosting
- Link Radicle COBs (issues/patches) to N² Memory events
- Decentralized CI/CD triggered by kind 31910 status changes

### NextGraph (Collaborative Documents)
- CRDTs for conflict-free document collaboration
- RDF/SPARQL semantic queries on N² data
- Local-first, privacy-preserving document sync

## Future Enhancements

### Phase 1: Basic Sync (Current)
- ✅ 44 event kinds synchronized
- ✅ Hub-and-satellite topology
- ✅ Periodic pull-based sync
- ✅ N² Memory System (kind 31910)

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

