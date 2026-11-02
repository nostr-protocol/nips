NIP-PQ
======

Post-Quantum Event Signatures
----------------------------

`draft` `optional`

This NIP extends the [NIP-01](./01.md) event signature format with ML-DSA-44, as specified in [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final). It defines post-quantum signatures, not encryption or key agreement. Support is optional and requires changes to both clients and relays.

## Motivation and scope

ML-DSA is designed to resist signature forgery by an adversary with a cryptographically relevant quantum computer. This proposal allows an event to be authenticated with an ML-DSA key instead of a secp256k1 Schnorr key. It does not retroactively protect existing Schnorr signatures, establish the real-world identity of a public key, or encrypt event content.

ML-DSA-44 is a standardized parameter set and has the smallest public keys and signatures among the FIPS 204 ML-DSA parameter sets. Choosing one parameter set keeps this proposal's algorithm selection unambiguous. This is not a claim that it is optimal for every application or that a particular implementation is independently audited.

## Event format

Events retain the NIP-01 fields, serialization, SHA-256 event ID calculation, and kind range of 0 through 65535. This proposal changes the permitted public-key and signature lengths:

| Signature scheme | `pubkey` bytes | `pubkey` hex characters | `sig` bytes | `sig` hex characters |
| --- | ---: | ---: | ---: | ---: |
| BIP-340 Schnorr (NIP-01) | 32 | 64 | 64 | 128 |
| ML-DSA-44 | 1312 | 2624 | 2420 | 4840 |

`id`, `pubkey`, and `sig` MUST be lowercase hexadecimal strings without prefixes or whitespace. `id` remains exactly 32 bytes (64 hex characters). The ML-DSA public key and signature MUST use the raw encodings defined by FIPS 204, without DER, PEM, or other wrappers.

Implementations MUST select the signature scheme using the exact public-key and signature length pair above. All other pairs MUST be rejected. A public key longer than 64 hex characters is not sufficient to identify ML-DSA-44. The signature scheme MUST NOT be inferred from `kind`. Existing event kinds retain their meanings: for example, a kind 1 event remains a text note whether signed with Schnorr or ML-DSA-44. No algorithm tag, new event kind, or kind-number offset is introduced. A failed verification MUST NOT fall back to another algorithm.

The public key and signature together occupy 7,464 hex characters for ML-DSA-44, compared with 192 for Schnorr. This adds 7,272 bytes to a JSON event with otherwise identical fields. Clients and relays need to account for this overhead in message limits, storage, and verification budgets.

## Signing

1. Set `pubkey` to the lowercase hexadecimal encoding of the ML-DSA-44 public key corresponding to the signing key.
2. Serialize `[0, pubkey, created_at, kind, tags, content]` using the NIP-01 serialization rules.
3. Compute SHA-256 over the UTF-8 serialization. Set `id` to its lowercase hexadecimal encoding.
4. Sign the **32 raw digest bytes** with ordinary FIPS 204 ML-DSA-44 and an **empty context string** (zero bytes).
5. Set `sig` to the lowercase hexadecimal encoding of the resulting 2420-byte signature.

The signed message is not the 64-character hexadecimal ID or the serialized JSON. Although the event is hashed to obtain its ID, this profile uses ordinary ML-DSA over that digest; it does not use the distinct HashML-DSA interface. The context is fixed by this profile, not chosen per application or event. Implementations SHOULD use randomized signing with a cryptographically secure random source.

## Verification

Before accepting an event, a supporting implementation MUST:

1. Validate the required fields and types under NIP-01, including integer timestamps and kinds, string content, and arrays of string tags. Reject malformed hexadecimal encodings and unsupported key/signature length pairs before invoking cryptography.
2. Reconstruct the NIP-01 serialization from the received event fields and compute its SHA-256 digest.
3. Check that the lowercase hexadecimal digest equals the received `id`. Reject any mismatch, even if a signature over the supplied `id` would verify.
4. For the Schnorr length pair, apply NIP-01/BIP-340 verification. For the ML-DSA-44 length pair, verify the signature over the recomputed 32-byte digest with the received public key and an empty context string.
5. Accept only if verification succeeds and the event also satisfies the applicable relay or application policy.

An implementation without ML-DSA-44 support MUST NOT accept these events as valid signed events. Verification authenticates the event against the given key; applications remain responsible for deciding whether that key is trusted or authorized.

## Compatibility

Ordinary NIP-01 implementations expect 32-byte public keys and cannot validate these events unchanged. Supporting relays need to preserve the full ML-DSA public key in storage and `authors` filters, and use it in replaceable-event and addressable-event identity comparisons. They MUST NOT truncate or hash the key into a 32-byte substitute. Event IDs and references using those IDs remain 32 bytes.

Within this extension, public-key references in `p` tags, the optional author field of `e` tags, and the public-key component of `a` tags use the full lowercase hexadecimal key. Supporting clients and relays must handle those longer values, including corresponding tag filters. Other NIPs that require a secp256k1 public key are not automatically extended by this proposal.

This NIP does not define ML-DSA encodings for [NIP-19](./19.md) `npub`, `nsec`, or public-key-bearing TLV entities. Existing key encodings MUST NOT be reused for ML-DSA keys without a separate specification. It also does not define migration or a binding between an existing Schnorr identity and a new ML-DSA identity. A binding authenticated only by Schnorr inherits that scheme's limitations.

## Encryption is separate

ML-DSA keys are signing keys and cannot replace the secp256k1 ECDH keys used by [NIP-44](./44.md). NIP-44 version 2 is not post-quantum secure; changing an event signature does not change its encryption or key agreement. This proposal also does not make [NIP-59](./59.md) wrapping post-quantum secure or modify either NIP's required signature scheme.

A post-quantum encryption extension would need its own specification for key establishment, authenticated key distribution, key derivation, authenticated encryption, and recovery. ML-KEM is a separate primitive with separate keys; its presence in an implementation is not, by itself, such a protocol.

## Implementation experience (informative)

[Stroma](https://github.com/trbouma/stroma) provides an experimental `stroma.pq.PQBackend` with ML-DSA-44 key generation, signing, and verification, and separate ML-KEM-768 operations. Its primitive API accepts explicit context bytes. To implement this NIP, an event adapter would pass the recomputed 32-byte event digest and `context=b""`.

At the reviewed [Stroma revision](https://github.com/trbouma/stroma/tree/2571bb978d16868539efe2d8f5573650946ad01c), its standard `Event` class still signs and verifies Schnorr events. The PQ primitive backend is therefore implementation experience, not a complete built-in implementation of this event extension. Its proposed signed/encrypted envelope uses a different transcript and context (`stroma-pq-v1`); those signatures and fixtures are not test vectors for this NIP.

[PQRelay](https://github.com/trbouma/pqrelay/tree/81abc22011a6bc3612afd365b2cd2d93b129e74a) supplies an experimental event adapter and relay integration using Stroma for cryptography and Monstr for relay storage and subscriptions. Its `PQEvent` adapter signs the raw 32-byte event digest with ML-DSA-44 and an empty context, enforces exact key/signature sizes and lowercase hexadecimal encoding, and recomputes the event ID before verification. Its query adapter validates both classical and ML-DSA events. The repository includes optional native tests for signing, tamper rejection, and local SQLite-backed relay publishing and retrieval. It does not implement post-quantum encryption.

This implementation is experimental, not a conformance claim. Its included relay test queries by event ID and does not establish coverage of long-key author/tag filters or replaceable/addressable-event behavior. Those compatibility cases still need verification.

Interoperability testing for this NIP should include complete event vectors with canonical serialization, event ID, public key, and signature. Negative cases should cover changes to every signed field, a valid signature over an incorrect supplied ID, malformed encodings, incorrect length pairs, nonempty contexts, and signing the hexadecimal ID instead of its raw bytes. Such event-level vectors remain to be supplied; the abbreviated example from the initial draft is not a verification vector.
