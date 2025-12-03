---
nip: XXX
title: Encrypted Binary Attachments for DMs and MLS
author: Jonathan Borden (jonathan@loxation.com)
status: Draft
type: Standards Track
created: 2025-08-23
license: CC0-1.0
---

## Abstract

This NIP profile standardizes encrypted binary attachments (images, audio, video, documents) for private Nostr messaging only: NIP‑17 direct messages and MLS groups. It defines:

- A normalized JSON structure for NIP‑17 DMs (keys live only inside the DM ciphertext)
- An MLS profile that derives per‑attachment AEAD key/nonce via the MLS exporter
- A per‑attachment AEAD scheme (AES‑256‑GCM) with normative sizes
- Integrity requirements (SHA‑256 over ciphertext)
- HTTP storage guidance (presigned upload/finalize), optionally compatible with NIP‑96 and NIP‑98

Public, unencrypted tags (attach/eattach) are explicitly out of scope for this profile.

## Motivation

Clients and servers need a consistent, interoperable, privacy‑preserving mechanism for sharing files in private contexts. This document scopes the solution to encrypted‑only delivery via NIP‑17 (1:1) and MLS (1:group), which matches our deployment and avoids ambiguity and leakage associated with public note tags.

## Rationale

- Keep symmetric keys in encrypted channels only (DM content or MLS exporter). Never in public tags or relay‑visible metadata.
- Use per‑attachment AEAD to avoid key reuse and enable granular sharing and revocation.
- Compute integrity over ciphertext so clients can verify prior to decryption and rendering.
- Keep events lightweight; store bytes off‑relay at canonical HTTPS URLs.

## Definitions

- **Attachment**: A binary resource referenced by a message.
- **Ciphertext attachment**: Uploaded bytes are encrypted; clients decrypt locally to render.
- **Per‑attachment key**: A random 32‑byte AES‑256 key generated uniquely per attachment (DMs). For MLS, the key is derived via the exporter.

## Specification

### 1. Cipher and integrity

- AEAD: AES‑256‑GCM
  - key: 32 bytes (base64) [DMs only; MLS derives]
  - iv/nonce: 12 bytes (base64)
  - tag: 16 bytes (base64)
- Integrity: sha256 MUST be computed over ciphertext and verified before decrypt/render.

### 2. NIP‑17 direct messages (DMs)

Attachment parameters MUST live inside the DM’s encrypted content (not tags). The DM plaintext embeds a normalized JSON array of attachment objects:

```json
{
  "type": "message",
  "text": "optional user text",
  "attachments": [
    {
      "url": "https://storage.example/enc/blob",
      "ct": "image/jpeg",
      "size": 23011,
      "sha256": "<hex_of_ciphertext>",
      "fn": "photo.jpg",
      "enc": {
        "mode": "dm",
        "algo": "A256GCM",
        "k": "<b64-32-bytes>",
        "iv": "<b64-12-bytes>",
        "t": "<b64-16-bytes>"
      },
      "alt": "a cat",
      "blurhash": "..."
    }
  ]
}
```

Receiver processing:
1) Decrypt the DM per NIP‑17.  
2) Fetch the ciphertext bytes from `url`.  
3) Verify `sha256` over ciphertext.  
4) Decrypt with `enc.k/iv/t`.  
5) Render using `ct`, `fn`, `alt`, and optional hints (e.g., `blurhash`).

Notes:
- The `size` field SHOULD reflect ciphertext length.  
- Clients SHOULD cache both ciphertext and decrypted plaintext for efficient re‑rendering.

### 3. MLS group attachments

For MLS application messages, the attachment AEAD key and nonce are derived via the MLS exporter; no symmetric key material is placed in relay‑visible metadata.

Key/nonce derivation (normative):
- key = MLS.exporter(label="attachment", context=concat(epoch, "|", ctx), length=32)  
- nonce = MLS.exporter(label="attachment-nonce", context=concat(epoch, "|", ctx), length=12)

Where `ctx` is a stable, mutually known identifier for this attachment (e.g., server `blobId` or a message‑scoped `attachmentId`). Publishers MUST include enough metadata for receivers to compute the same `ctx`.

Attachment metadata embedded in or adjacent to the MLS application message SHOULD include:

```json
{
  "url": "https://storage.example/enc/blob",
  "ct": "image/jpeg",
  "size": 23011,
  "sha256": "<hex_of_ciphertext>",
  "fn": "photo.jpg",
  "enc": {
    "mode": "mls",
    "algo": "A256GCM",
    "t": "<b64-16-bytes>",
    "mls": { "group_id": "<groupId>", "epoch": 42, "ctx": "<blobId|attachmentId>" }
  }
}
```

Receiver processing:
1) Use MLS state for `group_id`/`epoch` to derive key and nonce with the exporter and `ctx`.  
2) Fetch ciphertext, verify `sha256`, then decrypt with derived key/nonce and verify auth tag `t`.

### 4. Out of scope

- Public note tags for unencrypted or encrypted media (attach/eattach).  
- NIP‑92 “imeta” and NIP‑94 file‑metadata records for public media.  
This profile targets encrypted attachments delivered via NIP‑17 and MLS only.

### 5. Storage and transport

- Storage: Off‑relay HTTP object storage with presigned upload + finalize flows that return canonical download URLs and server‑computed metadata (size/checksum). These flows are compatible with NIP‑96 where applicable.
- Auth: Publishers and storage providers MAY require NIP‑98 (HTTP Auth) for upload/finalize/download.
- Alternate device transports (e.g., BLE/Noise) MAY carry the same JSON payloads; this does not change the on‑wire format for Nostr DMs or MLS.

### 6. Client behavior

- Verify `sha256` over ciphertext before decrypt/render.  
- Verify GCM auth tag during decryption.  
- Show filename/thumbnail; respect accessibility fields like `alt`.  
- Cache intelligently; apply quotas and safe‑content policies when fetching.

### 7. Security considerations

- Do not place keys, IVs, or tags in public tags or content.  
- Do not include encryption material in NIP‑92 `imeta` or any relay‑visible metadata.  
- Treat URL‑based key delivery or external key references as non‑confidential; this profile forbids such patterns.  
- Ensure unique IVs per key; per‑attachment keys simplify this, but libraries MUST still generate fresh IVs.

## Examples

### NIP‑17 DM with encrypted attachment

```json
{
  "type": "message",
  "attachments": [
    {
      "url": "https://cdn.example/enc/xyz",
      "ct": "image/jpeg",
      "size": 23011,
      "sha256": "55aa...",
      "fn": "photo.jpg",
      "enc": { "mode": "dm", "algo": "A256GCM", "k": "...", "iv": "...", "t": "..." }
    }
  ]
}
```

### MLS attachment metadata (ciphertext at URL; key/nonce via exporter)

```json
{
  "url": "https://cdn.example/enc/xyz",
  "ct": "video/mp4",
  "size": 8329001,
  "sha256": "2f3a...",
  "fn": "talk.mp4",
  "enc": {
    "mode": "mls",
    "algo": "A256GCM",
    "t": "....",
    "mls": { "group_id": "deadbeef", "epoch": 42, "ctx": "blob:e3b0c442..." }
  }
}
```

## Implementation Status

- Reference client: **loxation‑sw**  
- Supports per‑attachment AES‑256‑GCM, presigned upload/finalize, NIP‑17 DM JSON payloads, and UI rendering.  
- MLS exporter‑based attachments are supported in the MLS messaging flows used by Loxation.

