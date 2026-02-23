# **NIP-XX — Time-Lock Encrypted Messages (Time Capsules)**

`draft` `optional`

This NIP defines **time capsules**: Nostr events whose plaintext becomes readable **at/after a target time** using a drand time-lock (tlock). Capsules can be broadcast publicly or delivered privately with [**NIP-59**](https://github.com/nostr-protocol/nips/blob/master/59.md) gift wrapping; encryption for sealing/wrapping uses [**NIP-44 v2**](https://github.com/nostr-protocol/nips/blob/master/44.md).

> Encoding note: All Base64 in this NIP is RFC 4648 padded and MUST NOT contain line breaks.
>
> **Hex note:** All hex strings in this NIP are **lowercase**.

---

## Event kinds

- **1041** — Time Capsule.

---

## Time capsule (kind: 1041)

A public capsule is a signed `kind:1041` event. Its `content` is a **Base64 of the binary (non-armored) age v1 ciphertext** with **exactly one `tlock` recipient stanza** (no other recipient types).

```json
{
  "id": "<32-byte lowercase hex sha256 of serialized event>",
  "pubkey": "<32-byte lowercase hex pubkey of the author>",
  "created_at": "<unix timestamp in seconds>",
  "kind": 1041,
  "tags": [
    ["tlock", "<drand_chain_hex64>", "<drand_round_uint>"],
    ["alt", "<description>"]
  ],
  "content": "<base64(binary age v1 tlock ciphertext)>",
  "sig": "<64-byte lowercase hex signature of the event hash>"
}
```

**Rules (public 1041):**

- Exactly **one** `tlock` tag (see below).
- `content` **MUST** be Base64 of **binary** age v1 with a **single `tlock` recipient stanza** and **no other** recipient stanzas (e.g., **no** `X25519`, `scrypt`). ASCII-armored age is **invalid**.
- **clients** enforce unlock by verifying drand beacons; relays **do not** enforce time.

---

## Tags

### `tlock` (required on 1041)

**Single, preferred format (normative):**

```json
["tlock", "<drand_chain_hex64>", "<drand_round_uint>"]
```

**Validation:**

- `drand_chain_hex64` matches `^[0-9a-f]{64}$` (lowercase).
- `drand_round_uint` matches `^[1-9][0-9]{0,18}$` (positive, 64-bit safe).
- The age ciphertext **MUST** contain **exactly one** recipient stanza of type `tlock` whose **chain and round equal** the tag values; any mismatch **MUST** be rejected.

### `p` (routing) — **only valid on outer 1059**

- The **inner** `kind:1041` **MUST NOT** contain `p` tags. Clients **MUST** reject any private capsule whose inner 1041 includes a `p` tag.
- On the **outer** `kind:1059` (gift wrap), include at least one `["p","<recipient-npub>","<relay_url?>"]` per recipient for routing.

### `alt` (optional on 1041)

- Human-readable description for UX.

---

## Private capsule (sealed & wrapped per NIP-59)

A private capsule is delivered via the NIP-59 pipeline:

1. **Create the rumor (kind:1041, unsigned).**

   Same schema as public, but **do not sign**. `content` is Base64(binary age v1 `tlock` ciphertext) and the `tlock` tag is present. **Omit `p`**.

   **Rumor MUST NOT include `sig`.** **`id` MAY be present**; if present, clients **MUST** recompute it after recovery and reject on mismatch.

2. **Seal (kind:13).**

   JSON-serialize the rumor and encrypt it to the **recipient** using **NIP-44 v2**; put the ciphertext in `.content`. **`tags` MUST be `[]`**. **Sign with the author’s real key.**

3. **Gift wrap (kind:1059).**

   JSON-serialize the **seal** and encrypt it to the **recipient** using **NIP-44 v2** with a **one-time ephemeral** key; put the ciphertext in `.content`. Add at least one `["p","<recipient>","<relay_url?>"]` (one 1059 per recipient is best practice). **Sign with the ephemeral key.**

   Broadcast only to the recipient’s **DM relays** as advertised by their relay list metadata (per the relevant NIP).

### Minimal examples (structure only)

**Rumor (kind:1041, unsigned):**

```json
{
  "id": "<32-byte lowercase hex sha256 of serialized event>",
  "pubkey": "<author pubkey hex32>",
  "created_at": 1234567890,
  "kind": 1041,
  "tags": [
    ["tlock", "<drand_chain_hex64>", "<drand_round_uint>"],
    ["alt", "<description>"]
  ],
  "content": "<base64(binary age v1 tlock ciphertext)>"
}
```

**Seal (kind:13, signed by author; `tags = []`):**

```json
{
  "id": "<32-byte lowercase hex sha256 of serialized event>",
  "pubkey": "<author pubkey hex32>",
  "created_at": 1234567890,
  "kind": 13,
  "tags": [],
  "content": "<NIP-44 v2 ciphertext of JSON(rumor kind:1041)>",
  "sig": "<author signature hex64>"
}
```

**Gift wrap (kind:1059, signed by ephemeral; includes `p`):**

```json
{
  "id": "<32-byte lowercase hex sha256 of serialized event>",
  "pubkey": "<ephemeral pubkey hex32>",
  "created_at": 1234567890,
  "kind": 1059,
  "tags": [["p", "<recipient npub>", "<relay_url>"]],
  "content": "<NIP-44 v2 ciphertext of JSON(seal kind:13)>",
  "sig": "<ephemeral signature hex64>"
}
```

---

## Decryption & validation (client-side)

### Public 1041

1. Verify **NIP-01** signature; check **exactly one** `tlock` tag; Base64-decode `content`.
2. Fetch the drand beacon for `drand_round_uint` and **verify** it against the chain’s BLS public key derived from `drand_chain_hex64`.
3. Parse the **binary** age v1 ciphertext; ensure **exactly one** recipient stanza of type `tlock` whose chain/round **match the tag**; reject ASCII armor or extra recipient types.
4. Decrypt with the verified beacon; the result is the plaintext.

### Private (1059 → 13 → 1041)

1. Validate outer **1059** (ephemeral **NIP-01** signature); **NIP-44 v2** decrypt `.content` with your key.
2. Parse inner **kind:13**; **`tags` MUST be empty**; verify **author** signature; **NIP-44 v2** decrypt `.content` using the author↔recipient conversation key.
3. Parse recovered **unsigned kind:1041 rumor**. **Verify** `lower(seal.pubkey) == lower(rumor.pubkey)` (both 32-byte lowercase hex). If `rumor.id` is present, **recompute** and reject on mismatch. For display and ordering, **use `rumor.created_at`**; the `created_at` of the seal and wrap are transport metadata and **MUST NOT** replace the rumor’s timestamp in UX.
4. Fetch & verify drand beacon as above; ensure `tlock` tag ↔ age stanza chain/round match; then age-decrypt to recover the plaintext.

---

## Relay semantics

- Relays **MUST NOT** attempt to decrypt or enforce unlock times.
- Clients **MUST** enforce unlock using **verified** drand beacons, **not** local clocks.

---

## Security considerations

- **Beacon verification:** Always verify drand beacons against the chain’s BLS public key (derived from `drand_chain_hex64`) before age decryption. Do **not** trust local time or unsigned beacons; accept the first BLS-verified beacon from any endpoint.
- **Ciphertext format:** Accept **only** binary age v1 `tlock` with **exactly one** recipient stanza; **reject** ASCII-armored inputs and stanza multiplicity or other stanza types.
- **Bounds & DoS:** Before allocation, clients **SHOULD** enforce `tlock_blob ≤ 4096 bytes` and **SHOULD** reject 1041 whose **decoded** `content` exceeds **64 KiB**. Relays **MAY** drop 1041 exceeding **256 KiB** decoded.
- **Sealing/wrapping crypto:** Use **NIP-44 v2** (ECDH → HKDF, ChaCha20, HMAC, padded Base64). Validate MAC in constant time **before** attempting decryption.
- **Timestamps & privacy:** Randomize seal/wrap `created_at` slightly (e.g., jitter/backdate) for metadata privacy; the rumor’s `created_at` is canonical for UX.

---

## Implementations

- **Relay** [**Shugur Relay**] (<https://github.com/Shugur-Network/relay>)
- **Client** [**Shugur Time Capsules**] (<https://capsules.shugur.com>)
