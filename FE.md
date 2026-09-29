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
  **author seal**, signed by the author's identity key with standard
  event signing, whose content decrypts to an **unsigned rumor** of any
  kind. The seal's content is encrypted under the note CEK (not a
  pairwise conversation key). The seal is nested inside `ct` — it is
  never published as a top-level relay event.
- The rumor MUST carry a random 32-byte **reply CEK** as a tag
  (`["reply_cek", "<hex>"]`).
- The author SHOULD include a slot addressed to themself, so notes can
  be re-read from any device.

```
kind 1370 (burner-signed, alias tags, slots)
  └─ note CEK decrypts → kind 124 seal (author-signed)
       └─ note CEK decrypts → unsigned rumor (any kind, + reply CEK)
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
— exact results, standard pagination. The alias list is derived once per
session from the user's key and their contacts' public keys.
Author-pubkey queries are a degraded fallback (they return events the
querier cannot open, and pagination cannot indicate completeness).

## Replies (kind 1470)

- **All-viewers reply**: `content` is the [FB](FB.md) envelope with
  `ct = AEAD(reply CEK, seal)` — the replier's kind `124` seal wrapping
  their unsigned rumor; `tags` is `[["n", note_id]]` where
  `note_id = H(reply CEK ‖ "fb-note-id-v1")`. Replies carry no slots —
  every reader of the root note already holds the reply CEK.
- **To-OP-only reply**: a one-recipient private note (one slot, addressed
  to the root author) carrying the pairwise alias tag. It SHOULD NOT
  carry the `n` tag; clients MAY include it to render "private reply"
  placeholders. (`n` is used rather than `e` because the value is not an
  event id and `e` tooling would attempt to fetch it.)
- Every reply at any depth tags the note_id, so one query
  `{"#n": [note_id]}` returns the entire tree; parent references inside
  the rumors render the shape. Clients MUST paginate to an empty page
  to consider the top level complete.
- Reactions are all-viewers replies whose rumor is a [NIP-25](25.md)-style event.
- Reply CEKs never expire. Conversation membership is fixed at note
  creation; new members are admitted only by the author sending them
  the reply CEK in a one-off private note.

## Chunking for large audiences

A single event holds ~500 slots at a 64 KB relay limit. For larger
audiences the author MUST publish **chunk events**: multiple `1370`
events, each with its own note CEK and independently re-encrypted `ct`
(chunks carry no shared tag and are thus unlinkable), each rumor carrying
the same reply CEK. 6000 recipients ≈ 12 events.

## Editing

Edits are **revision events**: a new event of the same kind referencing
the event it revises (hash inside the rumor), sealed by the same author.
Clients render the latest revision per author and retain history —
append-only, no replaceable events, no retained signing keys. Revisions
and reactions SHOULD embed the hash of the exact parent revision they
respond to, allowing clients to display "edited after this reply"
without trusting relays.

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
   `nostr+fb:offer/<offerer npuk>` (carries only a public key; safe over
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
