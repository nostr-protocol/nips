NIP-42 WoTx2 Permits Extension
================================

P2P Web of Trust eXtended — Decentralized Competence Certification
-------------------------------------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-42](42.md) that enables **peer-validated permit management** for the UPlanet WoTx2 (Web of Trust eXtended on Nostr) system. This extension implements a fully P2P Web of Trust model for decentralized competence certification — no Oracle or central server required.

## Overview

This extension adds support for:

1. **Permit Definition Events (kind 30500)** - Skill/permit created by a user via `POST /api/permit/define`, signed by the user (NIP-07)
2. **Learning Request Events (kind 30501)** - Self-declaration by an apprentice
3. **Formal Endorsement Events (kind 30502)** - Rule B endorsement published by a peer of level X1+
4. **Self-Signed Certificate Events (kind 30503)** - Auto-signed by apprentice when Rule A threshold is reached
5. **Kind 7 WoTx2 Reactions** - Rule A: Like/Dislike reactions used for peer validation
6. **Authentication with Permit Credentials** - NIP-42 auth enhanced with permit verification

### WoTx2 Rules

- **Rule A**: 3 Kind 7 `+` reactions from distinct pubkeys → apprentice can self-sign Kind 30503 (level upgrade)
- **Rule B**: 1 Kind 30502 from a peer of level X1+ → direct level upgrade

### NIP-42 Auth for Permit Definition

`POST /api/permit/define` requires NIP-42 authentication (TTL 300s), managed by `window.callAPIWithAuth()` (common.js).

## Motivation

Standard NIP-42 authentication:
- ❌ Only validates user identity (signature verification)
- ❌ Cannot verify competencies or authority levels
- ❌ Lacks peer-validation mechanisms

This extension solves these problems by:
- ✅ Adding competence-based authentication
- ✅ Enabling peer-validated permit certification (100% P2P)
- ✅ Integrating self-sovereign credentials into Nostr
- ✅ Supporting Web of Trust (WoT) attestation chains without central Oracle

## Implementation

### WoTx2 Event Kinds

| Kind  | Name | Description | Signed by |
|-------|------|-------------|-----------|
| 30500 | Permit Definition | Skill definition created via `POST /api/permit/define` | User (NIP-07) |
| 30501 | Learning Request | Apprentice self-declaration | Apprentice |
| 30502 | Formal Endorsement | Rule B direct endorsement | Peer of level X1+ |
| 30503 | Self-Signed Certificate | Auto-signed when Rule A threshold reached | Apprentice (self-signed) |
| 7 | WoTx2 Reaction | Rule A Like/Dislike peer review | Reviewer |

### 0. Kind 7 — WoTx2 Reaction (Rule A)

A peer review Like/Dislike used to validate an apprentice's competence. Three `+` reactions from distinct pubkeys enable the apprentice to self-sign a Kind 30503 certificate.

```jsonc
{
  "kind": 7,
  "pubkey": "<reviewer_hex>",
  "tags": [
    ["e", "<permitEventId>"],         // optional: reference to permit definition
    ["p", "<targetNpub>"],            // apprentice being reviewed
    ["t", "wotx-review"],
    ["t", "<normalizedSkill>"],       // e.g. "permis-conduire"
    ["k", "30500"]
  ],
  "content": "+"   // "+" = Like, "-" = Dislike
}
```

### 1. Permit Definition (kind 30500)

Defines a skill/permit type. Created by any user via `POST /api/permit/define` (requires NIP-42 auth, TTL 300s), signed by the user's own key (NIP-07). No central authority required.

```jsonc
{
  "kind": 30500,
  "pubkey": "<creator_hex>",
  "tags": [
    ["d", "PERMIT_ORE_V1"],
    ["t", "permit"],
    ["t", "definition"],
    ["t", "UPlanet"],
    ["min_attestations", "3"],        // Rule A threshold
    ["valid_duration_days", "1095"],  // 3 years
    ["revocable", "true"]
  ],
  "content": "{
    \"id\": \"PERMIT_ORE_V1\",
    \"name\": \"ORE Environmental Verifier\",
    \"description\": \"Authority to verify ORE environmental contracts\",
    \"min_attestations\": 3,
    \"valid_duration_days\": 1095,
    \"verification_method\": \"peer_attestation\"
  }"
}
```

**Common permit types:**
- `PERMIT_ORE_V1` - Environmental verifier (5 attestations, 3 years)
- `PERMIT_DRIVER` - Driver's license WoT model (12 attestations, 15 years)
- `PERMIT_WOT_DRAGON` - UPlanet authority (3 attestations, unlimited)
- `PERMIT_MEDICAL_FIRST_AID` - First aid provider (8 attestations, 2 years)
- `PERMIT_BUILDING_ARTISAN` - Building artisan (10 attestations, 5 years)

### 2. Permit Request (kind 30501)

User requests a permit by publishing their application.

```jsonc
{
  "kind": 30501,
  "pubkey": "<applicant_hex>",
  "tags": [
    ["d", "<request_id>"],
    ["l", "PERMIT_ORE_V1", "permit_type"],
    ["p", "<applicant_hex>"],
    ["t", "permit"],
    ["t", "request"],
    ["t", "UPlanet"]
  ],
  "content": "{
    \"request_id\": \"abc123...\",
    \"permit_definition_id\": \"PERMIT_ORE_V1\",
    \"applicant_did\": \"did:nostr:<applicant_hex>\",
    \"statement\": \"I have expertise in ecological validation\",
    \"evidence\": [\"ipfs://Qm...\"],
    \"status\": \"pending\"
  }"
}
```

### 3. Formal Endorsement (kind 30502) — Rule B

A peer of level X1+ endorses an apprentice directly (bypasses Rule A threshold). Published by the endorser's own key — no Oracle involved.

```jsonc
{
  "kind": 30502,
  "pubkey": "<attester_hex>",
  "tags": [
    ["d", "<attestation_id>"],
    ["e", "<request_event_id>"],
    ["p", "<applicant_hex>"],
    ["permit", "PERMIT_ORE_V1"],
    ["attester_license", "<credential_id>"],
    ["t", "permit"],
    ["t", "attestation"],
    ["t", "UPlanet"]
  ],
  "content": "{
    \"attestation_id\": \"att_xyz...\",
    \"request_id\": \"abc123...\",
    \"attester_did\": \"did:nostr:<attester_hex>\",
    \"statement\": \"I attest to this applicant's competence\",
    \"signature\": \"<schnorr_signature>\",
    \"date\": \"2025-11-03T12:00:00Z\"
  }"
}
```

**Endorsement requirements:**
- Endorser MUST be a peer of level X1+ for the relevant skill
- Each endorser can only endorse ONCE per request
- Endorsement is cryptographically signed (Schnorr signature)
- A single valid Kind 30502 from a qualified peer triggers immediate level upgrade (Rule B)

### 4. Self-Signed Certificate (kind 30503) — Rule A or Rule B outcome

Published **by the apprentice themselves** (self-signed) once either:
- Rule A: 3 Kind 7 `+` reactions from distinct pubkeys are received (`checkWoTx2LevelUpgrade()` in wotx2.js), or
- Rule B: 1 valid Kind 30502 from a qualified peer is received.

No Oracle or central authority issues this event.

```jsonc
{
  "kind": 30503,
  "pubkey": "<apprentice_hex>",
  "tags": [
    ["d", "<credential_id>"],
    ["l", "PERMIT_ORE_V1", "permit_type"],
    ["p", "<apprentice_hex>"],
    ["e", "<permit_definition_event_id>"],
    ["t", "permit"],
    ["t", "credential"],
    ["t", "wotx2"],
    ["t", "UPlanet"]
  ],
  "content": "{
    \"@context\": \"https://www.w3.org/2018/credentials/v1\",
    \"id\": \"urn:uuid:<credential_id>\",
    \"type\": [\"VerifiableCredential\", \"WoTx2Certificate\"],
    \"issuer\": \"did:nostr:<apprentice_hex>\",
    \"issuanceDate\": \"2025-11-03T12:00:00Z\",
    \"expirationDate\": \"2028-11-03T12:00:00Z\",
    \"credentialSubject\": {
      \"id\": \"did:nostr:<apprentice_hex>\",
      \"license\": \"PERMIT_ORE_V1\",
      \"licenseName\": \"ORE Environmental Verifier\",
      \"rule\": \"A\",
      \"reviewsCount\": 3
    }
  }"
}
```

### 5. Authentication with Permit Credentials

Enhanced NIP-42 authentication that includes permit verification.

```jsonc
{
  "kind": 22242,
  "pubkey": "<user_hex>",
  "tags": [
    ["relay", "wss://relay.copylaradio.com"],
    ["challenge", "<relay_challenge>"],
    ["did", "did:nostr:<user_hex>"],
    ["permit", "PERMIT_ORE_V1"],
    ["credential_id", "<credential_id>"],
    ["t", "UPlanet"]
  ],
  "content": "",
  "sig": "<signature>"
}
```

**Relay validation process:**
1. Verify standard NIP-42 authentication (signature + challenge)
2. If `permit` tag present, query kind 30503 events for this user
3. Verify credential is valid (not expired, not revoked)
4. Grant enhanced access based on permit level

## Use Cases

### 1. Driver's License (WoT Model — Rule A)

From the [CopyLaRadio article](https://www.copylaradio.com/blog/blog-1/post/reinventer-la-societe-avec-la-monnaie-libre-et-la-web-of-trust-148#):

1. **Alice declares** her learning intent `PERMIT_DRIVER` (kind 30501)
2. **3 certified drivers** send Kind 7 `+` reactions (`wotx-review`) (Rule A)
3. **Alice self-signs** her certificate (kind 30503) — no Oracle needed
4. **The 3 reviewers become** Alice's peer validators
5. **If Alice is dangerous**, peers can revoke the permit

### 2. ORE Environmental Verifier (Rule B)

1. **Bob declares** `PERMIT_ORE_V1` learning (kind 30501)
2. **One existing verifier of level X1+** publishes a Kind 30502 endorsement (Rule B)
3. **Bob self-signs** his credential (kind 30503) immediately
4. **Bob can now verify** ORE contracts for UMAPs

### 3. WoT Dragon (UPlanet Authority — Rule A)

1. **Carol declares** `PERMIT_WOT_DRAGON` learning (kind 30501)
2. **3 community members** send Kind 7 `+` reactions (Rule A)
3. **Carol self-signs** her WoT Dragon certificate (kind 30503)
4. **Carol gains** authority to issue Rule B endorsements (kind 30502) to others

## P2P Bootstrap — No "Block 0" Required

WoTx2 requires no bootstrap Oracle or server-side initialization. Any user can:

1. **Define a permit** (kind 30500) via `POST /api/permit/define`
2. **Declare themselves an apprentice** (kind 30501)
3. **Gather peer reactions** (Kind 7 `+`, Rule A) from 3 distinct pubkeys
4. **Self-sign their certificate** (kind 30503) once the threshold is reached

The trust chain is self-bootstrapping: the first certificate holders become Rule B endorsers for future apprentices.

## Level Upgrade Logic (Client-Side, P2P)

The `checkWoTx2LevelUpgrade()` function in `wotx2.js` evaluates locally:

```
Rule A:
  IF (count of distinct Kind 7 '+' reactions with tag 't':'wotx-review') >= 3:
    → Apprentice can publish Kind 30503 (self-signed certificate)

Rule B:
  IF (1 valid Kind 30502 from peer with level X1+):
    → Apprentice can publish Kind 30503 immediately
```

No server-side Oracle, no automatic issuance, no central authority. The apprentice actively signs their own certificate when eligible.

## Security Considerations

### Multi-Signature Validation
- Each permit requires **N attestations** from certified experts
- Attesters must hold the `required_license` permit (if specified)
- Creates **self-validating chain of trust**

### Attestation Requirements
- One attestation per attester per request
- Attestations are cryptographically signed
- Signature chain is verifiable on-chain

### Revocation
Permits can be revoked if:
- False attestations discovered
- Holder violates permit conditions
- Permit expires (validity period set)

### Sybil Attack Prevention
- Require attesters in Ğ1 Web of Trust (verified humans)
- Economic cost (Ẑen) for permit applications
- Multiple attestations from independent sources

## Integration with DID Documents

When a permit is issued, it's automatically added to the holder's DID document (kind 30800):

```jsonc
{
  "id": "did:nostr:<holder_hex>",
  "verifiableCredential": [
    {
      "@context": "https://www.w3.org/2018/credentials/v1",
      "type": ["VerifiableCredential", "UPlanetLicense"],
      "credentialSubject": {
        "license": "PERMIT_ORE_V1"
      }
    }
  ]
}
```

## Economic Incentives

Permit holders may receive cooperative rewards for verified competencies. These are not automatically triggered by kind 30503 issuance but can be attributed by the cooperative based on on-chain certificate evidence:
- **WoT Dragon**: 100 Ẑen from `UPLANETNAME_G1`
- **ORE Verifier**: 10 Ẑen + payment per verification from `UPLANETNAME_RND`
- **Mediator**: Compensation for conflict resolution from `UPLANETNAME_RND`

## API Integration

Relays can expose permit verification endpoints:

**GET `/api/permit/verify/<pubkey>/<permit_id>`**

Response:
```jsonc
{
  "valid": true,
  "permit_id": "PERMIT_ORE_V1",
  "holder_hex": "<pubkey>",
  "credential_id": "<credential_id>",
  "issued_at": "2025-11-03T12:00:00Z",
  "expires_at": "2028-11-03T12:00:00Z",
  "attestations": 5,
  "status": "active"
}
```

## Compatibility

This extension is compatible with:
- ✅ [NIP-42](42.md) - Authentication to relays
- ✅ [NIP-01](01.md) - Basic protocol flow
- ✅ [NIP-33](33.md) - Parameterized Replaceable Events
- ✅ [NIP-101](101.md) - UPlanet Identity & DID system
- ✅ W3C Verifiable Credentials Data Model

Standard NIP-42 relays can accept authentication and ignore permit tags.

## Reference Implementation

- **API endpoint:** `POST /api/permit/define` — NIP-42 auth (TTL 300s), user signs kind 30500 via NIP-07
- **P2P logic:** `UPlanet/earth/wotx2.js` — `normalizeSkillTag`, `publishWoTx2Reaction`, `fetchWoTx2Reactions`, `checkWoTx2LevelUpgrade`
- **Auth helper:** `UPlanet/earth/common.js` — `callAPIWithAuth()` for NIP-42 flow
- **UI:** `UPassport/templates/wotx2.html` — loads wotx2.js after common.js
- **Repository:** [github.com/papiche/UPassport](https://github.com/papiche/UPassport)

## Further Reading

- [ORACLE_SYSTEM.md](../Astroport.ONE/docs/ORACLE_SYSTEM.md) - Complete documentation
- [CopyLaRadio Article](https://www.copylaradio.com/blog/blog-1/post/reinventer-la-societe-avec-la-monnaie-libre-et-la-web-of-trust-148#) - WoT philosophy
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) - VC standard
- [NIP-101](101.md) - UPlanet Identity system

## License

This specification is released under **AGPL-3.0**.

## Authors

- **papiche** - [github.com/papiche](https://github.com/papiche)
- **CopyLaRadio SCIC** - Cooperative implementation

