NIP-FB
======

False Bottom: Multi-recipient Encrypted Events
----------------------------------------------

`draft` `optional`

This NIP defines a generic encryption envelope for nostr events: a
single event whose content is readable by any number of chosen
recipients and publicly linkable to none of them. Applications built on
it (for example [FE](FE.md), feed encryption) choose the
kinds and semantics; this NIP specifies only the envelope and its
derivations.

The construction generalizes [NIP-59](59.md) from one recipient per
wrap to many recipients per event: instead of one gift wrap per
recipient, a single event carries one small encrypted *slot* per
recipient, each delivering the same content encryption key.

## The envelope

The event's `content` is a JSON object:

```json
{
  "v": 1,
  "alg": "fb-ecdh-v1",
  "ct": "<base64: the payload, encrypted once>",
  "slots": ["<base64>", "…"]
}
```

- `ct` is the payload, encrypted exactly once under a random symmetric
  32-byte **content encryption key** (CEK, [JOSE](https://datatracker.ietf.org/doc/html/rfc7516) vocabulary).
- Each entry of `slots` is that CEK, wrapped for one recipient.
- The event's `pubkey`/`sig` belong to the **envelope key** — any
  keypair the application chooses (a one-time burner key, or a derived
  shared key). The envelope key is also the ECIES ephemeral key: every
  slot is wrapped under a key derived from it.

### Cryptographic constructions (alg `fb-ecdh-v1`)

- AEAD: `XChaCha20-Poly1305` with a fresh 24-byte random nonce per
  encryption. A slot's encoding is `nonce ‖ ciphertext`, base64. `ct`
  uses the same encoding.
- ECDH: secp256k1; the input keying material is the 32-byte
  x-coordinate of the shared point, computed exactly as
  [NIP-44](44.md) computes its conversation-key input.
- Reader KEK: `HKDF-SHA256(ikm = ECDH(envelope_sk, reader_pk), salt = 0³², info = "fb-slot-v1")`
- Slot: `AEAD(reader KEK, CEK_raw)`

### Reading

For any false-bottom event, a reader derives
`HKDF(ECDH(my_sk, event.pubkey))` and attempts to open each slot;
exactly one authenticates (or none, if the reader is not a recipient),
yielding the CEK, which decrypts `ct`. Readers that are not recipients
learn nothing beyond the event's existence and size.

### Padding

Applications SHOULD include junk slots — random bytes of the same
encoded length — uniformly 1..20 extra, so that the recipient count is
not revealed by the slot count.

## Alias tags

Discovery of envelope events by relationship, without naming anyone:

```
alias(a, b) = H(ECDH(a_sk, b_pk) ‖ "fb-alias-v1")
```

- Symmetric: both parties derive the same value from their own secret
  key and the other's public key. Deterministic — one value per pair,
  forever; no setup events of any kind.
- Carried as an `f` tag (single-character tags are the only
  filterable ones; `a`, `i`, and `t` are avoided — [NIP-33](33.md),
  [NIP-22](22.md), and hashtags respectively).
- To an outsider an alias tag is opaque noise; to the pair it is a
  queryable shared address: `{"#f": [alias(contact, me), …]}` returns
  exactly and only the events addressed to that relationship.

Applications MAY also emit per-relationship, per-payload-kind tags:

```
kindtag(a, b, kind) = H(ECDH(a_sk, b_pk) ‖ "fb-kind" ‖ kind)
```

carried as `x` tags, enabling typed queries ("videos from my contacts")
without revealing payload kinds publicly.

## Remote signer support

Recipient-side operations (alias derivation, slot opening) use ECDH +
HKDF + AEAD — the same primitives as [NIP-44](44.md) conversation keys.
Signer interfaces ([NIP-07](07.md)/[NIP-46](46.md)) that support
NIP-44 already hold the required machinery; this NIP requires
equivalent operations (e.g. `ecdh(peer_pk)` or a higher-level
`fb_open(event)`) rather than exposure of the raw secret key.

## Relay requirements

None. Envelope events are ordinary NIP-01 events; `f` and `x` are
ordinary single-character tags. Spam mitigation (burner-signed events
cannot be reputation-rate-limited) inherits [NIP-59](59.md)'s answers:
[NIP-42](42.md) authentication and [NIP-13](13.md) proof-of-work.

## Security considerations

Outsiders observe: event existence, timestamp, slot count (padded ±20),
and continuity — the same alias value recurring across events forms a
stable pseudonym for a relationship. Outsiders cannot observe: payload,
recipients, or the envelope key holder's identity.
