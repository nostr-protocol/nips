NIP-42 Twin-Key Extension
==========================

Geographic Identity Authentication for UPlanet
----------------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-42](42.md) that enables **Twin-Key authentication** for UPlanet's geographic identity system (see [NIP-101](101.md)). This extension is built on **Shamir Secret Sharing (SSSS)** and **deterministic key generation** to enable secure, location-based authentication without storing private keys.

## Overview

This extension adds support for:

1. **SSSS-based authentication** - Users authenticate using 1/3 of their secret seed (NaCl) via QR code scanning
2. **Twin-Key mechanism** - Deterministic generation of multiple keypairs (Nostr, Ğ1, IPFS, Bitcoin, Monero) from a single seed
3. **Geographic key delegation** - Geographic keypairs (UMAP, SECTOR, REGION) derived from coordinates + namespace
4. **Key delegation contracts** - Delegation of authentication rights to UPlanet relay swarm network
5. **Smart contract integration** - Daily refresh scripts (`NOSTR.UMAP.refresh.sh`, `UPLANET.refresh.sh`) manage geographic key grids

## Motivation

Standard NIP-42 authentication:
- ❌ Requires full private key storage (security risk)
- ❌ No geographic context
- ❌ Cannot delegate authentication to relay networks
- ❌ Single keypair per identity

This extension solves these problems by:
- ✅ **SSSS secret sharing** - Only 1/3 of secret needed for terminal authentication
- ✅ **Deterministic key generation** - All keypairs derived from single seed (SALT + PEPPER)
- ✅ **Geographic key delegation** - Location-based keys for UMAP/SECTOR/REGION grids
- ✅ **Relay swarm delegation** - Authentication contracts with IPFS swarm network
- ✅ **Multi-blockchain support** - Same seed generates keys for multiple blockchains

## Core Concepts

### 1. DISCO Seed (NaCl Secret)

The foundation of UPlanet identity is a **DISCO seed** containing SALT and PEPPER:

```
DISCO = "/?${EMAIL}=${SALT}&nostr=${PEPPER}"
```

This seed is used as input to `keygen` tool for deterministic key generation across multiple blockchains.

### 2. Shamir Secret Sharing (SSSS)

The DISCO seed is split into **3 parts** using SSSS (2-of-3 threshold):

```
ssss-split -t 2 -n 3
```

**Distribution:**
- **HEAD** → Encrypted with user's G1PUB (player's key)
- **MIDDLE** → Encrypted with CAPTAING1PUB (captain's key)
- **TAIL** → Encrypted with UPLANETG1PUB (UPlanet's key)

**Security Model:**
- User needs **HEAD** (from QR code) + **TAIL** (from UPlanet network) to reconstruct DISCO
- Any 2 of 3 parts can restore the full secret
- No single party has full access to the secret

### 3. MULTIPASS QR Code

The QR code contains:

```
M-{SSSS_HEAD_B58}:{NOSTRNS}
```

Where:
- `SSSS_HEAD_B58` = Base58-encoded HEAD fragment
- `NOSTRNS` = IPNS key for user's storage vault

**Terminal Authentication Flow:**
1. User scans QR code → extracts `SSSS_HEAD` and `NOSTRNS`
2. Terminal requests `SSSS_TAIL` from UPlanet network (encrypted with UPLANETG1PUB)
3. Terminal combines `SSSS_HEAD` + `SSSS_TAIL` → reconstructs DISCO
4. Terminal extracts SALT + PEPPER from DISCO
5. Terminal regenerates NSEC using `keygen -t nostr "${SALT}" "${PEPPER}"`
6. User is authenticated without storing full private key

### 4. Twin-Key Deterministic Generation

From a single seed (SALT + PEPPER), `keygen` generates multiple keypairs deterministically:

| Key Type | Command | Use Case |
|----------|---------|----------|
| **Nostr** | `keygen -t nostr "${SALT}" "${PEPPER}"` | Identity & messaging |
| **Ğ1 (Duniter)** | `keygen -t duniter "${SALT}" "${PEPPER}"` | Economic transactions |
| **IPFS** | `keygen -t ipfs "${SALT}" "${PEPPER}"` | Storage & content |
| **Bitcoin** | `keygen -t bitcoin "${SALT}" "${PEPPER}"` | Interoperability |
| **Monero** | `keygen -t monero "${SALT}" "${PEPPER}"` | Privacy transactions |

**Key Properties:**
- Same seed → same keys (deterministic)
- Different seed → different keys (unique per user)
- No key storage needed (regenerate on-demand from seed)

### 5. Geographic Key Grids

For geographic cells (UMAP, SECTOR, REGION), keys are derived from coordinates:

**Seed Format:**
```
"{UPLANETNAME}_{FORMATTED_LATITUDE}" "{UPLANETNAME}_{FORMATTED_LONGITUDE}"
```

**Grid Levels:**

| Level | Precision | Area Size | Example Seed |
|-------|-----------|-----------|--------------|
| **UMAP** | 0.01° | ~1.2 km² | `"UPlanetV148.85" "UPlanetV1-2.34"` |
| **SECTOR** | 0.1° | ~100 km² | `"UPlanetV148.8" "UPlanetV1-2.3"` |
| **REGION** | 1.0° | ~10,000 km² | `"UPlanetV148" "UPlanetV1-2"` |

**Smart Contract Management:**
- `NOSTR.UMAP.refresh.sh` - Daily refresh of UMAP keys and DID documents
- `UPLANET.refresh.sh` - Daily refresh of SECTOR/REGION keys and economic flows
- Geographic keys are ephemeral and regenerated daily from coordinates

## Implementation

### Authentication Flow

#### Standard NIP-42 (for reference)

```
1. Client connects to relay
2. Relay sends: ["AUTH", "<challenge>"]
3. Client signs event and sends: ["AUTH", <signed_event>]
4. Relay validates and responds: ["OK", <event_id>, true, ""]
```

#### Twin-Key Extension with SSSS

```
1. User scans MULTIPASS QR code on terminal (scan_new.html)
2. Terminal extracts SSSS_HEAD from QR code
3. Terminal requests SSSS_TAIL from UPlanet network
4. Terminal combines HEAD + TAIL → reconstructs DISCO
5. Terminal extracts SALT + PEPPER from DISCO
6. Terminal regenerates NSEC: keygen -t nostr "${SALT}" "${PEPPER}"
7. Terminal signs authentication event with regenerated NSEC
8. Terminal sends: ["AUTH", <signed_event>]
9. Relay validates and responds: ["OK", <event_id>, true, "authenticated:ssss"]
```

### Key Delegation Contract

When authenticating, the user implicitly signs a **key delegation contract** with the UPlanet relay swarm:

```jsonc
{
  "type": "key_delegation",
  "user_hex": "<user_hex>",
  "delegated_to": "<relay_swarm_id>",
  "scope": "authentication",
  "validity": "<timestamp>",
  "signature": "<user_signature>"
}
```

**Contract Properties:**
- User delegates authentication rights to relay swarm
- Relay swarm can authenticate user on behalf of user
- Contract is signed with user's NSEC (regenerated from SSSS)
- Contract is stored in user's DID Document (kind 30800)

### Personal Authentication Event (kind 22242)

Standard NIP-42 event with UPlanet extensions:

```jsonc
{
  "id": "<event_id>",
  "pubkey": "<user_hex>",
  "kind": 22242,
  "created_at": <unix_timestamp>,
  "tags": [
    ["relay", "wss://relay.copylaradio.com"],
    ["challenge", "<relay_challenge>"],
    ["did", "did:nostr:<user_hex>"],
    ["umap", "43.60,1.44"],
    ["delegation", "<delegation_contract_id>"],
    ["application", "UPlanet"]
  ],
  "content": "",
  "sig": "<signature>"
}
```

### UMAP Authentication Event (kind 22242)

Secondary authentication with geographic keypair (derived from coordinates):

```jsonc
{
  "id": "<event_id>",
  "pubkey": "<UMAP_hex>",
  "kind": 22242,
  "created_at": <unix_timestamp>,
  "tags": [
    ["relay", "wss://relay.copylaradio.com"],
    ["challenge", "<relay_challenge>"],
    ["p", "<user_hex>"],
    ["g", "spey6"],
    ["latitude", "43.60"],
    ["longitude", "1.44"],
    ["grid_level", "UMAP"],
    ["application", "UPlanet"]
  ],
  "content": "",
  "sig": "<signature>"
}
```

**UMAP Key Derivation:**
```bash
# UMAP keypair derived from coordinates
UMAP_LAT="43.60"
UMAP_LON="1.44"
UMAP_SALT="${UPLANETNAME}_${UMAP_LAT}"
UMAP_PEPPER="${UPLANETNAME}_${UMAP_LON}"

# Generate UMAP keys
UMAP_NSEC=$(keygen -t nostr "${UMAP_SALT}" "${UMAP_PEPPER}" -s)
UMAP_HEX=$(keygen -t nostr "${UMAP_SALT}" "${UMAP_PEPPER}" | nostr2hex)
```

### Relay Validation

Relays implementing this extension MUST:

1. **Validate SSSS reconstruction** (if applicable)
   - Verify user provided valid SSSS_HEAD
   - Verify UPlanet network provided valid SSSS_TAIL
   - Verify reconstructed DISCO matches user's DID Document

2. **Validate personal auth** (standard NIP-42)
   - Verify signature
   - Check timestamp (< 10 minutes old)
   - Validate challenge matches

3. **Validate UMAP auth** (if provided)
   - Verify signature with UMAP pubkey (derived from coordinates)
   - Check `p` tag references user's pubkey
   - Verify geographic coordinates match UMAP derivation
   - Optionally resolve DID Document to validate identity claims

4. **Validate key delegation contract**
   - Verify delegation contract signature
   - Check contract validity period
   - Store delegation in relay's authentication cache

5. **Link identities**
   - Store association: `user_hex ↔ UMAP_hex`
   - Enable location-based queries
   - Track user's current geographic context

6. **Respond with enhanced status**
   ```json
   ["OK", "<event_id>", true, "authenticated:twin-key:ssss", {
     "user": "<user_hex>",
     "umap": "<UMAP_hex>",
     "location": "43.60,1.44",
     "grid_level": "UMAP",
     "delegation": "<delegation_contract_id>"
   }]
   ```

### DID Resolution for Authentication

Relays MAY resolve DID Documents to enhance authentication:

```
1. User authenticates with pubkey
2. Relay queries: kind 30800, pubkey == user_hex
3. Relay extracts from DID Document:
   - verificationMethod (check key matches)
   - service endpoints (IPFS drive, Ğ1 wallet)
   - verifiableCredentials (UPlanet permits)
   - keyDelegation (delegation contracts)
4. Relay grants enhanced permissions based on credentials
```

Example enhanced authentication response:

```json
["OK", "<event_id>", true, "authenticated:twin-key:ssss", {
  "user": "<user_hex>",
  "did": "did:nostr:<user_hex>",
  "umap": "<UMAP_hex>",
  "credentials": ["PERMIT_ORE_V1"],
  "services": ["IPFSDrive", "Ğ1Wallet"],
  "delegation": "<delegation_contract_id>"
}]
```

## Use Cases

### 1. Terminal Authentication (SSSS-based)

Alice wants to authenticate on an Astroport terminal:

```
1. Alice scans MULTIPASS QR code on terminal (scan_new.html)
2. Terminal extracts SSSS_HEAD from QR code
3. Terminal requests SSSS_TAIL from UPlanet network
4. Terminal combines HEAD + TAIL → reconstructs DISCO
5. Terminal extracts SALT + PEPPER
6. Terminal regenerates NSEC: keygen -t nostr "${SALT}" "${PEPPER}"
7. Terminal signs authentication event
8. Alice is authenticated without storing full private key
```

### 2. Geographic Content Access

Bob wants to post to his UMAP feed:

```
1. Bob authenticates with personal key (from SSSS)
2. Bob derives UMAP key from coordinates (43.60, 1.44)
3. Bob authenticates with UMAP key (Twin-Key)
4. Relay links Bob ↔ UMAP_43.60_1.44
5. Bob publishes event with ["p", "UMAP_hex"]
6. Carol (subscribed to UMAP) sees Bob's post
```

### 3. Location-Based Permissions

Dave is an ORE verifier and needs to validate a specific UMAP:

```
1. Dave authenticates with personal key (from SSSS)
2. Dave authenticates with TARGET_UMAP key (Twin-Key)
3. Relay resolves Dave's DID → finds PERMIT_ORE_V1
4. Relay grants Dave write access to ORE events in this UMAP
5. Dave publishes kind 30313 (ORE verification)
```

### 4. Relay Swarm Delegation

Eve delegates authentication to UPlanet relay swarm:

```
1. Eve authenticates using SSSS (HEAD + TAIL)
2. Eve signs key delegation contract
3. Contract stored in Eve's DID Document
4. Relay swarm can authenticate Eve on behalf of Eve
5. Eve can access services across all swarm relays
```

### 5. Multi-Location Authentication

Frank travels between two UMAPs:

```
1. Frank authenticates at UMAP_A (Paris) using SSSS
2. Frank derives UMAP_A key from coordinates
3. Frank posts content → tagged with UMAP_A
4. Frank moves to UMAP_B (Toulouse)
5. Frank authenticates at UMAP_B using same SSSS
6. Frank derives UMAP_B key from new coordinates
7. Frank posts content → tagged with UMAP_B
8. Both feeds remain separate and geographically organized
```

### 6. Constellation Synchronization

UPlanet relay constellation synchronizes authentication events:

```
1. User authenticates on relay.copylaradio.com using SSSS
2. Authentication event (kind 22242) is published
3. Constellation members sync this event
4. User is now authenticated on all constellation relays
5. Seamless roaming between UPlanet nodes
```

## Client Behavior

### Authenticating with SSSS + Twin-Key

Clients SHOULD:

1. **Scan MULTIPASS QR code**
   - Extract `SSSS_HEAD` and `NOSTRNS` from QR code
   - Format: `M-{SSSS_HEAD_B58}:{NOSTRNS}`

2. **Request SSSS_TAIL from UPlanet network**
   - Query UPlanet network for encrypted `SSSS_TAIL`
   - Decrypt using UPLANETG1PUB (public key)

3. **Reconstruct DISCO seed**
   - Combine `SSSS_HEAD` + `SSSS_TAIL` using `ssss-combine`
   - Extract SALT + PEPPER from DISCO

4. **Regenerate keypairs**
   - Nostr: `keygen -t nostr "${SALT}" "${PEPPER}"`
   - Ğ1: `keygen -t duniter "${SALT}" "${PEPPER}"`
   - IPFS: `keygen -t ipfs "${SALT}" "${PEPPER}"`

5. **Derive geographic keys** (if needed)
   - UMAP: `keygen -t nostr "${UPLANETNAME}_${LAT}" "${UPLANETNAME}_${LON}"`
   - SECTOR: `keygen -t nostr "${UPLANETNAME}_${LAT_ROUNDED}" "${UPLANETNAME}_${LON_ROUNDED}"`

6. **Sign authentication events**
   - Personal auth: signed with regenerated NSEC
   - UMAP auth: signed with derived UMAP key

7. **Send both to relay**
   - Send personal authentication event
   - Send UMAP authentication event (if applicable)

8. **Store delegation contract**
   - Sign key delegation contract
   - Store in DID Document (kind 30800)

Example JavaScript implementation:

```javascript
async function authenticateWithSSSS(qrCode, relay, latitude, longitude) {
  // 1. Decode QR code
  const decoded = base58Decode(qrCode.substring(2)); // Skip "M-"
  const [ssssHead, nostrns] = decoded.split(':');
  
  // 2. Request SSSS_TAIL from UPlanet network
  const ssssTailEncrypted = await fetchUPlanetSSSSTail(nostrns);
  const ssssTail = await decryptWithUPlanetKey(ssssTailEncrypted);
  
  // 3. Reconstruct DISCO
  const disco = await ssssCombine(ssssHead, ssssTail);
  const [salt, pepper] = extractSaltPepper(disco);
  
  // 4. Regenerate Nostr keypair
  const nsec = await keygen('nostr', salt, pepper, { secret: true });
  const userKeys = { privateKey: nsec, publicKey: getPublicKey(nsec) };
  
  // 5. Derive UMAP keypair
  const umapSalt = `${UPLANETNAME}_${latitude.toFixed(2)}`;
  const umapPepper = `${UPLANETNAME}_${longitude.toFixed(2)}`;
  const umapNsec = await keygen('nostr', umapSalt, umapPepper, { secret: true });
  const umapKeys = { privateKey: umapNsec, publicKey: getPublicKey(umapNsec) };
  
  // 6. Get challenge from relay
  const challenge = await relay.getChallenge();
  
  // 7. Sign personal authentication
  const personalAuth = await signEvent({
    kind: 22242,
    tags: [
      ["relay", relay.url],
      ["challenge", challenge],
      ["did", `did:nostr:${userKeys.publicKey}`],
      ["umap", `${latitude.toFixed(2)},${longitude.toFixed(2)}`],
      ["application", "UPlanet"]
    ],
    content: ""
  }, userKeys.privateKey);
  
  // 8. Sign UMAP authentication
  const umapAuth = await signEvent({
    kind: 22242,
    tags: [
      ["relay", relay.url],
      ["challenge", challenge],
      ["p", userKeys.publicKey],
      ["g", geohash(latitude, longitude)],
      ["latitude", latitude.toFixed(2)],
      ["longitude", longitude.toFixed(2)],
      ["grid_level", "UMAP"],
      ["application", "UPlanet"]
    ],
    content: ""
  }, umapKeys.privateKey);
  
  // 9. Send both
  await relay.send(["AUTH", personalAuth]);
  await relay.send(["AUTH", umapAuth]);
  
  // 10. Sign and store delegation contract
  const delegationContract = await signDelegationContract(userKeys.privateKey, relay.swarmId);
  await updateDIDDocument(userKeys.publicKey, { keyDelegation: delegationContract });
}
```

### Caching Authentication

Clients SHOULD cache authentication state:
- Store `user_hex ↔ UMAP_hex` mapping in localStorage
- Store `SSSS_HEAD` in secure storage (encrypted)
- Check if current location matches cached UMAP
- Re-authenticate only when location changes significantly (> 0.01°)
- **Never store full NSEC** - always regenerate from SSSS

## Privacy Considerations

- **Location disclosure:** UMAP authentication reveals user's approximate location (1.2 km² grid)
- **Mitigation:** Users can authenticate at broader grid levels (SECTOR: 100 km², REGION: 10,000 km²)
- **SSSS security:** Only 1/3 of secret needed for authentication (reduces attack surface)
- **Ephemeral keys:** UMAP keypairs should be ephemeral and derived on-demand
- **DID privacy:** DID Documents may contain sensitive information (use selective disclosure)
- **No key storage:** Keys are regenerated on-demand from SSSS (no persistent storage)

## Security Considerations

- **SSSS threshold:** 2-of-3 parts required (prevents single point of failure)
- **Key derivation:** All keys deterministically derived from seed (no randomness)
- **Replay attacks:** Authentication events have short TTL (< 10 minutes)
- **Sybil attacks:** Ğ1 Web of Trust integration prevents fake geographic identities
- **Signature verification:** Both user and UMAP signatures must be validated independently
- **Delegation contracts:** Must be signed and stored in DID Documents
- **Smart contract refresh:** Daily refresh scripts ensure geographic keys are up-to-date

## Smart Contract Integration

### Daily Refresh Scripts

**`NOSTR.UMAP.refresh.sh`** (daily cron):
- Refreshes UMAP keys from coordinates
- Updates UMAP DID documents (kind 30800)
- Synchronizes UMAP events across constellation
- Manages ORE contracts for UMAPs

**`UPLANET.refresh.sh`** (daily cron):
- Refreshes SECTOR/REGION keys from coordinates
- Updates economic flows (Ẑen distribution)
- Synchronizes constellation events
- Manages smart contracts for geographic grids

**Key Properties:**
- Geographic keys are ephemeral (regenerated daily)
- Smart contracts ensure key consistency across network
- Daily refresh prevents key staleness
- Constellation sync ensures network-wide consistency

## Compatibility

This extension is compatible with:
- ✅ [NIP-42](42.md) - Authentication to relays
- ✅ [NIP-01](01.md) - Basic protocol flow
- ✅ [NIP-101](101.md) - UPlanet Identity & Twin-Key system
- ✅ [NIP-49](49.md) - Private key encryption (SSSS alternative)

Standard NIP-42 relays can accept the personal authentication and ignore UMAP authentication.

## Reference Implementation

- **Backend:** `UPassport/54321.py` (FastAPI with NIP-42 validation)
- **Frontend:** `UPlanet/earth/common.js` (JavaScript Twin-Key derivation)
- **Terminal:** `UPassport/scan_new.html` (QR code scanner)
- **Script:** `UPassport/upassport.sh` (SSSS reconstruction)
- **Keygen:** `Astroport.ONE/tools/keygen` (Deterministic key generation)
- **MULTIPASS:** `Astroport.ONE/tools/make_NOSTRCARD.sh` (SSSS splitting)
- **Refresh:** `Astroport.ONE/RUNTIME/NOSTR.UMAP.refresh.sh` (Daily UMAP refresh)
- **Refresh:** `Astroport.ONE/RUNTIME/UPLANET.refresh.sh` (Daily constellation refresh)
- **Relay:** `NIP-101/relay.writePolicy.plugin/` (strfry plugin for validation)
- **Repository:** [github.com/papiche/NIP-101](https://github.com/papiche/NIP-101)

## License

This specification is released under **AGPL-3.0**.

## Authors

- **papiche** - [github.com/papiche](https://github.com/papiche)
- **CopyLaRadio SCIC** - Cooperative implementation
- **Astroport.ONE community** - UPlanet architecture
