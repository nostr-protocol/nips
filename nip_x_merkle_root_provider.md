# NIP-X: Merkle Root Providers (MRPs)

## Identity Commitment Trees for Anonymous, PoW-Weighted Actions

NIP: X

Title: Merkle Root Providers (MRPs)

Author: Stelios Rammos

Status: Draft

Type: Standard

Created: 2025-06-12

License: MIT

## 1. Summary

This NIP defines the **Merkle Root Provider** (MRP) role: a service that maintains an anonymous identity commitment tree using public Nostr events (`39011`) and periodically publishes configuration metadata and Merkle root snapshots (`39012`).
MRPs can be replaced or replicated by anyone, as both their inputs and deterministic rules are fully public.

This NIP enables the identity layer used by NIP-Y for anonymous, PoW-weighted Nostr interactions.

## 2. Motivation

Identity commitments and PoW-based trust scoring require deterministic, globally replayable state.
Rather than requiring every relay to maintain its own Merkle tree, this NIP:

- Defines a standardized identity-tree service

- Ensures deterministic replayability and replaceability

- Enables relays/clients to verify ZK proofs offline using published roots

- Allows multiple MRPs to coexist with varying policies

- Keeps Nostr decentralized—relays choose which MRPs to trust

- MRPs do not see or verify anonymous action proofs; they only publish public state.

## 3. Definitions

**Identity commitment:** `C = H(s)`

**PoW score:** accumulated work for commitment C

**Leaf:** `(C, pow_score)`

**Membership tree:** Merkle tree over all leaves

**Root snapshot:** Merkle root published as a Nostr event

**MRP:** A service that produces the membership tree/roots

## 4. Consumed Events

MRPs MUST ingest a single event type to build and update the membership tree.

### 4.1 Identity & PoW Update (Kind 39011)

Registers or updates an anonymous identity commitment `C = H(s)` and optionally
adds PoW to it.

**Kind:** `39011`  
**Required Tags:**

```
["c", "<hex_C>"]
["work", "<integer_work_value>"]
["root", "<hex_previous_root>"] (optional for first update)
```

- `c`: identity commitment `C = H(s)`.
- `work`: amount of PoW to add (MAY be `"0"`).
- `root`: the MRP root used when generating the proof (if required by the circuit).

**Content:**

- If `work > 0`: base64-encoded ZK proof asserting:
  1. knowledge of `s` with `C = H(s)`,
  2. valid PoW (`H(s || n)` meets difficulty),
  3. correct derivation of `work`,
  4. (optionally) relation to `root`.
- If `work = 0`: MAY be empty or contain a lightweight proof; MRPs MAY ignore
  such events or treat them as zero-score registrations.

**MRP behavior:**

- If `work > 0`:
  - Verify the ZK proof.
  - If invalid → ignore.
  - If valid:
    - If `C` is new, create `{ C, pow_score = work }`.
    - If `C` exists, increase `pow_score(C)` by `work`.
    - Recompute the membership tree and publish a new root (39013).
- If `work = 0`:
  - MRPs MAY:
    - ignore the event entirely, OR
    - insert `{ C, pow_score = 0 }` without requiring a proof.

## 5. Produced Events

### 5.1 Config & Root Snapshot (Kind 39012)

MRPs MUST publish Merkle roots and monotonically increasing sequence numbers.

Tags:

```
["mrp", "<provider_id>"]
["root", "<hex_merkle_root>"]
["seq", "<sequence_number>"]
["leaf_order", "<ordering_rule>"]
["pow_func", "<pow_scoring_function>"]
["pow_min", "<minimum_pow_for_inclusion>"]
["config_version", "<int>"]
["leaf_count", "<int>"]             (optional)
["upto_created_at", "<timestamp>"]  (optional)
```

These roots allow clients to construct anonymous proofs and relays to verify them.

## 6. Replaceability

MRPs MUST be fully replaceable.

A new MRP can perfectly replicate an old one if:

- All identity and PoW events (`39011`) are public

- The configuration event (`39012`) is public

- All root snapshots (`39013`) are public

Any party MAY replay all events + configuration to generate identical roots and seamlessly continue the role of a disappeared MRP.

## 7. Root History Window

Relays SHOULD maintain a cache of recent root snapshots for verification.

Proofs referencing any cached root SHOULD be accepted

MRPs do not need to be online for proof verification

Caches MAY be time-based or size-based

Relays MAY employ strict mode (only latest root), but this is discouraged.

## 8. Trust Model

Clients and relays independently choose which MRPs to trust

Proof events MUST specify:

`["mrp", "<provider_id>"]`

`["root", "<hex_root_used>"]`

Relays verify proofs only against trusted roots

Multiple MRPs MAY coexist.

## 9. Rationale

Separating MRPs from relays:

- Reduces complexity for relays

- Enables proof reuse across relays

- Allows specialized infrastructure for identity trees

- Preserves decentralization through replaceability

## 10. Backwards Compatibility

This NIP introduces new kinds and does not affect existing Nostr behavior.

## 11. Reference Implementation

TBD — minimal reference implementation MUST:

- Ingest events

- Maintain `(C, pow_score)` pairs

- Build Merkle tree

- Publish root snapshots

- MUST determine the algorithm used for the merkle tree and proof.

## 12. License

MIT
