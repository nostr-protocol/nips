NIP-XX
======

Event Timestamp Attestations
----------------------------

`draft` `optional`

This NIP defines a Nostr event kind for publishing a signed *Event Timestamp Attestation* (hereafter "attestation") that references another event. The attestation's `created_at` field represents the signer's claimed receipt timestamp for the referenced event.

This NIP is complementary to [NIP-03](03.md) (OpenTimestamps Attestations for Events). NIP-03 provides trustless timestamping via Bitcoin blockchain anchoring at the cost of latency (≥10 minutes per confirmation) and operational complexity. This NIP provides immediate, lightweight timestamping based on trust in a third-party signer. Applications choose between the two based on their trust and latency requirements.

## Motivation

Many applications need authoritative receipt timestamps for events:

- **Real-time turn-based games**: chess, shogi, xiangqi, and similar games where per-move timing is decisive.
- **Auctions and bidding**: where the ordering and timing of bids determines the outcome.
- **Live contests and polls**: where the moment of a contribution affects its validity.
- **Audit logs**: regulatory or organizational trails requiring third-party witness.
- **Receipt acknowledgments**: a party formally attesting they received a specific event at a specific moment.

For these use cases, the `created_at` field of the original event is set by the event's author, who may have an incentive to misrepresent it. A third-party attestation, signed by a party with no such incentive, establishes an independent timing claim that consumers can rely on to the extent they trust the signer.

NIP-03 addresses related needs via Bitcoin-anchored OpenTimestamps. Its trust model is trustless, but its latency and infrastructure footprint make it unsuitable for high-frequency, low-latency applications. This NIP fills that gap with a minimal primitive that any party may publish and any consumer may evaluate based on their trust in the signer.

This NIP defines the primitive only. It deliberately does NOT specify who may produce authoritative attestations for any particular application; that designation is the responsibility of application-layer NIPs that consume this primitive.

## Specification

### Event kind

`kind: 1041` (tentative)

The choice of `1041` is deliberate: it sits adjacent to NIP-03's kind `1040`, signalling that this NIP addresses a related concern (event-level timestamping) under a different trust model. Implementers SHOULD verify the kind has not been claimed by another draft before adoption.

Attestation events are **regular events** per NIP-01: immutable once signed and broadcast. Replaceable or addressable semantics are intentionally not used: an attestation is an audit artifact whose function — third-party witness to a moment in time — requires immutability. A replaceable attestation could be silently rewritten by its signer, defeating that function. Regular-event semantics additionally allow any relay to replicate an attestation independently, strengthening its value as a durable timing anchor.

### Tags

#### Required tag

| Tag | Cardinality | Value | Description |
|-----|-------------|-------|-------------|
| `e` | exactly one with marker `attests` | event id, optional relay hint, marker | reference to the attested event |

The required `e` tag MUST carry the marker `attests` as its fourth element:

```
["e", "<attested_event_id>", "<relay_hint>", "attests"]
```

The relay hint (third element) is OPTIONAL but SHOULD be present.

Exactly one `e` tag with the marker `attests` MUST be present. An event of this kind that does not contain exactly one such tag is non-conforming and MUST NOT be treated as an attestation per this NIP.

The use of a marker as the fourth element of an `e` tag follows the convention introduced by [NIP-10](10.md).

#### Optional tags

Higher-layer NIPs MAY define additional tags for application-specific semantics:

- Additional `e` tags with markers (fourth element) for contextual references (e.g., a root or chain anchor).
- `p` tags for indexing and notification routing of interested parties.
- Other application-specific tags as defined by consuming NIPs.

Application-specific markers SHOULD use a namespacing convention (e.g., a short application or domain prefix such as `chess:root`) to avoid future collisions with general-purpose markers that may be standardized in subsequent NIPs. Bare, generic marker names (`context`, `parent`, `anchor`, …) SHOULD be avoided for application-specific use.

This NIP imposes no semantic on tags beyond the required `attests`-marked `e` tag. Consumers of an attestation MAY ignore unknown tags.

### Content

The `content` field MUST be the empty string (`""`).

An attestation carries no subjective payload: the signer attests they received the referenced event at the moment indicated by `created_at`. The semantics are fully carried by the signature, the `created_at` field, and the `attests`-marked `e` tag. A non-empty `content` field would either be ignored (creating a misleading impression of relevance) or introduce a side channel for subjective claims in an event meant to be purely objective. Forcing the empty string removes this ambiguity.

### Semantic constraints

A conforming attestation MUST satisfy ALL of the following:

1. Exactly one `e` tag is present carrying the marker `attests` as its fourth element. Additional `e` tags with other markers MAY be present per application-specific semantics.
2. The `content` field is the empty string.

Both constraints are checkable from the event alone (stateless validation). Relays and clients can validate attestations without fetching any external event.

#### Handling of non-conforming events

Relays MAY reject events of kind `1041` that violate the constraints above. Clients MUST ignore non-conforming events for any timing purpose, even if a relay has accepted them.

Properties that require cross-event access — for example, the logical consistency of the attestation's `created_at` relative to the attested event's `created_at`, or the signature validity of the attested event — are NOT relay-level validation requirements. They are consumer-side concerns; see §Security considerations.

## Application

This NIP defines a primitive. Higher-layer NIPs that wish to use authoritative receipt timing layer their own semantics on top:

- **Designating authoritative signers**: an application MAY restrict the set of signers whose attestations are considered authoritative for that application. Attestations from non-designated signers MAY still exist on relays but are ignored by the application's timing logic.
- **Application-specific context**: an application MAY define additional `e` tag markers for chain or root references that facilitate discovery, following the namespacing convention recommended above.
- **Timing semantics**: an application defines how the attestation's `created_at` interacts with its domain (e.g., anchoring a time-control budget, ordering bids).

A representative example: a turn-based game protocol designates a `timestamper` role at game creation via the game's founding event. Attestations from that specific signer, referencing the game's move events, are authoritative for the game's time accounting. Attestations from any other signer are ignored by the game's timing logic, even if otherwise valid per this NIP.

The separation of concerns is intentional:

- **This NIP** defines what an attestation IS (the structural and cryptographic primitive).
- **The application's NIP(s)** define WHICH attestations are authoritative for that application's purposes (the trust restriction).

## Examples

### Example 1 — Standalone attestation

A witness `W` attests they received an event published by another party at the moment `W` signed:

```json
{
  "kind": 1041,
  "pubkey": "<witness_pubkey>",
  "created_at": 1748131201,
  "tags": [
    ["e", "<attested_event_id>", "wss://relay.example.com", "attests"]
  ],
  "content": "",
  "id": "...",
  "sig": "..."
}
```

The attestation's `created_at` is `W`'s claim of when they received the attested event. Consumers who trust `W` use this timestamp as the receipt moment; consumers who do not trust `W` ignore the attestation.

### Example 2 — Application-contextual attestation

An application that uses this primitive for a chain of related events MAY include an additional `e` tag with an application-defined marker for discovery:

```json
{
  "kind": 1041,
  "pubkey": "<timestamper_pubkey>",
  "created_at": 1748131500,
  "tags": [
    ["e", "<attested_event_id>", "wss://relay.example.com", "attests"],
    ["e", "<root_event_id>", "wss://relay.example.com", "chess:root"]
  ],
  "content": "",
  "id": "...",
  "sig": "..."
}
```

The first `e` tag (marker `attests`) identifies the attested event per this NIP. The second `e` tag (marker `chess:root`) is application-specific — here it identifies the founding event of a game in a chess-domain application. The marker is namespaced (`chess:`) to avoid collision with future general-purpose markers. The semantic interpretation of any application-specific marker is defined by the consuming application's NIP, not by this NIP.

## Relationship to other NIPs

| NIP                                  | Relationship                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NIP-10 (Marker conventions)          | Structural dependency. The use of a marker as the fourth element of an `e` tag (here, `attests`) follows the convention defined by NIP-10. Application-specific markers, when used in additional `e` tags, also follow this convention.                                                                                                                                                                                               |
| NIP-03 (OpenTimestamps Attestations) | Complementary. NIP-03 provides trustless timestamping via Bitcoin blockchain; this NIP provides trusted-third-party timestamping with no blockchain dependency. Use NIP-03 when trustlessness matters and latency is acceptable; use this NIP when latency matters and a trusted party is available. The two NIPs do not conflict; an event MAY have both an OpenTimestamps Attestation and one or more attestations under this NIP. |
| NIP-09 (Event Deletion Request)      | A signer MAY publish a NIP-09 deletion request to retract a previously-published attestation. Compliance is per-relay; once observed by a third party, an attestation cannot be fully revoked.                                                                                                                                                                                                                                        |
| NIP-26 (Delegated Event Signing)     | Out of scope at the primitive level. This NIP does not specify whether attestations signed via NIP-26 delegation are equivalent, for authoritative-signer purposes, to attestations signed directly by the designated signer's primary key. Applications relying on a designated authoritative signer SHOULD state explicitly whether delegated signatures are accepted.                                                              |
| NIP-40 (Expiration Timestamp)        | Independent. NIP-40 declares an event's intended expiration; this NIP attests receipt of an event. The two NIPs address different concerns and may coexist.                                                                                                                                                                                                                                                                           |

## Security considerations

* **Signature verification**: consumers MUST verify the attestation's signature per NIP-01 before treating its `created_at` as authoritative.

* **Stateless validation**: this NIP is designed for stateless validation by relays and clients. Conformance to §Semantic constraints can be verified without fetching any external event. Properties requiring cross-event access are consumer-side concerns documented below.

* **Logical consistency of timestamps**: a consumer that has access to both the attestation and the attested event MAY check that the attestation's `created_at` is greater than or equal to the attested event's `created_at`. An attestation violating this property is internally inconsistent (the signer would be claiming to have received an event before it was created) and the consumer SHOULD treat it as evidence of signer error or malice. This check requires fetching the attested event and is therefore stateful; relays MUST NOT be expected to enforce it.

* **Referenced event validity**: a consumer that has access to the attested event SHOULD verify its signature and well-formedness per NIP-01 before relying on the attestation. An attestation referencing a non-existent or signature-invalid event provides no meaningful evidence. Like the previous check, this is consumer-side and stateful.

* **Trust model**: this NIP provides NO trustlessness guarantee. The value of an attestation depends entirely on the consumer's trust in the signer. Applications using this NIP for high-value timing decisions SHOULD specify their trust model explicitly via a higher-layer NIP designating authoritative signers.

* **Clock skew and synchronization**: the attestation's `created_at` reflects the signer's clock at the moment of signing. Clock skew between the signer and other parties is not corrected by the protocol. Signers SHOULD synchronize their clocks against a reliable time source (e.g., NTP) to minimize drift, and SHOULD monitor for skew or stepping events that could compromise the credibility of their attestations. Applications with strict timing requirements SHOULD additionally account for plausible residual skew between the signer and other observers.

* **Signer discretion**: a signer MAY delay signing arbitrarily, effectively shifting the attestation's `created_at` forward beyond the actual receipt moment. The protocol provides no upper bound on signing latency. Applications relying on attestations SHOULD model this discretion as part of their trust analysis. The logical-consistency check above provides a lower bound when the consumer can verify it; no equivalent protocol-level upper bound exists.

* **Multiple signers**: an attested event MAY receive attestations from arbitrary signers. Applications using this NIP MUST specify whose attestations are authoritative for their purposes; absent such specification, consumers SHOULD treat all attestations as informational only.

* **Replay and finality**: per NIP-01, signed events are immutable. An attestation, once signed, persists. Applications relying on attestations SHOULD treat them as permanent contributions to the audit trail; NIP-09 deletion requests provide partial mitigation but no guarantee.

* **Privacy**: an attestation publicly reveals that the signer received the attested event at a specific moment, along with the attested event's identifier. Signers SHOULD consider whether revealing this receipt is acceptable in their context. Attestations cannot be made private without breaking their function as public timing anchors.

## References

* [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) — Basic protocol flow description
* [NIP-03](https://github.com/nostr-protocol/nips/blob/master/03.md) — OpenTimestamps Attestations for Events
* [NIP-09](https://github.com/nostr-protocol/nips/blob/master/09.md) — Event Deletion Request
* [NIP-10](https://github.com/nostr-protocol/nips/blob/master/10.md) — Conventions for clients of a basic protocol
* [NIP-26](https://github.com/nostr-protocol/nips/blob/master/26.md) — Delegated Event Signing
* [NIP-40](https://github.com/nostr-protocol/nips/blob/master/40.md) — Expiration Timestamp
