# NIP-XX: Private On-Chain Zaps via Silent Payments

`draft` `optional`

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

-----

## Abstract

This NIP defines a **privacy-preserving** on-chain Bitcoin payment layer for Nostr, complementing the existing kind `8333` on-chain zap spec. It uses **BIP-352 Silent Payments** to ensure that on-chain payments cannot be linked to the **recipient’s** Nostr identity by a **chain-only** adversary. An adversary who cross-references kind `0` Nostr events with blockchain data can perform payment detection using the publicly visible scan key; see §“Threat Model.”

Beyond privacy, the scheme provides two additional properties:

- **Verifiability**: Anyone can independently confirm that a published `sp1...` address derives from a given npub, since the derivation is deterministic from public keys alone
- **Deniability**: Only the nsec holder can scan and identify transactions addressed to them — there is no on-chain linkage between sender inputs and recipient identity

It specifies:

1. A standard derivation path from a Nostr private key to a BIP-352 SP address
1. Automatic kind `0` advertisement of the derived SP address by the client
1. A new event kind (`9739`) for publicly broadcasting a silent payment zap receipt
1. A private wallet-layer notification via NIP-17 so recipients detect payments without scanning

-----

## Event Kinds

|Kind   |Name                       |Type                          |Description                                                                                                                                                                                                                                       |
|-------|---------------------------|------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`9739` |Silent Payment Zap         |Regular                       |Sender-signed receipt attesting that a BIP-352 Silent Payment was sent to a recipient                                                                                                                                                             |
|`21059`|Silent Payment Notification|Ephemeral Rumor (gift-wrapped)|Private wallet-layer notification sent by sender to recipient after broadcast; carries txid, vout, amount, and optional tweak. Never published directly to relays — only transmitted as the inner rumor inside a kind `1059` gift wrap per NIP-59.|

-----

## Motivation

### The existing landscape

**NIP-57** defines Lightning zaps. It requires a `lud16` / `lud06` Lightning address in the recipient’s profile, requiring a LNURL-compatible Lightning wallet — friction that has limited adoption.

**Kind 8333** (Ditto, 2025) defines on-chain zaps. Because Nostr and Bitcoin Taproot share the same cryptographic primitives (secp256k1, Schnorr, 32-byte x-only keys), every npub deterministically maps to one static Taproot address — no setup required. Kind 8333 is production-deployed and works for every Nostr user automatically.

### The problem kind 8333 does not solve: recipient privacy

Kind 8333 maps each npub to exactly one static Bitcoin address permanently. Any observer can derive the Taproot address from any npub, watch it forever, and correlate the recipient’s full on-chain history with their Nostr identity.

**BIP-352 Silent Payments** solves address reuse. The recipient publishes one static `sp1...` address. Each sender derives a unique, unlinkable P2TR output via ECDH — no two payments to the same recipient share any visible on-chain relationship.

This matters beyond casual zaps. In high-risk situations — journalists, activists, dissidents — the sender may be at equal or greater risk than the recipient. Silent Payments provide **sender deniability**: there is no on-chain evidence connecting the sender’s inputs to the recipient’s Nostr identity. Neither party can be implicated by chain analysis alone.

### Design principle: zero additional setup

This NIP eliminates external wallet friction **for the recipient**: the Nostr client derives the SP address from the user’s private key using a standard tagged hash path and publishes it automatically. No external wallet is needed to receive. Senders require an operational Bitcoin wallet for UTXO access and PSBT signing — this is unchanged from any other on-chain payment flow.

### Two complementary tiers

|Tier       |Kind             |Privacy                                                                                |Setup                                                                                  |
|-----------|-----------------|---------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
|Convenience|`8333`           |None — recipient address permanently linked to npub                                    |None                                                                                   |
|Private    |`9739` (this NIP)|High against chain-only observers — see §“Threat Model” for active observer limitations|None for recipient — client auto-derives and publishes. Sender requires Bitcoin wallet.|

Clients SHOULD support both tiers. Implementing this NIP implies implementing kind `8333` as a fallback; see Sender Resolution Logic.

-----

## Threat Model

|Adversary                    |What they observe                                                   |What this NIP protects                                                                  |What this NIP does NOT protect                                                                                                                  |
|-----------------------------|--------------------------------------------------------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
|Passive chain observer       |All on-chain transactions                                           |Recipient’s npub cannot be linked to any on-chain output by chain analysis alone        |Sender’s npub is disclosed via their kind `9739` event                                                                                          |
|Nostr relay operator         |Gift wrap `p` tag (recipient’s pubkey), timing of kind `1059` events|Notification content is encrypted; payment amount and txid are not visible              |That a gift wrap was sent to the recipient at approximately a given time. Future versions may mitigate this via sealed-sender envelope patterns.|
|Malicious sender             |Can publish fake kind `9739` with inflated amount                   |On-chain verification caps displayed amount to actual output value at the specified vout|Sender publishing a kind `9739` pointing at a real but unrelated P2TR output                                                                    |
|Compromised nsec             |Can derive spend private key via tagged hash                        |Nothing — nsec is the security root                                                     |All Bitcoin funds at the derived address are at risk if nsec is compromised                                                                     |
|Active chain + Nostr observer|Both the kind `9739` receipt and on-chain data                      |Recipient unlinkability from chain data alone                                           |Full privacy against an adversary correlating kind `9739` events with blockchain data                                                           |

-----

## SP Address Derivation from Private Key

### Input

Let `sk` be the 32-byte raw private key scalar (big-endian), as defined in BIP-340. This is the underlying scalar of the user’s Nostr private key — **not** the bech32-encoded `nsec1...` string. Implementations MUST decode any encoded form (bech32, hex) to raw bytes before passing to the tagged hash function.

### Derivation Path

```
scan_privkey  = int(tagged_hash("nostr-sp/scan",  sk)) mod n
spend_privkey = int(tagged_hash("nostr-sp/spend", sk)) mod n

scan_pubkey   = scan_privkey  · G
spend_pubkey  = spend_privkey · G
```

Where:

- `tagged_hash(tag, data)` = `SHA256(SHA256(tag) || SHA256(tag) || data)` (BIP-340)
- `tag` is encoded as **UTF-8 bytes** before hashing
- `n` = secp256k1 group order
- `G` = secp256k1 generator point
- The input `data` is the 32-byte raw scalar `sk`
- `int(h)` interprets the 32-byte hash output as a **big-endian** unsigned integer

Both derived scalars MUST be checked to be in range `[1, n-1]`. If either equals 0, the client MUST abort and surface an error. No fallback derivation is defined.

### SP Address Encoding

The SP address follows BIP-352 §“Address encoding” exactly. In pseudocode:

```python
payload   = serP(scan_pubkey) || serP(spend_pubkey)      # 66 bytes total
data_5bit = [0] + convertbits(payload, 8, 5, pad=True)   # version nibble first
sp_address = bech32m_encode(hrp="sp", data=data_5bit)
```

Where:

- `serP(P)` is the **33-byte SEC-compressed** encoding: one parity byte (0x02 or 0x03) + 32-byte x-coordinate big-endian. Implementations MUST NOT use 32-byte x-only keys — doing so produces a non-BIP-352-compliant address incompatible with any conforming wallet
- `convertbits` is the standard bech32 base conversion from 8-bit to 5-bit groups with padding
- `[0]` is the version 0 nibble (bech32m character `q`) prepended as the first 5-bit element before the 8-to-5 conversion of the key material. The version nibble occupies the 5-bit domain; the key material is separately converted
- `bech32m_encode` applies the bech32m checksum per BIP-350

The resulting address always begins `sp1q` and is at minimum 116 characters. Clients parsing the `bitcoin` field MUST NOT reject SP addresses based on the BIP-173 90-character limit, which does not apply to SP addresses.

For testnet/signet, `hrp="tsp"`. Clients encountering a `tsp1...` address in a kind `0` `bitcoin` field MUST treat it as absent for mainnet payment purposes. This NIP applies to Bitcoin mainnet only.

### Properties of the Derivation

- **Deterministic**: same `sk` always produces the same SP address
- **Domain-separated**: tag strings `"nostr-sp/scan"` and `"nostr-sp/spend"` are unique to this NIP
- **Key independence**: scan and spend keys are independent under the random oracle model for SHA-256, by the standard tagged-hash domain-separation argument (BIP-340)
- **Non-invertible**: under the random oracle model, derived public keys are indistinguishable from independent uniform secp256k1 points, revealing nothing about `sk` beyond its public key `P = sk·G`
- **Modular bias**: the `mod n` reduction introduces negligible (~2⁻¹²⁸) bias, consistent with BIP-340 nonce-generation practice
- **Not endorsed by BIP-352**: BIP-352 defines key derivation via BIP-32 hardened paths (`m/352'/coin'/account'/1'/0` for scan, `m/352'/coin'/account'/0'/0` for spend). The derivation path defined here is a novel extension specific to this NIP

-----

## ⚠️ Security Warning: nsec Is the Security Root

**All Bitcoin received at the SP address derived under this NIP is controlled by the spend private key, which is deterministically derivable from the user’s Nostr private key in under one millisecond by any party who obtains it.**

This means:

- Any NIP-46 bunker operator who holds your `nsec` can derive your SP spend key
- Any NIP-07 browser extension with access to your `nsec` can derive your SP spend key
- Any custodial Nostr service storing your `nsec` can derive your SP spend key
- Any malware or phishing attack that extracts your `nsec` can immediately access your Bitcoin

Users holding **significant Bitcoin value** SHOULD use an independent Bitcoin wallet with a separate seed phrase, generate an SP address within that wallet, and publish it manually in their kind `0` profile (see Override Behavior below).

**Key rotation**: Upon nsec compromise or intentional rotation, funds at the old derived SP address require the **old** `sk` to spend. Users rotating their Nostr key MUST sweep funds from the old derived address before abandoning the old key, or retain the old `sk` solely for Bitcoin spending. This NIP does not define a migration protocol for key rotation.

-----

## Automatic Profile Advertisement (kind:0)

Clients implementing this NIP SHOULD automatically compute the user’s SP address from `sk` and publish it in their kind `0` profile metadata:

```json
{
  "kind": 0,
  "content": "{\"name\":\"alice\",\"bitcoin\":\"sp1q...\"}"
}
```

### Client Rules

- The client MUST recompute the SP address fresh from `sk` each time it publishes kind `0`
- If the `bitcoin` field already contains a manually entered `sp1...` address (override from an independent wallet), the client MUST NOT overwrite it without explicit user consent
- Clients implementing this NIP SHOULD populate the `bitcoin` field with a valid `sp1...` address when publishing the derived address. The presence of a non-SP Bitcoin address in the `bitcoin` field does not constitute a protocol error; such values are ignored for sender resolution under this NIP
- The `bitcoin` field is independent of `lud06` and `lud16` fields; all three MAY coexist
- A non-`sp1` value in the `bitcoin` field (e.g., a bare Taproot or legacy Bitcoin address) MUST be overwritten when the client publishes the derived SP address, unless it is explicitly preserved as a manual override by user action. Clients SHOULD notify the user when overwriting a pre-existing non-SP value

The formal definition of the `bitcoin` kind `0` field is coordinated with NIP PR #1934; see Open Question OQ-5.

### Override Behavior

Users requiring stronger security MAY manually enter an SP address from an independent Bitcoin wallet. Clients SHOULD provide a UI for this. A manually entered address MUST be preserved across kind `0` republications unless the user explicitly requests reset to the derived address.

### Signer Support

The following method signatures are **proposed** for NIP-07 and NIP-46. Formal adoption requires companion PRs against those NIPs. Implementations MAY support these methods before formal adoption; clients MUST treat an unsupported or unrecognized method as a graceful fallback to kind `8333` behavior.

**NIP-07 browser extension (proposed):**

```javascript
// Async. Returns the derived sp1... address. MUST NOT return private key material.
// The canonical method name is the string "getSpAddress" — NOT "getSPAddress".
const spAddress = await window.nostr.getSpAddress();
```

**NIP-46 bunker (proposed):**

Request:

```json
{ "id": "<uuid>", "method": "get_sp_address", "params": [] }
```

Success response:

```json
{ "id": "<uuid>", "result": "sp1q..." }
```

Unsupported response (any non-null error string):

```json
{ "id": "<uuid>", "result": null, "error": "<implementation-defined string>" }
```

Clients MUST treat any response where `result` is `null` and `error` is non-null as “unsupported,” regardless of the exact error string value, and fall back to kind `8333` behavior.

For signers managing multiple accounts, the `params` array MAY carry an account identifier as the first element (e.g. `["account_0"]`). Signers that do not support account selection SHOULD ignore extra params and derive from the default account. Signers that require explicit account selection and receive an empty `params` array SHOULD return an error with a descriptive message (e.g. `"account selection required"`) rather than silently deriving from an unexpected account.

**PSBT signing**: To construct and sign a BIP-352 transaction, the sender must also sign Bitcoin inputs via PSBT. Clients MUST NOT attempt to access `sk` directly for PSBT signing; they SHOULD use `signPsbt` (NIP-07 extension method) or `sign_psbt` RPC (NIP-46) consistent with existing conventions (see Ditto WALLET.md for reference implementation). Full specification of the PSBT signing protocol is out of scope for this NIP.

### Sender Resolution Logic

When preparing an on-chain zap:

1. Recipient’s kind `0` has a `bitcoin` field starting with `sp1` → use this NIP (kind `9739`)
1. No valid `sp1...` field present → fall back to kind `8333` (derive Taproot address from npub directly)
1. Kind `8333` not implemented by this client → inform user that payment is not possible for this recipient

Inform the user which tier is being used before sending.

-----

## Silent Payment Zap Receipt (kind:9739)

A kind `9739` event is published by the sender after broadcast. It is **self-attested** — the sender asserts that they sent a payment. Clients MUST NOT treat the event itself as proof of payment; on-chain verification is required.

```json
{
  "kind": 9739,
  "pubkey": "<sender-pubkey>",
  "content": "<optional-comment>",
  "tags": [
    ["i", "bitcoin:tx:<txid>"],
    ["vout", "0"],
    ["p", "<recipient-pubkey>"],
    ["e", "<zapped-event-id>", "<relay-hint>"],
    ["amount", "<sats>"],
    ["alt", "Silent payment zap"]
  ]
}
```

### Tags

|Tag     |Required|Description                                                                                                                                                                                           |
|--------|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`i`     |YES     |NIP-73 identifier: `bitcoin:tx:<txid>` (64-char lowercase hex)                                                                                                                                        |
|`vout`  |YES     |Output index within the transaction as a string-encoded decimal integer, e.g. `["vout", "0"]`. Identifies the specific P2TR output claimed to be the SP payment. Required for per-output verification.|
|`p`     |YES     |Hex pubkey of the recipient                                                                                                                                                                           |
|`e`     |NO      |ID of the zapped event, with relay hint as 3rd element                                                                                                                                                |
|`a`     |NO      |Coordinate of a zapped addressable event                                                                                                                                                              |
|`k`     |NO      |Stringified `kind` of the target event                                                                                                                                                                |
|`amount`|YES     |Claimed amount in satoshis as a string-encoded decimal integer. Self-reported; see §“On-Chain Verification” for required handling by conformance class.                                               |
|`alt`   |YES     |NIP-31 fallback. MUST be the string `"Silent payment zap"`. MUST NOT embed the unverified amount.                                                                                                     |

### Scope Limitation (v1)

This version of kind `9739` is limited to **single-SP-output per recipient** per transaction. A transaction sending SP payments to multiple recipients MUST be represented as separate kind `9739` events — one per recipient — with the same `txid` and different `p` and `vout` tags. A transaction sending multiple SP outputs to the same recipient (BIP-352 counter k > 0) is out of scope for this version.

### Sender Algorithm Reference

Senders MUST construct the Bitcoin transaction following the BIP-352 Sender Algorithm exactly (BIP-352 §“Sender algorithm”). The recipient’s `Bscan` and `Bspend` keys are decoded from the `sp1...` address per BIP-352 §“Address encoding”. Input selection, input hash computation, and output key derivation are defined by BIP-352 and are not modified by this NIP.

-----

## On-Chain Verification

### Conformance Classes

**Verifying Client**: Can make Esplora-compatible API calls. MUST verify on-chain before counting kind `9739` events toward zap totals or displaying amounts.

**Display-Only Client**: Cannot perform on-chain lookups. MAY render kind `9739` events but MUST label them `"unverified"` and MUST NOT include them in aggregate zap totals.

### What Third-Party Clients Can Verify

Third-party verifying clients (holding only the recipient’s `npub`, not `sk`) can verify:

1. The transaction identified by `txid` exists on-chain and is confirmed
1. The output at `vout` is a P2TR output (`scriptPubKey` begins `5120`)
1. The output value at `vout` is the verifiable amount ceiling

Third-party clients **cannot** verify that the P2TR output at `vout` is addressed to the recipient via BIP-352. This requires the recipient’s scan private key (`bscan`). The BIP-352 ECDH computation is `ecdh_shared_secret = input_hash · bscan · A` — `bscan` is a private scalar that is never exposed; the scan public key `Bscan` is insufficient.

This is a **deliberate privacy property**: third-party verifiability of ownership would require exposing `bscan`, which would enable chain surveillance of the recipient’s full payment history. The scheme is **computationally unlinkable** to observers who do not hold `bscan` — they cannot determine which on-chain outputs belong to a given recipient even knowing the SP address, because deriving the output key requires the private scan scalar.

Full cryptographic ownership verification is performed only by the recipient’s own wallet using `scan_privkey` and the transaction’s input public keys, aided by the NIP-17 private notification.

### Verification Steps for Verifying Clients

1. Extract `txid` from the `i` tag and `vout` from the `vout` tag
1. Fetch the transaction from an Esplora-compatible API (`GET /tx/{txid}`)
1. If `vout` is ≥ the number of outputs in the transaction, discard the event as malformed. Implementations MUST NOT throw unhandled exceptions on this condition.
1. Confirm the transaction is included in a block (not mempool-only)
1. Confirm the output at `vout` has `scriptPubKey` beginning `5120` (P2TR). If not P2TR, discard the event
1. Read the output value in satoshis. This is the **verifiable amount ceiling**
1. If the claimed `amount` tag exceeds the output value, display the output value — not the claimed amount
1. Count the verified amount toward zap totals

Unconfirmed transactions MAY be shown as pending with a distinct visual state. They MUST NOT be counted in aggregate totals.

### Anti-Spam and Deduplication

- Clients SHOULD reject kind `9739` events where `event.pubkey` appears in any `p` tag (self-zaps)
- Clients SHOULD deduplicate by **(txid, `vout` tag, `p` tag)** — one kind `9739` per (txid, output index, recipient) triple. The `e`/`a` tag MUST NOT be part of the deduplication key — a sender cannot claim credit for the same on-chain output against multiple zapped events by issuing separate kind `9739` events with different `e` tags
- This NIP applies to Bitcoin mainnet only

### Cross-Kind Deduplication (kind 8333 and kind 9739)

The same Bitcoin transaction cannot simultaneously be both a valid kind `8333` payment (output at the npub-derived Taproot address) and a valid kind `9739` SP payment (output derived via BIP-352 ECDH). If the same `txid` appears in both kinds for the same recipient and target, at least one is fraudulent or mistaken.

Clients MUST resolve as follows:

1. Attempt kind `8333` verification: derive the recipient’s expected Taproot address from their npub and check whether any output in the transaction matches. Kind `8333` verification is **deterministic and complete** — a match is conclusive proof of a valid kind `8333` payment.
1. If kind `8333` verification **succeeds** for a specific output (txid, vout): that result is authoritative for that output. Any kind `9739` event for the same (txid, **vout**, recipient) MUST be discarded. If the kind `9739` references a **different vout** in the same transaction, it MUST be verified independently — a transaction may legitimately contain both a kind `8333` output at one vout and a kind `9739` SP output at another vout, and both represent distinct value transfers that MUST each be counted.
1. If kind `8333` verification **fails** for the vout referenced in a kind `9739`: attempt kind `9739` verification per the steps above. If the P2TR output at `vout` confirms, count the kind `9739` verified amount.
1. In no case count the same (txid, vout) output value twice regardless of kind.

This precedence is based on verification strength: kind `8333` verification is deterministic (expected output key is fully derivable from the recipient’s npub); kind `9739` third-party verification can only confirm that a P2TR output exists at the specified vout, not that it is cryptographically addressed to the recipient. When both appear to confirm, the kind `8333` confirmation is the stronger result.

-----

## Private SP Notification (NIP-17) — Wallet Layer

After broadcast, the sender SHOULD send a private NIP-17 / NIP-59 gift-wrapped DM to the recipient’s npub. This allows the recipient’s wallet to perform full BIP-352 ownership verification without blockchain scanning.

### Payload

The rumor event (kind `21059`) content is a JSON string:

```json
{
  "type": "sp-notification",
  "version": "1",
  "txid": "<bitcoin-txid-hex>",
  "vout": 0,
  "amount": 50000,
  "tweak": "<33-byte-compressed-hex-optional>"
}
```

|Field    |Required|Description                                                                                                                                                                                         |
|---------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`type`   |YES     |Fixed: `"sp-notification"`                                                                                                                                                                          |
|`version`|YES     |Fixed: `"1"`                                                                                                                                                                                        |
|`txid`   |YES     |Bitcoin transaction ID (64-char lowercase hex)                                                                                                                                                      |
|`vout`   |YES     |Output index as a JSON integer (not a string, unlike the Nostr tag representation)                                                                                                                  |
|`amount` |YES     |Claimed amount in satoshis as a JSON integer. **Advisory only** — recipients MUST NOT display this as a confirmed or pending amount until on-chain verification confirms the output value at `vout`.|
|`tweak`  |NO      |33-byte compressed-SEC-encoded `input_hash · A`. Allows ownership verification without fetching transaction inputs. Senders SHOULD include this.                                                    |

### Relay Delivery

Sender SHOULD attempt delivery to relays in the recipient’s kind `10050` inbox relay list (per NIP-17), with fallback to relays listed in their kind `0` metadata. If neither kind `10050` nor kind `0` relay lists are found for the recipient, the sender SHOULD NOT attempt delivery to arbitrary public relays — per NIP-17, absence of a kind `10050` list indicates the user is not ready to receive messages under this protocol. Full BIP-352 blockchain scan MUST always be available as the authoritative fallback for recipients who did not receive a notification.

### Gift Wrap Construction (NIP-17 / NIP-59)

SP notifications use the NIP-59 gift wrap pattern with a dedicated rumor kind:

```
Gift Wrap (kind 1059)  ← fresh ephemeral sender key per notification, p-tagged to recipient
  └─ Seal (kind 13)    ← NIP-44 v2 encrypted to recipient
      └─ Rumor (kind 21059) ← unsigned, payload JSON in content
```

Kind `21059` is defined by this NIP as the **Silent Payment Notification** rumor kind. It is distinct from kind `14` (NIP-17 chat messages, which require plain text content) and MUST NOT be rendered as a chat message by DM clients. Clients implementing NIP-17 chat SHOULD ignore kind `21059` rumors.

`created_at` timestamps SHOULD be set to a random time up to two days in the past, per NIP-17, to prevent timing correlation with the on-chain transaction.

### DoS Mitigations (REQUIRED for Recipient Wallets)

Kind `1059` gift wraps are shared with NIP-17 DMs and other gift-wrapped protocols. Recipients MUST NOT apply a blanket rate limit on kind `1059` unwrapping — doing so would drop legitimate chat messages. Instead, apply SP-specific rate limits only after identifying the inner rumor as kind `21059`:

**After unwrapping**, if the inner rumor kind is `21059` (SP notification), apply the following before triggering any on-chain API lookup:

- **Rate limit per zapper**: The inner rumor sender pubkey on a gift wrap is an ephemeral key and MUST NOT be used as the rate limit key — it can be trivially spoofed. Rate limiting MUST instead key on the **sender pubkey from the corresponding kind `9739` receipt event** (`event.pubkey`). If no matching kind `9739` receipt is found for the notified `txid`, treat the notification as anonymous and apply a shared anonymous rate limit of 3 lookups per rolling 60-minute window
- **Confirmed rate limit**: MUST NOT process more than 10 SP notifications per zapper pubkey (from the kind `9739` event) per rolling 60-minute window
- **Failure tracking**: MUST NOT trigger on-chain lookups for a zapper pubkey that has sent 3 or more confirmed invalid notifications (vout out of range, or output at vout is not P2TR) within the last 24 hours. A “txid not found” result MUST be treated as transient: implementations SHOULD retry once after 30 seconds before recording a failure
- **Web of Trust filter**: SHOULD restrict accepted SP notifications to zapper pubkeys within the recipient’s web of trust. Wallets unable to determine WoT status MAY accept all notifications subject to the above rate limits

If the inner rumor kind is not `21059`, process it normally per whatever protocol it belongs to.

Mobile wallets that cannot maintain persistent state between sessions SHOULD enforce these limits on a per-session basis at minimum.

### Scanning Fallback (REQUIRED)

Wallet implementations MUST provide a manual full-scan fallback using BIP-352’s Receiver Algorithm. NIP-17 notification delivery is not guaranteed. Full blockchain scan MUST always be available, especially on wallet restore from `sk` alone.

Server-side scanning is a valid alternative to NIP-17 notification-based detection. SP-capable Electrum servers implementing the `blockchain.silentpayments.subscribe` protocol (such as Frigate, the reference server used by Sparrow Wallet 2.5.0) can deliver scan results to the client without requiring the sender to send a NIP-17 notification. Clients MAY use server-side scanning as their primary detection method, with NIP-17 notifications as a supplementary fast path. The full-scan fallback requirement applies regardless of which detection method is used.

Server-side scanning is a valid alternative to NIP-17 notification-based detection. SP-capable Electrum servers implementing the `blockchain.silentpayments.subscribe` protocol (such as Frigate, the reference server used by Sparrow Wallet 2.5.0) can deliver scan results to the client without requiring the sender to send a NIP-17 notification. Clients MAY use server-side scanning as their primary detection method, with NIP-17 notifications as a supplementary fast path. The full-scan fallback requirement applies regardless of which detection method is used.

### Tweak Field

The `tweak` field carries the value `input_hash · A` where `A` is the sum of all eligible sender input public keys, as defined in BIP-352 §“Receiver algorithm”. It is encoded as a 33-byte SEC-compressed point (hex string in the JSON payload).

This NIP restricts kind `9739` to a single SP output per recipient per transaction (v1 scope limitation). This means the BIP-352 output counter is always `k = 0` for notifications sent under this NIP. Recipients MUST use `k = 0` when computing the output key from the tweak.

Parse and use procedure:

1. Hex-decode the `tweak` string to 33 bytes
1. Parse as a compressed secp256k1 point `T` (reject if not a valid point)
1. Compute `ecdh_shared_secret = T · bscan` (scalar multiplication of the tweak point by the scan private key). This is equivalent to `input_hash · bscan · A` per BIP-352 §“Receiver algorithm” — the tweak ships the pre-combined point `input_hash · A` to avoid requiring the receiver to fetch sender input keys
1. Compute `t_0 = tagged_hash("BIP0352/SharedSecret", x(ecdh_shared_secret) || ser32(0))` where:

- `tagged_hash` is the BIP-340 construction: `SHA256(SHA256(tag) || SHA256(tag) || data)`
- `x(P)` is the **32-byte x-coordinate** of point P (not the 33-byte compressed encoding)
- `ser32(0)` is the 4-byte **big-endian** encoding of the integer 0: `00 00 00 00`
- This matches BIP-352 §“Receiver algorithm” exactly. Implementors MUST verify against the BIP-352 reference implementation for `k = 0`

1. Compute `P_0 = B_spend + t_0 · G`
1. Compute `output_key = x(P_0)` — the 32-byte x-only public key
1. Check whether the P2TR output at `vout` has a scriptPubKey matching `OP_1 <output_key>`. If it matches, the output is addressed to this recipient and can be spent with the private key `spend_privkey + t_0 mod n`

- **With valid tweak**: complete steps 1–4 without fetching transaction inputs
- **Without tweak**: fetch transaction inputs, reconstruct `input_hash · A` from the input public keys per BIP-352 §“Receiver algorithm”, then proceed with receive verification
- A malformed or invalid tweak (non-hex, wrong length, not a valid curve point) MUST NOT cause fund loss. Wallets MUST fall back to full receive verification if tweak parsing or verification fails

-----

## Client Behavior Summary

### Sender

1. Fetch recipient’s kind `0`; check for `bitcoin` field starting with `sp1`
1. If present: follow BIP-352 Sender Algorithm to construct transaction, broadcast, publish kind `9739`, SHOULD send NIP-17 SP notification
1. If absent: fall back to kind `8333`; inform user the payment will not be private

### Recipient Wallet

1. On key load, derive SP address from `sk` using standard path
1. If kind `0` `bitcoin` field is absent **or does not begin with `sp1`** (and no manual override is set — see Override Behavior), publish updated kind `0` automatically
1. Poll relays for kind `1059` gift wraps; apply DoS mitigations before on-chain lookup
1. Validate on-chain; perform BIP-352 ownership verification using `scan_privkey`
1. Maintain full-scan fallback

### Display

- Render kind `9739` alongside kind `9735` (⚡ Lightning) and kind `8333` (⛓ on-chain)
- Kind `9739` events not yet on-chain verified MUST be labeled `"unverified"`
- Suggested tier labels: ⚡ Lightning · ⛓ On-chain · 🔒⛓ Private on-chain
- Sum verified amounts across all three kinds for aggregate totals; apply cross-kind dedup as specified

-----

## Comparison: All Three Zap Tiers

|Aspect                  |NIP-57 (⚡ kind 9735)        |kind 8333 (⛓)                                                         |This NIP (🔒⛓ kind 9739)                                                                      |
|------------------------|----------------------------|----------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
|Settlement              |Lightning                   |Bitcoin L1                                                            |Bitcoin L1                                                                                   |
|External wallet required|Yes (`lud16`)               |No                                                                    |No for recipient — derived from `sk`. Sender requires Bitcoin wallet.                        |
|Works for all users     |Only with lud16             |Yes — automatic                                                       |Yes — automatic                                                                              |
|Address model           |Lightning invoice           |Static Taproot (npub-derived)                                         |Unique SP output per payment                                                                 |
|Recipient privacy       |N/A                         |None — npub permanently linked                                        |High against chain-only observers (see §“Threat Model” for Nostr-aware adversary limitations)|
|Sender privacy          |Partial (Lightning routing) |Disclosed via kind `8333`                                             |Disclosed via kind `9739`                                                                    |
|Key reuse               |N/A                         |Spend key = TapTweak(npub)-adjusted nsec (trivially derived from nsec)|Spend key = `tagged_hash("nostr-sp/spend", sk)` (one hash from nsec)                         |
|Receipt issuer          |Recipient LNURL server      |Sender (self-attested)                                                |Sender (self-attested)                                                                       |
|Third-party verification|LNURL server pubkey + bolt11|Derive Taproot address from npub, match outputs (deterministic)       |Confirm P2TR output at vout exists; SP ownership requires recipient’s scan privkey           |
|Shipped                 |Yes (widely)                |Yes (Ditto)                                                           |No — this draft                                                                              |

-----

## Relationship to Existing Specs

|Spec                 |Relationship                                                                                                                                                                                      |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Kind 8333** (Ditto)|Convenience-tier on-chain zap. This NIP is the privacy tier. Implementing this NIP implies implementing kind `8333` as fallback. Cross-kind dedup per §“Cross-Kind Deduplication”.                |
|**NIP-57**           |Lightning zap standard. Neither deprecates the other.                                                                                                                                             |
|**NIP-17 / NIP-59**  |Gift wrap transport for private wallet-layer notification. Kind `10050` inbox relay list used for delivery. Kind `21059` (defined here) is the rumor kind — distinct from kind `14` chat messages.|
|**NIP-65**           |Not used for gift wrap delivery (that uses kind `10050`). May still be referenced for other relay discovery purposes.                                                                             |
|**NIP-73**           |`bitcoin:tx:<txid>` identifier format adopted directly.                                                                                                                                           |
|**NIP-07 / NIP-46**  |Extended with `get_sp_address` method.                                                                                                                                                            |
|**BIP-352**          |SP address format, send and receive algorithms. This NIP does not modify BIP-352. The key derivation path here is not part of BIP-352.                                                            |
|**BIP-340**          |Tagged hash function used for SP key derivation.                                                                                                                                                  |
|**BIP-350**          |Bech32m — SP address encoding.                                                                                                                                                                    |

-----

## Open Questions

**OQ-H: NIP-specific test vector for tweak-assisted receive**
BIP-352’s own test vectors cover the full send/receive flow but do not directly exercise the notification-assisted receive path (tweak → `t_0` → output key). A NIP-specific vector with known inputs (`bscan` scalar, `T` point) and expected outputs (`ecdh_shared_secret`, `t_0`, `output_key`) would reduce cross-implementation divergence on a path that has historically been error-prone. Contributions of test vectors verified against the BIP-352 reference implementation are welcome.

**OQ-I: Scanning birthday on wallet restore from `sk` alone**
BIP-352’s receiver algorithm requires a scanning birthday block height to bound the scan. This NIP derives keys outside BIP-352’s HD path, so BIP-352’s own wallet backup guidance does not cover the birthday question. Wallet implementations SHOULD store the block height at which the SP address was first published as a scanning birthday. On restore from `sk` alone, wallets MAY default to the SP address’s first on-chain appearance block. A formal policy for birthday handling is deferred to a future revision or companion BIP.

**OQ-G: Delving Bitcoin notification schema compatibility**
The January 2026 Delving Bitcoin thread (setavenger, reviewed by Ruben Somsen) proposed a notification schema for SP-via-Nostr. This NIP’s `tweak` field encoding MUST be verified for compatibility with that schema and with any implementations that adopted it (Cake Wallet, Sparrow fork). Silent divergence in the `tagged_hash` tag string or point serialization format would cause cross-implementation failures. Implementors SHOULD cross-check against the schema at [delvingbitcoin.org/t/silent-payments-notifications-via-nostr/2203](https://delvingbitcoin.org/t/silent-payments-notifications-via-nostr/2203) before shipping.

**OQ-F: Companion PRs required for NIP-07 and NIP-46**
The `get_sp_address` method proposed in this NIP requires formal adoption via separate PRs against NIP-07 and NIP-46. This NIP cannot unilaterally extend those specs. Implementers SHOULD coordinate with NIP-07 and NIP-46 maintainers. Until companion PRs are merged, `get_sp_address` is an informal convention and clients MUST gracefully fall back to kind `8333` when it is unsupported.

**OQ-1: Minimum notification payload (txid vs. taproot output key)**
Ruben Somsen (BIP-352 co-author) has argued the minimum payload should be the taproot output key rather than txid, to reduce relay operator metadata leakage. setavenger argues txid is more practical for wallet backends. This NIP uses txid + vout as a deliberate tradeoff. Community resolution before finalization is encouraged.

**OQ-2: `get_sp_address` async interface at NIP-07 level**
This NIP specifies an async method. Extension developers should confirm compatibility with existing NIP-07 signer implementations.

**OQ-3: Zap split support**
NIP-57 Appendix G supports weighted zap splits. Kind `9739` does not support zap splits in this version. This is intentional scope limitation.

**OQ-4: Kind number confirmation**
Both `9739` and `21059` are proposed. Both MUST be confirmed against the NIP kind registry before opening a PR.

**OQ-5: Coordination with NIP PR #1934**
NIP PR #1934 (0ceanSlim, May 2025) proposes the `bitcoin` field in kind `0`. This NIP self-defines the field to avoid dependency on an unmerged proposal. If #1934 merges before this NIP, the kind `0` field definition here SHOULD be replaced with a reference to the merged NIP number.

**OQ-C: Gift wrap metadata leakage**
The gift wrap `p` tag exposes the recipient’s pubkey to relay operators, making the fact that an SP notification was received visible as metadata even though content is encrypted. This is a known limitation acknowledged in the threat model. Mitigation via sealed-sender envelope patterns (suppressing the `p` tag on the outer gift wrap) is a plausible future improvement but requires relay-side changes and is out of scope for this version.

**OQ-D: Should the NIP-17 notification include the kind 9739 event ID?**
A recipient receiving multiple notifications for the same txid (e.g. multi-sender same-target zap) or receiving a notification before the kind `9739` event propagates must correlate them via txid alone. Adding a `nostr_event_id` field to the notification payload would make this pairing explicit. Implementers should evaluate whether this is necessary in practice.

-----

## Reference Implementations

- **Ditto / soapbox-pub** — Production kind `8333` on-chain zaps. [github.com/soapbox-pub/ditto](https://github.com/soapbox-pub/ditto)
- **Cake Wallet** (`cw_bitcoin`) — Production BIP-352 SP on mobile. [github.com/cake-tech/cake_wallet](https://github.com/cake-tech/cake_wallet)
- **Sparrow Wallet 2.5.0** (craigraw) — Production SP sending (v2.3.0) and receiving (v2.5.0, released May 2026) in the most widely-used Bitcoin desktop wallet, including airgapped hardware wallet signer support. [github.com/sparrowwallet/sparrow](https://github.com/sparrowwallet/sparrow)
- **Frigate** (sparrowwallet) — SP-capable Electrum server implementing `blockchain.silentpayments.subscribe`, providing server-side scanning as an alternative to NIP-17 notification-based detection. Public instance at `frigate.2140.dev`, auto-selected by Sparrow 2.5.0. [github.com/sparrowwallet/frigate](https://github.com/sparrowwallet/frigate)
- **Sparrow Wallet fork (BoltTouring)** — Proof-of-concept NIP-17 SP notification flow predating the mainline Sparrow implementation. [github.com/BoltTouring/sparrow](https://github.com/BoltTouring/sparrow)
- **OpenETR** (trbouma) — Active implementation of SP address derivation from npub and txid-based receipt detection; codebase publication forthcoming. [github.com/trbouma/openetr](https://github.com/trbouma/openetr)
- **Delving Bitcoin — SP notifications via Nostr** (setavenger, Jan 2026) — Notification schema with Ruben Somsen review. [delvingbitcoin.org](https://delvingbitcoin.org/t/silent-payments-notifications-via-nostr/2203)
- **NIP PR #1934** (0ceanSlim, May 2025) — Parallel kind `0` field proposal.

-----

## Authors

silentius-satoshi — `npub13vftmhzzxxyuvcq4d643agzwr4zvce3pc4gvxymgvuzlwpxa4z2sq4sjd9`

-----

*This NIP is a draft. Feedback welcome via the nostr-protocol/nips issue tracker.*
