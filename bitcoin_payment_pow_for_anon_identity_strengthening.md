# NIP-Z: Anonymous Bitcoin-Fee-Based Proof-of-Work for Identity Strengthening

Draft — Work in Progress

## 1. Summary

This NIP defines a mechanism for generating anonymous, non-replayable Proof-of-Work (PoW) for Nostr identities using Bitcoin transaction fees.
Users prove in zero knowledge that they created a Bitcoin transaction that:

- Pays `fees ≥ threshold`, and
- Commits to their anonymous identity inside a Taproot Pay-to-Contract (P2C) output, without revealing which Bitcoin transaction was used.

The resulting PoW update event strengthens an anonymous identity without leaking any link between Nostr activity and Bitcoin activity.

## 2. Motivation

Bitcoin transaction fees represent verifiable, irreversible economic cost.
By binding a Bitcoin payment to a hidden identity commitment, users can:

- Strengthen their anonymous identity (increase trust),

- Without revealing which Bitcoin address or transaction they used,

- Without relying on centralized services.

This PoW is:

- **Unstealable** (others cannot reuse your tx),

- **Unlinkable** (no on-chain identifier ties to your identity),

- **Non-replayable** (each tx can be used only once),

- **Decentralized** (no trusted parties).

## 3. Identity Commitment

User chooses a private secret s, computes:

C = H(s)


C is the anonymous identity commitment used in PoW.

## 4. Taproot Pay-to-Contract Commitment

To bind a Bitcoin transaction to C without revealing it:

Nostr client generates a Taproot internal key:

`P = internal_pubkey`


Compute Taproot tweak:

`t = H(P || C)`


Compute tweaked Taproot output key:

`Q = P + t·G`


Encode Q as a standard Taproot address (bech32m):

`bc1p...Q`


User then sends any Bitcoin amount from any wallet to this address.

### Privacy guarantee

- On-chain observers see only Q.

- They cannot detect the commitment.

- They cannot derive C, s, or whether P2C was used.

## 5. Requirements for the Bitcoin Transaction

The PoW Bitcoin transaction tx must:

- Include at least one output paying to Taproot key Q,

- Have fee = sum(inputs) - sum(outputs),

- Satisfy `fee ≥ pow_threshold`.

The funds remain spendable by the user because they know the internal private key and tweak.

## 6. ZK Proof Statement

User proves in zero knowledge:

**Private Inputs**

```
s (identity secret)

tx (full Bitcoin transaction)

P (internal Taproot pubkey)

Bitcoin Merkle branch (block inclusion proof)

fee (computed internally)
```

**Public Inputs**

```
C

txid_hash = H(txid)

pown = H(txid || s) (PoW nullifier)

pow_threshold
```

**Constraints**

1. C = H(s)
2. Transaction is included in the Bitcoin chain.
3. `fee ≥ pow_threshold`.
4. Transaction contains a Taproot output Q = P + H(P || C)·G.
5. pown = H(txid || s) (prevents reuse across identities or updates).

**Proof outputs:**

```
C

pown

txid_hash

ZK proof
```

The Bitcoin transaction itself is never revealed.

## 7. PoW Update Event

Kind: `39011`

**Tags:**

```
["c",    "<hex C>"]
["pown", "<hex pown>"]
["txh",  "<hex txid_hash>"]
["work", "<integer work_value>"]
```

**Content:**
Base64-encoded ZK proof described above.

**Relay/MRP behavior**

- Verify the ZK proof.
- Reject if txid_hash or pown was previously used.
- Add work to the identity’s PoW score.

## 8. Security Properties

**Unlinkability**
- No Bitcoin address or tx is exposed.
- Taproot tweaks hide commitments invisibly.
- Proof reveals nothing about which UTXOs were used.

**Unstealable PoW**
- Only transactions committing to C can strengthen identity C.
- Attackers cannot reuse someone else’s tx.

**Non-Replayable**
- Each tx yields a unique pown = H(txid || s).

**Decentralized**
- Anyone can verify the proof.
- No centralized registry of transactions.
- No trusted setup beyond ZKP scheme assumptions.

## 9. Notes

- Multiple P2C PoW events accumulate as increasing trust score for the identity.
- Users may keep or later spend the funds sent to their P2C address.
- No custom Bitcoin wallet is required:
- Users only need to send to a generated Taproot address.
