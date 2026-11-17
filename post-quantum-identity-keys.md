NIP-XX
======

Post-Quantum Identity Keys
--------------------------

`draft` `optional`

This NIP defines how a Nostr identity commits to post-quantum public keys, and how those
keys are derived deterministically from an existing [NIP-06](06.md) mnemonic seed.

It defines the identity layer — how post-quantum keys come into existence and how other
users find them — and the message envelope that uses them. Both are implemented and
working and shipped; see [Reference implementation](#reference-implementation).

It does **not** define a signature format or any change to event validation. Event
signatures remain `secp256k1`, and the limits of that are stated plainly below.

## Motivation

`secp256k1` is not quantum-resistant. A cryptographically relevant quantum computer running
Shor's algorithm recovers a private key from a published public key, and every Nostr public
key is published by design.

Two distinct harms follow, and they have very different deadlines:

1. **Retroactive disclosure.** [NIP-44](44.md) derives its conversation key from an ECDH
   shared secret between two `secp256k1` keys. An adversary who records encrypted events
   today and breaks `secp256k1` later can decrypt all of them. This is the "harvest now,
   decrypt later" threat, and the damage is already accruing — every NIP-44 event published
   today is a future plaintext.

2. **Forgery.** The same adversary can sign events as any user. This breaks authorship for
   the whole protocol.

Only the first harm can be mitigated *retroactively*. Messages encrypted today with a
quantum-resistant KEM stay confidential regardless of what happens to `secp256k1`
afterwards. Forgery, by contrast, is a live-attack problem: it cannot be fixed by anything
published before the break, only by migrating signatures before it happens.

This NIP therefore addresses the first harm now and prepares for the second. It lets an
identity commit to post-quantum keys without changing anything a relay or an unaware client
does today.

### Why the keys must not be derived from the private key

A recurring proposal is to derive post-quantum keys from the `secp256k1` private key, e.g.
`pq_key = KDF(nsec)`. This is circular and provides no post-quantum security: an adversary
who recovers `nsec` from `npub` via Shor runs the same KDF and obtains the post-quantum key.

This NIP derives the `secp256k1` key and the post-quantum keys as **siblings from a common
seed**, never one from the other. Both derivations are one-way. Recovering the `secp256k1`
private key does not reveal the seed — that would require inverting HMAC-SHA512 — and
therefore does not reveal the post-quantum private keys.

This property is the reason the scheme works, and implementations MUST preserve it.

## Key derivation

Let `S` be the 64-byte binary seed produced by BIP39 from the user's mnemonic, exactly as
[NIP-06](06.md) already specifies. `S` is the same seed from which the `secp256k1` key is
derived at `m/44'/1237'/<account>'/0/0`. No new secret is introduced and no new backup
material is created.

Post-quantum keys are derived with HKDF-SHA256, using `S` as input keying material, an empty
salt, and a domain-separated `info` string:

```
info_kem = "nip-pqc/v1/ml-kem-1024/" + account
info_dsa = "nip-pqc/v1/ml-dsa-87/"  + account

kem_seed = HKDF-SHA256(ikm = S, salt = "", info = info_kem, L = 64)
dsa_seed = HKDF-SHA256(ikm = S, salt = "", info = info_dsa, L = 32)
```

where `account` is the decimal NIP-06 account index, so that post-quantum keys track the
same account as the `secp256k1` key they accompany.

The seeds are then expanded by the standard key-generation functions:

- `kem_seed` (64 bytes: `d || z`) generates an **ML-KEM-1024** key pair per [FIPS 203].
- `dsa_seed` (32 bytes: `ξ`) generates an **ML-DSA-87** key pair per [FIPS 204].

Both algorithms specify deterministic key generation from these seeds, so the key pairs are
fully recoverable from the mnemonic alone. A user restoring from their words recovers their
`secp256k1` key and both post-quantum keys, with no additional backup.

The `info` strings are normative. Changing them yields different keys.

### Algorithm choice

ML-KEM-1024 and ML-DSA-87 are the NIST Category 5 parameter sets, and are the sets
mandated by NSA CNSA 2.0 for national security systems. Australia's Information Security
Manual additionally disallows ML-KEM-768 and ML-DSA-65 after 2030, so specifying the
Category 3 sets would standardise parameters already scheduled for withdrawal in at least
one jurisdiction.

The cost is modest and falls in the right place: the attestation event grows to roughly
12 KB but is published once per identity on a replaceable event, and the per-message KEM
ciphertext grows by 640 bytes. Neither is worth a weaker parameter set on a protocol whose
whole purpose here is to still be sound in 2040.

Future versions MAY specify other parameter sets under new `info` strings and new `alg`
identifiers; the `alg` tag is the negotiation point, so adding a set is not a breaking
change.

### Seed strength

BIP39 produces a 64-byte seed regardless of mnemonic length, so a 12-word mnemonic would
mechanically derive working post-quantum keys. It carries only 128 bits of entropy, however,
and Grover's algorithm provides at most a quadratic speedup on unstructured search — so a
12-word seed is a materially thinner margin than 256 bits, and the seed rather than the
lattice becomes the limiting factor.

This NIP therefore does **not** permit seed-derived post-quantum keys below 256 bits.

- Implementations MUST derive post-quantum keys only from a 24-word (256-bit) mnemonic, and
  MUST publish `seed_strength` as `"256"` when `origin` is `derived`.
- Implementations MUST NOT derive post-quantum keys from a 12-word mnemonic. An identity
  holding one is not thereby excluded: it MAY generate an independent post-quantum key pair
  and publish it with `origin` set to `independent`, exactly as a seedless identity does.

The distinction is deliberate and is about honesty rather than exclusion. A key labelled
`derived` is a promise that the mnemonic alone restores it at full strength. Allowing a
128-bit seed to carry that label would make the label mean two different things, and a
correspondent reading the attestation could not tell which. An `independent` key gives the
same confidentiality benefit; it simply cannot claim seed recovery, and the user must be
told to back it up separately.

Clients generating a new identity SHOULD generate a 24-word mnemonic.

### Identities that cannot derive

Three cases cannot use seed derivation: identities imported as a bare `nsec`, identities
operated through a remote signer, and identities whose mnemonic is 12 words.

All three MAY generate an independent post-quantum key pair and publish it with `origin` set
to `independent` and no `seed_strength` tag. They gain the same confidentiality protection,
but lose the property that one mnemonic restores everything: the post-quantum private keys
become separate backup material, and clients MUST make that explicit to the user rather than
implying seed recovery will restore them.

Remote signers are a further constraint: the signing protocol has no post-quantum
operations, so an independent key held by such an identity cannot be used through the
remote signer and MUST NOT be advertised unless the client itself holds the key.

## The attestation event

A `kind:10203` event, which is *replaceable*, advertises an identity's post-quantum public
keys. It is signed with the identity's ordinary `secp256k1` key.

```jsonc
{
  "kind": 10203,
  "pubkey": "<32-byte hex secp256k1 public key>",
  "created_at": 1754640000,
  "content": "",
  "tags": [
    ["alg", "ml-kem-1024", "<base64 encapsulation key>"],
    ["alg", "ml-dsa-87", "<base64 verification key>"],
    ["origin", "derived"],
    ["seed_strength", "256"],
    ["v", "nip-pqc/v1"],
    ["pop", "ml-dsa-87", "<base64 ML-DSA signature over the proof-of-possession message>"]
  ],
  "sig": "<64-byte hex schnorr signature>"
}
```

- **`alg`** — one per published key. The second element is the algorithm identifier, the
  third is the base64-encoded public key. An identity SHOULD publish at most one `alg` tag
  per algorithm. Unknown algorithm identifiers MUST be ignored, not treated as an error.
- **`origin`** — `derived` if the keys come from the mnemonic per this NIP, `independent`
  if they were generated separately. Clients MUST NOT display `independent` keys as
  seed-recoverable.
- **`seed_strength`** — MUST be `"256"` when `origin` is `derived`; omitted when `origin`
  is `independent`. No other value is valid: this NIP does not permit derivation from a
  weaker seed. An attestation declaring `derived` with any other `seed_strength`, or none,
  MUST be rejected.
- **`v`** — the derivation profile, so that future revisions are distinguishable.
- **`pop`** — proof of possession. REQUIRED when an `ml-dsa-87` key is published. See below.

### Proof of possession

A `secp256k1` signature over the event proves only that the identity published these bytes,
not that it holds the corresponding post-quantum private keys. Without proof of possession,
a user could advertise a key they do not control — by client bug, by copying another user's
key, or deliberately — and correspondents would encrypt messages that the intended recipient
cannot read.

The ML-DSA key therefore counter-signs the declaration. The proof-of-possession message is
the UTF-8 encoding of:

```
nip-pqc/v1/pop:<secp256k1 pubkey hex>:<base64 ml-kem-1024 key>:<base64 ml-dsa-87 key>
```

signed with the ML-DSA-87 private key and placed in the `pop` tag. Verifiers MUST
reconstruct this message from the event's own tags and verify the signature against the
published ML-DSA verification key, rejecting the attestation if it does not verify.

Because the message includes the ML-KEM key, a valid `pop` binds both post-quantum keys and
the `secp256k1` identity together in a single assertion. ML-KEM cannot produce signatures,
so this is what gives the KEM key a possession proof.

An attestation publishing only an `ml-kem-1024` key — for example from an implementation that
does not yet support ML-DSA — MAY omit `pop`. Clients SHOULD surface such keys as
unproven, since possession has not been demonstrated.

This mirrors the reasoning in [PR #2424](https://github.com/nostr-protocol/nips/pull/2424)
(Key Set Declaration), which observes that unilateral key declarations permit impersonation
and that a link should be attested from both sides.

The `pop` signature adds roughly 6.2 KB to the event.

Relays need no changes: `kind:10203` falls in the existing replaceable range
(`10000 <= n < 20000`) defined in [NIP-01](01.md), and the event is an ordinary
`secp256k1`-signed event. With both keys and a proof of possession the event is roughly 12 KB, which is within the limits
accepted by relays in practice but is not negligible; it is published once and only changes
on key rotation.

### Why not `kind:0`

`kind:0` `content` is free-form JSON and a post-quantum key could be placed there. It MUST
NOT be the authoritative location. Most clients rebuild the profile object from the fields
they know about and republish it, so an unknown `pq` field is silently dropped the first
time the user edits their profile in any client that does not implement this NIP. The
failure is invisible: the user still believes they are reachable post-quantum, while senders
stop seeing a key and fall back to classic encryption.

A client MAY additionally mirror the keys into `kind:0` as a discovery hint. Where the two
disagree, `kind:10203` wins. A key present only in `kind:0` MUST be treated as unverified.

### Validation

Before using an advertised key, a client MUST verify the event signature against the
identity's `secp256k1` public key, and MUST check that the key material decodes to the
correct length for the declared algorithm (1568 bytes for ML-KEM-1024, 2592 bytes for
ML-DSA-87). Keys of the wrong length MUST be rejected.

## The message envelope

A sender who has retrieved a recipient's ML-KEM encapsulation key encapsulates to it and
combines the resulting secret with the classic [NIP-44](44.md) conversation key:

```
k = HKDF-SHA256(ikm = ss || conversation_key, salt = "", info = "nip-pqc/v1/hybrid", L = 32)
```

The shared secret MUST NOT be used alone. Concatenating and hashing both means the result
is no weaker than either input: a flaw in a comparatively young lattice scheme must not be
able to make Nostr messaging *worse* than it is today. This also matches the guidance of
the European agencies currently recommending hybrid deployment.

The payload is then sealed with XChaCha20-Poly1305:

```
version   1 byte    0x01
alg       1 byte    0x01 = ML-KEM-1024 + NIP-44 conversation key, XChaCha20-Poly1305
kem_ct    1568      ML-KEM-1024 ciphertext
nonce     24        XChaCha20-Poly1305 nonce
sealed    variable  AEAD(padded plaintext), including the 16-byte tag
```

base64-encoded for transport. Three requirements:

- The AEAD's associated data MUST bind the version, the algorithm identifier, and **both
  participants' `secp256k1` public keys**, so a ciphertext cannot be replayed into another
  conversation, have its direction reversed, or have its algorithm silently downgraded.
- Plaintext MUST be padded using NIP-44's existing padding scheme, so ciphertext length
  does not leak message length on a public relay.
- Implementations MUST report a single generic failure for every decryption error.
  Distinguishing padding failures from authentication failures provides an oracle.

This envelope deliberately carries its **own** version byte rather than claiming one in
NIP-44's registry, which NIP-44 owns. It is self-describing, so it can be adopted,
renumbered or superseded without colliding with other work.

### Composition with NIP-17 and NIP-59

The envelope is the `content` of the [NIP-59](59.md) `kind:13` seal, carrying a
[NIP-17](17.md) `kind:14` rumor. The seal is gift-wrapped in a `kind:1059` with an
ephemeral key exactly as NIP-59 already specifies.

Placing the envelope at the seal layer rather than inside the rumor is a deliberate
size decision: NIP-59 base64-encodes at every layer, so a payload in the rumor is expanded
by 4/3 three times over. One layer out removes an entire expansion of the ML-KEM
ciphertext, which measures 16-28% of total message size.

Because the rumor is unsigned by design, its `pubkey` is only a claim. Implementations MUST
verify the seal's signature and MUST reject a rumor whose `pubkey` differs from the seal's
author. Without that check, anyone can wrap a rumor attributed to someone else and have it
displayed as genuine.

The outer layers remain `secp256k1`. This is what allows post-quantum messages to traverse
today's relay network unmodified, with no relay changes and no effect on clients that have
not implemented this NIP.

### Message size

Measured on the complete `kind:1059` event:

| message | classic NIP-17 | post-quantum | overhead | ratio |
|---|---|---|---|---|
| "hi" (2 chars) | 1,533 B | 4,605 B | +3,072 B | 3.0x |
| a tweet (280) | 2,213 B | 5,285 B | +3,072 B | 2.4x |
| a paragraph (1 KB) | 3,921 B | 7,333 B | +3,412 B | 1.9x |
| a long note (4 KB) | 11,429 B | 14,161 B | +2,732 B | 1.2x |

About **3 KB of constant overhead**, almost all of it the ML-KEM ciphertext. At 100
messages a day that is roughly **+107 MB per year per conversation**, which is the cost
relay operators are being asked to absorb and is stated here rather than left to be
discovered. Note that NIP-59 already carries a ~1.5 KB floor of its own: a *classic*
two-character message costs 1,533 bytes. This raises that floor rather than creating it.

Encryption takes ~1.3 ms and decryption ~1.6 ms for a 280-byte message in pure JavaScript.

### What this does and does not protect

It is important to state the limits precisely.

**Protected:** the confidentiality of message content against an adversary who records
traffic now and acquires a quantum computer later. The ML-KEM private key is not derivable
from any published value, so recorded ciphertexts stay confidential. This defeats
harvest-now-decrypt-later, which is the only harm that must be prevented *before* the
break rather than after it.

**Not protected:** anything depending on `secp256k1` signatures. An adversary with a quantum
computer can forge events, impersonate users, and — relevant here — publish a *replacement*
`kind:10203` attestation carrying their own post-quantum keys, thereby intercepting future
messages. Metadata exposed by the gift wrap layer is likewise unprotected.

So this NIP makes past messages permanently safe. It does not make future messages safe
against an adversary who has already broken `secp256k1`; that requires migrating signatures,
which is out of scope here. Publishing the ML-DSA verification key now is what makes that
later migration possible without users changing their mnemonic: the commitment exists,
signed by the classic key, from before the break.

Clients MUST NOT present this as making an identity "quantum-safe" without qualification.

### On signature migration

Migrating signatures is deferred deliberately, and not only for scope reasons. An ML-DSA-87
signature is 4627 bytes — roughly 6.2 KB base64 — which would be added to *every event on
the network*, a several-fold increase in relay storage and bandwidth for typical short
notes. That is a network-economics problem requiring relay operator consensus, not a
client-side change, and it should be specified on its own terms once the identity layer
exists.

## Relationship to other work

This NIP is intended to compose with, not replace, work already in progress:

- Issue [#1971](https://github.com/nostr-protocol/nips/issues/1971) raised post-quantum
  security for NIP-44 and identified two unsolved problems: how to generate post-quantum
  private keys and bind them to an existing identity, and where to publish the public keys.
  This NIP proposes an answer to both, and adopts the position argued there that a hybrid
  construction, not a replacement, is the correct approach.
- Proposals adding a post-quantum NIP-44 version byte remain compatible: this envelope
  carries its own version byte precisely so both can exist. If such a proposal is adopted,
  an implementation may carry the same hybrid secret in that format instead; the identity
  layer defined here is unchanged either way.
- [PR #1647](https://github.com/nostr-protocol/nips/pull/1647) (`nip4e`, decoupling
  encryption from identity) is compatible. If encryption keys become independent of identity
  keys generally, the attestation event described here is a natural place to publish them,
  and the derivation scheme still applies.

## Relationship to NIP-06

[NIP-06](06.md) is currently marked `unrecommended`, on the reasoning that a single `nsec`
is simpler than a mnemonic. That trade-off changes here. Once an identity needs more than
one private key — a signing key, a KEM key, and eventually a post-quantum signing key — a
seed is what allows them to be recovered together from one backup. Deriving them from a
mnemonic is what makes the migration path survivable for users, since it means the words
written down today still restore the identity after the transition.

This NIP does not propose changing NIP-06's status, but implementers should note that
identities created from a bare `nsec` cannot participate in seed-based derivation.

## Test vectors

Using the second NIP-06 test mnemonic:

Using the second (24-word) test mnemonic from [NIP-06](06.md), with `account = 0`:

```
mnemonic:  what bleak badge arrange retreat wolf trade produce cricket blur garlic valid
           proud rude strong choose busy staff weather area salt hollow arm fade

secp256k1 private key (hex, per NIP-06, unchanged by this NIP):
           c15d739894c81a2fcfd3a2df85a0d2c0dbc47a280d092799f144d73d7ae78add

info_kem:  "nip-pqc/v1/ml-kem-1024/0"
kem_seed:  14c9c221e25ab2ec16b1a98ddb6ec7828da71fa209add560dba396e87973e3fc
           bc78df3c2edf380ff8f76825f6825e2503f6cda26c752b839aed3c6938e2e4d9

info_dsa:  "nip-pqc/v1/ml-dsa-87/0"
dsa_seed:  39e830d2d3f38e3014ed73d0194048f9068c7e1511de3a764f4731e07900191a
```

The expanded public keys are large, so they are given here as SHA-256 digests of the raw
key bytes; a full-length copy accompanies the reference implementation.

```
ml-kem-1024 encapsulation key: 1568 bytes
  sha256 = f15e1a31adc3198a3e09f1d473aa0f2cd3e28392b77f1e350468bae15dfa251b
  base64 begins "HrEVOPWUZTZ5kNy8pLeLsLNXjFtE3IW5KFQ1fzYa5/JOXTGRaIECSixUUxpPFkRp"

ml-dsa-87 verification key:   2592 bytes
  sha256 = 6912f6f1dd8f8e6c1d9e7d349d75ef1b582ccf2aa95636bf2445b0e22be18e16
  base64 begins "K2MUxAjQwNLleHacGHChwBhCFnIUooSYUJ/qOulIZ79DctOGZZ17AoUItBAz27cH"
```

Base64 encodings are 2092 and 3456 characters respectively, giving a complete `kind:10203`
event of approximately 5.6 KB, or roughly 12 KB once the proof-of-possession signature is
included. Measured against a published event: 12,200 bytes.

### Relay acceptance

Implementers should expect the attestation to be refused by some relays on size. Publishing
a 12,200-byte `kind:10203` to four widely-used public relays, one rejected it outright and
three accepted it. Message-sized payloads (roughly 4,600 bytes for a post-quantum direct
message) were accepted everywhere.

Clients therefore SHOULD publish the attestation to several relays and MUST NOT treat a
single rejection as failure, and SHOULD surface how many relays accepted it rather than
reporting a binary result. A recipient whose attestation reached no relay is unreachable
for post-quantum messages, and a sender that cannot find one MUST NOT silently fall back to
classic encryption (see [What this does and does not protect](#what-this-does-and-does-not-protect)).

## Reference implementation

A reference implementation of the derivation, the proof-of-possession construction, and the
ML-KEM operations, with the test vectors above as executable assertions:

- **[`@nostr-wot/pq`](https://github.com/nostr-wot/nostr-wot-sdk/tree/main/packages/pq)** —
  the complete reference library: derivation, attestation, envelope and gift-wrapped direct
  messages, with 56 tests.
- A shipped signer implementing this document: [Nostr WoT extension
  v0.4.0](https://github.com/nostr-wot/nostr-wot-extension/releases/tag/v0.4.0) derives the
  keys from an existing NIP-06 seed, publishes the attestation, and sends and receives
  post-quantum direct messages. `lib/crypto/pq.ts` and `scripts/pqc-keygen.mjs` in that
  repository are the derivation and the offline attestation generator respectively.
- A public capability checker that fetches an attestation, validates it and verifies its
  proof of possession in the browser: <https://nostr-wot.com/pqc>
- A live two-party demonstration against public relays, which publishes attestations,
  resolves each party's ML-KEM key from them, exchanges gift-wrapped post-quantum messages,
  and decomposes any resulting event layer by layer:
  <https://nostr-wot.com/pqc/chat>

The vectors in this document were generated with `@noble/post-quantum` using the one-shot
`hkdf()` helper, and are reproduced independently by that implementation using separate
`extract` and `expand` calls.

## References

### Standards

- [FIPS 203], *Module-Lattice-Based Key-Encapsulation Mechanism Standard* (ML-KEM). NIST,
  final, 13 August 2024.
- [FIPS 204], *Module-Lattice-Based Digital Signature Standard* (ML-DSA). NIST, final,
  13 August 2024.
- [BIP-39], *Mnemonic code for generating deterministic keys.*
- [BIP-32], *Hierarchical Deterministic Wallets.*
- [RFC 5869], *HMAC-based Extract-and-Expand Key Derivation Function (HKDF).*
- [SLIP-44], registered coin type `1237` for Nostr, as used by NIP-06.

### Nostr specifications

- [NIP-01](01.md) — event structure, `kind` ranges, replaceable events.
- [NIP-06](06.md) — mnemonic seed derivation, the seed this NIP reuses.
- [NIP-17](17.md) — private direct messages.
- [NIP-44](44.md) — versioned encryption; the conversation key combined with the KEM secret.
- [NIP-59](59.md) — gift wrap; the transport this composes with unchanged.

### Prior and related work

- [nips#1971](https://github.com/nostr-protocol/nips/issues/1971) — *NIP-44: post-quantum
  security.* The discussion this NIP responds to, and the source of the requirement that
  post-quantum keys must not be derivable from the `secp256k1` private key.
- [nips#1647](https://github.com/nostr-protocol/nips/pull/1647) — *nip4e: decoupling
  encryption from identity.* Compatible; if encryption keys become independent of identity
  keys generally, this attestation is a natural place to publish them.
- [nips#2424](https://github.com/nostr-protocol/nips/pull/2424) — *NIP-A1: Key Set
  Declaration.* The source of the proof-of-possession reasoning adopted here.

### Threat model and migration guidance

- *Quantum-Readiness: Migration to Post-Quantum Cryptography.* CISA, NSA and NIST, August
  2023. https://www.cisa.gov/sites/default/files/2023-08/Quantum%20Readiness_Final_CLEAR_508c%20%283%29.pdf
- *NIST IR 8547 ipd, Transition to Post-Quantum Cryptography Standards.* NIST, initial
  public draft, November 2024. https://csrc.nist.gov/pubs/ir/8547/ipd — proposes ECDSA and
  ECDH disallowed after 2035. **Still a draft; it has not been finalised.**
- *CNSA 2.0 Algorithms.* NSA — mandates ML-KEM-1024 and ML-DSA-87 for national security
  systems. https://media.defense.gov/2025/May/30/2003728741/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS.PDF
- *Planning for post-quantum cryptography* and the ISM cryptography guidelines. Australian
  Signals Directorate — withdraws approval for ECDH/ECDSA, and for ML-KEM-768 and ML-DSA-65,
  after 2030. https://www.cyber.gov.au/business-government/secure-design/planning-for-post-quantum-cryptography
- *Securing Tomorrow, Today: Transitioning to Post-Quantum Cryptography.* Joint statement of
  21 European agencies, 27 June 2025 — recommends hybrid deployment.
  https://www.bsi.bund.de/SharedDocs/Downloads/EN/BSI/Crypto/PQC-joint-statement-2025.pdf
- *Timelines for migration to post-quantum cryptography.* UK NCSC, 20 March 2025.
  https://www.ncsc.gov.uk/guidance/pqc-migration-timelines

### Implementations

- `@noble/post-quantum` — pure-JavaScript ML-KEM and ML-DSA.
  https://github.com/paulmillr/noble-post-quantum

[FIPS 203]: https://csrc.nist.gov/pubs/fips/203/final
[FIPS 204]: https://csrc.nist.gov/pubs/fips/204/final
[BIP-39]: https://bips.xyz/39
[BIP-32]: https://bips.xyz/32
[RFC 5869]: https://www.rfc-editor.org/rfc/rfc5869
[SLIP-44]: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
