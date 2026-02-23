NIP-42 Oracle Permits Extension
=================================

Multi-Signature Permit Management via Web of Trust
---------------------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-42](42.md) that enables **multi-signature permit management** for the UPlanet Oracle System. This extension implements the Web of Trust (WoT) model for decentralized competence certification.

## Overview

This extension adds support for:

1. **Permit Definition Events (kind 30500)** - License types requiring N attestations
2. **Permit Request Events (kind 30501)** - Applications from users
3. **Permit Attestation Events (kind 30502)** - Expert signatures (multi-sig validation)
4. **Permit Credential Events (kind 30503)** - W3C Verifiable Credentials
5. **Authentication with Permit Credentials** - NIP-42 auth enhanced with permit verification

## Motivation

Standard NIP-42 authentication:
- ❌ Only validates user identity (signature verification)
- ❌ Cannot verify competencies or authority levels
- ❌ Lacks multi-signature validation mechanisms

This extension solves these problems by:
- ✅ Adding competence-based authentication
- ✅ Enabling multi-signature permit validation
- ✅ Integrating W3C Verifiable Credentials into Nostr
- ✅ Supporting Web of Trust (WoT) attestation chains

## Implementation

### Permit System Event Kinds

| Kind  | Name | Description | Signed by |
|-------|------|-------------|-----------|
| 30500 | Permit Definition | License type definition | `UPLANETNAME.G1` (authority) |
| 30501 | Permit Request | Application from user | Applicant |
| 30502 | Permit Attestation | Expert signature | Attester (must have required permit) |
| 30503 | Permit Credential | W3C Verifiable Credential | `UPLANETNAME.G1` (authority) |

### 1. Permit Definition (kind 30500)

Defines a license type that users can request and experts can attest.

```jsonc
{
  "kind": 30500,
  "pubkey": "<UPLANETNAME_G1_hex>",
  "tags": [
    ["d", "PERMIT_ORE_V1"],
    ["t", "permit"],
    ["t", "definition"],
    ["t", "UPlanet"],
    ["min_attestations", "5"],
    ["required_license", ""], // Empty if no requirement
    ["valid_duration_days", "1095"], // 3 years
    ["revocable", "true"]
  ],
  "content": "{
    \"id\": \"PERMIT_ORE_V1\",
    \"name\": \"ORE Environmental Verifier\",
    \"description\": \"Authority to verify ORE environmental contracts\",
    \"min_attestations\": 5,
    \"valid_duration_days\": 1095,
    \"reward_zen\": 10.0,
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

### 3. Permit Attestation (kind 30502)

Experts attest an applicant's competence (multi-signature validation).

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

**Attestation requirements:**
- Attester MUST hold the `required_license` permit (if specified)
- Each attester can only attest ONCE per request
- Attestation is cryptographically signed (Schnorr signature)

### 4. Permit Credential (kind 30503)

W3C Verifiable Credential issued after sufficient attestations.

```jsonc
{
  "kind": 30503,
  "pubkey": "<UPLANETNAME_G1_hex>",
  "tags": [
    ["d", "<credential_id>"],
    ["l", "PERMIT_ORE_V1", "permit_type"],
    ["p", "<holder_hex>"],
    ["t", "permit"],
    ["t", "credential"],
    ["t", "verifiable-credential"],
    ["t", "UPlanet"]
  ],
  "content": "{
    \"@context\": \"https://www.w3.org/2018/credentials/v1\",
    \"id\": \"urn:uuid:<credential_id>\",
    \"type\": [\"VerifiableCredential\", \"UPlanetLicense\"],
    \"issuer\": \"did:nostr:<UPLANETNAME_G1_hex>\",
    \"issuanceDate\": \"2025-11-03T12:00:00Z\",
    \"expirationDate\": \"2028-11-03T12:00:00Z\",
    \"credentialSubject\": {
      \"id\": \"did:nostr:<holder_hex>\",
      \"license\": \"PERMIT_ORE_V1\",
      \"licenseName\": \"ORE Environmental Verifier\",
      \"attestationsCount\": 5
    },
    \"proof\": {
      \"type\": \"Ed25519Signature2020\",
      \"created\": \"2025-11-03T12:00:00Z\",
      \"verificationMethod\": \"did:nostr:<UPLANETNAME_G1_hex>#uplanet-authority\",
      \"proofValue\": \"<base64_signature>\"
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

### 1. Driver's License (WoT Model)

From the [CopyLaRadio article](https://www.copylaradio.com/blog/blog-1/post/reinventer-la-societe-avec-la-monnaie-libre-et-la-web-of-trust-148#):

1. **Alice requests** `PERMIT_DRIVER` (kind 30501)
2. **12 certified drivers attest** Alice's competence (kind 30502)
3. **Oracle issues** W3C credential (kind 30503)
4. **The 12 attesters become** Alice's insurance mutual
5. **If Alice is dangerous**, attesters can revoke the permit

### 2. ORE Environmental Verifier

1. **Bob requests** `PERMIT_ORE_V1` (kind 30501)
2. **5 existing verifiers attest** Bob's competence (kind 30502)
3. **Oracle issues** W3C credential (kind 30503)
4. **Bob receives** 10 Ẑen reward from `UPLANETNAME_RND`
5. **Bob can now verify** ORE contracts for UMAPs

### 3. WoT Dragon (UPlanet Authority)

1. **Carol requests** `PERMIT_WOT_DRAGON` (kind 30501)
2. **3 community members attest** Carol's trustworthiness (kind 30502)
3. **Oracle issues** W3C credential (kind 30503)
4. **Carol receives** 100 Ẑen reward from `UPLANETNAME_G1`
5. **Carol gains** authority powers (infrastructure management, permit issuance, credential revocation)

## Web of Trust Bootstrap ("Block 0")

For NEW permits with no existing holders, the system uses **"Block 0" initialization**:

**Principle:** For a permit requiring **N signatures**, minimum **N+1 members registered** on the station.

Each member attests all other members (except themselves), giving exactly **N attestations** per member.

**Example:**
- `PERMIT_ORE_V1` (5 signatures) → minimum **6 registered members**
- Each member receives 5 attestations (from the other 5)
- Oracle issues credentials to all 6 members simultaneously
- The initial group can now attest new applicants

## Auto-Issuance Logic

The Oracle System automatically issues credentials when thresholds are met:

```
IF (attestations_count >= min_attestations) AND (all_attesters_valid):
    status = "validated"
    TRIGGER credential_issuance(request_id)
    UPDATE_DID(holder, credential)
    IF (permit_has_reward):
        TRANSFER_ZEN(UPLANETNAME_RND → holder, reward_amount)
```

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

Permit holders receive economic rewards:
- **WoT Dragon**: 100 Ẑen from `UPLANETNAME_G1`
- **ORE Verifier**: 10 Ẑen + payment per verification from `UPLANETNAME_RND`
- **Mediator**: Compensation for conflict resolution from `UPLANETNAME_RND`

Rewards flow:
```
UPLANETNAME_RND → Credential Holder
           ↓
  Automatic on issuance (kind 30503)
           ↓
  Blockchain transaction (Ğ1)
           ↓
  DID update (metadata.permit_rewards)
```

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

- **Backend:** `UPassport/oracle_system.py` (Python)
- **API:** `UPassport/54321.py` (FastAPI routes)
- **Frontend:** `UPassport/templates/oracle.html` (Web interface)
- **Scripts:** `Astroport.ONE/tools/oracle.WoT_PERMIT.init.sh` (Bootstrap "Block 0")
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

