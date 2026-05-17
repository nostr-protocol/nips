NIP-XX
======

Dual Encryption and ECDH Delegated Access
------------------------------------------

`draft` `optional`

This NIP defines a pattern for publishing Nostr events encrypted to two independent parties simultaneously, and a set of grant events that allow organizations to delegate decryption access to staff and service agents without exposing the organization's master private key.

## Motivation

Many applications require that a single piece of encrypted data be independently readable by two parties — the publisher (an organization) and a specific recipient (a client, patient, student, etc.) — without either party needing to request permission from the other.

Existing approaches (NIP-04, NIP-44) encrypt content to a single conversation pair. NIP-17 provides private messaging via gift wraps but does not address the case where *structured data* must be independently decryptable by both the publishing organization and a designated recipient.

This NIP solves three problems:

1. **Dual-party access**: Both publisher and recipient can independently decrypt the same event using their own private keys.
2. **Cold storage of master keys**: Organizations can keep their master keypair offline while authorized members operate with their own keypairs.
3. **Scoped delegation**: Service agents (automated systems) can receive narrowly scoped decryption grants without access to the master key.

## Concepts

- **Publisher**: The organization or entity that creates and signs events (e.g., a business, institution, or practice). Identified by its Nostr keypair.
- **Recipient**: The individual to whom the data pertains (e.g., a client, patient, or student). Identified by their own Nostr keypair.
- **Member**: A human operator authorized by the publisher to read and write data on behalf of the organization using their personal keypair.
- **Service Agent**: An automated system (server process, API) authorized by the publisher for a narrow scope of operations.
- **X₁ (Publisher Shared Secret)**: `getSharedSecret(publisherSk, publisherPk)` — the ECDH shared secret of the publisher with itself. Constant for all events by this publisher. Grants organization-wide decryption.
- **X₂ (Recipient Shared Secret)**: `getSharedSecret(publisherSk, recipientPk)` — the ECDH shared secret between publisher and a specific recipient. Unique per recipient.

## Dual Encryption

### Event Structure

A dual-encrypted event carries the same plaintext encrypted twice:

- `.content`: NIP-44 encrypted using **X₁** (the publisher's self-shared-secret). Any authorized member of the organization can decrypt this.
- `["recipient-content", "<ciphertext>"]` tag: NIP-44 encrypted using **X₂** (the publisher-recipient shared secret). Only the recipient can decrypt this using `getSharedSecret(recipientSk, publisherPk)`.

```json
{
  "kind": <application-defined>,
  "pubkey": "<publisher-or-member-pubkey>",
  "content": "<NIP-44 encrypted with X₁>",
  "tags": [
    ["p", "<publisher-pubkey>"],
    ["p", "<recipient-pubkey>"],
    ["recipient-content", "<NIP-44 encrypted with X₂>"],
    ["enc", "nip44-dual"],
    ["alt", "dual-encrypted event"]
  ]
}
```

### Encryption Procedure (Publisher)

Given plaintext `P`, publisher secret key `sk_pub`, publisher public key `pk_pub`, and recipient public key `pk_rec`:

1. Compute `X₁ = getSharedSecret(sk_pub, pk_pub)` (publisher self-ECDH)
2. Compute `X₂ = getSharedSecret(sk_pub, pk_rec)` (publisher-recipient ECDH)
3. Set `.content = nip44Encrypt(P, X₁)`
4. Set `["recipient-content", nip44Encrypt(P, X₂)]` tag

### Decryption

**By an authorized member of the publisher (has X₁):**
```
plaintext = nip44Decrypt(event.content, X₁)
```

**By the recipient (has their own sk):**
```
publisherPk = event.tags.find(t => t[0] === "p")[1]  // first "p" tag is the publisher
tag = event.tags.find(t => t[0] === "recipient-content")
X₂ = getSharedSecret(recipientSk, publisherPk)
plaintext = nip44Decrypt(tag[1], X₂)
```

Note: The recipient uses the **publisher's pubkey** from the `"p"` tag (not `event.pubkey`, which may be a member's key). Because NIP-44 ECDH is symmetric (`getSharedSecret(a, B) === getSharedSecret(b, A)`), the recipient derives the same X₂ that the publisher originally used for encryption.

### Why Self-ECDH for `.content`?

Using `getSharedSecret(sk, pk)` where `sk` and `pk` belong to the same keypair produces a deterministic shared secret. This means:

- All events by the same publisher use the same X₁, enabling organization-wide decryption with a single secret.
- X₁ can be distributed to authorized members via encrypted grants (see below), without sharing the publisher's private key.
- Members decrypt `.content` using the precomputed X₁ regardless of which member signed the event.

## ECDH Delegated Access Grants

When the publisher's master key is in cold storage, authorized members need precomputed shared secrets to read and write dual-encrypted events. This section defines four grant event kinds.

All grant payloads are NIP-44 encrypted using the ECDH shared secret between the publisher and the grant recipient: `getSharedSecret(publisherSk, memberPk)`.

### Kind 2100: Publisher Key Grant

Distributes X₁ (the publisher's self-shared-secret) to a member or service agent, granting them the ability to decrypt all `.content` fields across all recipients.

```json
{
  "kind": 2100,
  "pubkey": "<publisher-pubkey>",
  "content": "<NIP-44 encrypted payload>",
  "tags": [
    ["p", "<member-pubkey>"],
    ["grant", "publisher-secret"],
    ["alt", "publisher key grant"]
  ]
}
```

**Decrypted payload:**
```json
{
  "publisherSharedSecret": "<hex-encoded X₁>",
  "publisherPkHex": "<publisher public key>"
}
```

The member decrypts this using `getSharedSecret(memberSk, publisherPk)`, then uses the resulting X₁ to decrypt `.content` on any event published by or for this organization.

### Kind 2101: Recipient Key Grant

Distributes X₂ (a per-recipient shared secret) to a member, granting them the ability to decrypt the `recipient-content` tag for a specific recipient and to publish new dual-encrypted events for that recipient.

```json
{
  "kind": 2101,
  "pubkey": "<publisher-pubkey>",
  "content": "<NIP-44 encrypted payload>",
  "tags": [
    ["p", "<member-pubkey>"],
    ["d", "<recipient-identifier>"],
    ["grant", "recipient-secret"],
    ["alt", "recipient key grant"]
  ]
}
```

**Decrypted payload:**
```json
{
  "recipientId": "<application-level identifier>",
  "recipientPkHex": "<recipient public key>",
  "recipientSharedSecret": "<hex-encoded X₂>"
}
```

### Kind 2102: Member Roster

An encrypted list of all members, their roles, and permissions. Encrypted to X₁ (self-ECDH), so any authorized member with a Publisher Key Grant can read it.

```json
{
  "kind": 2102,
  "pubkey": "<publisher-pubkey>",
  "content": "<NIP-44 encrypted payload>",
  "tags": [
    ["alt", "encrypted member roster"]
  ]
}
```

**Decrypted payload:**
```json
{
  "members": [
    {
      "pkHex": "<member public key>",
      "name": "<display name>",
      "role": "<application-defined role>",
      "permissions": ["read", "write", "..."],
      "addedAt": <unix-timestamp>,
      "revokedAt": <unix-timestamp or null>
    }
  ]
}
```

Clients determine the latest roster by selecting the event with the highest `created_at` from the publisher. Revocation is indicated by setting `revokedAt` on a member entry and publishing a new roster event.

### Kind 2103: Service Agent Grant

Authorizes a service agent (an automated system with its own keypair) for a specific, narrow scope of operations. Unlike members who receive interactive access, service agents typically perform a single function (e.g., sending invoices, serving an API).

```json
{
  "kind": 2103,
  "pubkey": "<publisher-pubkey>",
  "content": "<NIP-44 encrypted payload>",
  "tags": [
    ["p", "<agent-pubkey>"],
    ["service", "<service-identifier>"],
    ["d", "service-agent-<service-identifier>"],
    ["alt", "service agent grant"]
  ]
}
```

**Decrypted payload:**
```json
{
  "agentPubkey": "<agent public key>",
  "service": "<service-identifier>",
  "permissions": ["<application-defined permission>"],
  "grantedAt": <unix-timestamp>
}
```

The `["service"]` tag allows clients to filter for specific service types. The `["d"]` tag is used as a stable identifier for the service — since kind 2103 is a regular event, clients select the latest by `created_at` for each service identifier.

A service agent that needs to decrypt data SHOULD also receive a Kind 2100 Publisher Key Grant and, if per-recipient access is needed, Kind 2101 Recipient Key Grants.

## Member Bootstrap Flow

When a member logs in with their personal keypair, they bootstrap their session as follows:

1. **Check if owner**: If `memberPk === publisherPk`, the member is the organization owner and derives all secrets directly from `sk`.
2. **Fetch roster**: Query for `{kinds: [2102], authors: [publisherPk]}`. Decrypt with X₁ (if already known) or skip to step 3.
3. **Fetch Publisher Key Grant**: Query for `{kinds: [2100], authors: [publisherPk], #p: [memberPk]}`. Decrypt using `getSharedSecret(memberSk, publisherPk)` to obtain X₁.
4. **Fetch Recipient Key Grants**: Query for `{kinds: [2101], authors: [publisherPk], #p: [memberPk]}`. Decrypt each to build a map of `recipientId → X₂`.
5. **Verify membership**: Decrypt the roster with X₁ and confirm the member's pubkey appears with `revokedAt === null`.

If any grant is missing or the member is revoked, the client MUST deny access.

## Writing Events as a Member

When a member publishes a dual-encrypted event on behalf of the organization:

1. Encrypt `.content` using X₁ (from their Publisher Key Grant)
2. Encrypt `["recipient-content"]` using the recipient's X₂ (from their Recipient Key Grant)
3. Sign the event with the **member's own keypair** (not the publisher's)
4. Add an `["authored-by", "<member-pubkey>", "<member-name>"]` tag for attribution

Clients receiving such events decrypt `.content` using X₁ regardless of which member signed it, because all members encrypt to the same X₁.

## Revocation

### Member Revocation
1. Publish a new Kind 2102 roster event with the member's `revokedAt` set.
2. The revoked member still possesses X₁ and any X₂ values they received. If the threat model requires immediate cryptographic revocation:
   a. Generate a new publisher keypair.
   b. Re-encrypt all existing events with the new X₁.
   c. Distribute new grants to remaining members.
   d. Update relay access controls.

### Service Agent Revocation
1. Publish a new Kind 2103 event for the same service with an empty permissions array or a `revokedAt` field in the payload.
2. Remove the agent's pubkey from relay whitelists.

## Security Considerations

- **X₁ is a permanent master decryption key.** Any entity possessing X₁ can decrypt all `.content` fields ever published by the organization. Distribute it only to trusted members and agents. Plan for periodic key rotation.
- **X₂ is per-recipient.** Compromise of a single X₂ exposes only that recipient's data.
- **Grant events are encrypted in transit** but the publisher must trust the relay to not serve grants to unauthorized parties. Using NIP-42 relay authentication is RECOMMENDED.
- **Append-only data model.** Nostr events are immutable. Revocation prevents future access but does not retroactively protect previously-decrypted data.
- **Self-ECDH determinism.** X₁ = `getSharedSecret(sk, pk)` is deterministic and never changes for a given keypair. This is a feature (enables organization-wide decryption) and a risk (no forward secrecy). Applications requiring forward secrecy should implement periodic key rotation.
- **Relay-level access control.** Dual encryption provides defense-in-depth. Even if relay access controls are bypassed, data remains encrypted. Both layers (NIP-42 authentication and NIP-44 encryption) SHOULD be active simultaneously.
- **Member attribution.** The `["authored-by"]` tag provides an audit trail of which member created each event, even though all members encrypt to the same X₁/X₂.

## Use Cases

This pattern is broadly applicable to any scenario where an organization publishes encrypted data that both the organization and a specific individual need independent access to:

- **Healthcare**: Electronic health records encrypted to both the provider and the patient.
- **Legal**: Documents encrypted to both the law firm and the client.
- **Financial**: Account records encrypted to both the institution and the account holder.
- **Education**: Student records encrypted to both the school and the student/guardian.
- **Enterprise**: Internal documents encrypted to both the company and specific employees.

## Event Kind Proposal Summary

| Kind   | Name                  | Description                                                  |
| ------ | --------------------- | ------------------------------------------------------------ |
| `2100` | Publisher Key Grant   | Distributes X₁ (organization-wide decryption secret) to a member or agent |
| `2101` | Recipient Key Grant   | Distributes X₂ (per-recipient decryption secret) to a member or agent |
| `2102` | Member Roster         | Encrypted list of members with roles, permissions, and revocation status |
| `2103` | Service Agent Grant   | Authorizes a service agent keypair for a specific scope of operations |

All four kinds are regular events (1000-9999 range). Implementations determine the "current" version of each by selecting the event with the highest `created_at` for a given publisher and (where applicable) `#p` filter. Regular events are used rather than replaceable or addressable events because they are universally supported across relay implementations and allow clients to retain historical grant records for audit purposes.

## Tags Introduced

| Tag                  | Value                       | Description                                                  |
| -------------------- | --------------------------- | ------------------------------------------------------------ |
| `recipient-content`  | NIP-44 ciphertext           | The recipient's independently-decryptable copy of the event content |
| `enc`                | `nip44-dual`                | Indicates dual NIP-44 encryption is used                     |
| `grant`              | `publisher-secret` / `recipient-secret` | Identifies the type of key material in a grant event |
| `service`            | service identifier string   | Identifies the service type for a service agent grant        |
| `authored-by`        | member pubkey, display name | Attribution tag for events written by delegated members      |

## Relationship to Other NIPs

- **NIP-44**: This NIP uses NIP-44 encryption primitives (ECDH + HKDF + ChaCha20-Poly1305) for all encryption operations. It does not define new cryptographic primitives.
- **NIP-17**: NIP-17 defines private direct messaging via gift wraps. This NIP is complementary — it addresses structured data encrypted to two parties, not conversational messaging.
- **NIP-42**: Relay authentication is recommended as a complementary access control layer alongside the encryption defined here.
- **NIP-59**: Gift wrap (kind 1059) can be used alongside this NIP for messaging between members and recipients. The dual encryption pattern is for *data records*, not ephemeral messages.

## Reference Implementation

A reference implementation is available at [github.com/johnsoc34/nostr-ehr](https://github.com/johnsoc34/nostr-ehr), which uses this pattern for encrypted healthcare records. The relevant source files are:

- `src/lib/dual-encryption.ts` — Dual encryption and decryption functions
- `src/lib/nip44.ts` — NIP-44 primitives
- `src/lib/nostr.ts` — ECDH shared secret derivation, grant event kinds, member bootstrap
