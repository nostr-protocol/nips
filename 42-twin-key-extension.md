NIP-42 Twin-Key Extension
==========================

Geographic Identity Authentication for UPlanet
----------------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-42](42.md) that enables **Twin-Key authentication** for UPlanet's geographic identity system (see [NIP-101](101.md)).

## Overview

This extension adds support for:

1. **Multi-key authentication** - Users authenticate with both personal and UMAP keypairs
2. **Geographic context** - Authentication events include location metadata
3. **DID resolution** - Relays resolve DID Documents to verify user identity
4. **Constellation sync** - Geographic authentication events are synchronized across UPlanet constellation

## Motivation

Standard NIP-42 authentication:
- ❌ Only supports single keypair authentication
- ❌ Has no geographic context
- ❌ Cannot validate UPlanet-specific identity claims

This extension solves these problems by:
- ✅ Enabling authentication with both user and UMAP keypairs
- ✅ Linking authentication to geographic cells (UMAP, SECTOR, REGION)
- ✅ Supporting DID-based identity verification
- ✅ Enabling location-based access control

## Implementation

### Authentication Flow

#### Standard NIP-42 (for reference)

```
1. Client connects to relay
2. Relay sends: ["AUTH", "<challenge>"]
3. Client signs event and sends: ["AUTH", <signed_event>]
4. Relay validates and responds: ["OK", <event_id>, true, ""]
```

#### Twin-Key Extension

```
1. Client connects to relay
2. Relay sends: ["AUTH", "<challenge>"]
3. Client signs TWO events:
   a. Personal auth: signed by user's keypair
   b. UMAP auth: signed by UMAP's keypair (Twin-Key)
4. Client sends: ["AUTH", <personal_event>]
5. Client sends: ["AUTH", <umap_event>]
6. Relay validates BOTH and links identities
7. Relay responds: ["OK", <event_id>, true, "authenticated:twin-key"]
```

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
    ["application", "UPlanet"]
  ],
  "content": "",
  "sig": "<signature>"
}
```

### UMAP Authentication Event (kind 22242)

Secondary authentication with geographic keypair:

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

### Relay Validation

Relays implementing this extension MUST:

1. **Validate personal auth** (standard NIP-42)
   - Verify signature
   - Check timestamp (< 10 minutes old)
   - Validate challenge matches

2. **Validate UMAP auth** (if provided)
   - Verify signature with UMAP pubkey
   - Check `p` tag references user's pubkey
   - Verify geographic coordinates match UMAP derivation
   - Optionally resolve DID Document to validate identity claims

3. **Link identities**
   - Store association: `user_hex ↔ UMAP_hex`
   - Enable location-based queries
   - Track user's current geographic context

4. **Respond with enhanced status**
   ```json
   ["OK", "<event_id>", true, "authenticated:twin-key", {
     "user": "<user_hex>",
     "umap": "<UMAP_hex>",
     "location": "43.60,1.44",
     "grid_level": "UMAP"
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
4. Relay grants enhanced permissions based on credentials
```

Example enhanced authentication response:

```json
["OK", "<event_id>", true, "authenticated:twin-key", {
  "user": "<user_hex>",
  "did": "did:nostr:<user_hex>",
  "umap": "<UMAP_hex>",
  "credentials": ["PERMIT_ORE_V1"],
  "services": ["IPFSDrive", "Ğ1Wallet"]
}]
```

## Use Cases

### 1. Geographic Content Access

Alice wants to post to her UMAP feed:

```
1. Alice authenticates with personal key
2. Alice authenticates with UMAP key (Twin-Key)
3. Relay links Alice ↔ UMAP_43.60_1.44
4. Alice publishes event with ["p", "UMAP_hex"]
5. Bob (subscribed to UMAP) sees Alice's post
```

### 2. Location-Based Permissions

Carol is an ORE verifier and needs to validate a specific UMAP:

```
1. Carol authenticates with personal key
2. Carol authenticates with TARGET_UMAP key (Twin-Key)
3. Relay resolves Carol's DID → finds PERMIT_ORE_V1
4. Relay grants Carol write access to ORE events in this UMAP
5. Carol publishes kind 30313 (ORE verification)
```

### 3. Multi-Location Authentication

Dave travels between two UMAPs:

```
1. Dave authenticates at UMAP_A (Paris)
2. Dave posts content → tagged with UMAP_A
3. Dave moves to UMAP_B (Toulouse)
4. Dave authenticates at UMAP_B
5. Dave posts content → tagged with UMAP_B
6. Both feeds remain separate and geographically organized
```

### 4. Constellation Synchronization

UPlanet relay constellation synchronizes authentication events:

```
1. User authenticates on relay.copylaradio.com
2. Authentication event (kind 22242) is published
3. Constellation members sync this event
4. User is now authenticated on all constellation relays
5. Seamless roaming between UPlanet nodes
```

## Client Behavior

### Authenticating with Twin-Key

Clients SHOULD:

1. Generate or load user's personal keypair
2. Derive UMAP keypair from current geographic coordinates
3. Sign both authentication events
4. Send both to relay sequentially
5. Store UMAP keypair in memory (ephemeral, location-specific)

Example JavaScript implementation:

```javascript
async function authenticateWithTwinKey(relay, userKeys, latitude, longitude) {
  const challenge = await relay.getChallenge()
  
  // Personal authentication
  const personalAuth = await userKeys.signEvent({
    kind: 22242,
    tags: [
      ["relay", relay.url],
      ["challenge", challenge],
      ["did", `did:nostr:${userKeys.publicKey}`],
      ["umap", `${latitude.toFixed(2)},${longitude.toFixed(2)}`],
      ["application", "UPlanet"]
    ],
    content: ""
  })
  
  // UMAP authentication (Twin-Key)
  const umapKeys = deriveUmapKeypair(latitude, longitude)
  const umapAuth = await umapKeys.signEvent({
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
  })
  
  // Send both
  await relay.send(["AUTH", personalAuth])
  await relay.send(["AUTH", umapAuth])
}
```

### Caching Authentication

Clients SHOULD cache authentication state:
- Store `user_hex ↔ UMAP_hex` mapping in localStorage
- Check if current location matches cached UMAP
- Re-authenticate only when location changes significantly (> 0.01°)

## Privacy Considerations

- **Location disclosure:** UMAP authentication reveals user's approximate location (1.2 km² grid)
- **Mitigation:** Users can authenticate at broader grid levels (SECTOR: 100 km², REGION: 10,000 km²)
- **Ephemeral keys:** UMAP keypairs should be ephemeral and derived on-demand
- **DID privacy:** DID Documents may contain sensitive information (use selective disclosure)

## Security Considerations

- **Key derivation:** UMAP keys must be deterministically derived from coordinates + namespace
- **Replay attacks:** Authentication events have short TTL (< 10 minutes)
- **Sybil attacks:** Ğ1 Web of Trust integration prevents fake geographic identities
- **Signature verification:** Both user and UMAP signatures must be validated independently

## Compatibility

This extension is compatible with:
- ✅ [NIP-42](42.md) - Authentication to relays
- ✅ [NIP-01](01.md) - Basic protocol flow
- ✅ [NIP-101](101.md) - UPlanet Identity & Twin-Key system

Standard NIP-42 relays can accept the personal authentication and ignore UMAP authentication.

## Reference Implementation

- **Backend:** `UPassport/54321.py` (FastAPI with NIP-42 validation)
- **Frontend:** `UPlanet/earth/common.js` (JavaScript Twin-Key derivation)
- **Relay:** `NIP-101/relay.writePolicy.plugin/` (strfry plugin for validation)
- **Repository:** [github.com/papiche/NIP-101](https://github.com/papiche/NIP-101)

## License

This specification is released under **AGPL-3.0**.

## Authors

- **papiche** - [github.com/papiche](https://github.com/papiche)
- **CopyLaRadio SCIC** - Cooperative implementation
- **Astroport.ONE community** - UPlanet architecture

