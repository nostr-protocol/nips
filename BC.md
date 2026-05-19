NIP-BC
======

Onchain Zaps
------------

`draft` `optional`

A Nostr pubkey is also a Bitcoin Taproot address: both are 32-byte x-only secp256k1 keys, so any Nostr user can receive Bitcoin directly to their Nostr identity — no LNURL, custodian, or Lightning address required. This NIP defines `kind:8333`, the **onchain zap**: a regular event published by the sender that attributes such a payment to a Nostr event or profile, analogous to the NIP-57 zap receipt (`kind:9735`) but for Bitcoin transactions instead of Lightning invoices.

The kind number mirrors the convention of NIP-57: `9735` is the Lightning Network P2P port, and `8333` is the Bitcoin mainnet P2P port.

## Deriving the Recipient's Bitcoin Address

The recipient's Nostr pubkey is used **directly** as the internal key of a [BIP-341](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki) P2TR output, with no mathematical conversion. The output key is produced by the standard BIP-341 key-path-only tweak (no script tree), and encoded as bech32m ([BIP-350](https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki)) with human-readable prefix `bc`. Every Nostr pubkey therefore has exactly one corresponding mainnet Taproot address, and anyone can compute it from the pubkey alone.

This specification applies to Bitcoin **mainnet** only. Testnet, signet, and other networks are out of scope; addresses and txids from those networks MUST NOT be used in `kind:8333` events.

## Event Structure

Single-recipient zap (the common case — tipping a post or profile):

```jsonc
{
  "kind": 8333,
  "pubkey": "<sender-pubkey>",
  "content": "Great post!",
  "tags": [
    ["i", "bitcoin:tx:<txid>"],
    ["p", "<recipient-pubkey>"],
    ["amount", "<sats>"],
    ["e", "<target-event-id>", "<relay-hint>"],
    ["block", "<block-hash-hex>", "<height>"],
    ["proof", "<raw-tx-hex>", "<merkle-proof-hex>"],
    ["alt", "Onchain zap: 25000 sats"]
  ]
}
```

Multi-recipient zap (one transaction paying multiple recipients — community splits, campaign donations):

```jsonc
{
  "kind": 8333,
  "pubkey": "<sender-pubkey>",
  "content": "Great campaign!",
  "tags": [
    ["i", "bitcoin:tx:<txid>"],
    ["p", "<recipient-1-pubkey>"],
    ["p", "<recipient-2-pubkey>"],
    ["p", "<recipient-3-pubkey>"],
    ["amount", "<total-sats-paid-to-all-listed-recipients>"],
    ["a", "<kind>:<pubkey>:<d-tag>"],
    ["alt", "Onchain zap: 75000 sats across 3 recipients"]
  ]
}
```

The `content` field is a human-readable comment from the sender. It MAY be empty. Unlike NIP-57, it is NOT a JSON-encoded zap request.

### Tags

| Tag      | Required | Description                                                                                  |
|----------|----------|----------------------------------------------------------------------------------------------|
| `i`      | Yes      | [NIP-73](73.md) external content identifier. MUST be `bitcoin:tx:<txid>` where `<txid>` is a 64-character lowercase hex Bitcoin transaction ID. |
| `p`      | Yes (≥1) | Hex-encoded pubkey of a zap **recipient** (an author being paid). A single event MAY include multiple `p` tags when the transaction has one output per recipient. Each `p` tag MUST correspond to at least one tx output paying that recipient's derived Taproot address. |
| `amount` | Yes      | **Total** amount paid in **satoshis**, as a decimal integer string. This is the sum of outputs in the referenced transaction that pay the derived Taproot addresses of **all** listed `p` recipients combined — *not* the total transaction value. The sender's change output MUST NOT be included. For single-recipient events this is simply the amount paid to that one recipient. |
| `e`      | If zapping an event | Hex-encoded id of the event being zapped. A relay hint SHOULD be provided as the third element. |
| `a`      | If zapping an addressable event | Addressable event coordinate `<kind>:<pubkey>:<d-tag>`. Used instead of (or alongside) `e` for addressable events. |
| `k`      | No       | The stringified `kind` of the target event, as in NIP-57.                                    |
| `block`  | No       | Block containing the transaction, as `["block", "<block-hash-hex>", "<height>"]`. `<block-hash-hex>` is the 64-character lowercase hex block hash in display (RPC) byte order. `<height>` is a stringified non-negative decimal integer ≤ `2^31 − 1` with no leading zeros. Enables SPV-style verification (see [Header-only verification](#header-only-verification)). |
| `proof`  | No       | Inline SPV proof, as `["proof", "<raw-tx-hex>", "<merkle-proof-hex>"]`. When `proof` is present, `block` MUST also be present. See [Inline SPV proof encoding](#inline-spv-proof-encoding). |
| `alt`    | Yes      | [NIP-31](31.md) human-readable fallback.                                                     |

If neither `e` nor `a` is present, the zap targets the recipients' **profiles** (i.e. a tip to the pubkey(s), not to a specific event).

Per-recipient amounts are not encoded in the event. Clients that need them (e.g. attributing a multi-recipient donation to one recipient's profile zap history) recompute them from the on-chain transaction by matching each recipient's derived Taproot address against the tx outputs.

## Querying

Clients can retrieve onchain zaps for an event using a standard NIP-01 filter:

```jsonc
{ "kinds": [8333], "#e": ["<target-event-id>"] }
```

For addressable events, use `"#a": ["<kind>:<pubkey>:<d-tag>"]`. For profile-level zaps targeting a specific user, use `"#p": ["<pubkey>"]` — this matches both single-recipient events tagging that user and multi-recipient events where the user is one of several recipients. Clients MAY also locate zaps for a given transaction with `"#i": ["bitcoin:tx:<txid>"]`.

## Verification

Because the `amount` tag is self-reported by the sender, clients MUST verify a `kind:8333` event against the referenced Bitcoin transaction before counting it toward a zap total or displaying its amount.

To verify a `kind:8333` event:

1. Parse the `txid` from the `i` tag.
2. Fetch the transaction from a Bitcoin data source (an Esplora-compatible API, an Electrum server, a local node, etc.).
3. For each `p` tag, derive the recipient's expected Taproot address from the pubkey as described above.
4. Sum the values of all outputs in the transaction that pay any of the derived recipient addresses. This is the **verified amount**. Change outputs paying back to the sender's own derived Taproot address MUST NOT be counted.
5. If the verified amount is `0` (no listed recipient received anything in the tx), the event SHOULD be discarded.
6. If the sender's `amount` tag is greater than the verified amount, clients MUST NOT display or count the claimed amount. They MAY discard the event, or cap it to the verified amount.

When a client needs to attribute a multi-recipient event to one specific recipient (e.g. rendering a profile zap-history entry), it MAY sum only the tx outputs paying that one recipient's derived Taproot address. Per-recipient amounts are not stored in the event — they are recomputed from the transaction at display time.

Unconfirmed transactions MAY be displayed as pending. Because unconfirmed transactions can be evicted (RBF, double-spend), clients SHOULD either exclude them from aggregate totals or clearly label them as pending until they confirm.

### Header-only verification

Fetching transactions from a remote Bitcoin API introduces a trusted third party and a round-trip per zap. Senders MAY include an SPV proof inline in the event via the optional `block` and `proof` tags, allowing a verifier with only the ~75 MB Bitcoin block-header chain to validate the event offline.

With both tags present, a verifier:

1. Looks up the header by `block-hash-hex` (or by `height`) in its local header chain.
2. Double-SHA256 hashes `raw-tx-hex` (with any SegWit witness data stripped) to obtain the txid, and checks it matches the `i` tag txid.
3. Walks the merkle proof from the txid up to the header's `merkleRoot`, per [Inline SPV proof encoding](#inline-spv-proof-encoding) below.
4. Parses the outputs from `raw-tx-hex`, derives the Taproot script for each `p` tag, and sums outputs paying any of those scripts — this is the verified amount (applying the same rules as above).
5. Computes confirmations as `tip_height − height + 1`.

When these tags are present, clients SHOULD prefer the inline proof over a remote fetch. When they are absent — or when proof verification fails — clients fall back to the remote verification flow in the previous section. A `kind:8333` event whose `proof` fails verification MUST NOT be treated as invalid overall; it MUST be treated as if neither `block` nor `proof` were present.

Senders MAY publish a `kind:8333` event before the transaction is confirmed, omitting `block` and `proof`. Once the transaction has at least one confirmation, the same sender MAY publish a second `kind:8333` event referencing the same `i` tag with `block` and `proof` filled in. Verifiers MUST deduplicate by `(txid, recipient-set, target)` and prefer the variant carrying a valid SPV proof.

Per-event payload cost is roughly 1 KB. For sessions with very large numbers of zaps (≳1M events), downloading compact block filters ([BIP-157](https://github.com/bitcoin/bips/blob/master/bip-0157.mediawiki)/[BIP-158](https://github.com/bitcoin/bips/blob/master/bip-0158.mediawiki), ~1–2 GB) may be more efficient than carrying inline proofs on every event.

### Inline SPV proof encoding

All hex byte strings in this section use lower-case hex. Each 32-byte hash inside `<merkle-proof-hex>` is encoded in **internal hashing byte order** (the order produced by SHA-256, the reverse of explorer/RPC display order). The `block-hash-hex` and `txid` strings used elsewhere in the event remain in display order; verifiers reverse them before hashing.

The `<merkle-proof-hex>` field encodes an ordered list of *N* sibling steps from the txid leaf toward the root. Each step is **33 bytes**:

```
+0     1 B   direction
             0x00 → current node is the LEFT child; sibling is on the RIGHT
             0x01 → current node is the RIGHT child; sibling is on the LEFT
             all other values MUST cause the verifier to reject the proof
+1    32 B   sibling hash, internal byte order
```

So `<merkle-proof-hex>` is exactly `33 * N` bytes (`66 * N` hex chars). *N* MAY be `0` (a block with a single transaction), in which case the field is the empty string; the verifier MUST then check that the computed txid equals the header's `merkleRoot`. *N* MUST NOT exceed 32. Verifiers MUST reject proofs whose length is not a multiple of 33.

When Bitcoin's standard odd-level duplication applies — the current node sits at the last, unpaired position at some level — the producer MUST emit a step with `direction = 0x00` and `sibling = cur` (the current node hashed with itself). The verifier treats it like any other step; it does not need to know the total transaction count of the block.

#### Verification algorithm

```
def verify(raw_tx_hex, merkle_proof_hex, header_merkle_root_display):
    tx_bytes = unhex(raw_tx_hex)
    cur      = dsha256(strip_witness(tx_bytes))         # txid, internal order
    root     = reverse_bytes(unhex(header_merkle_root_display))
    proof    = unhex(merkle_proof_hex)
    if len(proof) % 33 != 0: reject()
    if len(proof) // 33 > 32: reject()
    for step in chunks(proof, 33):
        direction, sibling = step[0], step[1:]
        if   direction == 0x00: cur = dsha256(cur     + sibling)
        elif direction == 0x01: cur = dsha256(sibling + cur)
        else: reject()
    return cur == root
```

### Anti-spoofing rules

- **Self-zaps.** Clients SHOULD reject events where the sender's `pubkey` appears in any `p` tag. Because the sender already controls the destination address, self-zaps are trivial to fabricate and contribute nothing meaningful to zap totals. Outputs in the underlying transaction that pay the sender's own derived Taproot address are change outputs and MUST NOT be counted toward the verified amount regardless of the tag set.
- **Duplicate events for the same transaction.** Any party can publish a `kind:8333` event referencing someone else's transaction. Clients SHOULD deduplicate events by `txid` and treat the event whose `pubkey` matches an input of the transaction as canonical when such a correlation is available; otherwise the earliest valid event per `txid` SHOULD be preferred.

## Client Behavior

Clients SHOULD present verified onchain zaps alongside NIP-57 Lightning zap receipts and, where relevant, [NIP-61](61.md) Nutzaps, summing their verified amounts when displaying aggregate zap totals for a post or profile.

When the `content` is non-empty, it MAY be displayed as the sender's comment, analogous to the comment in a NIP-57 zap request.

## Signer Methods

Because the sender's secret key is used to sign both the Nostr event and the underlying Bitcoin transaction, signers that hold the key on the user's behalf need a way to sign Bitcoin transactions in addition to Nostr events. This NIP extends [NIP-07](07.md) and [NIP-46](46.md) with a single new method: `signPsbt` / `sign_psbt`.

A [Partially Signed Bitcoin Transaction](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki) (PSBT) is the standard Bitcoin container for an unsigned or partially signed transaction and contains all information the signer needs to produce a valid signature. The client constructs the unsigned PSBT (inputs, outputs, fee, `tapInternalKey`) and passes it to the signer; the signer applies the BIP-341 TapTweak to the internal key, signs the relevant inputs, and returns the updated PSBT. The client then finalizes and broadcasts the transaction.

Passing a PSBT (rather than a raw transaction or a private-key tweak request) lets the signer inspect the full set of inputs and outputs and display them to the user for confirmation before signing. Signers SHOULD display the destination addresses, the amount being spent, the change output (if any), and the fee before signing.

### NIP-07

The `window.nostr` object MAY expose a `signPsbt` method:

```
async window.nostr.signPsbt(psbt: string): string
```

- The input is a PSBT encoded as a lowercase hex string (BIP-174 binary format hex-encoded).
- The signer signs each input whose `tapInternalKey` matches the user's Nostr pubkey, applying the BIP-341 key-path-only tweak.
- The return value is the updated PSBT, also as a lowercase hex string.
- The signer SHOULD NOT finalize the PSBT; finalization is the client's responsibility.
- If the user rejects the request, the signer MUST throw / reject the promise.

### NIP-46

The `sign_psbt` command is added to the method table in [NIP-46](46.md):

| Command     | Params                                                   | Result                       |
| ----------- | -------------------------------------------------------- | ---------------------------- |
| `sign_psbt` | `[<psbt-hex>]`                                           | `<signed-psbt-hex>`          |

The semantics are identical to the NIP-07 method above: the signer signs inputs whose `tapInternalKey` matches the _user-pubkey_, does not finalize, and returns the resulting PSBT as a lowercase hex string. `sign_psbt` MAY appear in the `perms` list of a `nostrconnect://` URI or a `connect` request.
