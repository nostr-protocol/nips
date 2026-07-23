NIP-XX
======

BOLT12 Zaps
-----------

`draft` `optional`

This NIP defines BOLT12 zaps: public Nostr events proving that a BOLT12 payment was made to the author of a profile, event, or addressable event.

BOLT12 zaps add a BOLT12 payment flow alongside the LNURL callback flow used by NIP-57. No LNURL endpoint, zap callback server, separately relayed zap request event, or recipient-operated receipt publisher is required.

## Motivation

NIP-57 made Lightning payments visible on Nostr, but it depends on LNURL pay servers. A sender asks the recipient's server for a BOLT11 invoice, pays it, and then trusts that server to publish a zap receipt.

With BOLT12, a recipient can publish a reusable offer. A payer can request an invoice over the Lightning network, pay it, receive an `lnp` payer proof, and publish a Nostr event proving the payment.

This NIP defines public zap proof events that allow clients to compute a verified cumulative zap amount for a profile, event, or addressable event.

## Event Kind

This draft uses two candidate event kinds:

| kind | name | use |
| --- | --- | --- |
| `9736` | `bolt12_zap` | public BOLT12 payment proof |
| `9737` | `bolt12_zap_intent` | signed pre-payment zap intent embedded in `9736` |

Kind `9736` is the only event counted as a BOLT12 zap.

## BOLT12 Zap Targets

Recipient selection is outside this NIP. A client that supports NIP-57 `zap` tags can use those tags to select recipients before creating BOLT12 zaps.

The canonical raw offer is the lowercase `lno1...` BOLT12 offer string with BOLT12 `+` separators and whitespace removed.

Each recipient payment produces a separate kind `9736` zap event.

## Zap Event

A zap event is a signed event of kind `9736`.

Required tags:

- `description`: serialized zap intent event.
- `p`: recipient pubkey.
- `amount`: amount in millisatoshis.
- `offer`: canonical raw BOLT12 offer.
- `proof`: BOLT12 `lnp` payer proof.

Optional tags:

- `P`: payer pubkey. If present, it MUST equal the zap event `pubkey`.
- `e`: event being zapped.
- `a`: addressable event coordinate being zapped.
- `k`: kind of the event being zapped.

The `description` tag uses the same embedding pattern as NIP-57. Its value MUST be the complete serialized kind `9737` zap intent event as JSON.

`content` MUST equal the zap intent event `content`.

Example:

```json
{
  "kind": 9736,
  "content": "excellent note",
  "tags": [
    ["description", "{\"kind\":9737,\"content\":\"excellent note\",\"tags\":[[\"p\",\"32e182...e245\"],[\"e\",\"9ae37a...94fb\"],[\"k\",\"1\"],[\"amount\",\"21000\"],[\"offer\",\"lno1...\"],[\"zap_id\",\"4f1c8f6a0d5e4a4e94f5ef99d1c1e8ad\"]],\"pubkey\":\"97c70a...e322\",\"created_at\":1781699999,\"id\":\"d8f3...9c1a\",\"sig\":\"f4b1...7a02\"}"],
    ["p", "32e182...e245"],
    ["P", "97c70a...e322"],
    ["e", "9ae37a...94fb"],
    ["k", "1"],
    ["amount", "21000"],
    ["offer", "lno1..."],
    ["proof", "lnp1..."]
  ],
  "pubkey": "97c70a...e322",
  "created_at": 1781700012
}
```

The zap event MUST have exactly one `description` tag and exactly one `p` tag. It MUST have at most one `e` tag and at most one `a` tag, and MUST NOT contain both `e` and `a`.

Publicly attributed zaps SHOULD include `P`. Anonymous zaps MUST use an ephemeral event pubkey and MUST omit `P`.

The zap event `pubkey`, `content`, `p`, `amount`, `offer`, `e`, `a`, and `k` presence and values MUST match the embedded zap intent event.

## Zap Intent

Before paying, the payer creates and signs a zap intent event. The zap intent binds the payer's Nostr key to the recipient, target, amount, and BOLT12 offer before the Lightning payment is attempted. This event is never broadcast and only embedded in the Zap Event.

The payer chooses a `zap_id` with at least 128 bits of entropy, encoded as lowercase hex.

A zap intent event is a signed event of kind `9737`.

Required tags:

- `p`: recipient pubkey.
- `amount`: amount in millisatoshis.
- `offer`: canonical raw BOLT12 offer.
- `zap_id`: random lowercase hex value.

Optional tags:

- `e`: event being zapped.
- `a`: addressable event coordinate being zapped.
- `k`: kind of the event being zapped.

`content` MAY contain a zap comment.

The zap intent event MUST have exactly one `p` tag. It MUST have at most one `e` tag and at most one `a` tag, and MUST NOT contain both `e` and `a`.

Anonymous zaps use an ephemeral event pubkey.

Example:

```json
{
  "kind": 9737,
  "content": "excellent note",
  "tags": [
    ["p", "32e182...e245"],
    ["e", "9ae37a...94fb"],
    ["k", "1"],
    ["amount", "21000"],
    ["offer", "lno1..."],
    ["zap_id", "4f1c8f6a0d5e4a4e94f5ef99d1c1e8ad"]
  ],
  "pubkey": "97c70a...e322",
  "created_at": 1781699999,
  "id": "d8f3...9c1a",
  "sig": "f4b1...7a02"
}
```

The payer MUST include the zap intent event id as the BOLT12 `invreq_payer_note`:

```text
nostr:nipXX:<zap-intent-event-id>
```

## Payer Proof Disclosure

The `proof` tag MUST contain a bech32-encoded BOLT12 `payer_proof` with human-readable prefix `lnp`.

For NIP-XX validation, the payer proof MUST disclose at least:

- `invreq_payer_note`;
- `invoice_payment_hash`;
- `invoice_amount`;
- `signature`;
- `proof_preimage`;
- `proof_signature`;

The proof MUST NOT omit any field required by NIP-XX validation behind `proof_omitted_tlvs`.

`invreq_payer_note` MUST equal:

```text
nostr:nipXX:<zap-intent-event-id>
```

The proof MUST disclose all fields required to run the BOLT12 payer-proof validation algorithm against the canonical raw BOLT12 offer in the zap event and embedded zap intent. This NIP does not require verifiers to compare arbitrary offer TLVs one by one. A proof that cannot be validated against that exact offer MUST NOT be counted as a BOLT12 zap.

## Payment Flow

To send a BOLT12 zap:

1. Resolve the target recipient and BOLT12 offer.
2. Choose the Nostr key that will publish the zap event.
3. Choose a random `zap_id`.
4. Create and sign a kind `9737` zap intent event.
5. Pay the offer for the requested amount, including `nostr:nipXX:<zap-intent-event-id>` in BOLT12 payer metadata.
6. Obtain a settled `lnp` payer proof from the payer wallet.
7. Publish a kind `9736` zap event carrying the serialized zap intent event and the proof.

## Async Payments

A kind `9736` zap event MUST prove settled payment.

Pending, queued, held, async-handoff, or invoice-request-only artifacts MUST NOT be published as kind `9736` zaps and MUST NOT be counted as verified zaps.

If an async payment flow does not produce settled payer proof until the recipient or recipient infrastructure comes online, publication of the zap event MUST wait until that proof exists.

This delays zap publication for offline recipients, but prevents clients from counting unverifiable pending payments as valid zaps.

## Validation

A client MUST validate a zap event before counting it.

Validation steps:

1. Verify the zap event signature and kind `9736`.
2. Verify the zap event structure:
   - exactly one `description` tag;
   - exactly one `p` tag;
   - positive `amount`;
   - canonical raw BOLT12 `offer`;
   - bech32 `lnp` `proof`;
   - at most one `e` tag and at most one `a` tag;
   - it does not contain both `e` and `a`;
   - `P`, if present, equals the zap event `pubkey`.
3. Parse the `description` tag as a Nostr event and verify that embedded zap intent event has:
   - a valid signature;
   - kind `9737`;
   - the same `pubkey` as the zap event;
   - exactly one `p` tag;
   - positive `amount`;
   - canonical raw BOLT12 `offer`;
   - valid `zap_id`;
   - at most one `e` tag and at most one `a` tag;
   - it does not contain both `e` and `a`.
4. Verify the zap event and embedded zap intent event match on `content`, `p`, `amount`, `offer`, and target tags `e`, `a`, and `k`.
5. Parse the raw BOLT12 offer from the `offer` tag.
6. Decode and validate the `lnp` payer proof according to the BOLT12 payer-proof specification, including proof preimage, invoice signature, and payer proof signature checks.
7. Verify the payer proof binds to this zap:
   - `invreq_payer_note` equals `nostr:nipXX:<zap-intent-event-id>`;
   - `invoice_amount` equals the event `amount`;
   - the proof is valid for the canonical raw BOLT12 offer in the zap event and embedded zap intent.

If no settled `lnp` payer proof is available, the event MUST NOT be counted as a BOLT12 zap.

## Counting Zaps

To compute the verified cumulative zap amount for an event, clients query for kind `9736` events with `#e` equal to the event id. For addressable events, clients query by `#a`. For profile zaps, clients query by `#p` and ignore events that also contain `e` or `a`.

Clients MUST validate each zap event before counting it.

Clients MUST deduplicate zap events for the same target by proof identifier. The proof identifier is `invoice_payment_hash` from the validated payer proof.

If two valid zap events for the same target have the same proof identifier, clients MUST count only one. If amounts differ, clients MUST count the lower amount.

The cumulative zap amount is a client-computed view over valid public proof events. It is not consensus.

## Rationale

A separately relayed zap request event is not required when the signed zap intent event is embedded in the final zap event. Verifiers retain the NIP-57 property that the payer signed the Nostr zap context before payment.

The zap intent event binds the payer's Nostr key to the zap target. The BOLT12 payer note binds the Lightning payment proof to that signed intent. Without this binding, a payer could reuse proof from one payment to claim zaps on unrelated events.

Only settled payer proofs count. Pending async payment artifacts do not prove payment and MUST NOT be counted.

## Compatibility

NIP-XX does not replace NIP-57. Clients MAY display NIP-57 and NIP-XX receipts together, but they MUST validate and label them separately.

BOLT12 zap clients can use existing NIP-57 `zap` tags for recipient selection.

## References

- NIP-57: https://github.com/nostr-protocol/nips/blob/master/57.md
- BOLT12: https://github.com/lightning/bolts/blob/master/12-offer-encoding.md
- BOLT12 payer proofs draft: https://github.com/lightning/bolts/pull/1346
