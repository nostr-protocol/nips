NIP-XX
======

Distributed Directory Consensus using Replica Identity Keys and Web of Trust
---------------------------------------------------------------------------

`draft` `optional`

## Abstract

This NIP defines a protocol for distributed consensus among Nostr relays using replica identity keys and a web of trust mechanism to regulate replication of directory events. It enables relay operators to form trusted consortiums that automatically synchronize essential identity-related events (metadata, follow lists, relay lists, mute lists) while maintaining decentralization and Byzantine fault tolerance.

## Motivation

Current Nostr relay implementations operate independently, leading to fragmentation of user directory information across the network. Users must manually configure multiple relays to ensure their profile data and social graph information is widely available. This creates several problems:

1. **Data Availability**: Essential user directory events may not be available on all relays a user wants to interact with
2. **Synchronization Overhead**: Users must manually publish directory events to multiple relays
3. **Discovery Issues**: New users have difficulty finding existing users and their current relay preferences
4. **Trust Management**: No standardized way for relay operators to establish trusted relationships for data sharing

This NIP addresses these issues by enabling relay operators to form trusted consortiums that automatically replicate directory events among trusted peers, similar to the democratic Byzantine Fault Tolerant approach used in [pnyxdb](https://github.com/technicolor-research/pnyxdb).

## Specification

### Relay Identity Keys

Each participating relay MUST generate and maintain a long-term identity keypair separate from any user keys:

- **Identity Key**: A secp256k1 keypair used to identify the relay in the consortium. The public key MUST be listed in the `pubkey` field of the NIP-11 relay information document, and the relay MUST prove control of the corresponding private key through the signature mechanism described below.
- **Signing Keys**: Ephemeral keys used for signing attestations and directory events
- **Encryption Keys**: Keys used for ECDH encryption of sensitive consortium communications

The relay identity key serves as the authoritative identifier for the relay and MUST be discoverable through the standard NIP-11 relay information document available at `https://<relay-domain>/.well-known/nostr.json` or via the `NIP11` WebSocket message. This ensures that any client or relay can verify the identity of a consortium member by requesting their relay information document and comparing the public key.

### NIP-11 Extensions for Identity Verification

This protocol extends the NIP-11 relay information document with two additional fields to prove control of the advertised public key:

```json
{
  "name": "relay.example.com",
  "description": "A community relay",
  "pubkey": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
  "contact": "admin@example.com",
  "supported_nips": [1, 2, 9, 11, 12, 15, 16, 20, 22],
  "software": "https://github.com/example/relay",
  "version": "1.0.0",
  "nonce": "a1b2c3d4e5f6789012345678901234567890abcdef",
  "sig": "3045022100ab1234...def567890123456789012345678901234567890abcdef"
}
```

**New Fields:**
- `nonce`: A random hex-encoded value (recommended 20+ bytes) used to strengthen signature security
- `sig`: A secp256k1 signature proving control of the private key corresponding to `pubkey`

**Signature Generation:**
1. Concatenate the `pubkey` and `nonce` values as strings: `pubkey + nonce`
2. Compute SHA256 hash of the concatenated string
3. Sign the hash using the relay's private key (corresponding to `pubkey`)
4. Encode the signature as hex and store in the `sig` field

**Verification Process:**
1. Extract `pubkey`, `nonce`, and `sig` from the NIP-11 document
2. Concatenate `pubkey + nonce` as strings
3. Compute SHA256 hash of the concatenated string
4. Verify the signature using the public key and computed hash
5. If verification succeeds, the relay has proven control of the private key

This mechanism ensures that only the entity controlling the private key can generate a valid NIP-11 document, preventing relay impersonation attacks where an attacker might copy another relay's public key without controlling the corresponding private key.

### Event Kinds

This NIP defines the following new event kinds:

| Kind | Description |
|------|-------------|
| `39100` | Relay Identity Announcement |
| `39101` | Trust Attestation |
| `39102` | Group Tag Attestation |
| `39103` | Public Key Advertisement |
| `39104` | Directory Event Replication Request |
| `39105` | Directory Event Replication Response |

### Relay Identity Announcement (Kind 39100)

Relay operators publish this event to announce their participation in the distributed directory consortium. This event MUST be signed with the same private key used to sign the relay's NIP-11 information document:

```json
{
  "kind": 39100,
  "content": "{\"name\":\"relay.example.com\",\"description\":\"Community relay\",\"contact\":\"admin@example.com\"}",
  "tags": [
    ["d", "relay-identity"],
    ["relay", "wss://relay.example.com"],
    ["signing_key", "<hex-encoded-public-key>"],
    ["encryption_key", "<hex-encoded-public-key>"],
    ["version", "1"],
    ["nip11_url", "https://relay.example.com/.well-known/nostr.json"]
  ]
}
```

**Tags:**
- `d`: Identifier for the relay identity (always "relay-identity")
- `relay`: WebSocket URL of the relay
- `signing_key`: Public key for verifying attestations from this relay (MAY be the same as identity key)
- `encryption_key`: Public key for ECDH encryption
- `version`: Protocol version number
- `nip11_url`: URL to the relay's NIP-11 information document for identity verification

**Identity Verification Process:**
1. Other relays receive this announcement event
2. They extract the `pubkey` field (relay identity key) and `nip11_url` 
3. They fetch the NIP-11 document from the specified URL
4. They verify the NIP-11 signature using the extended verification process:
   - Extract `pubkey`, `nonce`, and `sig` from the NIP-11 document
   - Verify that the `pubkey` matches the announcement event's `pubkey`
   - Concatenate `pubkey + nonce` and compute SHA256 hash
   - Verify the signature proves control of the private key
5. They verify that the announcement event is signed by the same key
6. This confirms that the relay identity is cryptographically bound to the network address

### Trust Attestation (Kind 39101)

Relay operators create trust attestations toward other relays they wish to enter consensus with:

```json
{
  "kind": 39101,
  "content": "",
  "tags": [
    ["p", "<target-relay-pubkey>"],
    ["trust_level", "high|medium|low"],
    ["relay", "<target-relay-url>"],
    ["expiry", "<unix-timestamp>"],
    ["reason", "manual|automatic|inherited"]
  ]
}
```

**Tags:**
- `p`: Public key of the target relay being attested
- `trust_level`: Level of trust (high, medium, low)
- `relay`: WebSocket URL of the target relay
- `expiry`: Optional expiration timestamp for the attestation
- `reason`: How this trust relationship was established

**Trust Levels:**
- `high`: Full replication of all directory events
- `medium`: Selective replication based on additional criteria
- `low`: Minimal replication, primarily for discovery

### Group Tag Attestation (Kind 39102)

Relays can attest to arbitrary string values used as tags to create logical groups:

```json
{
  "kind": 39102,
  "content": "<optional-description>",
  "tags": [
    ["d", "<group-identifier>"],
    ["group_tag", "<tag-name>", "<tag-value>"],
    ["attestor", "<relay-pubkey>"],
    ["confidence", "0-100"]
  ]
}
```

**Tags:**
- `d`: Unique identifier for this group attestation
- `group_tag`: The tag name and value being attested
- `attestor`: Public key of the relay making the attestation
- `confidence`: Confidence level (0-100) in this attestation

### Public Key Advertisement (Kind 39103)

Relays advertise public keys that will be used in future operations:

```json
{
  "kind": 39103,
  "content": "",
  "tags": [
    ["d", "<key-identifier>"],
    ["pubkey", "<hex-encoded-public-key>"],
    ["purpose", "signing|encryption|identity"],
    ["valid_from", "<unix-timestamp>"],
    ["valid_until", "<unix-timestamp>"],
    ["algorithm", "secp256k1|x25519"]
  ]
}
```

**Tags:**
- `d`: Unique identifier for this key advertisement
- `pubkey`: The public key being advertised
- `purpose`: Intended use of the key
- `valid_from`: When this key becomes valid
- `valid_until`: When this key expires
- `algorithm`: Cryptographic algorithm used

### Directory Event Types

The following existing event kinds are considered "directory events" and subject to consortium replication:

- **Kind 0**: User Metadata
- **Kind 3**: Follow Lists  
- **Kind 5**: Event Deletion Requests
- **Kind 1984**: Reporting
- **Kind 10002**: Relay List Metadata
- **Kind 10000**: Mute Lists
- **Kind 10050**: DM Relay Lists

### Replication Protocol

#### 1. Consortium Formation

1. Relay operators publish Relay Identity Announcements (Kind 39100)
2. Operators create Trust Attestations (Kind 39101) toward relays they wish to collaborate with
3. When mutual trust attestations exist, relays begin sharing directory events
4. Trust relationships can be inherited through the web of trust with appropriate confidence scoring

#### 2. Directory Event Synchronization

When a relay receives a directory event from a user, it:

1. Validates the event signature and content
2. Stores the event locally
3. Identifies trusted consortium members based on current trust attestations
4. Replicates the event to trusted relays using Directory Event Replication Requests (Kind 39104)

#### 3. Conflict Resolution

When conflicting directory events are received (same pubkey, same kind, different content):

1. **Timestamp Priority**: Newer events replace older ones
2. **Signature Chain Validation**: Verify the complete signature chain
3. **Consensus Voting**: For disputed events, trusted relays vote on validity
4. **Byzantine Fault Tolerance**: System remains functional with up to 1/3 malicious nodes

#### 4. Trust Propagation

Trust relationships can be inherited through the web of trust:

1. If Relay A trusts Relay B with "high" trust
2. And Relay B trusts Relay C with "medium" trust  
3. Then Relay A may automatically trust Relay C with "low" trust
4. Trust inheritance follows configurable policies and confidence thresholds

### Message Flow

```
Relay A                    Relay B                    Relay C
   |                          |                          |
   |-- Trust Attestation ---->|                          |
   |<-- Trust Attestation ----|                          |
   |                          |-- Trust Attestation ---->|
   |                          |<-- Trust Attestation ----|
   |                          |                          |
   |-- Directory Event ------>|-- Directory Event ------>|
   |                          |                          |
   |<-- Replication Req ------|<-- Replication Req ------|
   |-- Replication Resp ----->|-- Replication Resp ----->|
```

### Security Considerations

1. **Identity Verification**: Relay identity keys MUST be verified through the extended NIP-11 relay information document. The relay MUST prove control of the private key through the `nonce` and `sig` fields, and the same keypair MUST be used to sign consortium events, creating a cryptographic binding between network address and relay identity.
2. **Trust Boundaries**: Operators should carefully configure trust levels and inheritance policies
3. **Rate Limiting**: Implement rate limiting to prevent spam and DoS attacks
4. **Signature Validation**: All events and attestations MUST be cryptographically verified
5. **Privacy**: Sensitive consortium communications SHOULD use ECDH encryption
6. **Address Binding**: The extended NIP-11 document serves as the authoritative source for relay identity verification. Relays MUST NOT accept consortium events from identities that cannot be verified through their NIP-11 document's signature mechanism. The `nonce` field SHOULD be regenerated periodically to maintain security.
7. **Key Rotation**: If a relay rotates its identity key, it MUST update both its NIP-11 document and republish its Relay Identity Announcement to maintain consortium membership.

### Implementation Guidelines

#### Relay Operators

1. Generate and securely store relay identity keys
2. Configure trust policies and attestation criteria
3. Implement Byzantine fault tolerance mechanisms
4. Monitor consortium health and trust relationships
5. Provide configuration options for users to opt-out of replication

#### Client Developers

1. Clients MAY display consortium membership information
2. Clients SHOULD respect user preferences for directory event replication
3. Clients MAY use consortium information for relay discovery
4. Clients SHOULD validate directory events from multiple sources

### Backwards Compatibility

This NIP is fully backwards compatible with existing Nostr implementations:

- Relays not implementing this NIP continue to operate normally
- Directory events maintain their standard format and semantics
- Users can opt-out of consortium replication
- Existing event kinds and message types are unchanged

## Rationale

This design draws inspiration from the democratic Byzantine Fault Tolerant approach used in [pnyxdb](https://github.com/technicolor-research/pnyxdb), adapting it for the decentralized nature of Nostr. Key design decisions:

1. **Separate Identity Keys**: Relay identity keys are separate from user keys to maintain clear boundaries
2. **Graduated Trust Levels**: Multiple trust levels allow for flexible consortium policies
3. **Automatic Synchronization**: Reduces user burden while maintaining decentralization
4. **Byzantine Fault Tolerance**: Ensures system reliability even with malicious participants
5. **Optional Participation**: Maintains Nostr's principle of optional protocol extensions

## Reference Implementation

A reference implementation will be provided showing:

1. Relay identity key generation and management
2. Trust attestation creation and validation
3. Directory event replication logic
4. Byzantine fault tolerance mechanisms
5. Web of trust computation algorithms

## Test Vectors

[Test vectors will be provided in a future revision]

## Changelog

- 2025-01-XX: Initial draft

## Copyright

This document is placed in the public domain.
