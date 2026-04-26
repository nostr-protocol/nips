NIP-XX
======

Agent Reputation Attestations
-----------------------------

`draft` `optional`

This NIP defines a standard for publishing cryptographically signed reputation attestations between Nostr identities, with specific application to autonomous agents and services.

## Motivation

As AI agents and automated services proliferate on Nostr, there is a need for:

1. **Contextual trust signals** - Knowing someone is "trustworthy" in one domain (e.g., translation) doesn't mean they're reliable in another (e.g., financial advice)
2. **Temporal decay** - Trust signals should degrade over time; a service that worked well a year ago may no longer be maintained
3. **Sybil resistance** - Attestations should carry information about their cost/commitment level
4. **Peer-to-peer evaluation** - Agents should be able to attest each other directly, without requiring centralized trust providers

## Event Format

Attestations use kind `30085` (addressable/replaceable):

```jsonc
{
  "kind": 30085,
  "pubkey": "<attestor's pubkey>",
  "created_at": <unix timestamp>,
  "tags": [
    ["d", "<subject_pubkey>:<context>"],    // Required: unique identifier
    ["p", "<subject_pubkey>"],              // Required: who is being attested
    ["t", "<context>"],                     // Required: domain/namespace
    ["expiration", "<unix timestamp>"],     // Required: when attestation expires
    ["commitment_class", "<class>"]         // Optional: signal strength
  ],
  "content": "<JSON payload>",
  "sig": "..."
}
```

### Content Payload

The `content` field MUST be a JSON object with these required fields:

```jsonc
{
  "subject": "<subject_pubkey>",    // Must match p tag
  "context": "<context>",           // Must match t tag
  "rating": <1-5>,                  // Integer rating
  "confidence": <0.0-1.0>,          // Float, attestor's confidence
  "evidence": [                     // Optional: supporting evidence
    {
      "type": "<evidence_type>",
      "description": "<text>",
      // Additional type-specific fields
    }
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | `<subject_pubkey>:<context>` - Makes the event replaceable per subject+context pair |
| `p` | Yes | Subject's pubkey (who is being attested) |
| `t` | Yes | Context namespace (e.g., `nip90.translation`, `reliability`, `infrastructure.relay`) |
| `expiration` | Yes | Unix timestamp when this attestation expires (MUST be set) |
| `commitment_class` | No | One of: `self_assertion`, `social_endorsement`, `computational_proof`, `time_lock`, `economic_settlement` |

## Validation Rules

Implementations MUST validate attestations against these 10 rules:

1. **Kind**: Event kind MUST be `30085`
2. **Content JSON**: Content MUST parse as valid JSON containing `subject`, `rating`, `context`, and `confidence` fields
3. **Subject match**: `content.subject` MUST equal the `p` tag value
4. **Context match**: `content.context` MUST equal the `t` tag value
5. **D-tag format**: `d` tag MUST equal `<p_tag>:<t_tag>`
6. **Expiration required**: Event MUST have an `expiration` tag with a valid future timestamp
7. **Not expired**: Current time MUST be before the expiration timestamp
8. **No self-attestation**: Attestor pubkey MUST NOT equal subject pubkey
9. **Rating range**: `rating` MUST be an integer between 1 and 5 (inclusive)
10. **Confidence range**: `confidence` MUST be a float between 0.0 and 1.0 (inclusive)

Invalid attestations SHOULD be rejected by clients and ignored in scoring.

## Commitment Classes

The optional `commitment_class` tag signals the cost/effort behind an attestation, enabling weighted scoring:

| Class | Description | Suggested Weight |
|-------|-------------|------------------|
| `self_assertion` | A claim without backing | 1.0× |
| `social_endorsement` | Staking social reputation | 1.05× |
| `computational_proof` | Proof of work, usage logs | 1.1× |
| `time_lock` | Time-locked commitment | 1.15× |
| `economic_settlement` | Payment proof (e.g., L402 preimage) | 1.25× |

This follows Zahavi/Grafen signaling theory: costly signals are more reliable.

## Context Namespaces

Contexts use dot-separated namespaces to enable domain-specific trust:

```
reliability                   # General reliability
nip90.translation            # NIP-90 translation DVM
nip90.content_discovery      # NIP-90 content discovery DVM
protocol.design              # Protocol/specification work
infrastructure.library       # Code libraries
infrastructure.relay         # Relay operation
l402.service                 # L402 paywalled services
```

No central registry is required. Clients aggregate by prefix for broader queries (e.g., `nip90.*`).

## Scoring

### Temporal Decay

Attestations SHOULD be weighted with temporal decay. A simple exponential decay:

```
weight = base_weight × 2^(-age/half_life)
```

Where:
- `age` = `now - created_at` (in seconds)
- `half_life` = decay rate (recommended: 7,776,000 seconds / 90 days)

Alternative decay functions (e.g., Gaussian) MAY be used for more aggressive recency weighting:

```
weight = base_weight × exp(-(age/half_life)² / 2)
```

### Tier 1 Score

A basic trust score aggregates valid attestations:

```
score = sum(rating × weight × commitment_weight) / sum(weight × commitment_weight)
```

### Diversity Metrics

Clients SHOULD consider attestor diversity:
- Number of unique attestors
- Social graph distance of attestors
- Context coverage

A single attestor creating many attestations provides less signal than diverse independent attestors.

## Evidence Types

The `evidence` array supports various proof types:

| Type | Fields | Description |
|------|--------|-------------|
| `usage` | `description`, `count` | Direct usage experience |
| `dvm_job` | `job_id`, `result` | NIP-90 job completion |
| `dependency` | `npm_package`, `version` | Software dependency |
| `lightning_preimage` | `payment_hash`, `preimage` | L402/Lightning payment proof |
| `timestamp_proof` | `ots`, `digest` | OpenTimestamps attestation |

Clients MAY verify evidence cryptographically where possible.

## Example

An agent attesting a translation DVM:

```jsonc
{
  "kind": 30085,
  "pubkey": "7bc3c83a0822d5b0f5e1c7a7b3c8e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0",
  "created_at": 1713340800,
  "tags": [
    ["d", "e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411:nip90.translation"],
    ["p", "e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411"],
    ["t", "nip90.translation"],
    ["expiration", "1721116800"],
    ["commitment_class", "social_endorsement"]
  ],
  "content": "{\"subject\":\"e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411\",\"context\":\"nip90.translation\",\"rating\":5,\"confidence\":0.9,\"evidence\":[{\"type\":\"dvm_job\",\"job_id\":\"abc123\",\"result\":\"success\",\"description\":\"Translated 50 notes accurately\"}]}",
  "sig": "..."
}
```

## Querying

To fetch attestations for a subject:

```jsonc
{
  "kinds": [30085],
  "authors": ["<attestor_pubkeys>"],  // Optional: filter by trusted attestors
  "#p": ["<subject_pubkey>"]
}
```

To fetch attestations in a specific context:

```jsonc
{
  "kinds": [30085],
  "#p": ["<subject_pubkey>"],
  "#t": ["nip90.translation"]
}
```

## Relation to Other NIPs

- **NIP-85 (Trusted Assertions)**: NIP-85 offloads WoT calculations to trusted service providers. This NIP enables direct peer-to-peer attestations that can be inputs to NIP-85 calculations.
- **NIP-32 (Labeling)**: Labels are generic metadata. Attestations are specifically for reputation with structured ratings and temporal properties.
- **NIP-56 (Reporting)**: Reports flag problematic content. Attestations are bidirectional (positive and negative) trust signals.
- **NIP-40 (Expiration)**: This NIP mandates expiration for all attestations.

## Implementation Notes

- Relays SHOULD honor expiration tags and garbage-collect expired events
- Clients SHOULD cache attestations locally to reduce relay load
- Clients SHOULD verify signatures before trusting attestations
- New identities with zero attestations are not inherently untrustworthy; they're simply unknown

## Interoperability with W3C Verifiable Credentials

Kind 30085 attestations can be mapped to W3C Verifiable Credentials for interoperability with non-Nostr trust systems (e.g., DID-based frameworks, enterprise VCs).

### Mapping

| Kind 30085 Field | W3C VC Field |
|-----------------|--------------|
| `pubkey` | `issuer` (`did:nostr:<pubkey>`) |
| `p` tag (subject) | `credentialSubject.id` (`did:nostr:<subject>`) |
| `content.rating` + `content.confidence` | `credentialSubject.reputation` |
| `content.context` | `credentialSubject.reputation.context` |
| `commitment_class` | `evidence[0].type` |
| `sig` | `proof.proofValue` (SchnorrSignature2024) |

### Commitment Class to Evidence Type

| Commitment Class | VC Evidence Type | Signal Strength |
|-----------------|-----------------|----------------|
| `self_assertion` | `SelfAssertion` | minimal |
| `social_endorsement` | `SocialSignal` | low |
| `computational_proof` | `ComputationalProof` | medium |
| `economic_settlement` | `PaymentReceipt` | high |

### Round-Trip Conversion

A Kind 30085 event can be converted to a W3C VC and back without information loss. The `did:nostr:<hex_pubkey>` scheme maps Nostr identities to the DID ecosystem. Implementations SHOULD preserve the original Nostr event ID in the VC's `evidence` array to enable cross-reference.

This enables trust exchange between Nostr-native agents and VC-based systems while preserving the commitment-cost signal that distinguishes this NIP from generic reputation schemes.

## Reference Implementations

- JavaScript (npm): [nostr-reputation](https://www.npmjs.com/package/nostr-reputation) — zero-dependency library with validation, scoring, and decay
- JavaScript (standalone): [nip-xx-kind30085](https://github.com/kai-familiar/nip-xx-kind30085)
- Interop demo: [interop-handshake.mjs](https://github.com/kai-familiar/nostr-reputation/blob/main/examples/interop-handshake.mjs) — Kind 30085 ↔ W3C VC round-trip
- Test vectors: [nip-xx-test-vectors.json](https://github.com/kai-familiar/nip-xx-kind30085/blob/main/test-vectors.json)

---

*This NIP emerged from 76 days of autonomous agent operation on Nostr, building practical reputation tooling.*
