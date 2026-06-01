# NIP-XX: Nostr Silent Payments

`draft` `optional`

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## Abstract

This NIP defines the **Nostr Silent Payments (NSP)** — a standard for deterministically deriving a BIP-352 Silent Payment address from a Nostr public key (`npub`). The resulting `sp1...` address is a fully valid BIP-352 Silent Payment address; any BIP-352-compatible sender wallet requires no changes.

**Scope limitation:** NSP requires direct access to the raw `nsec` scalar for receiving and spending. Users whose key is managed by a NIP-07 browser extension or NIP-46 bunker can derive NSP recipient addresses without restriction, as derivation requires only the public `npub`. Constructing and broadcasting the Bitcoin transaction requires separate Bitcoin PSBT signing infrastructure independent of Nostr key management. Receiving and spending additionally require the signer to implement a derivation method that returns only the encoded `sp1...` address or `(Bscan, Bspend)` public keys — never `bscan` or `bspend`, which are root-equivalent to `nsec`.

-----

## Motivation

Every Nostr identity shares the same secp256k1 curve as Bitcoin. This NIP defines a deterministic derivation contract that maps any `npub` to a unique BIP-352 Silent Payment address, giving every Nostr user a privacy-preserving Bitcoin receive identity derivable from their public key alone. Each payment produces a unique on-chain Taproot output with no visible link to the recipient’s Nostr identity.

### Relationship to NIP-SP

NIP-SP (hzrd149) derives Silent Payment keys from `nsec` via an independent hash path, producing keys that are not publicly derivable from `npub` alone. This avoids root-equivalence at the cost of requiring explicit kind `0` publication — senders cannot derive the recipient’s SP address without a kind `0` lookup.

NSP uses additive derivation from `npub`, making the `sp1...` address computable by any sender from public identity material alone, at the cost of root-equivalence (`bscan` and `bspend` reveal `nsec` — see §Security Warning). The design choice reflects the core NSP property: every Nostr identity has a verifiable Bitcoin receive address, derivable without recipient action.

### Scan Key Exposure

Standard BIP-352 requires the scan private key to be available on an online device for receipt detection. If compromised, the complete incoming payment graph is exposed — not just the recipient’s privacy, but that of every past sender. In standard BIP-352, scan key compromise causes privacy loss only — the spend key remains independent and funds are safe. In NSP, scan key compromise is equivalent to `nsec` compromise: funds and Nostr identity are both at risk, making device security a first-order concern.

NSP strengthens the standard scan key protection: because `bscan` is root-equivalent to `nsec`, delegating `bscan` to any third-party scanning service is categorically prohibited rather than merely inadvisable. The tweak-data service (§Receiving) enables server-assisted scanning while `bscan` remains exclusively on the recipient’s device — the server computes `input_hash · A` from public transaction data and the client completes the ECDH locally.

-----

## Overview

Alice wants to send Bitcoin privately to Bob. Alice resolves Bob’s Nostr identity — either his `npub` directly or via NIP-05 (`bob@example.com` → `npub`) — and derives his Silent Payment address locally using the NSP derivation below. Alice sends to this address using any BIP-352-compatible wallet. Bob detects the payment by deriving his scan and spend private keys from his `nsec`.

Neither Alice nor Bob needs to exchange a Bitcoin address out-of-band. Bob does not need to publish anything. Each payment Alice makes produces a unique on-chain output that cannot be linked to Bob’s Nostr identity or to any previous payment.

-----

## Definitions

|Symbol              |Meaning                                                       |
|--------------------|--------------------------------------------------------------|
|`n`                 |secp256k1 curve order                                         |
|`G`                 |secp256k1 generator point                                     |
|`nsec`              |Recipient’s raw Nostr private key (32-byte scalar)            |
|`npub`              |Recipient’s Nostr public key (32-byte x-only, per BIP-340)    |
|`P_npub`            |The point `lift_x(npub)` — even-y by BIP-340 convention       |
|`d_npub`            |BIP-340-normalized scalar such that `d_npub · G = P_npub`     |
|`t_scan`, `t_spend` |Public per-identity additive tweaks                           |
|`bscan`, `bspend`   |Derived BIP-352 scan/spend private keys                       |
|`Bscan`, `Bspend`   |Derived BIP-352 scan/spend public keys                        |
|`H_tagged(tag, msg)`|BIP-340 tagged hash: `SHA256(SHA256(tag) ‖ SHA256(tag) ‖ msg)`|

`d_npub` is the BIP-340-normalized form of `nsec`:

```
d_npub = nsec        if (nsec · G) has even y
       = n − nsec    otherwise
```

-----

## Key Derivation

### Additive Derivation from `npub`

**Tweaks** — public, either side can compute:

```
t_scan  = H_tagged("nostr-sp/scan",  npub) mod n
t_spend = H_tagged("nostr-sp/spend", npub) mod n
```

The tagged-hash input is the **32-byte x-only `npub`** (the raw Nostr public key bytes). The 33-byte SEC-compressed form MUST NOT be used as the hash input.

**Sender side** (uses only `npub`):

```
Bscan  = P_npub + t_scan  · G
Bspend = P_npub + t_spend · G
```

**Recipient side** (uses `nsec`):

```
bscan  = (d_npub + t_scan)  mod n
bspend = (d_npub + t_spend) mod n
```

By construction `bscan · G = Bscan` and `bspend · G = Bspend`. Both sides arrive at the same `(Bscan, Bspend)` pair without communication.

If `t_scan`, `t_spend`, `bscan`, or `bspend` equals 0 after mod n reduction, the implementation MUST abort with an error. The probability of this for any given `npub` is approximately 2⁻²⁵⁶.

### Properties

- **Publicly derivable**: anyone knowing the `npub` can compute the `sp1...` address without the `nsec`
- **Anti-spoofing**: senders derive the address locally from a known identity — no need to trust a pasted address
- **Publication non-attribution**: because the address is derivable by anyone from the `npub`, its existence does not prove the `nsec` holder intentionally created or published it. This applies only to address publication — spending from an NSP UTXO conclusively establishes `nsec` control
- **Private receipt**: only the `nsec` holder can compute `bscan` and detect incoming payments
- **Private control**: only the `nsec` holder can compute `bspend` and spend received funds
- **BIP-352 compatible**: the resulting `sp1...` address is a standard BIP-352 object — any conforming sender wallet requires no changes

### NSP vs. BIP-352 Wallet-Derived Keys

NSP is a distinct wallet class, not merely an alternate address encoding. The difference lies in how the base scan and spend keys originate:

|Property                                  |NSP (this NIP)                        |BIP-352 Wallet-Derived       |
|------------------------------------------|--------------------------------------|-----------------------------|
|Base key origin                           |Nostr identity (`npub`)               |Private seed or BIP-32 tree  |
|Public derivability from `npub`           |Yes                                   |No                           |
|Address verifiability from public identity|Yes                                   |No                           |
|Private recovery                          |From `nsec`                           |From seed or xprv            |
|Scan key delegation to untrusted service  |No — `bscan` root-equivalent to `nsec`|Yes — scan key is independent|

A sender wallet need not distinguish: both classes produce a valid `sp1...` address and the BIP-352 send algorithm is identical. The distinction is receiver-side — an NSP address can only be recovered by software that implements the NSP derivation contract.

-----

## Address Encoding

The Silent Payment address follows BIP-352 §“Address encoding”:

```
payload = serP(Bscan) ‖ serP(Bspend)               # 66 bytes, 33-byte SEC-compressed each
data    = [0] + convertbits(payload, 8, 5, True)   # version nibble prepended; pad=True required
sp1...  = bech32m("sp", data)
```

Where `serP(P)` is the **33-byte SEC-compressed** encoding of P (0x02 or 0x03 parity byte + 32-byte x-coordinate). The resulting address begins `sp1q`. Note: the 33-byte compressed form is used for the address payload encoding; the 32-byte x-only form is used as the tagged hash input (§Key Derivation).

-----

## Sending

A sender follows the standard BIP-352 sending procedure. Given a recipient `npub`:

1. Derive `(Bscan, Bspend)` per §Key Derivation. No profile lookup or relay query is required.
1. Choose inputs from the sender’s wallet. All inputs MUST be of types permitted by BIP-352 (P2TR, P2WPKH, P2SH-P2WPKH, P2PKH).
1. Compute the shared secret per BIP-352:
   
   ```
   a          = sum of input private keys mod n
   A          = a · G
   input_hash = H_tagged("BIP0352/Inputs", outpointL ‖ A)
   shared     = input_hash · a · Bscan
   ```
1. For each output at index `k`:
   
   ```
   tₖ = H_tagged("BIP0352/SharedSecret", serP(shared) ‖ ser32(k))
   Pₖ = Bspend + tₖ · G
   ```
1. Place a P2TR output `OP_1 <xonly(Pₖ)>` in the transaction.
1. Sign each input: for P2TR inputs use `SIGHASH_DEFAULT` (preferred) or `SIGHASH_ALL`; for P2WPKH, P2PKH, and P2SH-P2WPKH inputs use `SIGHASH_ALL`. `SIGHASH_ANYONECANPAY` MUST NOT be used for any input type — the shared secret commits to the full input set.

-----

## Receiving

### Local Scan (Required)

The wallet computes `bscan` and `bspend` per §Key Derivation and runs the BIP-352 receiver algorithm over the chain. For each candidate transaction:

1. Identify eligible inputs and compute `A = ΣAᵢ` and `input_hash`.
1. Compute `shared = input_hash · bscan · A`.
1. For each Taproot output, iterate `k = 0, 1, …`:
   
   ```
   tₖ      = H_tagged("BIP0352/SharedSecret", serP(shared) ‖ ser32(k))
   P_check = Bspend + tₖ · G
   If xonly(P_check) matches the output key → UTXO found, store (txid, vout, value, tₖ)
   ```

### Tweak-Data Service (Optional)

A tweak-data service exposes only public per-transaction data — `input_hash · A` — for BIP-352-eligible transactions. The wallet completes the ECDH locally using `bscan`. **The service never receives `bscan` or any private key material.** Frigate (sparrowwallet) implements this protocol and is confirmed compatible with NSP-derived `sp1...` addresses. A self-hosted Frigate instance is the recommended scanning backend for recipients who require remote assistance.

Full scanning services — where the wallet provides `bscan` directly to a remote service — are **PROHIBITED** (see §Security Considerations). Because `bscan` is root-equivalent, providing it to any untrusted service is operationally equivalent to disclosing the `nsec`. Recipients who require remote scanning with an untrusted operator SHOULD use a seed-derived BIP-352 wallet rather than NSP; seed-derived scan keys cannot be algebraically inverted to expose a root key.

On wallet restore from `nsec` alone, a full BIP-352 scan from genesis (or a trusted checkpoint) is required to recover all UTXOs. Tweak-data service providers MAY offer checkpointed scan history to reduce restore time.

### Payment Flow

Implementing this derivation standard alone is sufficient to receive payments via BIP-352 chain scanning. A companion NIP, NIP-XX: Nostr Silent Payments — Payment Flow ([PR #2362](https://github.com/nostr-protocol/nips/pull/2362)), defines Nostr-native payment notifications (kind `8352`) and UTXO cache events (kind `10353`) built on this derivation standard.

-----

## Spending

Each silent-payment UTXO is a P2TR output. The full signing derivation chain:

```
Stage 1 — BIP-340 normalize nsec:
  d_npub = nsec        if (nsec · G) has even y
         = n − nsec    otherwise

Stage 2 — Additive spend-key derivation:
  t_spend = H_tagged("nostr-sp/spend", npub) mod n
  bspend  = (d_npub + t_spend) mod n

Stage 3 — BIP-352 per-output tweak:
  dₖ = (bspend + tₖ) mod n

Stage 4 — BIP-340 normalize output key:
  d_sign = dₖ        if (dₖ · G) has even y
         = n − dₖ    otherwise

Stage 5 — Sign:
  BIP-340 Schnorr signature with d_sign
```

When spending an NSP output, sign directly with `d_sign` (Stage 4 output). Do NOT treat `Pₖ` as a BIP-341 internal key — `Pₖ` is the output key itself and requires no further TapTweak. Implementations MUST verify `xonly(dₖ · G)` matches the on-chain output key before signing.

### Sweep-Only Rule

Detected NSP outputs MUST be swept to a fresh non-NSP Bitcoin address generated from the wallet’s standard HD derivation (e.g., BIP-86 P2TR or BIP-84 P2WPKH) before any further spending.

Implementations MUST NOT co-spend a detected NSP output with any non-NSP UTXO in the same transaction — doing so links the NSP output to the sender’s broader wallet via the common-input-ownership heuristic, potentially attributing the NSP payment to a known identity.

Spending multiple NSP UTXOs together in a single transaction is permitted but SHOULD be avoided, as it reveals common ownership of those outputs on-chain.

-----

## ⚠️ Security Warning: `bscan` and `bspend` Are Root-Equivalent

In NSP, both derived private keys are:

```
bscan  = (d_npub + t_scan)  mod n
bspend = (d_npub + t_spend) mod n
```

Because `t_scan` and `t_spend` are publicly computable from `npub`, anyone who obtains either key can recover `d_npub`:

```
d_npub = (bscan  − t_scan)  mod n
d_npub = (bspend − t_spend) mod n
```

**Disclosing `bscan` or `bspend` is mathematically equivalent to disclosing the `nsec`.** There is no cryptographic mitigation — this property is intrinsic to additive derivation.

Consequences:

- `bscan` and `bspend` MUST be treated with exactly the same care as `nsec`
- Full scanning services that receive `bscan` are **PROHIBITED**. Providing `bscan` to any third-party scanner is operationally equivalent to publishing the `nsec`
- TLS encryption does not mitigate this risk. The scanning service endpoint receives `bscan` in plaintext after TLS decryption regardless of transport security — end-to-end TLS with no intermediaries whatsoever does not prevent this. Additionally, any intermediate infrastructure — reverse proxies, WAFs, logging layers — may terminate TLS and observe the full payload before re-encrypting to the next hop
- The tweak-data scanning architecture (§Receiving) is the only safe form of remote scanning assistance
- Backup and key-export UI MUST display the same warnings for `bscan` and `bspend` as for `nsec`

### Label Support

This NIP does not define BIP-352 label support, including change labels (`m = 0`). Change outputs from transactions spending NSP UTXOs MUST be directed to non-NSP addresses. A future revision of this NIP MAY define label derivation compatible with the NSP key hierarchy.

### Receiver Scan Key Disclosure

A receiver who holds an NSP address can disclose `bscan` to an observer. In standard BIP-352, this exposes the complete incoming payment graph — all past senders and amounts become linkable — while leaving the receiver’s spend authority and identity unaffected. A receiver can rotate to a new address going forward while past senders remain permanently exposed.

In NSP, this attack is structurally deterred by root-equivalence. Disclosing `bscan` is equivalent to disclosing `nsec` — the receiver loses their Nostr identity and all NSP-derived key material simultaneously. A receiver considering deliberate scan key disclosure cannot limit the harm to past senders alone. This alignment of receiver and sender privacy incentives is a direct consequence of the additive derivation construction.

Senders should be aware that this deterrent is incentive-based, not cryptographic. A receiver who is compromised, coerced, or has already abandoned their identity can still disclose `bscan`.

### Key Rotation

Upon `nsec` compromise or rotation, funds at the old derived address require the **old** `d_npub` to spend. Users rotating their Nostr key MUST sweep all NSP funds before abandoning the old key.

### Coin Selection

Consolidating multiple NSP UTXOs in a single spending transaction links them on-chain as belonging to the same recipient, partially negating BIP-352’s per-payment privacy. Wallets SHOULD support per-payment spends where possible.

-----

## Profile Publication (kind `0`) — Optional

Because the `sp1...` address is publicly derivable from any `npub`, publication in kind `0` is optional — senders can derive the correct address without a kind `0` lookup. **Not publishing is the privacy-optimal path.**

Clients MAY publish the address in the `bitcoin` field of kind `0` for discoverability, with the understanding that doing so makes Bitcoin payment intent explicit in a public profile:

```json
{
  "kind": 0,
  "content": "{\"name\":\"bob\",\"bitcoin\":\"sp1q...\"}"
}
```

If the `bitcoin` field contains a manually entered `sp1...` address from an independent wallet, clients MUST NOT overwrite it without explicit user consent.

-----

## Sender Resolution

1. Resolve the recipient’s `npub` (from their Nostr profile, NIP-05, or any Nostr event)
1. If the recipient’s kind `0` profile contains a `bitcoin` field with a valid `sp1...` address:

- Use that published address directly
- If it matches the NSP-derived address, the recipient is confirmed as an NSP user
- If it differs from the NSP-derived address, the recipient has configured an independent wallet — use the published address and do NOT fall back to the NSP-derived address

1. If kind `0` has no `bitcoin` field, derive `sp1...` locally using the NSP derivation above
1. Send using the standard BIP-352 sender algorithm

A non-matching kind `0` address is the expected, correct outcome for any recipient running an independent BIP-352 wallet. Silently overriding a published address with the NSP-derived address risks sending funds to an address the recipient cannot spend.

-----

## Third-Party Wallet Compatibility

An NSP-derived `sp1...` address is a valid BIP-352 Silent Payment address. Any conforming sender wallet can pay to it without modification. However, receive-side compatibility requires explicit implementation of the NSP derivation contract.

A third-party wallet that claims NSP receive compatibility MUST implement:

1. Public derivation: `npub → (Bscan, Bspend) → sp1...`
1. Private derivation: `nsec → (bscan, bspend)`
1. BIP-352 receipt scanning using the NSP-derived `bscan`, including via the tweak-data service protocol (§Receiving)
1. Output private key reconstruction for sweep using the NSP-derived `bspend` and the stored per-output tweak `tₖ`

Wallet software MUST NOT claim NSP receive or scanning compatibility merely because it supports generic BIP-352 Silent Payments. The NSP derivation contract is identity-derived and is not reconstructible by software that assumes only a BIP-32 seed-tree key origin.

-----

## Open Questions

**OQ-1: NIP-07/NIP-46 signer derivation method**
The Abstract acknowledges that receiving and spending require a signer method returning only the encoded `sp1...` address or `(Bscan, Bspend)` public keys. This method is not yet defined in NIP-07 or NIP-46. Whether it belongs in this NIP, a companion NIP, or an extension to the existing signer NIPs is an open design decision.

**OQ-2: Coordination with NIP PR #1934**
This NIP self-defines the `bitcoin` field in kind `0`. NIP PR #1934 (0ceanSlim, May 2025) defines the same field. If #1934 merges before this NIP, the kind `0` field definition here SHOULD be replaced with a reference to the merged NIP number.

## Acknowledgments

The derivation standard and security model in this NIP are based on independent work by @hzrd149 ([NIP-SP](https://nostrhub.io/naddr1qvzqqqrcvypzqfngzhsvjggdlgeycm96x4emzjlwf8dyyzdfg4hefp89zpkdgz99qy28wumn8ghj7un9d3shjtnyv9kh2uewd9hsqpjwf9gz656seqszmx)) and @trbouma (Nostr Silent Payments).

## Reference Implementations

- **Nostr Silent Payments (NSP)** (trbouma) — field-tested with Cake Wallet. [Summary Brief](https://github.com/trbouma/openetr/blob/main/docs/summary-brief.md) · [Specification Note](https://github.com/trbouma/openetr/blob/main/docs/specs/NOSTR_SILENT_PAYMENTS_SPEC.md) · [Design Note](https://github.com/trbouma/openetr/blob/main/docs/specs/SILENT_PAYMENTS_DESIGN_NOTE.md) · [Derivation Decision Note](https://github.com/trbouma/openetr/blob/main/docs/specs/SILENT_PAYMENTS_DERIVATION_DECISION_NOTE.md)
- **Cake Wallet** (`cw_bitcoin`) — confirmed BIP-352 SP sender. [github.com/cake-tech/cake_wallet](https://github.com/cake-tech/cake_wallet)
- **Sparrow Wallet 2.5.0** (craigraw) — production BIP-352 send and receive. [github.com/sparrowwallet/sparrow](https://github.com/sparrowwallet/sparrow)
- **Frigate** (sparrowwallet) — SP Electrum server implementing tweak-data service protocol. [github.com/sparrowwallet/frigate](https://github.com/sparrowwallet/frigate)

-----

## Authors

silentius-satoshi — `npub13vftmhzzxxyuvcq4d643agzwr4zvce3pc4gvxymgvuzlwpxa4z2sq4sjd9`
