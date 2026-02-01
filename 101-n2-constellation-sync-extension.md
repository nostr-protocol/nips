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
Each station generates and maintains its **own** `amisOfAmis.txt` file containing the friends (N1) of its local MULTIPASS users. These files are then **shared via IPFS** across the swarm, allowing each station to:
- See its own users' friends (N1) - from its own `amisOfAmis.txt`
- See friends collected by OTHER stations (N2 = friends of friends) - by reading other stations' `amisOfAmis.txt` files

**Important:** Each `amisOfAmis.txt` file is **unique to each station** and contains only the friends of that station's local users. The files are shared (read-only) but not merged - each station maintains its own version.

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
- Each station **generates its own** `amisOfAmis.txt` from its local users' N1 contacts
- Each station **shares its own** `amisOfAmis.txt` via IPFS (readable by other stations)
- Each station **reads other stations'** `amisOfAmis.txt` files to build N2 network
- **Each `amisOfAmis.txt` remains unique to its generating station** - files are shared but not merged

#### How Relay Discovery Works

**Step 1: Swarm Discovery via IPNS**
1. Each station runs `_12345.sh` which publishes its metadata to `/ipns/${IPFSNODEID}/12345.json`
2. The `12345.json` file contains:
   ```json
   {
     "ipfsnodeid": "QmXXX...",
     "myRELAY": "ws://127.0.0.1:7777" or "wss://relay.example.com",
     "captain": "captain@example.com",
     "services": {...}
   }
   ```
3. Bootstrap nodes (`A_boostrap_nodes.txt`) are scanned periodically
4. Each station downloads other stations' `12345.json` files from IPNS
5. These files are cached locally in `~/.zen/tmp/swarm/${IPFSNODEID}/12345.json`

**Step 2: amisOfAmis.txt Location**
- Each station stores its `amisOfAmis.txt` in `~/.zen/tmp/swarm/${IPFSNODEID}/amisOfAmis.txt`
- This file is also published via IPNS at `/ipns/${IPFSNODEID}/amisOfAmis.txt`
- Other stations read this file from IPNS and cache it locally in their swarm directory

**Step 3: Relay URL Extraction**
- `backfill_constellation.sh` scans `~/.zen/tmp/swarm/*/12345.json` files
- Extracts `myRELAY` URL from each file
- Determines if relay is:
  - **Routable**: `wss://relay.example.com` → Direct connection
  - **Localhost**: `ws://127.0.0.1:7777` → Requires P2P tunnel via `x_strfry.sh`

#### Synchronization Process (`backfill_constellation.sh`)

**Phase 1: Peer Discovery**
```bash
# 1. Scan swarm directory for 12345.json files
~/.zen/tmp/swarm/*/12345.json

# 2. Extract relay URLs and IPFSNODEIDs
# 3. Identify localhost vs routable relays
# 4. For localhost relays, check for x_strfry.sh tunnel script
```

**Phase 2: P2P Tunnel Creation (for localhost relays)**
```bash
# For each localhost relay:
# 1. Execute x_strfry.sh to create IPFS P2P tunnel
# 2. Tunnel maps: /x/strfry-${IPFSNODEID} → ws://127.0.0.1:7777
# 3. Connect to tunnel endpoint: ws://127.0.0.1:9999
```

**Phase 3: amisOfAmis.txt Collection**
```bash
# 1. Read local amisOfAmis.txt from own station
~/.zen/game/nostr/*/HEX  # Local users (N1)

# 2. Read other stations' amisOfAmis.txt from swarm cache
~/.zen/tmp/swarm/*/amisOfAmis.txt  # Friends of friends (N2)

# 3. Combine all HEX pubkeys (N1 + N2)
# 4. Remove duplicates
```

**Phase 4: Event Synchronization**

This phase consists of 4 detailed functions:

#### 4.1. Subscribe to Events from Last N Days (N1+N2 Pubkeys)

**Function:** `execute_backfill_websocket_batch()`

**Process:**
1. **Collect HEX Pubkeys:**
   - Local users (N1): `~/.zen/game/nostr/*/HEX`
   - Friends of friends (N2): `~/.zen/tmp/swarm/*/amisOfAmis.txt`
   - Combine and deduplicate all HEX pubkeys

2. **Batch Processing:**
   - Split HEX pubkeys into batches (default: 50-100 per batch)
   - Adaptive batch size based on total count:
     - < 50 HEX: Single batch
     - 50-200 HEX: Batches of 50
     - > 200 HEX: Batches of 100

3. **Create NOSTR REQ Message:**
   ```json
   ["REQ", "backfill", {
     "kinds": [...],  // 45 event kinds
     "since": <timestamp_N_days_ago>,
     "limit": 10000,
     "authors": ["hex1", "hex2", ..., "hexN"]  // Batch of HEX pubkeys
   }]
   ```

4. **WebSocket Connection:**
   - Connect to peer relay (direct or via P2P tunnel)
   - Send REQ message via `nostr_websocket_backfill.py`
   - Receive events as JSON array
   - Save response to temporary file: `~/.zen/strfry/backfill-response-${RANDOM}.json`

5. **Retry Logic:**
   - Up to 3 retry attempts per batch
   - Exponential backoff: 2s, 4s, 6s
   - Connection timeout: 30 seconds

**Output:** JSON file containing array of events from peer relay

---

#### 4.2. Request 45 Event Kinds

**Function:** `execute_backfill_websocket_batch()` (kinds array construction)

**Event Kinds Synchronized (45 total):**

**Core NOSTR (NIP-01):**
- `0` - Profile metadata
- `1` - Text notes
- `3` - Contact lists
- `5` - Event deletions
- `6` - Reposts
- `7` - Reactions (+ZEN, votes, likes)

**Media (NIP-22, NIP-71, NIP-94, NIP-A0):**
- `21` - Regular videos (NIP-71)
- `22` - Short videos &lt; 60s (NIP-71)
- `1063` - File metadata (IPFS, NIP-94)
- `1111` - Comments / threaded replies (NIP-22)
- `1222` - Voice messages root (NIP-A0)
- `1244` - Voice message replies (NIP-A0)

**Content (NIP-23, NIP-32, NIP-38, NIP-51, NIP-58):**
- `8` - Badge awards
- `30008` - Profile badge selections
- `30009` - Badge definitions
- `30023` - Long-form articles
- `30024` - Draft articles
- `1985` - User tags
- `1986` - TMDB enrichments
- `30001` - Categorized lists
- `30005` - Playlists
- `10001` - Playlists (alternate)
- `30315` - User statuses

**Channels (NIP-28):**
- `40` - Channel creation
- `41` - Channel metadata
- `42` - Channel messages
- `44` - Channel mute list

**UPlanet Identity & Systems (NIP-101):**
- `30800` - DID Documents
- `30500` - Permit Definitions (Oracle)
- `30501` - Permit Requests
- `30502` - Permit Attestations
- `30503` - Permit Credentials

**ORE Environmental (NIP-101):**
- `30312` - ORE Meeting Space
- `30313` - ORE Verification Meeting

**Economic Health (NIP-101 extension):**
- `30850` - Station Economic Health Report
- `30851` - Economic Health (alternate)

**Cookie Workflows (NIP-101 extension):**
- `31900` - Cookie workflow start
- `31901` - Cookie workflow progress
- `31902` - Cookie workflow completion

**N² Memory System (NIP-101 extension):**
- `31910` - AI recommendations, Captain TODOs, votes

**Calendar (NIP-52):**
- `31922` - Calendar events
- `31923` - Calendar metadata
- `31924` - Calendar reminders
- `31925` - Calendar timezones

**Analytics (NIP-10000):**
- `10000` - Decentralized analytics (encrypted/non-encrypted)

**Optional (configurable):**
- `4` - Direct messages (DMs) - Excluded by default, can be enabled with `--no-dms` flag

**Filter Construction:**
```bash
# Build kinds array based on configuration
if [[ "$INCLUDE_DMS" == "true" ]]; then
    kinds_array="[0, 1, 3, 4, 5, 6, 7, 8, 21, 22, ...]"  # Include DMs
else
    kinds_array="[0, 1, 3, 5, 6, 7, 8, 21, 22, ...]"  # Exclude DMs
fi
```

---

#### 4.3. Import Events to Local strfry Database

**Function:** `process_and_import_events()`

**Process:**

1. **Event Statistics:**
   - Parse response JSON file using `jq`
   - Count events by kind (profiles, text, videos, files, etc.)
   - Log detailed statistics for monitoring

2. **Filter Events:**
   - **Remove "Hello NOSTR visitor." messages:** Filter out automated visitor greetings
   - **Process deletion events (kind 5):** Extract deleted message IDs from tags
   - **Exclude deleted messages:** Prevent re-importing messages marked for deletion
   - Create filtered file: `${response_file}_filtered.json`

3. **Convert to NDJSON Format:**
   - Convert JSON array to NDJSON (one event per line)
   - Required format for strfry import
   - Save to: `${response_file}_import.ndjson`

4. **Import to strfry:**
   ```bash
   cd ~/.zen/strfry
   ./strfry import < import_file.ndjson
   # OR with --no-verify for faster import (trusted constellation)
   ./strfry import --no-verify < import_file.ndjson
   ```

5. **Verification Mode:**
   - **Default:** `--no-verify` (faster, trusted constellation sources)
   - **Optional:** Signature verification enabled with `--verify` flag
   - Verification validates Schnorr signatures for each event

6. **Database Update:**
   - Events stored in LMDB database: `~/.zen/strfry/strfry-db/data.mdb`
   - Automatic deduplication (strfry handles duplicate events)
   - Indexed by event ID, pubkey, kind, and tags

7. **Cleanup:**
   - Remove temporary files (filtered, import, deletions)
   - Keep only response file for debugging (if verbose)

**Performance:**
- Batch processing: Events imported in batches to avoid memory issues
- Deduplication: strfry automatically skips duplicate events
- Statistics: Detailed logging of imported events by kind

---

#### 4.4. Extract Profiles (Kind 0) for HEX Pubkeys

**Function:** Profile extraction after successful backfill

**Process:**

1. **Trigger:**
   - Only if backfill was successful (`success_count > 0`)
   - Only if `EXTRACT_PROFILES=true` (default, can be disabled with `--no-profiles`)

2. **Collect HEX Pubkeys:**
   - Use cached constellation HEX pubkeys (N1 + N2)
   - Create temporary file: `~/.zen/tmp/constellation_hex_$(date +%s).txt`

3. **Profile Extraction Script:**
   ```bash
   ~/.zen/Astroport.ONE/tools/nostr_hex_to_profile.sh \
       --file hex_file.txt \
       --format json \
       --no-relays
   ```

4. **Profile Lookup:**
   - Script queries local strfry database for kind 0 events
   - Matches HEX pubkeys to profile events
   - Extracts profile metadata (name, display_name, picture, nip05, etc.)

5. **Batch Profile Scan (Optimized):**
   ```bash
   # Single strfry scan for all HEX pubkeys (performance optimization)
   cd ~/.zen/strfry
   ./strfry scan '{
     "kinds": [0],
     "authors": ["hex1", "hex2", ..., "hexN"]
   }'
   ```
   - **Before optimization:** N separate scans (one per HEX)
   - **After optimization:** 1 single batch scan for all HEX
   - **Performance gain:** ~100x faster for large constellations

6. **Profile Storage:**
   - Profiles saved to: `~/.zen/tmp/coucou/_NIP101.profiles.json`
   - Format:
     ```json
     [
       {
         "hex": "60c1133d148ae0d2c4b42506fb4abacac903032680b178010c942bd538643f78",
         "profile": {
           "name": "Alice",
           "display_name": "Alice Cooper",
           "picture": "https://...",
           "nip05": "alice@uplanet.com"
         }
       }
     ]
     ```

7. **Statistics & Logging:**
   - Total profiles found
   - Profiles with names vs. HEX-only
   - Sample profiles displayed in logs
   - Missing profiles (HEX without kind 0 events)

8. **Use Cases:**
   - Display human-readable names in constellation dashboards
   - Profile completion tracking
   - Network visualization
   - User discovery

**Performance:**
- Batch scan optimization: Single query instead of N queries
- Cached HEX pubkeys: Reuse constellation cache
- Parallel processing: Can be run asynchronously after backfill

**Complete Workflow:**
```
┌─────────────────────────────────────────────────────────────┐
│  Station A (IPFSNODEID: QmAAA...)                          │
│                                                             │
│  1. _12345.sh publishes:                                   │
│     /ipns/QmAAA.../12345.json                              │
│     /ipns/QmAAA.../amisOfAmis.txt                          │
│                                                             │
│  2. Station B scans bootstrap nodes                        │
│     → Downloads /ipns/QmAAA.../12345.json                  │
│     → Caches: ~/.zen/tmp/swarm/QmAAA.../12345.json        │
│     → Downloads /ipns/QmAAA.../amisOfAmis.txt             │
│     → Caches: ~/.zen/tmp/swarm/QmAAA.../amisOfAmis.txt    │
│                                                             │
│  3. backfill_constellation.sh on Station B:                │
│     → Reads swarm/*/12345.json → Finds Station A's relay   │
│     → Reads swarm/*/amisOfAmis.txt → Gets Station A's N1   │
│     → Creates P2P tunnel if needed (x_strfry.sh)           │
│     → Connects to Station A's relay                       │
│     → Requests events for all N1+N2 pubkeys               │
│     → Imports events to local strfry database              │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**
- **No central registry**: Discovery is decentralized via IPNS bootstrap network
- **Each station maintains its own swarm cache**: `~/.zen/tmp/swarm/${IPFSNODEID}/`
- **amisOfAmis.txt files are read-only shared**: Each station keeps its own version
- **P2P tunnels enable localhost relay access**: IPFS P2P protocol creates secure tunnels
- **Synchronization is pull-based**: Each station actively pulls events from peers

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
│  │  Syncs events from:                                      ││
│  │    - Local users (N1 from own amisOfAmis.txt)            ││
│  │    - All other stations' amisOfAmis.txt (N2)              ││
│  │  Result: N1 (own friends) + N2 (friends from other      ││
│  │          stations' amisOfAmis.txt files)                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Synchronized Event Kinds

The N² protocol synchronizes **45 event kinds** across all constellation members. See [101-backfill-constellation-kinds-analysis.md](101-backfill-constellation-kinds-analysis.md) for a canonical list and minimal vs full set.

### Core Events (NIP-01)
- **Kind 0** - Profile metadata
- **Kind 1** - Text notes
- **Kind 3** - Contact lists
- **Kind 5** - Deletion requests
- **Kind 6** - Reposts
- **Kind 7** - Reactions

### Media Events (NIP-71, NIP-22, NIP-94, NIP-A0)
- **Kind 21** - Regular videos (NIP-71)
- **Kind 22** - Short videos &lt; 60s (NIP-71)

### Long-Form Content (NIP-23)
- **Kind 30023** - Long-form articles
- **Kind 30024** - Draft articles

### Files & Comments (NIP-94, NIP-22, NIP-A0, NIP-32)
- **Kind 1063** - File metadata (IPFS)
- **Kind 1111** - Comments (NIP-22)
- **Kind 1222** - Voice messages (root)
- **Kind 1244** - Voice message replies
- **Kind 1985** - User tags (NIP-32)
- **Kind 1986** - TMDB enrichments

### Identity & Credentials (NIP-101)
- **Kind 30800** - DID Documents (UPlanet Identity)
- **Kind 30500** - Permit Definitions (Oracle System)
- **Kind 30501** - Permit Requests
- **Kind 30502** - Permit Attestations
- **Kind 30503** - Permit Credentials

### ORE Environmental System (NIP-101 ORE extension)
- **Kind 30312** - ORE Meeting Space (Persistent Geographic Space)
- **Kind 30313** - ORE Verification Meeting

### Economic Health (NIP-101 extension)
- **Kind 30850** - Station Economic Health Report (daily)

### Channel Events (NIP-28)
- **Kind 40** - Channel creation
- **Kind 41** - Channel metadata
- **Kind 42** - Channel messages
- **Kind 44** - Channel mute list

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

### Crowdfunding (NIP-75 extension)
- **Kind 30904** - Crowdfunding campaign

### Badge System (NIP-58)
- **Kind 8** - Badge awards
- **Kind 30008** - Profile badge selections
- **Kind 30009** - Badge definitions

**Total:** 45 event kinds automatically synchronized across the constellation.

**Minimal set:** Some deployments may sync a smaller set (e.g. core + UPlanet identity + Oracle + ORE + economic). The JSON example `sync_event_kinds` in this doc reflects a minimal set; the full list is in [101-backfill-constellation-kinds-analysis.md](101-backfill-constellation-kinds-analysis.md).

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
  "sync_event_kinds": [0, 1, 3, 5, 6, 7, 8, 21, 22, 30008, 30009, 30023, 30024, 30312, 30313, 30500, 30501, 30502, 30503, 30800, 30850]
}
```
*(Minimal set; full 45-kind list: see [101-backfill-constellation-kinds-analysis.md](101-backfill-constellation-kinds-analysis.md).)*

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
    "event_kinds": [0, 1, 3, 5, 6, 7, 8, 21, 22, 30008, 30009, 30023, 30024, 30312, 30313, 30500, 30501, 30502, 30503, 30800, 30850],
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
  "content": "{\"type\":\"n2_todo\",\"version\":\"2.1\",\"id\":\"ai_20260107143025_1_a3f2b1c7d4e8\",\"content\":\"Add kind 30850 economic health to dashboard\",\"status\":\"proposed\",\"rec_type\":\"ai_recommendation\",\"priority\":\"high\",\"station\":\"12D3KooWABC...\",\"captain\":\"captain@uplanet.org\",\"votes\":0,\"created_at\":\"2026-01-07T14:30:25Z\"}",
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

### Key Setup (Ğ1 Central Bank)

The `uplanet.G1.nostr` is the **Ğ1 Central Bank** key, shared by:
- **Oracle System**: Signs credentials (kind 30503), NIP-42 auth
- **N² Memory System**: Signs development recommendations (kind 31910)

All stations must use the **same seed**: `${UPLANETNAME}.G1`

```bash
# Recommended: Use UPLANET.init.sh (handles this automatically)
./UPLANET.init.sh

# Manual creation (same seed on all stations):
$HOME/.zen/Astroport.ONE/tools/keygen -t nostr "${UPLANETNAME}.G1" "${UPLANETNAME}.G1" \
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
- ✅ 45 event kinds synchronized
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

