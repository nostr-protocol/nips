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
- Each entry of `slots` is the CEK, wrapped for one recipient.
- The event's `pubkey`/`sig` belong to the **envelope key** — any
  keypair the application chooses (a one-time burner key, or a derived
  shared key). The envelope key is also the ECIES ephemeral key: every
  slot is wrapped under a key derived from it.

### Cryptographic constructions (alg `fb-ecdh-v1`)

Throughout this NIP and [FE](FE.md), `H(...)` is SHA-256 of the
concatenation of the listed byte strings (UTF-8 for the domain-separation
labels).

- AEAD: `XChaCha20-Poly1305` with a fresh 24-byte random nonce per
  encryption. A slot's encoding is `nonce ‖ ciphertext`, base64. `ct`
  uses the same encoding.
- ECDH: secp256k1; the input keying material is the 32-byte
  x-coordinate of the shared point, computed exactly as
  [NIP-44](44.md) computes its conversation-key input.
- Reader KEK: `HKDF-SHA256(ikm = ECDH(envelope_sk, reader_pk), salt = 0³², info = "fb-slot-v1")`
- Slot: `AEAD(reader KEK, CEK)`

### Reading

Opening an envelope is five steps:

1. **Find** the event by its application tag (for example `#f`). The
   relay matches tags mechanically.
2. **Parse** `content` — the envelope JSON `{v, alg, ct, slots}` is
   plaintext; only `ct` and each slot are encrypted.
3. **Derive** the reading key: `KEK = HKDF(ECDH(my_sk, event.pubkey))`.
4. **Try** every slot with that KEK. Each try is an AEAD
   authentication; failures are instant and silent. A recipient keeps
   the one slot that opens — it is the CEK.
5. **Decrypt** `ct` with the CEK — that is the payload.

A reader that opens no slot is not a recipient and learns nothing
beyond the event's existence and size. Degenerate envelopes
(`slots: []`) are identified by the application kind; do not run the
slot algorithm on them.

### Padding

Applications SHOULD include junk slots — random bytes of the same
encoded length — uniformly 1..20 extra, so that the recipient count is
not revealed by the slot count.

### Degenerate envelope (no slots)

Applications that have already distributed the CEK out of band (for
example [FE](FE.md) all-viewers replies) MAY publish the same JSON with
`"slots": []`. Readers MUST NOT run the slot-opening algorithm on these
events; the application specifies which CEK to use. `ct` is still
`AEAD(CEK, payload)` with the same encoding. An empty `slots` array is
the only permitted degenerate form — omit the field and the event is
not a valid envelope.

## Derived values

Two families of derived values appear throughout this NIP and
[FE](FE.md); every value in both NIPs is one or the other:

- **pairwise** — both parties of a relationship derive the *same*
  value, each from their own secret key and the other's public key.
  Nobody else can compute it. Examples: the alias, `conn_addr`.
  A pairwise value is the relationship's shared address.
- **personal** — only the owner can derive it, from their secret key
  alone. Example: `derived_identity_id`. A personal value is a private
  index over everything its owner has touched.

**Two-tools rule**: slots are unqueryable, tags are groupable — nothing
is both. A secret that must be queried becomes a tag; a secret that
must never be correlated stays in a slot.

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

carried as `k` tags, enabling typed queries ("videos from my contacts")
without revealing payload kinds publicly.

## Author key tag

An envelope event MAY carry a `b` tag handing the envelope's own
secret key back to its author:

```
b = AEAD(KEK, envelope_sk),   KEK = HKDF(ECDH(envelope_sk, author_pk))
```

Sealing uses the envelope's own secret key (for [FE](FE.md) notes,
the burner's) against the author's public key; reopening uses the
author's secret key against the event's public key. ECDH is symmetric,
so both sides derive the same KEK — and nobody else can derive
anything: the tag is opaque, does not name the author, and cannot be
correlated. Applications use it to make burner-signed events
manageable by their creator afterwards — [FE](FE.md) uses it for
NIP-09 deletion.

## Remote signer support

Recipient-side operations (alias derivation, slot opening) use ECDH +
HKDF + AEAD — the same primitives as [NIP-44](44.md) conversation keys.
Signer interfaces ([NIP-07](07.md)/[NIP-46](46.md)) that support
NIP-44 already hold the required machinery; this NIP requires
equivalent operations (e.g. `ecdh(peer_pk)` or a higher-level
`fb_open(event)`) rather than exposure of the raw secret key.

## Relay requirements

None. Envelope events are ordinary NIP-01 events; `f` and `k` are
ordinary single-character tags. Spam mitigation (burner-signed events
cannot be reputation-rate-limited) inherits [NIP-59](59.md)'s answers:
[NIP-42](42.md) authentication and [NIP-13](13.md) proof-of-work.

## Security considerations

Outsiders observe: event existence, timestamp, slot count (padded ±20),
and continuity — the same alias value recurring across events forms a
stable pseudonym for a relationship. Outsiders cannot observe: payload,
recipients, or the envelope key holder's identity.
