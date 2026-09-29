NIP-FE
======

Feed Encryption
---------------

`draft` `optional`

This NIP defines a private social layer on nostr — private notes,
replies, and explicit pairwise connections — built on the false-bottom
envelope ([FB](FB.md)): a single event readable by many chosen
recipients and linkable to none of them. Its goal application is a
**private feed**: posting to a contact list without duplicating content
per follower.

It depends on [NIP-59](59.md)'s rumor/seal *layering* idea (author-signed
wrapper around an unsigned rumor), and on [FB](FB.md) for the envelope,
alias tags, and derivations. The seal here is its own kind — not NIP-59's `13`.

A private feed is comprised of private events (1370), where each is essentially a gift wrap but to many receipients instead of one. It uses false bottom encryption, to allow a payload for many recipients to work. As such the event is private, yet scales better than one copy per recipient.
These private events are not identifiable by pubkeys tied to the creator/reciever, yet are queryable. Thus making them private, but efficient. This is done by using shared alias', as defined with the connection event (30378).

## Kinds

| kind | description |
|---|---|
| `1370` | private note (top-level) |
| `1470` | private reply |
| `124` | author seal (nested; not published top-level) |
| `30378` | connection record (parameterized, replaceable) |

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
- Each `f` tag is an alias for one recipient, plus junk ([FB](FB.md) padding).
- `ct` decrypts (per the [FB](FB.md) reading algorithm) to a kind `124`
  **author seal**. The seal is nested inside `ct` — it is never
  published as a top-level relay event.
- The rumor MUST carry a random 32-byte **reply CEK** as a tag
  (`["reply_cek", "<hex>"]`).
- The author SHOULD include a slot addressed to themself, so notes can
  be re-read from any device.

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

Clients query `{"#f": [alias(contact, me), …], "kinds": [1370]}`
— exact results, standard pagination. That returns notes, chunks,
revisions, and to-OP-only replies. All-viewers replies have no `f`
tag; they are fetched with `{"#n": [note_id], "kinds": [1470]}` after
the parent rumor yields the reply CEK. The alias list is derived once
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
- Every all-viewers reply at any depth tags the `note_id`, so one query
  `{"#n": [note_id]}` returns the entire tree; parent references
  (`e` tags) inside the rumors render the shape. Clients MUST paginate
  to an empty page to consider the top level complete.
- Reactions are all-viewers replies whose rumor is a [NIP-25](25.md)-style event.
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
they are not query-linkable as one object. They remain grouped with
other notes via each recipient's stable `f` alias — the continuity
property already documented in [FB](FB.md). 6000 recipients ≈ 12
events. A given recipient only needs the chunk that contains their
slot.

## Editing

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

Edits are **revision events**: a new kind `1370` (new burner, new note
CEK, new slots), sealed by the same author, rumor carrying the same
`reply_cek` plus `revision_of`. Append-only — no replaceable events,
no retained signing keys.

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
    ["c", "<graph_id of party A>"],
    ["c", "<graph_id of party B>"]
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
- `graph_id = H(my_sk ‖ "fb-graph-v1")` — a per-user opaque identifier,
  carried as a `c` tag.

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

`{"#c": [my graph_id]}` returns every record the querier has touched —
their connections and outgoing requests. Incoming unanswered requests
carry only the proposer's `c` tag, so a user's other devices learn
nothing about requests they have not acted on. This is the fresh-device
bootstrap: derive graph_id, one query, full graph.

## Notifications

Alias and graph_id derivation require the user's secret key (or a signer
oracle), so notification setup MUST be initiated on-device; afterwards
clients maintain subscriptions on alias tags and open note_ids. A push
delegate service MAY operate with the derived tag list alone — it can
detect that opaque events arrived but can never read them, and it never
receives keys.

## Relay requirements

None beyond [FB](FB.md)'s (which are none): all kinds and tags here are
ordinary NIP-01 constructs.

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

- Final confirmation of kind numbers against the registry of kinds.
- Recommended chunk size; reader bandwidth on first fetch of a chunked note.
- Canonical JSON and byte-level pinning for the connection payload
  signature base.
- Whether the connection-offer URI should be a [NIP-21](21.md) `nostr:`
  URL rather than `nostr+fb:`.
