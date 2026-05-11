NIP-XX
======

Reservations
------------

`draft` `optional`

This NIP defines a protocol for creating, negotiating, committing, cancelling, and reviewing accommodation reservations on Nostr. It introduces `kind:32122` reservation events, `kind:1326` append-only reservation transition events, `kind:1327` private structured-message rumors, `kind:1328` commit authorization helper events, `kind:1329` trade-key authorization helper events, and `kind:32124` reviews.

Negotiation is private. Signed reservation and escrow-selection events are sent as child events inside encrypted structured-message rumors and delivered with NIP-59 gift wraps. Public committed/cancelled reservation snapshots and transition records are published to relays chosen by the implementation.

## Terms

- **Buyer** — Nostr user requesting a reservation.
- **Seller** — Nostr user who owns the listing being reserved.
- **Escrow** — Optional service participant that verifies funding and can arbitrate disputes.
- **Trade** — A single reservation negotiation and lifecycle, identified by a stable `d` tag (trade ID).
- **Listing Anchor** — A NIP-99 accommodation listing address in the format `30402:<seller-pubkey>:<listing-d-tag>`.
- **Trade Key** — A per-trade Nostr key that can publish buyer-side reservation events. The buyer's account identity is bound to this key through encrypted `participant_proof` tags.

## Event Kinds

| Kind    | Name                    | Type                      | Description |
| ------- | ----------------------- | ------------------------- | ----------- |
| `32122` | Reservation             | Parameterized replaceable | A participant's reservation proposal, commitment, or cancellation. |
| `1326`  | Reservation Transition  | Regular                   | Append-only audit record of a reservation stage change. |
| `1327`  | Structured Message      | Regular private rumor     | Private structured-message rumor whose content is a signed child event JSON string. |
| `1328`  | Commit Authorization    | Regular helper event      | Seller authorization over exact negotiated commit terms. |
| `1329`  | Trade-Key Authorization | Regular helper event      | Identity-key authorization binding a real participant pubkey to a trade-key participant pubkey. |
| `32124` | Review                  | Parameterized replaceable | Post-stay review with participation proof. |

These kinds are application-specific and SHOULD be routed only to relays that support this protocol when broadcast as public events. Gift-wrapped private messages use standard NIP-59 outer `kind:1059` events and MAY be routed according to the implementation's private-message relay policy.

## Reservation (`kind:32122`)

A reservation event represents one participant's current position in a trade. Multiple participants (buyer, seller, and optionally escrow) may each publish reservation events sharing the same `d` tag.

### Stages

| Stage       | Description |
| ----------- | ----------- |
| `negotiate` | Mutable private proposal or counteroffer. Negotiate-stage reservations MUST only be exchanged as private messages in the negotiation protocol and MUST NOT be broadcast as public events. Clients MUST NOT treat negotiate-stage events as affecting availability. |
| `commit`    | Booking commitment. Public commit-stage events affect listing availability unless cancelled. |
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
| `a` | Yes | Listing anchor (`30402:<seller-pubkey>:<listing-d-tag>`). The referenced event MUST be a NIP-99 classified listing with `["t", "accommodation"]`. |
| `p` | Yes | Participant pubkey. When a role is known, use `["p", pubkey, relayHint, role]` where role is `seller`, `buyer`, or `escrow`. |
| `participant_proof` | No | Encrypted proof binding a trade-key participant pubkey to a real identity pubkey. Required when `participantPubkey != identityPubkey`. |
| `published_at` | No | First publication timestamp. Publishers SHOULD preserve this across replacements. |

### Participant Proofs

Participant proofs bind trade-key participant pubkeys to real participant identity pubkeys.

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

The plaintext authorization payload is a JSON-encoded signed `kind:1329` Trade-Key Authorization event. It is encrypted with NIP-44 for each trade participant recipient.

#### Trade-Key Authorization (`kind:1329`)

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
  "participantPubkey": "<trade-key-or-real-participant-pubkey>"
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
| `start` | string | No | Check-in date/time in ISO 8601 UTC. Date-only reservation UIs SHOULD encode calendar dates as midnight UTC. |
| `end` | string | No | Check-out date/time in ISO 8601 UTC. |
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

Implementations SHOULD canonicalize those fields before hashing. `stage`, `proof`, and participant proof tags are not part of the commit terms.

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

### Tags

```json
[
  ["d", "<trade-id>"],
  ["e", "<reservation-event-id>"],
  ["prev", "<previous-transition-event-id>"],
  ["a", "<listing-anchor>"]
]
```

| Tag | Required | Description |
| --- | -------- | ----------- |
| `d` | Yes | Trade identifier matching the reservation `d` tag. |
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

## Payment Proof

A `commit` reservation SHOULD include a `proof` object unless it is a seller-published blocked reservation.

### Zap Proof

```jsonc
{
  "seller": { "...": "seller profile/event JSON" },
  "listing": { "...": "kind:30402 NIP-99 accommodation listing event JSON" },
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
  "listing": { "...": "kind:30402 NIP-99 accommodation listing event JSON" },
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

All reservation events with the same trade id form a reservation group. The participant set is the union of event pubkeys, role-marked `p` tags, and any identity pubkeys revealed through valid participant proofs.

Roles are determined by:

| Role | Determination |
| ---- | ------------- |
| Seller | `pubkey == getPubKeyFromAnchor(listingAnchor)` or a `p` tag role of `seller`. |
| Buyer | A participant with role `buyer`, including a trade-key participant resolved through `participant_proof`. |
| Escrow | A participant with role `escrow`, or the pubkey of the escrow service in a valid escrow proof. |

The group id SHOULD be derived from the sorted participant set and trade id. Clients MUST reject reservation events from outsiders not in the established participant set.

The group stage is:

- `cancel` if any participant has cancelled;
- `commit` if any participant has committed and none cancelled;
- `negotiate` otherwise.

A group is **confirmed committed** if any of the following hold after validation:

- the seller has a `commit` reservation;
- the escrow has a `commit` reservation;
- the buyer's escrow-backed payment proof validates on-chain.

Later buyer or seller cancellation MUST NOT by itself erase the fact that a trade reached confirmed commitment.

## Review (`kind:32124`)

After a completed or confirmed committed stay, a participant MAY publish a review.

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
  "content": "Great stay, beautiful views and very clean.",
  "proof": {
    "role": "buyer",
    "participantPubkey": "<participant-or-trade-pubkey>",
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

This NIP does not define a canonical on-chain or block-time proof that the review was written after checkout. Clients MAY additionally require checkout to be in the past or a terminal payment event to exist, but those timing rules are application policy unless standardized separately.

## Protocol Flow

### 1. Buyer Initiates Negotiation

1. Buyer discovers a NIP-99 accommodation listing (`kind:30402`, `["t", "accommodation"]`).
2. Buyer allocates a deterministic trade id and trade key.
3. Buyer creates a `kind:32122` reservation with `stage=negotiate`, signed by the trade key.
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

11. Once payment proof exists, the buyer/trade key publishes a public `stage=commit` `kind:32122` reservation with `proof`.
12. A matching `kind:1326` transition is published.
13. Seller or escrow MAY publish their own `stage=commit` reservation/confirmation.

### 5. Cancellation

Either party MAY cancel a private negotiation with a private `stage=cancel` reservation child event. After public commitment, cancellation publishes a public `stage=cancel` reservation plus a `kind:1326` cancel transition. Escrow may only cancel before it has committed.

## Availability

Clients MUST only consider public `stage=commit` reservations from active, non-cancelled groups when computing listing availability. Private `stage=negotiate` events MUST NOT affect availability.

Reservation clients SHOULD verify that the referenced listing is an active NIP-99 accommodation listing before displaying or accepting a reservation. For this protocol, listing subtype such as `villa`, `hotel`, or `apartment` is determined by the listing's `type` tag and its relay-indexed `T` duplicate, not by additional `t` tags.

## Related NIPs

- [NIP-01](01.md) — Event structure and parameterized replaceable events.
- [NIP-99](99.md) — Classified listings.
- [NIP-17](17.md) — Private message rumor kind `14`.
- [NIP-19](19.md) — `naddr` encoding for anchors.
- [NIP-44](44.md) — Encryption scheme.
- [NIP-57](57.md) — Zaps.
- [NIP-59](59.md) — Gift wrap.
