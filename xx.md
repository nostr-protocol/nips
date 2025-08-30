# NIP-XX: Time Capsules

`draft` `optional`

This NIP defines time-locked capsules: encrypted Nostr events that become readable only at/after a target timestamp or when a threshold of designated witnesses publish unlock shares. This enables delayed revelation, threshold cryptography, digital inheritance, and whistleblowing protection.

Time-locked capsules allow content to be:

- Released automatically after a specific timestamp
- Unlocked when multiple witnesses collaborate
- Made accessible after long periods for digital inheritance
- Protected with built-in delays for sensitive material

## Event Kinds
Permalink: Event Kinds

- `1990`: Time Capsule (regular)
- `30095`: Time Capsule (parameterized replaceable; keyed by `d` tag)
- `1991`: Time Capsule Unlock Share
- `1992`: Time Capsule Share Distribution

## Specification
Permalink: Specification

### Time Capsule Events (kinds `1990` and `30095`)
Permalink: Time Capsule Events

A time capsule event contains encrypted content and unlock conditions.

#### Required tags

- `u`: Unlock configuration in format `["u","<mode>","<param1>","<value1>",...]`
- `p`: Witness pubkeys (one or more) - `["p","<witness_pubkey_hex>"]`
- `w-commit`: Merkle root commitment - `["w-commit","<hex_merkle_root>"]`
- `enc`: Encryption method - `["enc","nip44:v2"]`
- `loc`: Storage location - `["loc","inline"|"https"|"blossom"|"ipfs"]`

#### Optional tags

- `d`: Identifier (required for kind `30095`) - `["d","<capsule-id>"]`
- `uri`: External content URI (required when `loc != "inline"`) - `["uri","<url>"]`
- `sha256`: Content integrity hash - `["sha256","<hex_hash>"]`
- `expiration`: Expiration timestamp per NIP-40 - `["expiration","<unix>"]`
- `alt`: Human-readable description - `["alt","<description>"]`

#### Content

The `content` field MUST contain a base64-encoded NIP-44 v2 encrypted payload. When `loc` is `"inline"`, the entire encrypted content is in this field. When `loc` is external, this field MAY be empty and the `uri` tag points to the encrypted content.

### Unlock Modes
Permalink: Unlock Modes

#### Threshold Mode

```plaintext
["u","threshold","t","<t>","n","<n>","T","<unix_unlock_time>"]
```

- **t**-of-**n** witnesses must provide shares at/after timestamp `T`
- Prevents unilateral early disclosure but not collusion of any `t` witnesses

#### Scheduled Mode

```plaintext
["u","scheduled","T","<unix_unlock_time>"]
```

- Indicates time-based operational release where witnesses or services intend to post shares after `T`
- This mode is not a cryptographic timelock; a future revision may define a VDF-based trustless mode

Implementations MUST parse unknown `u` modes conservatively and treat them as unsupported.

### Unlock Share Events (kind `1991`)
Permalink: Unlock Share Events

A witness posts one share after the unlock timestamp (with optional skew tolerance).

#### Required tags

- `e`: Capsule event reference - `["e","<capsule_event_id>"]`
- `a`: Addressable reference (if capsule is parameterized replaceable) - `["a","30095:<pubkey_hex>:<d>"]`
- `p`: Witness pubkey - `["p","<witness_pubkey_hex>"]`
- `T`: Unlock time from capsule - `["T","<unix_timestamp>"]`

#### Content

- Base64 Shamir share for threshold mode
- MAY be gift-wrapped (per NIP-59) to reduce metadata leakage
- Clients MUST access the plaintext share after timestamp `T`

### Share Distribution Events (kind `1992`)
Permalink: Share Distribution Events

Automates delivery of per-witness shares immediately after capsule creation.

#### Required tags

- `e`: Capsule event reference - `["e","<capsule_event_id>"]`
- `a`: Addressable reference (if capsule is parameterized replaceable) - `["a","30095:<pubkey_hex>:<d>"]`
- `p`: Recipient witness - `["p","<witness_pubkey_hex>"]`
- `share-idx`: Share index - `["share-idx","<0..n-1>"]`
- `enc`: Encryption method - `["enc","nip44:v2"]`

#### Content

NIP-44 v2 ciphertext containing the Shamir share destined for the witness. Only the intended witness can decrypt.

#### Validation Rules

- Event MUST be authored by the same pubkey as the capsule
- The target `p` MUST appear in the capsule's witness list
- `share-idx` MUST be within `[0, n-1]`

## Protocol Flow
Permalink: Protocol Flow

1. **Create Capsule** (kind `1990` or `30095`)
   - Author generates random key `K` and encrypts payload with NIP-44 v2 → `C`
   - Selects witnesses (p tags), sets threshold `t`, witness count `n`, unlock time `T`
   - Computes `w-commit` over ordered witnesses
   - Publishes capsule with `content=C`, unlock config, witness list, commitment, storage location

2. **Distribute Shares** (kind `1992`) *(recommended)*
   - Split `K` using Shamir's Secret Sharing (t, n)
   - For each witness, publish `1992` with NIP-44 encrypted share for that witness
   - Include `share-idx` to maintain ordering

3. **Unlock** (kind `1991`)
   - At/after timestamp `T` (± skew tolerance), witnesses publish `1991` with plaintext shares
   - Clients collect any `t` valid shares, reconstruct `K`, and decrypt `C`

## Relay Behavior
Permalink: Relay Behavior

### Validation

Relays MUST:

- Ensure required tags exist and are well-formed
- For `1991`, reject shares where `now < T - skew` (recommended skew = 300 seconds)
- For `1992`, validate author matches capsule author and recipient witness is in capsule's witness list

### Indexing

Relays SHOULD:

- Index `p` tags (witnesses) and `e` tags (capsule references) for discovery
- Not rely on custom tag filters beyond NIP-01

### NIP-11 Capability Advertisement
Permalink: NIP-11 Capability Advertisement

Relays implementing this NIP SHOULD advertise their support in their NIP-11 document:

```json
{
  "supported_nips": [1, 11, ...],
  "software": "...",
  "version": "...",
  "capsules": {
    "v": "1",
    "modes": ["threshold","scheduled"],
    "max_inline_bytes": 131072
  }
}
```

### Error Handling

Early share rejection SHOULD use clear error messages per NIP-01 (e.g., `["OK", <event_id>, false, "invalid: too early"]`).

## Client Behavior
Permalink: Client Behavior

- **Creation**: Generate `K`, encrypt payload with NIP-44 v2, produce capsule event, compute `w-commit`, publish
- **Distribution**: Publish `1992` per witness with NIP-44 encrypted share; store local copy
- **Monitoring**: Track timestamp `T`, watch for `1991` from witnesses; tolerate skew ±300s
- **Reconstruction**: Verify witness membership via `w-commit`, collect any `t` valid shares, reconstruct `K`, decrypt content
- **Integrity**: When `loc != inline`, fetch `uri`, verify `sha256` hash before decryption
- **Discovery**: Use standard filters, e.g., witnesses look up:

```json
{ "kinds": [1992], "#p": ["<witness_pubkey_hex>"] }
```

## Security Considerations
Permalink: Security Considerations

- **Witness Collusion**: Threshold prevents unilateral early disclosure but not collusion of any `t` witnesses. Choose diverse witnesses and set `t` accordingly.
- **Early Disclosure**: Enforce timestamp `T` at relays (reject pre-`T - skew`) and at clients (ignore early shares).
- **Time Manipulation**: Use trusted time sources where possible; keep small skew windows.
- **External Storage Integrity**: Include `sha256` for any `uri` content.
- **Spam/DoS**: Rate-limit `1991/1992` per capsule and per witness.

## Examples
Permalink: Examples

### Time Capsule (kind 1990, threshold 2/3)

```json
{
  "kind": 1990,
  "pubkey": "a2b3c4d5...",
  "created_at": 1735689600,
  "content": "base64_encoded_nip44v2_ciphertext",
  "tags": [
    ["u","threshold","t","2","n","3","T","1735776000"],
    ["p","f7234bd4..."],
    ["p","a1a2a3a4..."],
    ["p","b1b2b3b4..."],
    ["w-commit","3a5f...c9"],
    ["enc","nip44:v2"],
    ["loc","inline"],
    ["alt","Secret message requiring 2 of 3 witnesses"]
  ]
}
```

### Time Capsule (kind 30095, external storage)

```json
{
  "kind": 30095,
  "pubkey": "a2b3c4d5...",
  "created_at": 1735689600,
  "content": "",
  "tags": [
    ["d","capsule-2025-07"],
    ["u","threshold","t","3","n","5","T","1736000000"],
    ["p","w1..."],
    ["p","w2..."],
    ["p","w3..."],
    ["p","w4..."],
    ["p","w5..."],
    ["w-commit","9c01...ab"],
    ["enc","nip44:v2"],
    ["loc","https"],
    ["uri","https://media.example/caps/abc"],
    ["sha256","c0ffee..."],
    ["alt","External ciphertext with integrity hash"]
  ]
}
```

### Unlock Share (kind 1991)

```json
{
  "kind": 1991,
  "pubkey": "a1a2a3a4...",
  "created_at": 1735776100,
  "content": "base64_shamir_share",
  "tags": [
    ["e","...capsule_event_id..."],
    ["a","30095:a2b3c4d5...:capsule-2025-07"],
    ["p","a1a2a3a4..."],
    ["T","1735776000"]
  ]
}
```

### Share Distribution (kind 1992)

```json
{
  "kind": 1992,
  "pubkey": "a2b3c4d5...",
  "created_at": 1735689700,
  "content": "base64_nip44v2_encrypted_share_for_witness",
  "tags": [
    ["e","...capsule_event_id..."],
    ["a","30095:a2b3c4d5...:capsule-2025-07"],
    ["p","a1a2a3a4..."],
    ["share-idx","1"],
    ["enc","nip44:v2"]
  ]
}
```

## Test Vectors
Permalink: Test Vectors

### Test Vector A: Threshold 2-of-3

- Witnesses (ordered pubkeys): `hex_pubkey_A`, `hex_pubkey_B`, `hex_pubkey_C`
- `w-commit` = MerkleRoot([(0, `hex_pubkey_A`), (1, `hex_pubkey_B`), (2, `hex_pubkey_C`)])
- `T` = `1735776000`
- Shares: `S0,S1,S2`; any two reconstruct `K`
- Ciphertext: `C = NIP44v2_Encrypt(K, "hello world")` → `content = base64(C)`

Expected flow:

- `1990` event as shown above
- `1992` to `hex_pubkey_B` with `share-idx=1` (content = NIP-44 encrypted `S1` to `hex_pubkey_B`)
- `1991` from `hex_pubkey_B` and `hex_pubkey_C` after `T` (plaintext shares)
- Client reconstructs `K` and decrypts `C` → `"hello world"`

## Rationale
Permalink: Rationale

- Uses new kinds to avoid overloading existing semantics; unaware nodes ignore unknown kinds
- Leverages standard `p`/`e` tags for discovery; avoids non-standard tag filtering
- `w-commit` binds the witness set to prevent tampering
- Parameterized replaceable variant (`30095`) supports pre-`T` fixes via the `d` tag and `a` addressing

## Backwards Compatibility
Permalink: Backwards Compatibility

New kinds are ignored by unaware relays/clients. The `alt` tag provides a human-readable hint for unknown kinds. Use of standard `p` and `e` tags preserves discoverability via existing filters.

## Reference Implementation
Permalink: Reference Implementation

A reference implementation is provided in [Shugur Relay](https://github.com/Shugur-Network/relay) project:

- Relay validation: `internal/relay/nips/nip_time_capsules.go`
- Test suite: `tests/nips/test_time_capsules_comprehensive.sh`
