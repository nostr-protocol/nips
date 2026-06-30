# NIP-XX: Bitcoin-OTC Identity Linkage Proof

## Status

Draft

## Author

Alwin/@TheButterZone

## License

MIT

---

## Abstract

This NIP defines a method for linking a Nostr public key (`npub`) to an external identity (bitcoin-otc nickname) via a self-attested cryptographic proof.

The proof consists of a signed assertion produced by the holder of an external cryptographic key (PGP or Bitcoin) binding that identity to a Nostr pubkey.

This enables offline-verifiable identity claims without external APIs, scraping, or trusted third-party verifiers.

---

## Motivation

Bitcoin-OTC is one of the earliest Web-of-Trust systems in the Bitcoin ecosystem, using PGP and Bitcoin-signed messages to associate persistent nicknames with reputation signals.

This identity space is not interoperable with Nostr.

This NIP enables:

* Linking external bitcoin-otc identifiers to Nostr pubkeys
* Preserving legacy identity associations as portable cryptographic claims
* Offline-verifiable identity binding
* Client-side interpretation without centralized attestation services

This NIP does not define bitcoin-otc as an authoritative registry.

---

## Specification

### Event Kind

This NIP defines a parameterized replaceable event:

```text
kind: 37773
```

Only the latest event per `(author pubkey, d tag)` is considered authoritative.

---

### Tags

#### Required tags

```json
["d", "ext:bitcoin-otc:<nick>"]
["proof-type", "pgp" | "btc"]
```

* `d`: External identity namespace and identifier being claimed
* `proof-type`: Cryptographic method used to produce the signature

---

#### Optional tags

```json
["uri", "https://bitcoin-otc.com/viewratings.php?nick=<nick>"]
["key", "<pgp-fingerprint OR bitcoin-address>"]
["ts", "<unix timestamp>"]
```

The `key` tag, if present, MUST match the public key used to verify the signature.

It is informational and MUST NOT be used for any external identity resolution or validation.

---

### Content

The `content` field MUST contain the exact message that was cryptographically signed.

#### Required format

```text
I, <external-identity>, assert control of Nostr pubkey:

<npub>

This is a self-attested statement associating external identity "<nick>" with this Nostr identity.
```

Implementations MAY include a nonce to ensure uniqueness.

---

## Verification

Clients verifying this event MUST perform the following steps:

### 1. Parse event

Extract:

* author pubkey
* `d` tag
* `proof-type`
* `content`

---

### 2. Obtain verification key

The verification key MUST be provided either via the `key` tag or supplied by the verifier.

No external system (including bitcoin-otc) MAY be used to derive or infer the verification key.

---

### 3. Verify signature

#### PGP

Verify that `content` is a valid clearsigned PGP message under the provided public key.

#### BTC

Verify the Bitcoin Signed Message using standard Bitcoin message verification against the provided address.

---

### 4. Validate binding

Clients MUST ensure:

* The event author pubkey MUST match the public key that verifies the cryptographic signature
* The external identity string MUST be identical across the `d` tag and the signed message content
* The cryptographic signature is valid
* Client UI MUST reflect only the result of cryptographic verification and MUST NOT imply identity, registry, or external authority validation

---

## 5. Result

If all verification steps succeed, the event is considered cryptographically valid with respect to the supplied verification key.

Clients MUST NOT infer or imply validation of any external identity, registry, or authority from successful verification.

Clients MAY present the result of signature verification to the user.

---

## Replaceability

* This is a parameterized replaceable event (PRE)
* Uniqueness key: `(pubkey, d)`
* Only the latest event per `d` is considered valid
* Clients MAY display older events but SHOULD mark them as superseded

---

## Security Considerations

### Replay resistance

Replay attacks are not meaningful, as signatures bind the statement to the signing key. Reposting does not alter validity.

---

### Key rotation

If a user changes:

* PGP key
* Bitcoin address
* Nostr key

they MUST publish a new event replacing the previous one.

---

### Trust model

This NIP introduces no trusted third parties.

Trust is derived solely from:

* possession of an external cryptographic key (PGP or Bitcoin)
* possession of a Nostr private key

This NIP defines identity claims only and does not define verification of external registries.

---

### External dependencies

This NIP does not require:

* bitcoin-otc API access
* HTML scraping
* CORS-enabled endpoints
* OpenTimestamps
* blockchain anchoring

All verification is performed locally by clients.

---

## Client behavior (optional)

Clients MAY:

* indicate that the cryptographic signature was successfully verified;
* display the claimed external identity;
* display the proof method (PGP or BTC);
* link to the external reference specified by the `uri` tag;
* allow filtering or searching by external identity.

Clients SHOULD distinguish between successful cryptographic verification and validation of an external identity.

Clients MUST NOT present the external identity as verified by an external registry unless another protocol layer provides that guarantee.

---

## Example event

```json
{
  "kind": 37773,
  "pubkey": "npub1xyz...",
  "tags": [
    ["d", "ext:bitcoin-otc:alice"],
    ["proof-type", "pgp"],
    ["uri", "https://bitcoin-otc.com/viewratings.php?nick=alice"],
    ["key", "FINGERPRINT123"]
  ],
  "content": "I, alice, assert control of Nostr pubkey npub1xyz... This is a self-attested statement associating external identity \"alice\" with this Nostr identity.",
  "sig": "..."
}
```

---

## Rationale

This design:

* avoids external dependencies
* avoids verifier services and centralized attestation systems
* enables offline verification of cryptographic claims
* separates identity claims from registry validation
* aligns with Nostr’s event-signed, client-interpreted model

---

## Changelog

### v0.2.1

* Separated protocol requirements from user interface recommendations

### v0.2

* Clarified trust model as self-attested cryptographic claim
* Removed any implication of bitcoin-otc as an authoritative registry
* Renamed terminology to “external identity” binding
* Strengthened separation of claim vs verification authority
* Refined client UI constraints to avoid semantic overreach
* Preserved parameterized replaceable event structure
* Retained PGP and Bitcoin message verification support

---

## References

* [https://github.com/nostr-protocol/nips](https://github.com/nostr-protocol/nips)
* NIP-01: Basic protocol flow
* NIP-18: Reposts
* NIP-33: Parameterized replaceable events
* Bitcoin Signed Message Format (Bitcoin Core ecosystem)
* RFC 4880: OpenPGP specification
* [https://bitcoin-otc.com/](https://bitcoin-otc.com/)
