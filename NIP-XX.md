# NIP-XX: Nostr Silent Payments — Receipts

`draft` `optional`

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”,
“SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be
interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## Defined Event Kinds

|Kind |Description                        |Scope                        |
|-----|-----------------------------------|-----------------------------|
|8352 |Silent payment receipt notification|Rumor only (NIP-59 gift wrap)|
|10353|Encrypted silent payment UTXO cache|Self                         |

-----

## Abstract

This NIP defines the Nostr-layer receipt and UTXO sync layer built on top of the
NSP derivation standard (PR #2355). It
specifies: a private sender-to-recipient receipt notification (kind `8352`)
delivered via NIP-59 gift wrap; an encrypted UTXO cache (kind `10353`) for
cross-device sync; and a sweep-only spending rule to prevent UTXO
cross-contamination. Both event kinds are optional — a wallet implementing only
the derivation standard will still discover all incoming payments via BIP-352
chain scanning.

-----

## Motivation

The NSP derivation standard (PR #2355) defines how to
derive a BIP-352 `sp1...` address from any `npub`. This NIP defines what
happens after a sender pays to that address — how the recipient is notified
quickly without scanning, how wallet state is preserved across devices, and how
detected funds are safely spent.

-----

## Overview

Alice sends Bitcoin to Bob’s NSP-derived address using any BIP-352-compatible
wallet. After broadcast, Alice’s Nostr client sends Bob a NIP-59 gift-wrapped
kind `8352` notification containing the txid, output index, amount, and BIP-352
tweak. Bob’s client receives the notification, independently verifies the
payment on-chain, credits the UTXO, and sweeps to a fresh address. Bob’s wallet
publishes an encrypted kind `10353` event to keep his UTXO state in sync across
devices.

Chain scanning (PR #2355 §Receiving) remains the authoritative fallback. A
missing notification cannot prevent Bob from discovering the UTXO via scanning.

-----

## Trust Model

NSP payment detection involves explicit trust choices, analogous to the custody
spectrum in ecash protocols — each tier adds convenience at the cost of privacy
or counterparty risk:

|Model                                            |What you trust                    |Risk                                                                |
|-------------------------------------------------|----------------------------------|--------------------------------------------------------------------|
|Txid hint + local verify                         |No third party                    |No third-party risk                                                 |
|Local scanner                                    |No third party                    |No third-party risk                                                 |
|Self-hosted scanner                              |Your own infrastructure           |Your own operational security                                       |
|Trusted Tweak-Data Service (e.g. BlindBit Oracle)|Server sees public tweak data only|Server learns payment amounts, output keys, and timing — not `bscan`|
|Full scan service                                |Scanner receives `bscan`          |**Equivalent to publishing `nsec` — PROHIBITED**                    |

The txid hint model (kind `8352`) is the only path that requires no scanning
infrastructure and no third-party trust.

-----

## Sending

A Nostr-native sender completing a BIP-352 payment to an NSP-derived address
SHOULD notify the recipient after broadcast. The full sending flow is:

1. Resolve the recipient’s silent payment address per PR #2355 §Sending (a
   kind:0-published address takes priority over the NSP-derived address)
1. Construct the BIP-352 transaction, computing the per-output tweak `tₖ` for
   each recipient output; for labeled addresses, `Bm` (the labeled spend key)
   is taken directly from the recipient’s published address and used in place of
   `Bspend` when constructing the output key
1. Sign and broadcast the transaction to the Bitcoin network
1. After broadcast, the sender MAY notify each recipient by sending one kind
   `8352` notification per SP output addressed to that recipient, gift-wrapped
   per NIP-59 (§Kind 8352 — Silent Payment Receipt Notification)

Step 4 is OPTIONAL. The on-chain transaction is the source of truth. A missing
notification cannot prevent a recipient from discovering the UTXO via BIP-352
chain scanning.

The sender MUST NOT send a kind `8352` notification before the transaction is
broadcast. A premature notification could cause the recipient to credit a UTXO
that is never confirmed.

Non-Nostr senders (CLI tools, server-to-server flows) MAY communicate the txid,
vout, and tweak to the recipient via any secure private channel. NIP-59 gift
wrap is the Nostr-native delivery mechanism for step 4.

-----

## Kind 8352 — Silent Payment Receipt Notification

Kind `8352` is used exclusively as the **rumor** inside a NIP-59 gift wrap. It
MUST NOT be published directly to relays in the clear.

The kind number `8352` encodes `8000 + 352` (the BIP-352 base) in the regular
event range.

```json
{
  "kind": 8352,
  "pubkey": "<sender-pubkey>",
  "content": "",
  "tags": [
    ["i",      "bitcoin:tx:<txid>"],
    ["vout",   "<output-index>"],
    ["amount", "<sats>"],
    ["tweak",  "<64-char lowercase hex>"],
    ["p",      "<recipient-pubkey>"],
    ["alt",    "Silent payment receipt: <amount> sats"]
  ]
}
```

### Tags

|Tag     |Required|Description                                           |
|--------|--------|------------------------------------------------------|
|`i`     |Yes     |NIP-73 identifier `bitcoin:tx:<txid>`, lowercase hex  |
|`vout`  |Yes     |Output index in the transaction (decimal string, ≥ 0) |
|`amount`|Yes     |Output value in satoshis (decimal string)             |
|`tweak` |Yes     |Per-output BIP-352 tweak `tₖ` as 64-char lowercase hex|
|`p`     |Yes     |Recipient pubkey. MUST match the gift-wrap recipient  |
|`alt`   |Yes     |NIP-31 human-readable fallback                        |

The `label` tag is absent from kind `8352`. The label scalar `m` is derived from
the recipient’s private `bscan` key — a value the sender does not possess. The
recipient identifies labeled payments by iterating over their known label set
during validation (§Recipient Validation step 5b). See OQ7 for alternative
approaches under consideration.

The `content` field MUST be an empty string.

### Gift Wrap Construction (NIP-59)

```
Gift Wrap (kind 1059)  ← ephemeral one-time keypair, p-tagged to recipient
  └─ Seal (kind 13)    ← NIP-44 v2 encrypted to recipient npub
      └─ Rumor (kind 8352) ← unsigned
```

The kind `8352` rumor MUST be unsigned — the `sig` field MUST be omitted per
NIP-59.

The ephemeral keypair MUST be freshly generated per notification. The sender’s
Nostr identity MUST NOT be used to sign or encrypt the gift wrap.

### Relay Delivery

The gift wrap MUST be delivered to relays in the recipient’s kind `10050` inbox
relay list. If no kind `10050` list exists, the sender SHOULD NOT attempt
delivery — absence indicates the recipient is not ready to receive gift-wrapped
events.

### Sender Behavior

After broadcasting a BIP-352 transaction, the sender MAY send one kind `8352`
notification per SP output addressed to that recipient. Each notification MUST
be delivered as a NIP-59 gift wrap (§Gift Wrap Construction) and MUST NOT be
published directly to relays. The `tweak` value is exactly the `tₖ` computed
when constructing the output.

Sending a notification is OPTIONAL. The on-chain transaction is the source of
truth.

### Recipient Validation

A wallet that supports kind `8352` MAY credit a UTXO before its next chain scan
completes. For each incoming gift wrap:

1. Decrypt the gift wrap per NIP-59.
1. Validate the rumor structure per §Tags above. Verify the `p` tag equals the
   recipient’s own pubkey; if it does not match, discard the notification.
1. Check the deduplication ledger: if `(txid, vout)` is already recorded as
   spendable, pending, or spent, silently discard the notification without
   triggering an Esplora lookup.
1. Fetch the referenced transaction via an Esplora-compatible API (e.g.,
   `GET /tx/:txid`). Alternative block data sources (Electrum, Bitcoin Core
   RPC) MAY be used provided they return the raw output set indexed by `vout`.
   Note the transaction’s confirmation status. If the transaction is not found,
   discard the notification. No further steps are taken.
1. Independently verify that output `vout` pays an NSP output key. Let `Bspend`
   be derived per PR #2355 §Derivation; `tweak` is a 32-byte scalar reduced mod
   the curve order `n`; `·` denotes secp256k1 scalar multiplication; `+`
   between point terms denotes elliptic curve point addition:
   
   a. Check unlabeled: compute `Pₖ = Bspend + tweak · G`. If `xonly(Pₖ)`
   equals the x-only Taproot output key of `tx.vout[vout]`, set
   `label = ""` and continue to step 6.
   
   b. If the unlabeled check fails, iterate over the recipient’s label scalars
   `{mᵢ}`: for each `mᵢ`, compute `Pₖ = Bspend + (tweak + mᵢ) · G`. If
   `xonly(Pₖ)` matches, set `label` to the 64-char lowercase hex encoding of `mᵢ` and continue to step 6.
   
   c. If neither check produces a match, discard the notification. No further steps are taken.
1. Verify the output value matches the `amount` tag. If the output value does
   not match, discard the notification. No further steps are taken.
1. Apply confirmation policy: wallets SHOULD NOT credit unconfirmed UTXOs.
   Wallets that credit unconfirmed UTXOs MUST mark them as pending and MUST
   re-verify confirmation before sweep. A pending UTXO that does not confirm
   within a locally configured timeout MUST be removed from the spendable set
   (see OQ5).
1. Credit `(txid, vout, value, tweak, label)` to the spendable set and record
   `(txid, vout)` in the deduplication ledger.

A failed verification MUST NOT cause the wallet to credit a phantom UTXO. The
notification is an optimization — wallets SHOULD still run BIP-352 scanning
periodically to backfill payments from senders who did not emit notifications.

### Spam Considerations

Gift wraps are unsolicited — any party can send kind `8352` events to any
pubkey. Wallets MUST treat on-chain verification (steps 4 and 5 above) as the
threshold for triggering an Esplora lookup, and MUST complete steps 4–7 before
crediting any UTXO. The existence of a notification alone is not sufficient.
Implementations MUST rate-limit Esplora lookups triggered by kind `8352`
notifications; a global limit of 10 lookups per minute is RECOMMENDED as a
baseline. Implementations SHOULD NOT
rely solely on per-sender rate limits, as the gift wrap’s ephemeral outer key
changes with each notification.

### Metadata Considerations

The kind `8352` rumor is encrypted inside the NIP-59 gift wrap and invisible to
relay operators. Only the recipient with their `nsec` can decrypt it.

However the gift wrap’s existence is observable — relay operators can see that
an anonymous sender delivered an encrypted event to the recipient’s inbox. A
sophisticated observer correlating the timing of an on-chain transaction with an
incoming gift wrap could infer a payment was made.

The `txid` content remains private. The existence of the hint is not. Recipients
who require stronger metadata privacy SHOULD use local scanning instead of
relying on kind `8352` notifications.

-----

## Kind 10353 — Encrypted Silent Payment UTXO Cache

Replaceable event for the recipient’s own wallet state. One canonical event per
identity. All UTXO state is NIP-44 self-encrypted in `content`.

The kind number `10353` places it in the replaceable range (10000–19999).

```json
{
  "kind": 10353,
  "pubkey": "<recipient-pubkey>",
  "content": "<NIP-44 ciphertext>",
  "tags": [
    ["alt", "Encrypted silent payment UTXO set"]
  ]
}
```

### Outer Tags

|Tag  |Required|Description                   |
|-----|--------|------------------------------|
|`alt`|Yes     |NIP-31 human-readable fallback|

### Encryption

```
conversationKey = nip44_get_conversation_key(ownPrivkey, ownPubkey)
content = nip44_encrypt(JSON.stringify(inner_tags), conversationKey)
```

Where `ownPrivkey` is the recipient’s 32-byte secret key and `ownPubkey` is the
corresponding x-only public key. Self-encryption produces an ECDH point of
`ownPrivkey² · G` as the symmetric base. Only the recipient can decrypt their
own UTXO cache.

### Inner Tag Schema

After decryption, the plaintext is a JSON-encoded array of tag arrays:

```json
[
  ["scan_height", "840000"],
  ["utxo", "a1b2c3...txid", "0", "100000", "aabbcc...tweak", ""],
  ["utxo", "d4e5f6...txid", "1", "50000",  "ddeeff...tweak", "112233...label"]
]
```

|Tag          |Cardinality |Description                                                    |
|-------------|------------|---------------------------------------------------------------|
|`scan_height`|Exactly one |Block height through which scanning is complete, decimal string|
|`utxo`       |Zero or more|One per spendable UTXO (see below)                             |

The set contains **only spendable UTXOs**. Spent UTXOs MUST be removed. Absence
from the set is the spent signal.

A wallet loading kind `10353` from a relay SHOULD use `scan_height` as the
lower bound for BIP-352 chain scanning, scanning forward from that height to the
current chain tip to detect UTXOs not yet captured in the cache.

### UTXO Tag

```json
["utxo", "<txid>", "<vout>", "<sats>", "<tweak-hex>", "<label-hex-or-empty>"]
```

|Position|Description                                         |
|--------|----------------------------------------------------|
|0       |`"utxo"`                                            |
|1       |Transaction ID, lowercase hex                       |
|2       |Output index, decimal string                        |
|3       |Value in satoshis, decimal string                   |
|4       |BIP-352 tweak `tₖ`, 64-char lowercase hex           |
|5       |Label scalar `m`, 64-char hex, or `""` for unlabeled|

For unlabeled outputs, position 5 MUST be present as an empty string `""`.
Implementations MUST NOT omit position 5 for unlabeled outputs.

### Update Behavior

The wallet republishes kind `10353` after every state change — crediting a new
UTXO or removing a spent one. Before publishing, the wallet MUST read and
decrypt the current kind `10353` from its relay set. The wallet MUST merge the
remote state with its local state by taking the union of `utxo` entries and the
maximum of `scan_height` values, then publish the merged result. `created_at`
MUST be set to the current Unix timestamp at the time of signing. Implementations
MUST NOT reuse a prior event’s `created_at`.

The event is replaceable; only the most recent version per pubkey (highest
`created_at`) is retained by relays. See OQ6 for remaining multi-device conflict
edge cases.

-----

## Sweep-Only Spending

Detected NSP outputs MUST be swept to a fresh address before any further
spending. A fresh address is an address derived from the recipient’s own wallet
that has not been used in any prior confirmed or unconfirmed on-chain transaction
and has no publicly observable link to the recipient’s identity. Reusing an
address as the sweep destination negates the unlinkability benefit of the
sweep-only rule.

Implementations MUST NOT construct transactions that co-spend a detected NSP
output with any non-NSP UTXO — doing so links the NSP output to the other inputs
via the common-input-ownership heuristic (CIOH), potentially attributing the NSP
payment to a known identity.

Multiple NSP outputs MAY be swept together in a single transaction, but this
groups them as co-owned via CIOH. Implementations SHOULD sweep each NSP output
individually where fees permit.

Recommended flow:

1. Detect output via kind `8352` notification or BIP-352 scanning
1. Construct a sweep transaction spending only the detected NSP output(s), with
   no non-NSP inputs
1. Send the full amount (minus fees) to a fresh address under the recipient’s
   control
1. All further spending occurs from the fresh address

-----

## Security Considerations

### Notification Authenticity

A kind `8352` notification authenticates the sender’s Nostr signing key but does
not prove the sender made the on-chain payment — any party who learns the txid
and tweak could forge a structurally valid notification. On-chain verification
(§Recipient Validation steps 4–7) is the gate. A notification that passes on-chain
verification is creditable regardless of who sent it.

### Remote Scanning

⚠️ Full scanning services that receive `bscan` are **PROHIBITED** per
PR #2355 §Security Warning.
The kind `10353` UTXO cache is self-encrypted — it does not reduce this
requirement.

### Kind 10353 Forward Secrecy

Kind `10353` inherits NIP-44’s threat model. A future `nsec` compromise decrypts
all prior cache events. Recipients who treat the UTXO cache as a long-term
record should be aware of this limitation.

### Metadata Timing Correlation

The existence of a kind `8352` gift wrap is observable by relay operators even
if its content is encrypted. An observer correlating the timing of an on-chain
transaction with an incoming gift wrap to a recipient’s inbox can infer that a
payment was made. Recipients who require stronger metadata privacy SHOULD use
local BIP-352 scanning rather than kind `8352` notifications.

-----

## Open Questions

The following are unresolved and flagged for discussion at PR review time. They
MUST NOT be speculatively resolved by implementations.

**OQ1 — Kind number registry conflicts and NIP-XX number assignment.** Kind
`8352` and `10353` are sourced from hzrd149’s NIP-SP draft. Both MUST be
confirmed against the live NIP registry immediately before PR submission.
Additionally, this companion NIP (currently placeholder NIP-XX) must be
assigned a final NIP number before PR submission. PR #2355 cross-references
throughout this document must be updated to the derivation standard’s assigned
NIP number once it is merged.

**OQ2 — `i` tag vs dedicated `txid` tag.** Using NIP-73 `bitcoin:tx:<txid>`
adds a dependency on NIP-73. A simple `["txid", "<hex>"]` tag is self-contained.
Maintainer preference requested.

**OQ3 — `scan_height` as block height vs block hash.** Block height is
ambiguous during reorgs. Block hash is unambiguous but heavier to store. The
current design uses height; this is a known limitation.

**OQ4 — Kind 10353 relay publishing.** The spec does not define which relays
the wallet should publish kind `10353` to. Should it follow the wallet’s NIP-65
write relay list, or a dedicated relay set? Guidance requested.

**OQ5 — Confirmation depth for UTXO crediting.** Should wallets credit UTXOs
at 0 confirmations (mempool), at 1 confirmation, or at N confirmations?
Zero-confirmation crediting exposes recipients to RBF double-spend risk; higher
confirmation requirements reduce the UX benefit of the notification fast path.
If an explicit default is adopted, replace “locally configured timeout” in
§Recipient Validation step 7 with the specified value.

**OQ6 — Kind 10353 multi-device conflict resolution.** The read-merge-write
pattern in §Update Behavior reduces but does not eliminate state loss under
concurrent writes. A device that reads state, goes offline, then publishes on
reconnect will overwrite changes made by other devices during that offline period.
An alternative — parameterized replaceable events with one event per UTXO
operation — would eliminate this risk but represents a significant design change.

**OQ7 — Label delivery for labeled payment notifications.** The `label` tag has
been removed from kind `8352` because the sender cannot derive the label scalar
`m` (see §Tags). Three approaches remain viable: (A) current design — recipient
iterates over `{mᵢ}` at validation time, O(num_labels); (B) `label` tag carries
`Bm` (labeled spend public key, 66-char compressed hex), enabling direct
verification without iteration; (C) `label` tag carries the label index integer,
requiring the derivation standard to expose the label index alongside `Bm` in labeled address
publication. Option B requires updating the verification formula; Option C
changes the tag format and step 5b lookup logic. Both may require changes to
the derivation standard’s labeled address publication format.

-----

## Reference Implementations

- **Nostr Silent Payments (NSP)** (trbouma) — reference implementation and design documentation.
  [Summary Brief](https://github.com/trbouma/openetr/blob/main/docs/summary-brief.md) · [Design Note](https://github.com/trbouma/openetr/blob/main/docs/specs/SILENT_PAYMENTS_DESIGN_NOTE.md) · [Derivation Decision Note](https://github.com/trbouma/openetr/blob/main/docs/specs/SILENT_PAYMENTS_DERIVATION_DECISION_NOTE.md)
- **Validate Payment Script** (trbouma) — pure Python standard library implementation
  of NSP payment validation, no external dependencies.
  [gist.github.com/trbouma](https://gist.github.com/trbouma/77648ebe1005b181b67d1c4b42c7f31d#file-validate_silent_payment-md)
- **Sweep Silent Payment Script** (trbouma) — pure Python standard library implementation
  of NSP sweep transaction construction, no external dependencies.
  [gist.github.com/trbouma](https://gist.github.com/trbouma/77648ebe1005b181b67d1c4b42c7f31d#file-sweep_silent_payment_standalond-md)
- **NIP-SP** (hzrd149) — source specification for kind `8352` and kind `10353`.
  [nostrhub.io](https://nostrhub.io/naddr1qvzqqqrcvypzqfngzhsvjggdlgeycm96x4emzjlwf8dyyzdfg4hefp89zpkdgz99qy28wumn8ghj7un9d3shjtnyv9kh2uewd9hsqpjwf9gz656seqszmx)
- **BlindBit Oracle** (setavenger) — tweak-data service providing `input_hash · A`
  per block. The recommended NSP-compatible scanning backend.
  [github.com/setavenger/blindbit-oracle](https://github.com/setavenger/blindbit-oracle)
- **Frigate** (sparrowwallet) — remote scanner requiring `bscan`. Full remote scanning
  is PROHIBITED for NSP. Appropriate for seed-derived BIP-352 wallets only.
  [github.com/sparrowwallet/frigate](https://github.com/sparrowwallet/frigate)

-----

## Authors

silentius-satoshi —
`npub13vftmhzzxxyuvcq4d643agzwr4zvce3pc4gvxymgvuzlwpxa4z2sq4sjd9`
