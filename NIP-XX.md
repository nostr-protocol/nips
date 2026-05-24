# NIP-XX: Nostr Silent Wallet

`draft` `optional`

## Abstract

This NIP defines the **Nostr Silent Wallet (NSW)** — a standard for deterministically deriving a BIP-352 Silent Payment address from a Nostr public key (`npub`). The resulting `sp1...` address is a fully valid BIP-352 Silent Payment address; senders require no changes to existing BIP-352 wallet software.

-----

## Motivation

Every Nostr identity shares the same secp256k1 curve as Bitcoin. This NIP defines a deterministic derivation contract that maps any `npub` to a unique BIP-352 Silent Payment address, giving every Nostr user a privacy-preserving Bitcoin receive identity derivable from their public key alone.

-----

## Overview

Alice wants to send Bitcoin privately to Bob. Alice resolves Bob’s Nostr identity — either his `npub` directly or via NIP-05 (`bob@example.com` → `npub`) — and derives his Silent Payment address locally using the NSW derivation below. Alice sends to this address using any BIP-352-compatible wallet. Bob detects the payment by deriving his scan and spend private keys from his `nsec`.

Neither Alice nor Bob needs to exchange a Bitcoin address out-of-band. Bob does not need to publish anything. Each payment Alice makes produces a unique on-chain output that cannot be linked to Bob’s Nostr identity or to any previous payment.

-----

## Derivation

### Inputs

Let:

- `d` = the Nostr private key scalar (the `nsec`)
- `P = d·G` = the Nostr public key point (the `npub`)

### Key Derivation

Compute two deterministic domain-separated tweak scalars from the base public key:

```
t_scan  = int(tagged_hash("nostr-sp/scan",  P)) mod n
t_spend = int(tagged_hash("nostr-sp/spend", P)) mod n
```

Where:

- `tagged_hash(tag, data)` = `SHA256(SHA256(tag) || SHA256(tag) || data)` per BIP-340
- `tag` is UTF-8 encoded
- `int(h)` interprets the 32-byte hash as a big-endian unsigned integer
- `n` = secp256k1 group order
- The serialization of `P` as bytes is specified in OQ-1 below

Derive the Silent Payment public keys using point addition:

```
ScanPub  = P + t_scan  · G
SpendPub = P + t_spend · G
```

When the `nsec` is available, derive the corresponding private keys:

```
scan_priv  = (d + t_scan)  mod n
spend_priv = (d + t_spend) mod n
```

Both tweak scalars MUST be in range `[1, n-1]`. If either equals 0 (probability ~2⁻²⁵⁶), abort with an error.

### Address Encoding

The Silent Payment address follows BIP-352 §“Address encoding”:

```
payload   = serP(ScanPub) || serP(SpendPub)        # 66 bytes
data      = [0] + convertbits(payload, 8, 5, True)  # version nibble prepended
sp1...    = bech32m("sp", data)
```

Where `serP(P)` is the 33-byte SEC-compressed encoding of P (0x02 or 0x03 parity byte + 32-byte x-coordinate). The resulting address begins `sp1q`. Implementations MUST NOT use 32-byte x-only serialization for the payload — doing so produces an address incompatible with BIP-352 wallets.

### Properties

- **Publicly derivable**: anyone knowing the `npub` can compute the `sp1...` address without the `nsec`
- **Anti-spoofing**: senders derive the address locally from a known identity — no need to trust a pasted address
- **Plausible deniability**: the address exists for any `npub` whether or not the `nsec` holder has acknowledged it
- **Private receipt**: only the `nsec` holder can compute `scan_priv` and detect incoming payments
- **Private control**: only the `nsec` holder can compute `spend_priv` and spend received funds
- **BIP-352 compatible**: the resulting `sp1...` address is a standard BIP-352 object — any conforming sender wallet requires no changes

-----

## Security Considerations

### nsec Is the Security Root

The spend private key `(d + t_spend) mod n` is derivable by any party who obtains the `nsec`. Users SHOULD treat the Nostr Silent Wallet as having the same security perimeter as their Nostr identity.

Users holding significant Bitcoin value SHOULD use an independent Bitcoin wallet with a separate seed phrase and derive the SP address from that wallet instead.

### Sweep-Only Spending

Funds received at NSW-derived outputs MUST be swept to a fresh address under the recipient’s control. Spending directly to third-party addresses from detected outputs may expose the link between the NSW identity and the destination. The recommended operational model is: detect → sweep to fresh address → spend from fresh address.

### Key Rotation

Upon `nsec` compromise or rotation, funds at the old derived address require the **old** `d` to spend. Users rotating their Nostr key MUST sweep NSW funds before abandoning the old key.

-----

## Profile Publication (kind `0`)

Because the `sp1...` address is publicly derivable from any `npub`, publication in kind `0` is **optional**. Senders can derive the correct address without a kind `0` lookup.

Clients MAY publish the address in the `bitcoin` field of kind `0` for discoverability:

```json
{
  "kind": 0,
  "content": "{\"name\":\"alice\",\"bitcoin\":\"sp1q...\"}"
}
```

If a `bitcoin` field containing a manually entered `sp1...` address from an independent wallet is present, clients MUST NOT overwrite it without explicit user consent.

-----

## Sender Resolution

Senders with NSW support:

1. Resolve the recipient’s `npub` (from their Nostr profile, NIP-05, or any Nostr event)
1. Derive `sp1...` locally using the NSW derivation above
1. Send using standard BIP-352 sender algorithm

If the recipient has published a `sp1...` in kind `0`, senders MAY use that value but SHOULD verify it matches the NSW-derived address before trusting it.

-----

## Open Questions

**OQ-1: Serialization of P in the tagged hash**
The derivation uses `tagged_hash("nostr-sp/scan", P)` where `P` is the Nostr public key point. The byte serialization of `P` as hash input must be specified for interoperability. Candidates: 32-byte x-only (BIP-340 convention, the raw `npub` bytes) or 33-byte SEC-compressed. Implementations MUST agree on one format; this question is open pending cross-implementation verification.

**OQ-2: Coordination with NIP PR #1934**
NIP PR #1934 (0ceanSlim, May 2025) proposes the `bitcoin` field in kind `0`. If #1934 merges before this NIP, the kind `0` field definition here SHOULD be replaced with a reference to the merged NIP number.

**OQ-3: Multiple derivation approaches**
Two independent implementations have emerged with different approaches: NSW additive tweak from `npub` (this NIP) and `nsec` as BIP-32 master key (hzrd149, Sparrow Wallet compatible). Cross-implementation test vectors and explicit compatibility documentation are needed before finalization.

-----

## Reference Implementations

- **Nostr Silent Wallet (NSW)** (trbouma) — reference NSW implementation, field-tested with Cake Wallet. [Summary Brief](https://github.com/trbouma/openetr/blob/main/docs/summary-brief.md) · [Design Note](https://github.com/trbouma/openetr/blob/main/docs/specs/SILENT_PAYMENTS_DESIGN_NOTE.md) · [Derivation Decision Note](https://github.com/trbouma/openetr/blob/main/docs/specs/SILENT_PAYMENTS_DERIVATION_DECISION_NOTE.md)
- **Cake Wallet** (`cw_bitcoin`) — confirmed BIP-352 SP sender. [github.com/cake-tech/cake_wallet](https://github.com/cake-tech/cake_wallet)
- **Sparrow Wallet 2.5.0** (craigraw) — production BIP-352 send and receive. [github.com/sparrowwallet/sparrow](https://github.com/sparrowwallet/sparrow)
- **Frigate** (sparrowwallet) — SP Electrum server with `blockchain.silentpayments.subscribe`. [github.com/sparrowwallet/frigate](https://github.com/sparrowwallet/frigate)

-----

## Authors

silentius-satoshi — `npub13vftmhzzxxyuvcq4d643agzwr4zvce3pc4gvxymgvuzlwpxa4z2sq4sjd9`
