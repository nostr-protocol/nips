NIP-EF
======

On-Chain EVM Identity Linking
------------------------------

`draft` `optional`

## Abstract

This NIP defines a Nostr event for cryptographically linking a Nostr
public key to an Ethereum (EVM) address through an on-chain smart
contract. The link is bidirectional and trustless: the Nostr private
key signs an event containing the Ethereum address, and the Ethereum
private key authorizes the on-chain transaction. No trusted third
party is required.

## Motivation

Existing identity linking mechanisms in Nostr rely on centralized
services for verification:

- **NIP-05** requires a DNS-controlled server
- **NIP-39** requires a post on GitHub, Twitter, or similar platforms

Both are mutable, censorable, and require trusting an external
service. This NIP provides a trustless alternative anchored on a
blockchain: the proof is permanent, publicly verifiable, and
requires no intermediary.

## Event Format

### Link Event

```json
{
  "kind": 13372,
  "created_at": <unix_timestamp>,
  "tags": [],
  "content": "0x<ethereum_address_lowercase_hex>",
  "pubkey": "<nostr_pubkey_hex>",
  "id": "<nip01_event_id>",
  "sig": "<bip340_schnorr_signature>"
}
```

| Field        | Value                                                        |
|--------------|--------------------------------------------------------------|
| `kind`       | `13372` — replaceable, one active link per pubkey            |
| `content`    | Ethereum address, lowercase hex, `0x` prefix, 42 chars total |
| `tags`       | Empty `[]`, or optional discovery tag (see below)            |

Example content: `"0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"`

### Optional Discovery Tag

Clients SHOULD include a single `r` tag with the verifying contract
in CAIP-10 format to help readers locate the on-chain deployment:

```json
"tags": [
  ["r", "eip155:8453:0xf311342bce77086D7C28e5Ba4544c02c5bbE3443"]
]
```

| Tag | Format                                          | Description                              |
|-----|-------------------------------------------------|------------------------------------------|
| `r` | CAIP-10: `eip155:<chainId>:<contractAddress>`   | Verifying contract (chain + address)     |

The `r` tag uses a single-character key and is therefore indexed by
relays, making it filterable in subscription queries (e.g. find all
links verified by a specific contract).

The tag is optional and informational. It does not affect signature
verification — the contract reconstructs the hash from the full tags
string as provided, and the signature covers it. A client that
includes this tag is signing a commitment to a specific deployment.

If omitted, readers must rely on known deployments to verify the link.
If included, readers can query the specified contract directly, and
relays can index and serve events by contract.

### Unlink Event

To remove an identity link, the Ethereum address owner calls
`pullLinkr()` on the contract. This is the authoritative removal.

Optionally, to signal the removal to Nostr clients, publish a
kind `13372` event with empty content:

```json
{
  "kind": 13372,
  "created_at": <unix_timestamp>,
  "tags": [],
  "content": "",
  "pubkey": "<nostr_pubkey_hex>",
  "id": "<nip01_event_id>",
  "sig": "<bip340_schnorr_signature>"
}
```

Since kind `13372` is replaceable, this event replaces the link event
on relays, signaling to Nostr clients that no active link exists.
Clients MUST verify link status by querying the contract directly —
relay state is informational and may lag or diverge.

## Client Requirements

Clients creating a link event MUST:

1. Set `kind` to `13372`
2. Set `content` to the target Ethereum address: lowercase hex with
   `0x` prefix, exactly 42 characters
3. Set `tags` to `[]` or to `[["r", "eip155:<chainId>:<contractAddress>"]]`
4. Compute `id` according to NIP-01
5. Sign via BIP-340 (typically via NIP-07)

Clients SHOULD include the `r` discovery tag pointing to the intended
verification deployment.

Clients SHOULD validate before on-chain submission:
- `content` matches `/^0x[0-9a-f]{40}$/`
- `sig` is exactly 64 bytes (128 hex chars)
- `pubkey` is a valid 32-byte secp256k1 x-only key
- `created_at` is within 10 minutes in the future and 24 hours
  in the past

## On-Chain Verification

### How It Works

A compatible smart contract receives the Nostr event parameters and:

1. Derives `content` from the transaction sender:
   `content = "0x" + toLowerHex(msg.sender)`
2. Reconstructs the NIP-01 serialization:
   `[0,"<pubkey>",<createdAt>,<kind>,<tags>,"<content>"]`
3. Computes `hash = SHA-256(serialization)`
4. Verifies the BIP-340 Schnorr signature:
   `verifySchnorr(pubkey, hash, sig) == true`
5. Records the bidirectional mapping on-chain:
   `ethereum_address ↔ nostr_pubkey`

The contract MUST NOT enforce specific values for `kind` or `tags` —
these are client-side concerns defined by this NIP. The contract is
an immutable cryptographic primitive; protocol semantics belong to
the NIP layer.

Recommended timestamp tolerance:
- Maximum 10 minutes in the future
- Maximum 24 hours in the past

### Contract Interface (Solidity)

```solidity
/// @notice Link caller's Ethereum address to a Nostr public key.
///         Content is derived internally from msg.sender.
///         Kind and tags are not validated — they are NIP-layer concerns.
/// @param pubkey    Nostr public key (x-only, 32 bytes)
/// @param createdAt Unix timestamp of the Nostr event
/// @param kind      Nostr event kind (13372 per this NIP)
/// @param tags      JSON tags string ("[]" per this NIP)
/// @param sig       BIP-340 Schnorr signature (64 bytes)
function pushLinkr(
    bytes32 pubkey,
    uint256 createdAt,
    uint256 kind,
    string calldata tags,
    bytes calldata sig
) external;

/// @notice Remove the link for the caller's Ethereum address.
function pullLinkr() external;

/// @notice Look up the Nostr pubkey linked to an Ethereum address.
function addressPubkey(address) external view returns (bytes32);

/// @notice Look up the Ethereum address linked to a Nostr pubkey.
function pubkeyAddress(bytes32) external view returns (address);
```

### Events

```solidity
event LinkrPushed(address indexed addr, bytes32 indexed pubkey);
event LinkrPulled(address indexed addr, bytes32 indexed pubkey);
```

## Security Properties

**Nostr → Ethereum binding:** The Nostr private key signs an event
whose content is the Ethereum address. The BIP-340 signature
cryptographically proves the Nostr key owner consented to link to
that specific address.

**Ethereum → Nostr binding:** The Ethereum transaction is authorized
by the Ethereum private key. The contract derives `content` from
`msg.sender`, ensuring only the owner of that address can create
the link.

**No trusted third party:** Verification is performed entirely
on-chain. No external server, DNS record, or social platform
is involved.

**Remediation:** Any incorrect link can always be overwritten by
the rightful owner submitting a new valid event. The contract
resolves conflicts automatically, preserving only the most recent
valid submission per address and per pubkey.

## Rationale

**Replaceable kind (10000–19999):** A Nostr key has exactly one
active Ethereum link. Replaceable events ensure relays retain only
the latest event per pubkey, matching the semantics of a current
identity.

**`0x` prefix in content:** Standard Ethereum address format.
Unambiguous and human-readable in any Nostr client or explorer
without additional context.

**Contract does not validate kind or tags:** The contract is an
immutable primitive. Protocol semantics belong to the NIP layer,
enforced client-side. Decoupling allows the protocol to evolve
without redeployment.

**`id` and `content` absent from `pushLinkr`:** Both are derivable
internally — `id` from NIP-01 hash reconstruction, `content` from
`msg.sender`. Removing them simplifies the interface and eliminates
redundant parameters that could be forged or mismatched.

**No chain identifier in content:** The Ethereum address uniquely
identifies the account. The chain context is carried by the optional
`r` discovery tag, not the content. This allows a single signed
event to establish links on multiple EVM chains simultaneously —
any compatible contract on any chain can verify the same signature.

**Single-character `r` tag for discoverability:** Nostr relays index
only tags with single-character keys. Using `r` makes the contract
reference filterable — clients can subscribe to `#r = eip155:8453:0x...`
to find all links for a specific deployment. Multi-character tag names
would not be indexed. The CAIP-10 format (`eip155:chainId:address`)
encodes chain and contract in one value, keeping the tag count minimal.
Because `r` is included in the NIP-01 hash, the signature authenticates
the deployment commitment.

**24-hour past tolerance:** Long enough to accommodate slow
transactions and user delays; short enough to limit the window
during which an accidentally signed event remains exploitable.

## Relationship to Other NIPs

**NIP-39:** Complementary. NIP-39 supports social platform identity
claims via proof URLs (trust-dependent, mutable). This NIP provides
cryptographic on-chain proof (trustless, permanent). Clients MAY
display both.

**NIP-05:** Orthogonal. NIP-05 maps a pubkey to a human-readable
identifier via DNS. This NIP maps a pubkey to a blockchain address
via cryptographic proof.

**NIP-98:** NIP-98 uses kind `27235` for HTTP authentication.
This NIP uses a distinct kind (`13372`) with no overlap.

## Discussion

### Contract Immutability

A contract implementing this NIP MUST be fully trustless and
immutable: no owner, no admin key, no proxy, no upgradability. Once
deployed, the contract is permanent cryptographic infrastructure.
This is a deliberate design constraint, not a limitation. An
upgradeable contract reintroduces a trusted third party — whoever
controls the upgrade key — which defeats the core security property
of this NIP.

Any bug or design change requires a new deployment rather than an
upgrade. Clients and users choose which deployment(s) to trust;
the protocol does not mandate a singleton.

### Multiple Deployments and Fragmentation

Anyone can deploy a contract compatible with this NIP. This raises
an obvious question: if multiple deployments exist, which one is
authoritative?

**None is globally authoritative by protocol.** Each deployment is
an independent, equally valid cryptographic registry. A Nostr key
may appear linked in one registry but not in another, or linked to
different Ethereum addresses across registries, without any
contradiction. The on-chain state of each contract is internally
consistent; there is no cross-contract coordination.

In practice, network effects will cause one deployment to emerge as
the canonical reference for most clients — analogous to how Bitcoin's
chain or a dominant DNS root works: the "correct" one is the one
most participants agree to use. Clients that integrate this NIP
SHOULD document which deployment(s) they query and SHOULD allow
users to configure alternatives.

### Event-Level Contract Declaration and Source of Truth

The optional `r` tag addresses fragmentation at the event level.
When a signer includes `["r", "eip155:<chainId>:<contractAddress>"]`
in the link event, the event itself declares the intended
verification deployment. The BIP-340 signature covers this tag, so
the declaration is cryptographically bound — the signer committed
to a specific contract at signing time.

This makes a Nostr event self-describing: a reader who encounters
it can determine exactly which on-chain registry to query without
out-of-band knowledge. It also allows a single Nostr key to publish
separate link events pointing to different deployments, each
independently verifiable.

The on-chain contract remains the authoritative source of link
status. Nostr relay state (kind 13372 events) is useful for
discovery and for determining which contract a signer used, but it
can lag, diverge, or be censored. Clients MUST verify current link
status by querying the contract directly.

## Reference Implementation

- **Repository:** [github.com/VincenzoImp/nostr-linkr](https://github.com/VincenzoImp/nostr-linkr) — Solidity contract + TypeScript SDK
- **TypeScript SDK:** [`nostr-linkr`](https://www.npmjs.com/package/nostr-linkr) on npm
- **Testnet deployment** (Base Sepolia): [`0xf311342bce77086D7C28e5Ba4544c02c5bbE3443`](https://sepolia.basescan.org/address/0xf311342bce77086D7C28e5Ba4544c02c5bbE3443#code)
- **Live demo:** [nostr-linkr.vercel.app](https://nostr-linkr.vercel.app) — interactive SDK explorer
