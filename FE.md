NIP-FE
======

Feed Encryption
---------------

`draft` `optional`

This NIP defines **private generics**: two wrapper kinds that make any
nostr event private. Kind `1370` (**private generic**) wraps any event
and *establishes* its own security — slots deliver a fresh content key
to each recipient. Kind `1470` (**related private generic**) wraps any
event that relates to a `1370` — replies, reactions, revisions — and
*inherits* its security and audience wholesale: encrypted under the
parent's reply CEK, slotless. The contained event is any standard
nostr kind; all content semantics live inside the wrapper.

The motivating application is a **private feed** — posting to a contact
list without duplicating content per follower — but nothing here is
feed-specific; any nostr kind gets a private version for free.

It depends on [NIP-59](59.md)'s rumor/seal *layering* idea (author-signed
wrapper around an unsigned rumor), and on [FB](FB.md) for the envelope,
alias tags, and derivations. The seal here is its own kind — not NIP-59's `13`.

A private feed is comprised of private events (1370), where each is essentially a gift wrap but to many receipients instead of one. It uses false bottom encryption, to allow a payload for many recipients to work. As such the event is private, yet scales better than one copy per recipient.
These private events are not identifiable by pubkeys tied to the creator/reciever, yet are queryable. Thus making them private, but efficient. This is done by using shared alias', as defined with the connection event (30378).

## Kinds

| kind | description |
|---|---|
| `1370` | private generic — wraps any event, *establishes* security |
| `1470` | related private generic — wraps any related event, *inherits* security |
| `124` | author seal (nested; not published top-level) |
| `30378` | connection record (parameterized, replaceable) |

Kinds are **crypto roles**, not content types: `1370` establishes a
fresh security context (slots deliver a new CEK), `1470` inherits an
existing one (encrypted under the parent's reply CEK). Content typing
lives in the rumor kind — a reply is a kind-1 rumor in a `1470`, a
reaction is a kind-7 rumor in a `1470`.

Kind numbers are the [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039/bip-0039-wordlists.md) English indices of `private`, `response`, `author`, and `connect` — a mnemonic convention only.

## Private note (kind 1370)

```json
{
  "kind": 1370,
  "pubkey": "<burner public key>",
  "created_at": 1790000000,
  "tags": [
    ["f", "5f2c…"],
    ["f", "91d8…"],
    ["f", "c4e0…"]
  ],
  "content": "{\"v\":1,\"alg\":\"fb-ecdh-v1\",\"ct\":\"<base64>\",\"slots\":[\"<base64>\", …]}",
  "id": "…",
  "sig": "<signed by the burner key>"
}
```

- `pubkey` and `sig` MUST belong to a one-time burner key, not the
  author's identity key.
- `created_at` SHOULD be jittered into the past; the rumor inside
  carries the true timestamp.
- Each `f` tag is an alias for one recipient, plus junk ([FB](FB.md)
  padding), plus the author's **self-alias** (see
  [Author archive](#author-archive)).
- `ct` decrypts (per the [FB](FB.md) reading algorithm) to a kind `124`
  **author seal**. The seal is nested inside `ct` — it is never
  published as a top-level relay event.
- The rumor MUST carry a random 32-byte **reply CEK** as a tag
  (`["reply_cek", "<hex>"]`).
- The author SHOULD include a slot addressed to themself, so notes can
  be re-read from any device.
- Every private event carries exactly one `b` tag ([FB](FB.md) author
  key tag): the burner secret key, sealed with the burner's own secret
  key to the author's public key — so the author can delete the event
  later ([Editing and deletion](#editing-and-deletion)).

```
kind 1370 (burner-signed, alias tags, slots)
  └─ note CEK decrypts → kind 124 seal (author-signed)
       └─ note CEK decrypts → unsigned rumor (any kind, + reply CEK)
```

Both layers use the **same** note CEK on purpose. [NIP-59](59.md) uses
a different pairwise key at each layer because each wrap has one
recipient. Here every recipient already holds the note CEK from their
slot; the seal exists for the signature / deniability split, not extra
confidentiality among recipients. Each AEAD invocation MUST use a
fresh nonce as specified in [FB](FB.md).

### Author seal (kind 124)

The seal is a signed event wrapping an unsigned rumor, formed like
[NIP-59](59.md)'s kind `13` but encrypted under the envelope CEK (the
note CEK for a `1370`, the reply CEK for an all-viewers `1470`) rather
than a pairwise conversation key. `id` and `sig` are ordinary
[NIP-01](01.md) (SHA-256 of the serialized event, Schnorr over `id`
with the author's identity key). `tags` MUST be empty. `created_at`
SHOULD be jittered into the past.

```json
{
  "id": "<id>",
  "pubkey": "<author identity pubkey>",
  "created_at": 1790000000,
  "kind": 124,
  "tags": [],
  "content": "<base64: AEAD(CEK, rumor JSON)>",
  "sig": "<author identity signature>"
}
```

The rumor is a regular event with `id` computed and `sig` omitted:

```json
{
  "id": "<id>",
  "pubkey": "<author identity pubkey>",
  "created_at": 1790001234,
  "kind": 1,
  "tags": [
    ["reply_cek", "<32-byte hex>"]
  ],
  "content": "hello from a private feed"
}
```

The layering provides:

| threat | result |
|---|---|
| a compromised recipient republishes the rumor as a public event | impossible — the rumor is unsigned, so it is not a valid event |
| a compromised recipient leaks the seal (it is signed) | harmless — the seal's content is still ciphertext |
| a compromised recipient reveals seal and note CEK | the plaintext becomes provable — the accepted residual, identical to NIP-59 |
| a forger copies alias tags and fakes a note "from" the author | impossible — the seal's standard signature must verify |
| outsiders identify the author | impossible — the seal lives inside the encryption |

## Discovery

Clients query `{"#f": [alias(contact, me), …], "kinds": [1370, 1470]}`
— exact results, standard pagination. That returns notes, chunks,
revisions, and to-OP-only replies. All-viewers replies have no `f`
tag; they are fetched with `{"#n": [note_id], "kinds": [1470]}` after
the parent rumor yields the reply CEK — replies, reactions, and
revisions are all conversation events under the reply CEK, so the same
query returns them regardless of connection state. The alias list is derived once
per session from the user's key and their contacts' public keys.
Author-pubkey queries are a degraded fallback (they return events the
querier cannot open, and pagination cannot indicate completeness).

## Replies (kind 1470)

Kind `1370` is a private note; kind `1470` is a private reply. The
difference below is only how each one **packages** its ciphertext —
the [FB](FB.md) envelope `{v, alg, ct, slots}`.

Slots exist to hand a CEK to people who do not yet have it. An
all-viewers reply is only for people who already opened the parent
note, so they already hold the reply CEK and slots would be empty
work. That is a **slotless** (degenerate) envelope: the same JSON,
`"slots": []`. It is not a copy of the note; it is new reply content
under a key the audience already has. Clients MUST dispatch on kind —
they MUST NOT run the FB slot-opening algorithm on a `1470`.

| | kind 1370 private note | kind 1470 private reply |
|---|---|---|
| what it is | new post to an audience | reply (or reaction) on that post |
| envelope | full: `slots` wrap a fresh note CEK for each recipient | slotless: `"slots": []` — CEK already known |
| outer `pubkey` / `sig` | one-time burner | one-time burner |
| public tags | `f` aliases (+ junk) | `n` = `note_id` |
| `content` JSON | `{v, alg, ct, slots: […]}` | `{v, alg, ct, slots: []}` |
| how the reader gets the CEK | open their slot | already have it (`reply_cek` on the parent rumor) |
| `ct` | `AEAD(note CEK, seal)` | `AEAD(reply CEK, seal)` |
| inner seal / rumor | kind 124 → unsigned rumor | kind 124 → unsigned rumor |

```
kind 1370                          kind 1470
┌──────────────────────────┐       ┌──────────────────────────┐
│ burner sig               │       │ burner sig               │
│ tags: f, f, f            │       │ tags: n                  │
│ slots: [s1, s2, …]  ───┐ │       │ slots: []                │
│ ct = AEAD(note CEK, ─┐ │ │       │ ct = AEAD(reply CEK, ─┐  │
│        seal)         │ │ │       │        seal)          │  │
└──────────────────────┼─┼─┘       └───────────────────────┼──┘
                       │ └ slot wraps note CEK             │
                       ▼                                   ▼
              kind 124 (author sig)               kind 124 (author sig)
              content = AEAD(note CEK, rumor)     content = AEAD(reply CEK, rumor)
              (same CEK as outer ct)              (CEK from parent rumor, not a slot)
```

```json
{
  "kind": 1470,
  "pubkey": "<burner public key>",
  "created_at": 1790000100,
  "tags": [
    ["n", "<note_id>"]
  ],
  "content": "{\"v\":1,\"alg\":\"fb-ecdh-v1\",\"ct\":\"<base64>\",\"slots\":[]}",
  "id": "…",
  "sig": "<signed by the burner key>"
}
```

- `pubkey` and `sig` MUST belong to a one-time burner key, not the
  replier's identity key — otherwise who replied is public even though
  the body is encrypted.
- `note_id = H(reply CEK ‖ "fb-note-id-v1")`. (`n` is used rather than
  `e` because the value is not an event id and `e` tooling would
  attempt to fetch it.)
- **To-OP-only reply**: a one-recipient kind `1370` (full envelope, one
  slot, addressed to the root author) carrying the pairwise alias tag.
  It SHOULD NOT carry the `n` tag; clients MAY include it to render
  "private reply" placeholders.
- Every all-viewers reply at any depth tags the `note_id`, and so does
  every revision, so one query `{"#n": [note_id]}` returns the entire
  conversation — replies and edits alike; parent references (`e` tags)
  inside the rumors render the shape. Clients MUST paginate
  to an empty page to consider the top level complete.
- Reactions are all-viewers replies whose rumor is a [NIP-25](25.md)-style kind-7 event.
- Reply CEKs never expire. Conversation membership is fixed at note
  creation; new members are admitted only by the author sending them
  the reply CEK in a one-off private note.

## Chunking for large audiences

A typical 64 KB relay limit holds on the order of **500 slots** per
event (CEK wrap + junk padding). If the audience is larger than that,
the author MUST publish **multiple kind `1370` events** — one chunk
per slice of the recipient list — each a full copy of the note for
that slice:

- each chunk has its own note CEK and independently re-encrypted `ct`
- each chunk's rumor is identical, including the same `reply_cek`
- each chunk carries `f` tags only for the recipients of *that* slice
  (plus junk)

Chunks share **no** note-level public tag (`n`, `d`, or otherwise), so
they are not query-linkable as one object and the publication size is
not observable. They remain grouped with other notes via each
recipient's stable `f` alias — the continuity property already
documented in [FB](FB.md). 6000 recipients ≈ 12 events. A given
recipient only needs the chunk that contains their slot.

## Editing and deletion

Kind `1370` is a regular event, not an addressable one. A public `d`
tag would not make relays replace prior versions (that only happens
for kinds `30000`–`39999`), and putting `note_id` in a public `d` or
`n` tag on the root would link chunks, revisions, and the reply tree
together for any observer.

Thread identity lives **inside** the rumor, encrypted:

- `["reply_cek", "<hex>"]` — the conversation key. Revisions MUST
  reuse the original note's reply CEK, so the `n`-tree continues and
  membership does not change.
- `["revision_of", "<previous rumor id>"]` — the [NIP-01](01.md) `id`
  of the unsigned rumor this event supersedes. That is *not* the
  wrapper event id (a burner id, useless as a stable handle). The
  original rumor omits this tag.

Edits are **revision events**: a single kind `1470` conversation event
— slotless, under the note's reply CEK like any reply, tagged `n` —
whose rumor carries the same `reply_cek` plus `revision_of`. One event
covers the whole audience: the audience is **frozen at the original's**
— every chunk recipient, including ex-connections, never post-hoc
connections — because every holder already has the reply CEK. No
slots, no aliases, no connection state are needed to edit, and holders
receive the revision with the same `#n` query that returns replies.
Authorization is **seal-matches-root**: each participant revises only
their own words (the seal `pubkey` must equal the superseded rumor's
author; anyone else's `revision_of` is just their own reply).
Append-only — no replaceable events; the revision's own `b` tag
retains its burner for deletion.

Clients discover candidates the same way they discover notes (`#f`
aliases), decrypt, and group by `reply_cek` + seal `pubkey`. They
render the rumor at the end of the `revision_of` chain (if the chain
is incomplete, the rumor with the latest `created_at` in that group)
and retain the rest as history.

Replies and reactions SHOULD put the `id` of the exact rumor they were
responding to in an `e` tag on **their** rumor, so clients can show
"edited after this reply" without trusting relays.

Chunks vs revisions: chunks of one publication share a `reply_cek`
**and** the same rumor `id` (identical unsigned rumor, independently
re-encrypted). Revisions share a `reply_cek` but have a new rumor `id`
and a `revision_of` tag.

### Deletion

[NIP-09](09.md) deletion is a kind `5` event signed by the deleted
event's own key. For a private event that key is the burner, so every
private event carries its burner key back to its author in a `b` tag
([FB](FB.md) author key tag), sealed by the burner to the author:

- To delete, the author re-reads their own event, opens its `b` tag
  (KEK from their secret key and the event's public key), recovers
  the burner secret key, and publishes a NIP-09 kind `5` signed by
  the burner, referencing the wrapper event id. The deleting key is
  the burner, so the deletion event links no identity to the note.
- Exactly one `b` tag per event, identical in shape on kinds `1370`
  and `1470`; its value is opaque and uncorrelatable, so carrying it
  is not a signal.
- Recovery is per-event and forward-only: without the event (and its
  `b` tag) the burner key is gone. Deletion is relay-side only;
  recipients' cached copies are not revoked, consistent with the
  traitor non-goal.

Connection records (kind `30378`) need no `b` tag — they are
replaceable by construction and both parties already hold the
connection key.

## Author archive

Every authored `1370` carries a **self-alias** — the me-me relationship
in the same `f` tag format as every other alias:

```
self_alias = H(ECDH(sk, pk) ‖ "fb-alias-v1")
```

One query — `{"#f": [self_alias]}` — returns exactly the events the
querier authored, complete history included (the tag lives on the
events, surviving unfollows, deleted connection records, and relay
moves; migration is verbatim republish, `b` tags intact). The tag is
the *query handle*; the seal remains the *arbiter* — authored = tag
match AND seal `pubkey` match, since tags are copyable onto fabricated
or even genuine events. Everything is identity-derived: no
device-local state backs the archive.

Privacy: the self-alias is one `f` tag among each event's recipient
and junk aliases — a coinjoin-style anonymity set; per event it is
indistinguishable. Extracting it requires global co-occurrence
analysis (a self-alias recurs within one corpus; a relationship alias
spans two), yields only an anonymous corpus grouping, never an
identity, and attribution still requires an external leak. Weaker than
the per-relationship alias continuity already accepted.

## Connections (kind 30378)

A connection is explicit mutual consent between two keys, recorded
privately, editable by both parties, and portable across devices. The
record is a [FB](FB.md) envelope event with exactly two readers, made
replaceable:

```json
{
  "kind": 30378,
  "pubkey": "<connection key public key>",
  "created_at": 1790000500,
  "tags": [
    ["d", "<conn_addr>"],
    ["c", "<derived_identity_id of party A>"],
    ["c", "<derived_identity_id of party B>"]
  ],
  "content": "{\"v\":1,\"alg\":\"fb-ecdh-v1\",\"ct\":\"<base64>\",\"slots\":[\"<party A>\",\"<party B>\"]}",
  "id": "…",
  "sig": "<signed by the connection key>"
}
```

with derivations (domain-separated from all [FB](FB.md) values):

- `conn_addr = H(ECDH(a, b) ‖ "fb-conn-addr-v1")` — the pair's private
  address, carried as the `d` tag (which also provides replaceability).
- connection key: `H(ECDH(a, b) ‖ "fb-conn-key-v1")` interpreted as a
  secp256k1 secret key — the shared envelope key. Both parties can sign
  record updates; standard replaceability applies. The domain-separated
  hash means it cannot derive the alias, any conn_addr, or any CEK, and
  it signs nothing else in existence.
- `derived_identity_id = H(my_sk ‖ "fb-identity-v1")` — a per-identity
  opaque identifier derived from the secret key alone (unlinkable to
  the pubkey), carried as a `c` tag.

The decrypted payload carries the minimum fields:

```json
{
  "parties": ["<pubkey A>", "<pubkey B>"],
  "created_at": 1790000400,
  "status": "open",
  "sigs": [
    {"pk": "<pubkey A>", "sig": "<identity-key signature over the canonical payload without sigs>"},
    {"pk": "<pubkey B>", "sig": "…"}
  ]
}
```

- **States**: one signature = request; two signatures = connected;
  `status: "closed"` severs. Verification is client-side against
  `parties` — a party cannot forge the other's signature, so
  "connected" cannot be faked.
- Updates are atomic whole-record republishes (new slots for both
  parties — wrapping requires only public keys). Either party may
  repair a corrupted record by republishing the last known-good payload.

### Request delivery

There is deliberately **no queryable inbound inbox** — a selector
strangers can compute is a public inbox, spammable and enumerable.
Delivery is:

1. The proposer publishes the record (one signature).
2. The proposer notifies out-of-band: a [NIP-21](21.md)-style URI
   `nostr+fb:offer/<offerer npub>` (carries only a public key; safe over
   any transport), or a [NIP-17](17.md) message as the nostr-native
   fallback.
3. The recipient's client derives `conn_addr(me, offerer)` and queries
   `{"kinds":[30378], "#d":[conn_addr]}`.

On-encounter checking (derive and query on viewing any profile) is an
optimization, not a delivery mechanism.

### Enumeration

`{"#c": [my derived_identity_id]}` returns every record the querier has
touched — their connections and outgoing requests. Incoming unanswered
requests carry only the proposer's `c` tag, so a user's other devices
learn nothing about requests they have not acted on. This is the
fresh-device bootstrap: derive it, one query, full graph.

## Notifications

Alias and derived_identity_id derivation require the user's secret key (or a signer
oracle), so notification setup MUST be initiated on-device; afterwards
clients maintain subscriptions on alias tags and open note_ids. A push
delegate service MAY operate with the derived tag list alone — it can
detect that opaque events arrived but can never read them, and it never
receives keys.

## Relay requirements

None beyond [FB](FB.md)'s (which are none): all kinds and tags here are
ordinary NIP-01 constructs.

## Spam and abuse

**Threat.** Anyone can copy an observed public tag value (`f` on
`1370`s, `n` on `1470`s) onto fabricated events, which then match
queries. This can never inject content — a fabricated event cannot
decrypt under the CEK it claims, so fake replies, reactions, and
revisions are cryptographically impossible. It can only waste reader
CPU and bandwidth.

**PoW floor.** The note's payload declares `pow_floor` (default ~20
bits, app-tunable), governing every `1470` in that thread — replies,
nested replies, reactions, and revisions are all flat thread members,
so one declaration covers them. Clients verify [NIP-13](13.md) PoW
before any crypto and discard sub-floor events; they MAY also enforce a
global floor on `1370`s. Members MAY declare a higher floor inside
their own `1470` payloads (advisory ratchet: clients adopt the max
seen per thread); only the author's declaration is the baseline.
Relays MAY enforce static floors at ingest; per-thread relay
enforcement is impossible (floors are encrypted).

Detection costs (order-of-magnitude, one core):

| check | time |
|---|---|
| PoW verification (1 sha256 + bit count) | ~1 µs |
| one AEAD attempt | ~1 µs |
| ECDH derivation (reader KEK) | ~100 µs |
| junk `1470`, total (copied `n`, no PoW) | ~2 µs |
| junk `1370`, total (copied `f`, no PoW) | ~125 µs (1 ECDH + ~24 AEADs) |
| any junk, with floor enforced | ~1 µs |

Clients decrypt everything fetched — each junk event fails
independently and nothing is crowded out; a global per-sync cap bounds
CPU at pathological volume. [NIP-42](42.md) AUTH is admission plumbing,
not spam defense for these kinds.

## Hard rules

Settled decisions; implementations MUST NOT deviate:

1. **No replaceable events for notes or replies** — visible revision
   history is permanent (respect for engagers).
2. **No revision kind** — revisions are `1470` + `revision_of`; kinds
   are crypto roles, content typing lives in rumor kinds.
3. **No identifier shared across chunks**, ever.
4. **Two-tools rule** ([FB](FB.md)): slots are unqueryable, tags are
   groupable — nothing is both.
5. **No queryable inbound connection inbox.**
6. **Everything identity-derived** — no device-local state for the
   archive.

## Security and privacy considerations

Outsiders observe: event existence, jittered timestamps, slot and tag
counts (±20 noise), conversation existence and size via `n`-tag
groupings, graph-set continuity via shared `c` values, and per-alias
continuity ([FB](FB.md)). Outsiders cannot observe: content,
participants, authors, audience identities, payload kinds, connection
parties, or whether a note's audience was chunked.

Non-goals: retroactive revocation (unconnecting is forward-only);
traitor-proofing (recipients can always republish plaintext —
equivalent to screenshots); forward secrecy or post-compromise security
(per-note keys bound the blast radius; ratchets were considered and
rejected for statelessness); mutual plaintext deniability beyond what
NIP-59's rumor/seal split provides.

## Open questions

- Final confirmation of kind numbers against the registry of kinds, and
  of the single-character tag letters `f`/`k`/`n`/`c`.
- Recommended chunk size; reader bandwidth on first fetch of a chunked note.
- Canonical JSON and byte-level pinning for the connection payload
  signature base.
- Whether the connection-offer URI should be a [NIP-21](21.md) `nostr:`
  URL rather than `nostr+fb:`.
