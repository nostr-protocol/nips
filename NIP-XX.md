# NIP-XX: Nostr Silent Payments — Silent Wallet Connect

`draft` `optional`

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”,
“SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be
interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## Defined Event Kinds

|Kind |Description                          |Scope                                        |
|-----|-------------------------------------|---------------------------------------------|
|23352|Silent payment wallet request        |[NIP-44](44.md) encrypted, p-tagged to wallet|
|23353|Silent payment wallet response       |[NIP-44](44.md) encrypted, p-tagged to client|
|38352|Silent payment wallet connection info|Addressable, replaceable                     |

-----

## Abstract

This NIP defines a relay-based protocol for Nostr clients to request Bitcoin
Silent Payment transactions from a connected Bitcoin wallet service. The wallet
service derives the recipient’s BIP-352 Silent Payment address from their
`npub`, constructs and broadcasts the transaction, and optionally delivers a
receipt notification to the recipient. Nostr clients require no Bitcoin wallet
infrastructure; address derivation from `recipient_npub` is performed by the
wallet service.

-----

## Motivation

NIP-XX (Nostr Silent Payments, PR #2355) defines how to derive a BIP-352
`sp1...` address from any `npub`. A Nostr client can resolve any recipient’s
address from their public identity alone. However, constructing and broadcasting
a BIP-352 transaction requires UTXO access, input key management, the BIP-352
shared secret computation, and PSBT signing — a full Bitcoin wallet stack that
lightweight Nostr clients cannot be expected to embed.

This NIP separates concerns in the same way [NIP-47](47.md) separates Lightning payments
from Nostr clients: the Nostr client resolves the recipient identity and requests
the payment; a connected Bitcoin wallet service executes it. The wallet service
handles all Bitcoin complexity and optionally delivers a receipt notification
(kind `8352`, PR #2362) to the recipient after broadcast.

### Roles

**Client:** Any Nostr application that wants to send a Silent Payment. The
client performs no Bitcoin operations. It identifies the recipient by their
Nostr `npub` and sends an encrypted kind `23352` request to the wallet service.

**User:** The person connecting their Bitcoin wallet service to their Nostr
client. The user publishes a kind `38352` event to link their Nostr identity
to their wallet service.

**Wallet service:** A Nostr-aware application that typically runs on an
always-on machine — a VPS, home server, or cloud instance. The wallet service
has access to a BIP-352-compatible Bitcoin wallet’s private keys and APIs.
It listens persistently for kind `23352` requests, constructs and broadcasts
Silent Payment transactions, and responds with the `txid`. Custodians may
operate a wallet service on behalf of users, or users may self-host their own
instance. The wallet service does not need to be embedded in the Nostr client
— the two communicate exclusively via Nostr relay.

-----

## Overview

Alice wants to send a Silent Payment to Bob. Alice’s Nostr client sends an
encrypted payment request carrying Bob’s `recipient_npub` to Alice’s connected
Bitcoin wallet service via a Nostr relay. The wallet service derives Bob’s
`sp1...` address internally per PR #2355, selects UTXOs, constructs and broadcasts
the BIP-352 transaction, and responds with the `txid`. The wallet
service optionally delivers a kind `8352` receipt notification to Bob’s inbox
relay so Bob can verify the payment without scanning.

Alice’s Nostr client performs no Bitcoin operations. The wallet service’s Nostr
footprint is limited to receiving kind `23352` requests and, optionally,
delivering anonymised kind `8352` notifications via ephemeral keys.

-----

## Wallet Connection Info (kind 38352)

A user who wants to send Silent Payments from a Nostr client MUST publish a
kind `38352` addressable event linking their Nostr identity to their Bitcoin
wallet service.

```json
{
  "kind": 38352,
  "pubkey": "<user-pubkey>",
  "content": "",
  "tags": [
    ["d",      "bitcoin-wallet"],
    ["relay",  "wss://relay.example.com"],
    ["pubkey", "<wallet-service-pubkey>"],
    ["lud16",  "alice@wallet.example.com"],
    ["alt",    "Bitcoin wallet connect info for silent payments"]
  ]
}
```

### Tags

|Tag     |Required|Description                                            |
|--------|--------|-------------------------------------------------------|
|`d`     |Yes     |MUST be `"bitcoin-wallet"`                             |
|`relay` |Yes     |Relay URL where the wallet service listens. Repeatable.|
|`pubkey`|Yes     |32-byte hex pubkey of the wallet service               |
|`lud16` |No      |Lightning address for fallback Lightning payments      |
|`alt`   |Yes     |[NIP-31](31.md) human-readable fallback                |

The `lud16` tag is informational. Nostr clients that do not support Silent
Payments MAY use this address for Lightning-based payments instead. The wallet
service does not act on the `lud16` tag; it is for client-to-client fallback
negotiation only.

The `content` field MUST be an empty string. The kind `38352` event is
addressable — only the most recent event per `(pubkey, "bitcoin-wallet")` pair
is authoritative.

### Connection Info Privacy

Kind `38352` is a public event. Publishing it discloses that the user has a
connected Bitcoin wallet service and reveals the wallet service’s relay endpoint
and pubkey. Users who prefer not to disclose Bitcoin wallet affiliation SHOULD NOT publish
kind `38352` to publicly accessible relays. Such users SHOULD publish kind
`38352` only to restricted-access relays, or not at all. Users who omit
kind `38352` entirely will be unable to use the automated wallet connect flow
defined by this NIP. This tradeoff is structurally identical to kind `10019` ([NIP-61](61.md) Cashu mint list), which similarly discloses mint affiliation.

-----

## Request (kind 23352)

The client sends a kind `23352` event [NIP-44](44.md) encrypted to the wallet service
pubkey. Because kind `23352` is in the ephemeral range (20000–29999), relays are
NOT required to store it. The wallet service MUST maintain a persistent relay
subscription. Clients SHOULD implement retry logic with exponential back-off
and an explicit timeout before reporting a payment failure to the user.

```json
{
  "kind": 23352,
  "pubkey": "<client-pubkey>",
  "content": "<NIP-44 ciphertext>",
  "tags": [
    ["p", "<wallet-service-pubkey>"],
    ["e", "<optional-referenced-event-id>"],
    ["alt", "Silent payment wallet request (NIP-44 encrypted)"]
  ]
}
```

The optional `e` tag MAY reference the Nostr event that prompted the payment
(e.g., a post being tipped); wallet services MUST ignore unrecognized tags.

### Decrypted Content

```json
{
  "id": "<random-hex-16>",
  "timestamp": 1700000000,
  "method": "send_silent_payment",
  "params": {
    "recipient_npub":    "npub1...",
    "amount_sats":       10000,
    "fee_rate":          "medium",
    "notification_relay": "wss://relay.example.com"
  }
}
```

### Request Fields

|Field               |Required|Description                                                                                                   |
|--------------------|--------|--------------------------------------------------------------------------------------------------------------|
|`id`                |Yes     |Random 16-byte hex string for request/response correlation and replay deduplication                           |
|`timestamp`         |Yes     |Unix timestamp (seconds) at time of request creation                                                          |
|`method`            |Yes     |MUST be `"send_silent_payment"`                                                                               |
|`recipient_npub`    |Yes     |Nostr `npub` of the payment recipient                                                                         |
|`amount_sats`       |Yes     |Payment amount in satoshis (positive integer, MUST exceed P2TR dust limit ~294 sats)                          |
|`fee_rate`          |No      |Fee preference: `"fastest"` (≤1 block), `"medium"` (≤6 blocks), `"economy"` (≤144 blocks). Default: `"medium"`|
|`notification_relay`|No      |Relay URL for kind `8352` delivery. If absent, the wallet service SHOULD NOT attempt notification.            |

### Wallet Behavior on Receiving a Request

Upon receiving a kind `23352` event, the wallet service MUST:

1. Decrypt the content using [NIP-44](44.md) with the wallet service private key.
1. Validate the request structure per §Request Fields.
1. Resolve the recipient’s `sp1...` address from `recipient_npub` using the
   NSP derivation defined in PR #2355:

```
P_npub  = lift_x(npub)
t_scan  = H_tagged("nostr-sp/scan",  npub) mod n
t_spend = H_tagged("nostr-sp/spend", npub) mod n
Bscan   = P_npub + t_scan  · G
Bspend  = P_npub + t_spend · G
```

1. Select UTXOs from the wallet’s available balance sufficient to cover
   `amount_sats` plus estimated fees at the requested `fee_rate`.
1. Construct the BIP-352 transaction per §Transaction Construction.
1. Sign and broadcast the transaction.
1. Respond with a kind `23353` event per §Response.
1. If `notification_relay` is present, deliver a kind `8352` receipt
   notification to the recipient per §Notification Delivery.

The wallet service MUST NOT use the recipient’s private key material at any
stage. The entire computation uses only the recipient’s public `npub`.

The wallet service MUST define a freshness window and MUST reject requests where
`|now − timestamp| > freshness_window`, returning `STALE_REQUEST`. The freshness
window SHOULD NOT exceed 300 seconds. Within the freshness window, the wallet
service MUST track processed `id` values and MUST return `DUPLICATE_REQUEST` for
any duplicate `id`. Processed IDs MUST be retained until `timestamp + freshness_window`
has elapsed.

-----

## Transaction Construction

The wallet constructs a standard BIP-352 Silent Payment transaction. Let:

```
# For each input i: negate d_i if P_i has odd y-coordinate (BIP-352 §Inputs)
# Only P2WPKH, P2SH-P2WPKH, P2PKH, P2TR inputs contribute. Exclude P2SH/P2WSH.
a          = Σ(d_i_adj) mod n           # parity-adjusted sum per BIP-352
A          = a · G                       # sum of even-y input public keys
outpointL  = lexicographically smallest input outpoint
input_hash = H_tagged("BIP0352/Inputs", outpointL || A)
shared     = input_hash · a · Bscan        # ECDH shared secret
```

Where `serP(P)` is the 33-byte compressed SEC1 serialization of point P, and
`ser32(k)` is the 4-byte big-endian encoding of integer k.

For each Silent Payment output at index `k`:

```
tₖ  = H_tagged("BIP0352/SharedSecret", serP(shared) || ser32(k))
Pₖ  = Bspend + tₖ · G
```

Place a P2TR output `OP_1 <xonly(Pₖ)>` in the transaction.

For signing each P2TR input:

```
d_sign  = tweaked private key per BIP-341 key-path spend
sighash = SIGHASH_DEFAULT (BIP-341)
sig     = schnorr_sign(d_sign, sighash)
```

`SIGHASH_ANYONECANPAY` MUST NOT be used — the shared secret commits to the
full input set via `input_hash`.

For non-P2TR inputs (P2WPKH, P2SH-P2WPKH, P2PKH), use `SIGHASH_ALL`.

### Correctness

The output key `Pₖ` is derivable by the recipient using only their `nsec`:

```
bspend = (d_npub + t_spend) mod n
tₖ     = H_tagged("BIP0352/SharedSecret", serP(input_hash · bscan · A) || ser32(k))
Pₖ     = bspend · G + tₖ · G = (bspend + tₖ) · G
```

Both the wallet (sender side, using `a` and the public `Bscan`) and the
recipient (using `bscan` and the public `A`) arrive at the same shared secret
by the commutativity of scalar multiplication:

```
input_hash · a · Bscan = input_hash · a · (bscan · G)
                       = input_hash · bscan · (a · G)
                       = input_hash · bscan · A
```

No new cryptographic assumptions are introduced. This is the standard BIP-352
sender algorithm applied to keys derived per NIP-XX.

-----

## Response (kind 23353)

The wallet service responds with a kind `23353` event [NIP-44](44.md) encrypted to the
client pubkey.

```json
{
  "kind": 23353,
  "pubkey": "<wallet-service-pubkey>",
  "content": "<NIP-44 ciphertext>",
  "tags": [
    ["p", "<client-pubkey>"],
    ["e", "<request-event-id>"],
    ["alt", "Silent payment wallet response (NIP-44 encrypted)"]
  ]
}
```

### Decrypted Content — Success

```json
{
  "id":          "<matches-request-id>",
  "result": {
    "txid":        "<bitcoin-txid>",
    "vout":        0,    // output index of the SP P2TR output; not necessarily 0
    "amount_sats": 9950
  }
}
```

### Decrypted Content — Error

```json
{
  "id":    "<matches-request-id>",
  "error": {
    "code":    "INSUFFICIENT_FUNDS",
    "message": "Available balance is 5000 sats, requested 10000 sats"
  }
}
```

### Error Codes

|Code                |Meaning                                                     |
|--------------------|------------------------------------------------------------|
|`INSUFFICIENT_FUNDS`|Wallet balance too low for amount + fees                    |
|`INVALID_NPUB`      |`recipient_npub` is not a valid Nostr public key            |
|`BELOW_DUST_LIMIT`  |`amount_sats` is below the P2TR dust limit (~294 sats)      |
|`STALE_REQUEST`     |`timestamp` is outside the wallet service’s freshness window|
|`DUPLICATE_REQUEST` |`id` has already been processed within the freshness window |
|`BROADCAST_FAILED`  |Transaction constructed but broadcast rejected              |
|`RATE_LIMITED`      |Too many requests from this client                          |
|`INTERNAL_ERROR`    |Unspecified wallet service error                            |

-----

## Notification Delivery

If the request included a `notification_relay`, the wallet service SHOULD
deliver a kind `8352` receipt notification to the recipient’s inbox after
successful broadcast. The notification is constructed per PR #2362:

```json
{
  "kind": 8352,
  "pubkey": "<ephemeral-sender-pubkey>",
  "content": "",
  "tags": [
    ["i",      "bitcoin:tx:<txid>"],
    ["vout",   "<output-index>"],
    ["amount", "<sats>"],
    ["tweak",  "<tₖ as 64-char lowercase hex>"],
    ["p",      "<recipient-pubkey>"],
    ["alt",    "Silent payment receipt: <amount> sats"]
  ]
}
```

The notification MUST be wrapped in a [NIP-59](59.md) gift wrap addressed to the
recipient and delivered to the `notification_relay`. The wallet service MUST
use a freshly generated ephemeral keypair for the gift wrap outer layer. The
wallet service MUST use a distinct freshly generated ephemeral keypair for the
seal layer. Wallet services MUST NOT reuse either ephemeral keypair across notifications. The
rumor’s `pubkey` MUST be set to the same ephemeral key used to sign the seal
layer, ensuring the NIP-59 seal and rumor share a consistent claimed author. The
wallet service’s real pubkey MUST NOT appear in any layer of the [NIP-59](59.md) structure.

The `tweak` field carries `tₖ` — the per-output BIP-352 scalar — not
`input_hash · A`. The recipient verifies:

```
Pₖ = Bspend + tₖ · G
xonly(Pₖ) == output key of tx.vout[vout]
```

-----

## Security Considerations

### Wallet Service Trust

The wallet service holds the sender’s Bitcoin private keys. It is a trusted
component — the sender must trust the wallet service with their funds in the
same way they trust any custodial or semi-custodial wallet. This NIP does not
define a trustless architecture for the wallet service itself.

A third-party wallet service has full visibility into the sender’s payment
activity: every recipient (`recipient_npub`), every amount, and every timestamp
across all requests. Over time this constitutes a complete payment graph that
can correlate the sender’s Nostr social identity with their Bitcoin spending
patterns. This surveillance capability exists regardless of Silent Payments’
on-chain unlinkability — the privacy guarantee NSP provides is that chain
observers cannot link payments to the recipient’s identity. It does not extend
to the wallet service itself. Users who require that their wallet service not
accumulate a payment graph MUST use a self-hosted wallet service.

### Input Selection Privacy

The wallet service selects UTXOs for the transaction. If the selected inputs
are publicly associated with the sender’s identity — for example, outputs
received directly from a KYC exchange or from a prior publicly attributed
transaction — the resulting Silent Payment may be linkable to the sender’s
identity via chain analysis regardless of the recipient-side privacy Silent
Payments provides. A wallet service that does not implement coin control or
privacy-aware UTXO selection can negate the on-chain privacy benefits of
BIP-352 through input selection alone. Users who require input-level privacy SHOULD use a self-hosted wallet service
with explicit coin control support; some third-party wallet services MAY offer
coin control features that mitigate this risk.

### Request Authenticity

Kind `23352` requests are signed by the client’s Nostr key. The wallet service
SHOULD verify the event signature before processing. A wallet service MAY
restrict which client pubkeys it accepts requests from.

### Recipient Address Verification

The wallet service MUST derive the recipient’s `sp1...` address locally from
`recipient_npub` using the NSP derivation (PR #2355). The wallet service MUST
NOT accept a raw `sp1...` address in the request payload — accepting an
externally supplied address would allow a malicious client to redirect funds.

### Scan Key Root-Equivalence

The NSP scan private key `bscan = (d_npub + t_scan) mod n` is computationally
equivalent to the user’s `nsec`. Any party who obtains `bscan` can recover the
Nostr private key as `d_npub = bscan − t_scan mod n`, since `t_scan` is
publicly computable from `npub`. Future extensions of this protocol MUST NOT
delegate scanning by sharing `bscan`. Scanning extensions MUST operate on the
watch-only public key `Bscan` only.

### Notification Forgery

Any party who learns the `txid` and `tₖ` can construct a structurally valid
kind `8352` notification. The recipient MUST independently verify the output
key on-chain before crediting the UTXO. See PR #2362 §Recipient Validation.

### Recipient Privacy

The wallet service learns both the recipient’s Nostr identity (`recipient_npub`)
and the payment amount (`amount_sats`) for every payment it processes. Combined
with the payment graph surveillance described in §Wallet Service Trust, a
third-party wallet service can identify not only individual counterparties but
the full structure of the sender’s payment relationships over time. Users who
require that their wallet service not learn their payment counterparties MUST
use a self-hosted wallet service. This NIP does not define a trustless
recipient-blinding mechanism.

### Amount Privacy

The `amount_sats` field in the request is visible to the wallet service. The
on-chain transaction amount is visible to chain observers. This NIP does not
provide amount privacy.

-----

## Open Questions

**OQ-1 — Multi-output payments.**
The current design supports a single recipient per request. Multiple recipients
in a single BIP-352 transaction are permitted by BIP-352 but not addressed here.
A future revision MAY add a `recipients` array parameter.

**OQ-2 — Relationship to NIP-47.**
[NIP-47](47.md) defines a relay-based wallet connect protocol for Lightning using kinds
`23194`/`23195` and kind `13194` for wallet info. This NIP defines new kinds
rather than extending NIP-47 for the following reasons: (1) [NIP-47](47.md)’s kind
`13194` is not addressable and cannot cleanly express separate wallet service
`pubkey` and `relay` fields; (2) the kind numbers `23352`, `23353`, and `38352`
encode `352` from BIP-352, signalling the protocol’s Silent Payments scope;
(3) the BIP-352 sender algorithm introduces input key parity adjustment and
SIGHASH constraints not present in Lightning. A future unified wallet connect
NIP MAY consolidate [NIP-47](47.md) and this NIP.

-----

## Reference Implementations

- **NIP-XX: Nostr Silent Payments** (PR #2355) — derivation standard this NIP depends on for address resolution.
- **NIP-XX: Nostr Silent Payments — Receipts** (PR #2362) — kind `8352` notification format used by this NIP for post-broadcast delivery.
- **[NIP-47: Nostr Wallet Connect](47.md)** — relay-based encrypted request/response pattern and wallet service architecture this NIP is modeled on.

-----

## Authors

silentius-satoshi —
`npub13vftmhzzxxyuvcq4d643agzwr4zvce3pc4gvxymgvuzlwpxa4z2sq4sjd9`
