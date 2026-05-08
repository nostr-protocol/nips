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

The `content` field is a human-readable comment from the sender. It MAY be empty. Unlike NIP-57, it is NOT a JSON-encoded zap request.

### Tags

| Tag      | Required | Description                                                                                  |
|----------|----------|----------------------------------------------------------------------------------------------|
| `i`      | Yes      | [NIP-73](73.md) external content identifier. MUST be `bitcoin:tx:<txid>` where `<txid>` is a 64-character lowercase hex Bitcoin transaction ID. |
| `p`      | Yes      | Hex-encoded pubkey of the zap **recipient** (the author being paid).                         |
| `amount` | Yes      | Amount paid to the recipient in **satoshis**, as a decimal integer string. This is the sum of outputs in the referenced transaction that pay the recipient's derived Taproot address — *not* the total transaction value. |
| `e`      | If zapping an event | Hex-encoded id of the event being zapped. A relay hint SHOULD be provided as the third element. |
| `a`      | If zapping an addressable event | Addressable event coordinate `<kind>:<pubkey>:<d-tag>`. Used instead of (or alongside) `e` for addressable events. |
| `k`      | No       | The stringified `kind` of the target event, as in NIP-57.                                    |
| `block`  | No       | Block containing the transaction, as `["block", "<block-hash-hex>", "<height>"]`. Enables SPV-style verification (see [Header-only verification](#header-only-verification)). |
| `proof`  | No       | SPV proof, as `["proof", "<raw-tx-hex>", "<merkle-proof-hex>"]`. The `<merkle-proof-hex>` is the concatenation of sibling hashes on the path from the txid leaf to the block's merkle root, ordered from leaf to root. |
| `alt`    | Yes      | [NIP-31](31.md) human-readable fallback.                                                     |

If neither `e` nor `a` is present, the zap targets the recipient's **profile** (i.e. a tip to the pubkey, not to a specific event).

## Querying

Clients can retrieve onchain zaps for an event using a standard NIP-01 filter:

```jsonc
{ "kinds": [8333], "#e": ["<target-event-id>"] }
```

For addressable events, use `"#a": ["<kind>:<pubkey>:<d-tag>"]`. For profile-level zaps, use `"#p": ["<pubkey>"]`. Clients MAY also locate zaps for a given transaction with `"#i": ["bitcoin:tx:<txid>"]`.

## Verification

Because the `amount` tag is self-reported by the sender, clients MUST verify a `kind:8333` event against the referenced Bitcoin transaction before counting it toward a zap total or displaying its amount.

To verify a `kind:8333` event:

1. Parse the `txid` from the `i` tag.
2. Fetch the transaction from a Bitcoin data source (an Esplora-compatible API, an Electrum server, a local node, etc.).
3. Derive the recipient's expected Taproot address from the `p` tag pubkey as described above.
4. Sum the values of all outputs in the transaction that pay that address. This is the **verified amount**. Change outputs paying back to the sender's own derived Taproot address MUST NOT be counted.
5. If the verified amount is `0`, the event SHOULD be discarded.
6. If the sender's `amount` tag is greater than the verified amount, clients MUST NOT display or count the claimed amount. They MAY discard the event, or cap it to the verified amount.

Unconfirmed transactions MAY be displayed as pending. Because unconfirmed transactions can be evicted (RBF, double-spend), clients SHOULD either exclude them from aggregate totals or clearly label them as pending until they confirm.

### Header-only verification

Fetching transactions from a remote Bitcoin API introduces a trusted third party and a round-trip per zap. Senders MAY include an SPV proof inline in the event via the optional `block` and `proof` tags, allowing a verifier with only the ~75 MB Bitcoin block-header chain to validate the event offline.

With both tags present, a verifier:

1. Looks up the header by `block-hash-hex` (or by `height`) in its local header chain.
2. Double-SHA256 hashes `raw-tx-hex` to obtain the txid, and checks it matches the `i` tag txid.
3. Walks the merkle proof from the txid up to the header's `merkleRoot`.
4. Parses the outputs from `raw-tx-hex`, derives the recipient's Taproot script from the `p` tag, and sums matching outputs — this is the verified amount (applying the same rules as above).
5. Computes confirmations as `tip_height − height + 1`.

When these tags are present, clients SHOULD prefer the inline proof over a remote fetch. When they are absent, clients fall back to the remote verification flow in the previous section. Publishers SHOULD include the tags once the transaction has at least one confirmation, so that the `block` reference is stable (not subject to reorg-induced invalidation of unconfirmed proofs).

Per-event payload cost is roughly 1 KB. For sessions with very large numbers of zaps (≳1M events), downloading compact block filters ([BIP-157](https://github.com/bitcoin/bips/blob/master/bip-0157.mediawiki)/[BIP-158](https://github.com/bitcoin/bips/blob/master/bip-0158.mediawiki), ~1–2 GB) may be more efficient than carrying inline proofs on every event.

### Anti-spoofing rules

- **Self-zaps.** Clients SHOULD reject events where the sender's `pubkey` equals the recipient pubkey in the `p` tag. Because the sender already controls the destination address, self-zaps are trivial to fabricate and contribute nothing meaningful to zap totals.
- **Duplicate events for the same transaction.** Any party can publish a `kind:8333` event referencing someone else's transaction. Clients SHOULD deduplicate events by `(txid, target)` pair and treat the event whose `pubkey` matches an input of the transaction as canonical when such a correlation is available; otherwise the earliest valid event per `(txid, target)` SHOULD be preferred.

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
