NIP-XX
======

Reservations
------------

`draft` `optional`

This NIP defines a protocol for creating, negotiating, committing, cancelling, and reviewing reservations against NIP-99 listings on Nostr. It introduces `kind:32122` reservation events, `kind:1326` append-only reservation transition events, `kind:1327` private structured-message rumors, `kind:1328` commit authorization helper events, `kind:1329` temporary trade key (temp-key) authorization helper events, and `kind:32124` reviews.

Negotiation is private. Signed reservation and escrow-selection events are sent as child events inside encrypted structured-message rumors and delivered with NIP-59 gift wraps. Public committed/cancelled reservation snapshots and transition records are published to relays chosen by the implementation.

## Terms

- **Buyer** — Nostr user requesting a reservation.
- **Seller** — Nostr user who owns the listing being reserved.
- **Escrow** — Optional service participant that verifies funding and can arbitrate disputes.
- **Trade** — A single reservation negotiation and lifecycle, identified by a stable `d` tag (trade ID).
- **Listing Anchor** — A NIP-99 listing address in the format `<listing-kind>:<seller-pubkey>:<listing-d-tag>`.
- **Temporary Trade Key (Temp-Key)** — A per-trade Nostr key that can publish buyer-side reservation events without revealing the buyer's long-lived account key on public relays. The buyer's account identity is bound to this temporary key through encrypted `participant_proof` tags, preserving buyer privacy while still allowing counterparties, escrows, and review verifiers to prove participation when needed.

## Event Kinds

| Kind    | Name                    | Type                      | Description |
| ------- | ----------------------- | ------------------------- | ----------- |
| `32122` | Reservation             | Parameterized replaceable | A participant's reservation proposal, commitment, or cancellation. |
| `1326`  | Reservation Transition  | Regular                   | Append-only audit record of a reservation stage change. |
| `1327`  | Structured Message      | Regular private rumor     | Private structured-message rumor whose content is a signed child event JSON string. |
| `1328`  | Commit Authorization    | Regular helper event      | Seller authorization over exact negotiated commit terms. |
| `1329`  | Temp-Key Authorization  | Regular helper event      | Identity-key authorization binding a real participant pubkey to a temporary trade key (temp-key) participant pubkey. |
| `32124` | Review                  | Parameterized replaceable | Post-trade review with participation proof. |

## Reservation (`kind:32122`)

A reservation event represents one participant's current position in a trade. Multiple participants (buyer, seller, and optionally escrow) may each publish reservation events sharing the same `d` tag.

### Stages

| Stage       | Description |
| ----------- | ----------- |
| `negotiate` | Mutable private proposal or counteroffer. Negotiate-stage reservations are sent only between buyer and seller as private structured-message child events delivered with NIP-59 gift wraps, so they are not observed by the wider relay network. |
| `commit`    | Reservation commitment. Public commit-stage events affect listing availability unless cancelled. |
| `cancel`    | Cancellation of a negotiation or prior commitment. |

### Tags

```json
[
  ["d", "<trade-id>"],
  ["a", "<listing-anchor>"],
  ["p", "<participant-pubkey>", "<relay-hint>", "<role>"],
  ["participant_proof", "<role>", "<participant-pubkey>", "<recipient-pubkey>", "nip44", "<payload-sha256>", "<encrypted-payload>"],
  ["published_at", "<unix-seconds>"]
]
```

| Tag | Required | Description |
| --- | -------- | ----------- |
| `d` | Yes | Trade identifier. Stable across all events in the trade. Private trade messages SHOULD repeat this value in a `conversation` tag on the enclosing rumor. |
| `a` | Yes | Listing anchor (`<listing-kind>:<seller-pubkey>:<listing-d-tag>`). The referenced event MUST be a NIP-99 listing. |
| `p` | Yes | Participant pubkey. When a role is known, use `["p", pubkey, relayHint, role]` where role is `seller`, `buyer`, or `escrow`. |
| `participant_proof` | No | Encrypted proof binding a temporary trade key (temp-key) participant pubkey to a real identity pubkey. Required when `participantPubkey != identityPubkey`. |
| `published_at` | No | First publication timestamp. Publishers SHOULD preserve this across replacements. |

### Participant Proofs

Participant proofs bind temporary trade key (temp-key) participant pubkeys to real participant identity pubkeys without forcing the buyer to disclose their long-lived account key publicly.

`participant_proof` tag format:

```json
[
  "participant_proof",
  "<role>",
  "<participant-pubkey>",
  "<recipient-pubkey>",
  "nip44",
  "<sha256-of-plaintext-authorization>",
  "<nip44-encrypted-authorization-payload>"
]
```

The plaintext authorization payload is a JSON-encoded signed `kind:1329` Temp-Key Authorization event. It is encrypted with NIP-44 for each trade participant recipient.

#### Temp-Key Authorization (`kind:1329`)

The `kind:1329` event is signed by the real identity pubkey and authorizes one participant pubkey for a trade role.

Tags:

```json
[
  ["a", "<listing-anchor>"],
  ["d", "<trade-id>"]
]
```

Content:

```jsonc
{
  "version": 1,
  "role": "buyer",
  "participantPubkey": "<temp-key-or-real-participant-pubkey>"
}
```

A verifier accepts a participant proof only when:

1. the `participant_proof` hash matches the decrypted authorization payload;
2. the authorization event is validly signed by the identity pubkey;
3. the authorization `a` tag matches the listing anchor;
4. the authorization `d` tag matches the reservation trade id;
5. the authorization content role and participant pubkey match the `participant_proof` tag.

### Content

Reservation content is JSON:

```jsonc
{
  "start": "2026-05-01T00:00:00.000Z",
  "end": "2026-05-05T00:00:00.000Z",
  "stage": "negotiate",
  "quantity": 1,
  "amount": {
    "value": "0.00500000",
    "denomination": "BTC",
    "decimals": 8
  },
  "recipient": "<recipient-or-trade-pubkey>",
  "proof": null,
  "commitAuthorization": null
}
```

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `stage` | string | Yes | One of `negotiate`, `commit`, `cancel`. |
| `start` | string | No | Reservation start date/time in ISO 8601 UTC. Date-only reservation UIs SHOULD encode calendar dates as midnight UTC. |
| `end` | string | No | Reservation end date/time in ISO 8601 UTC. |
| `quantity` | integer | No | Number of units. Default `1`. |
| `amount` | object | No | Agreed or proposed price. `value` is a decimal string, `denomination` is the unit of account, and `decimals` is precision. |
| `recipient` | string | No | Intended payment/trade recipient pubkey. |
| `proof` | object | No | Payment proof. Present on committed self-signed or escrow-backed reservations. |
| `commitAuthorization` | object | No | Full signed `kind:1328` event JSON authorizing negotiated terms. |

### Commit Terms

The reservation commitment hash locks exactly these fields:

```json
["start", "end", "quantity", "amount", "recipient"]
```

Implementations MUST canonicalize those fields before hashing. `stage`, `proof`, and participant proof tags are not part of the commit terms.

#### Commit Authorization (`kind:1328`)

When the seller accepts off-list or negotiated terms, the seller signs a `kind:1328` event authorizing the reservation commit hash.

Tags:

```json
[
  ["a", "<listing-anchor>"],
  ["d", "<trade-id>"]
]
```

Content:

```jsonc
{
  "version": 1,
  "commitHash": "<reservation-commit-hash>",
  "role": "seller"
}
```

The reservation is authorized only if the commit authorization was signed by the listing owner, references the same listing anchor and trade id, and contains the reservation's commit hash.

## Private Structured Messages (`kind:1327`)

Private structured trade messages use `kind:1327` as the inner rumor kind. The rumor `content` is the JSON string of a signed child event, usually a `kind:32122` reservation or `kind:30302` escrow-service selection.

The rumor includes `p` tags for the recipients and SHOULD include `["conversation", "<trade-id>"]` for trade-related messages. The `conversation` tag is the private-message grouping mechanism; reservation and escrow-selection child events do not carry their own grouping tag. The rumor MAY include `alt` tags. It is sealed and wrapped with NIP-59. The sender broadcasts one `kind:1059` gift wrap for every recipient and one for self.

Plain text private messages use standard private message rumor kind `14`.

## Reservation Transition (`kind:1326`)

Every public reservation stage change MUST be accompanied by a transition event. Transitions form an append-only audit trail per participant.

Reservation transitions are not the source of truth for reservation state because they are self-published by individual participants. Clients derive public state from validated reservation snapshots, payment proofs, escrow confirmations, and the reservation-group ordering rules below. However, a participant that publishes an invalid transition tree risks creating an unusable audit trail; an escrow may arbitrate against that participant if it cannot follow their updates to the reservation state.

### Tags

```json
[
  ["d", "<trade-id>"],
  ["t", "<trade-id>"],
  ["e", "<reservation-event-id>"],
  ["prev", "<previous-transition-event-id>"],
  ["a", "<listing-anchor>"]
]
```

| Tag | Required | Description |
| --- | -------- | ----------- |
| `d` | Yes | Canonical trade identifier matching the reservation `d` tag. Consumers MUST use this tag for reservation-transition identity and lookups. |
| `t` | No | Backward-compatible trade-id hashtag/search tag. When present it MUST equal `d`. Publishers SHOULD include it while older consumers still query transitions by `#t`; consumers MAY query it as a fallback but MUST NOT treat it as canonical. |
| `e` | Yes | Reservation event this transition applies to. |
| `prev` | No | Previous transition event id in this participant's transition chain. Omit only for the first transition. |
| `a` | No | Listing anchor. SHOULD be included when known. |

### Content

```jsonc
{
  "transitionType": "commit",
  "fromStage": "negotiate",
  "toStage": "commit",
  "commitTermsHash": "<sha256-hex>",
  "reason": "Accepted by seller",
  "updatedFields": {}
}
```

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `transitionType` | string | Yes | One of `counterOffer`, `commit`, `cancel`, `confirm`. |
| `fromStage` | string | Yes | Stage before this transition. |
| `toStage` | string | Yes | Stage after this transition. |
| `commitTermsHash` | string | No | Commit-terms hash at the time of transition. |
| `reason` | string | No | Human-readable explanation. |
| `updatedFields` | object | No | Snapshot of changed fields, useful for counteroffers. |

### State Machine

Legal transitions per participant:

```
negotiate -> negotiate   counterOffer
negotiate -> commit      commit
negotiate -> cancel      cancel
commit    -> cancel      cancel
commit    -> commit      confirm
```

Clients MUST validate:

1. each transition's `(fromStage, toStage)` is legal for its `transitionType`;
2. consecutive transitions chain correctly: previous `toStage == next fromStage`;
3. transition order is derived from the `prev` chain, not from `created_at`;
4. disconnected chains, multiple roots, and forks are invalid unless resolved by application policy.

### Escrow Monotonicity

Escrow MAY publish `negotiate -> commit` or `negotiate -> cancel` before accepting a trade. Escrow MUST NOT publish `commit -> cancel`. Once escrow confirms a funded trade, financial resolution must happen through payment settlement, claim, release, or arbitration rather than by erasing the committed reservation state.

## Verification

Clients verify reservations for two primary reasons:

1. to determine availability for the referenced NIP-99 listing;
2. to verify that reviews are attached to a real trade.

Availability verification is based on public reservation groups after applying the validity and precedence rules in the Reservation Group section. Review verification proves that the reviewer participated in a structurally valid reservation group that reached confirmed commitment.

## Payment Proof

A `commit` reservation SHOULD include a `proof` object unless it is a seller-published blocked reservation.

### Zap Proof

```jsonc
{
  "seller": { "...": "seller profile/event JSON" },
  "listing": { "...": "NIP-99 listing event JSON" },
  "zapProof": {
    "receipt": { "...": "zap receipt event JSON" }
  },
  "escrowProof": null
}
```

### Escrow Proof

```jsonc
{
  "seller": { "...": "seller profile/event JSON" },
  "listing": { "...": "NIP-99 listing event JSON" },
  "zapProof": null,
  "escrowProof": {
    "txHash": "<evm-transaction-hash>",
    "escrowService": "<JSON string of the EscrowService kind:30303 event>",
    "sellerEscrowMethods": "<JSON string of the seller's EscrowMethod kind:17388 event>"
  }
}
```

See the Escrow Services NIP for escrow verification requirements.

### Seller-Published Reservations

The listing owner MAY publish `commit` reservations without a payment proof, for example to block dates. Clients MAY accept proofless reservations when `reservation.pubkey == listing.pubkey`.

## Reservation Group

All reservation events with the same trade id and listing anchor form a reservation group. Role-marked `p` tags are routing and discovery hints; they MUST NOT by themselves add authority to the group. Clients establish participants from signed reservation authors that satisfy the role rules below, the listing owner derived from the listing anchor, valid participant proofs, valid escrow proofs, and valid escrow-authored reservations.

Roles are determined by:

| Role | Determination |
| ---- | ------------- |
| Seller | `pubkey == getPubKeyFromAnchor(listingAnchor)`. A `p` tag role of `seller` is only a hint unless it identifies the listing owner. |
| Buyer | A participant with role `buyer`, including a temporary trade key (temp-key) participant resolved through a valid `participant_proof`. |
| Escrow | A participant with role `escrow` only when it is the pubkey of the escrow service in a valid escrow proof or the author of an escrow-authored reservation for that trade. |

The group id SHOULD be derived from the listing anchor, trade id, and sorted established participant set. Clients MUST ignore role-marked `p` tags and reservation events from outsiders that cannot be tied to the listing owner, a valid participant proof, a valid escrow proof, or a valid escrow-authored reservation.

### Group Validity Ordering

The validity of a reservation group is ordered by participant authority:

1. buyer reservation with attached proof;
2. escrow reservation for the same trade id, which can confirm with `stage=commit` or override the buyer proof with `stage=cancel`;
3. seller reservation for the same trade id, which overrides buyer and escrow reservations.

Clients SHOULD first evaluate the buyer's latest public reservation and attached proof. A buyer `commit` can make a listing appear tentatively unavailable only if its payment proof validates or is confirmed by an escrow or seller reservation. An escrow SHOULD immediately publish either `stage=commit` or `stage=cancel` for the same trade id after validating or rejecting a buyer payment proof. This prevents ordinary clients from having to validate against the payment chain for hundreds of public reservations on a listing.

Seller reservations have highest precedence for listing availability because the seller owns the referenced listing. A seller `commit` confirms the trade or blocks the listed inventory even without buyer proof. A seller `cancel` invalidates buyer or escrow claims for availability purposes, while financial disputes after escrow commitment remain governed by escrow settlement, claim, release, or arbitration rules.

The group stage is derived after applying that ordering:

- `cancel` if the highest-precedence applicable reservation is cancelled;
- `commit` if the highest-precedence applicable reservation is committed;
- `negotiate` otherwise.

A group is **confirmed committed** if any of the following hold after validation:

- the seller has a `commit` reservation;
- the escrow has a `commit` reservation;
- the buyer's escrow-backed payment proof validates on-chain.

Later buyer or seller cancellation MUST NOT by itself erase the fact that a trade reached confirmed commitment.

## Review (`kind:32124`)

After a completed or confirmed committed trade, a participant MAY publish a review.

### Tags

```json
[
  ["d", "<trade-id>"],
  ["a", "<listing-anchor>"],
  ["r", "<reservation-anchor>"]
]
```

The `d` tag contains the reservation trade id. Reviews are parameterized replaceable events, so a participant replaces their review for the same trade by publishing a newer review with the same `d` tag.

The `r` tag contains a reservation anchor (`<kind>:<pubkey>:<d-tag>`) linking the review to a specific trade participant event.

### Content

```jsonc
{
  "rating": 4,
  "content": "Clear terms, smooth payment, and accurate listing.",
  "proof": {
    "role": "buyer",
    "participantPubkey": "<participant-or-temp-key-pubkey>",
    "authorizationPayload": "<plaintext signed kind:1329 event JSON>"
  }
}
```

| Field | Type | Description |
| ----- | ---- | ----------- |
| `rating` | integer | Rating from 1 to 5. |
| `content` | string | Review text. |
| `proof` | object | Participation proof revealing the signed authorization payload that matches a reservation `participant_proof` hash. |

### Review Validity

A review is valid only if:

1. the proof's `authorizationPayload` hashes to a `participant_proof` payload hash in the referenced reservation group;
2. the decoded `kind:1329` authorization event is valid and matches the claimed role, participant pubkey, listing anchor, and trade id;
3. the referenced reservation group validates structurally;
4. the reservation group is confirmed committed.

This NIP does not define a canonical on-chain or block-time proof that the review was written after the reservation ended. Clients MAY additionally require the reservation end time to be in the past or a terminal payment event to exist, but those timing rules are application policy unless standardized separately.

## Protocol Flow

### 1. Buyer Initiates Negotiation

1. Buyer discovers a NIP-99 listing.
2. Buyer allocates a trade id and temporary trade key (temp-key). Deterministic derivation is optional and described in the addendum below.
3. Buyer creates a `kind:32122` reservation with `stage=negotiate`, signed by the temporary trade key (temp-key).
4. Buyer includes role-marked participant `p` tags and encrypted `participant_proof` tags as needed.
5. Buyer sends the reservation as a child event inside a private `kind:1327` rumor tagged `["conversation", "<trade-id>"]`, delivered with NIP-59 gift wraps to the seller and self.

### 2. Negotiation

6. Seller reviews the request. If counter-offering, seller creates a new `stage=negotiate` reservation with changed terms.
7. If the seller accepts negotiated terms, the seller signs a `kind:1328` commit authorization and embeds it in the reservation content.
8. Counteroffers continue privately until terms are accepted or cancelled.

### 3. Escrow Selection and Payment

9. If escrow-backed, buyer sends a private `kind:30302` Escrow Service Selected child event inside a `kind:1327` rumor tagged `["conversation", "<trade-id>"]`.
10. Buyer funds escrow directly or via a Lightning-to-on-chain swap.

### 4. Commitment

11. Once payment proof exists, the buyer or temporary trade key (temp-key) publishes a public `stage=commit` `kind:32122` reservation with `proof`.
12. A matching `kind:1326` transition is published.
13. Seller or escrow MAY publish their own `stage=commit` reservation/confirmation.

### 5. Cancellation

Either party MAY cancel a private negotiation with a private `stage=cancel` reservation child event. After public commitment, cancellation publishes a public `stage=cancel` reservation plus a `kind:1326` cancel transition. Escrow may only cancel before it has committed.

## Availability

Clients MUST only consider public reservation groups after applying the Reservation Group validity ordering when computing listing availability. Negotiation reservations are exchanged only between buyer and seller via gift-wrapped private structured messages, so they are not part of public listing availability calculations.

Reservation clients SHOULD verify that the referenced listing is an active NIP-99 listing before displaying or accepting a reservation.

## Addendum: How to Choose Temporary Keys

Temporary trade keys (temp-keys) exist to preserve privacy by separating a buyer's public account identity from public reservation events. This NIP does not require deterministic values for trade ids or temporary keys. A client MAY generate a fresh random trade id and random temporary key for each trade and store the resulting private state locally.

A Nostr user MAY instead publish a single encrypted SEED event (`kind:17389`) globally. The SEED event content is a NIP-44 encrypted payload from the user's identity key to itself, for example:

```jsonc
{
  "v": 1,
  "seed": "<32-byte-hex-seed>"
}
```

Clients that can decrypt this SEED event can derive arbitrary trade ids and temporary trade keys from the seed, avoiding dependence on one device's local storage of encrypted gift wraps for each individual trade. This is a convenience and recovery mechanism, not a consensus requirement: clients MUST accept valid reservations and participant proofs regardless of whether their trade ids and temporary keys were random, locally stored, or derived from a published SEED event.

Clients that implement deterministic derivation SHOULD domain-separate trade ids from temporary keys and SHOULD include an account-controlled index or nonce so the same seed never produces the same public key for two unrelated trades.

## Related NIPs

- [NIP-01](01.md) — Event structure and parameterized replaceable events.
- [NIP-99](99.md) — Classified listings.
- [NIP-17](17.md) — Private message rumor kind `14`.
- [NIP-19](19.md) — `naddr` encoding for anchors.
- [NIP-44](44.md) — Encryption scheme.
- [NIP-57](57.md) — Zaps.
- [NIP-59](59.md) — Gift wrap.
