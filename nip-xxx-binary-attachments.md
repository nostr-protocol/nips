---
nip: XXX
title: Binary Attachments for Notes and DMs
author: Jonathan Borden (jonathan@loxation.com)
status: Draft
type: Standards Track
created: 2025-08-23
license: CC0-1.0
---

## Abstract

This NIP standardizes how Nostr events reference binary attachments (images, audio, video, documents), supporting both unencrypted and encrypted forms. It defines:

- Tag-based referencing for public events
- A JSON structure for private DMs that keeps encryption secrets private
- A per-attachment symmetric encryption scheme (AES-256-GCM) with normative sizes
- Integrity fields and basic metadata for rendering
- Optional alignment with existing NIPs (NIP-17, NIP-94, NIP-96, NIP-98)

## Motivation

Today, clients handle attachments inconsistently. Public events often embed arbitrary tags; private DMs sometimes inline URLs or bespoke JSON. This NIP provides a consistent, privacy-preserving way to:

- Attach unencrypted files to public notes
- Attach encrypted files whose decryption keys are delivered privately (via DMs) or embedded inside DMs
- Ensure interoperability by keeping metadata normalized (MIME, size, filename, integrity)

## Rationale

- Nostr events should remain lightweight; binary bytes should live off-relay in HTTP-accessible storage.
- Unencrypted public attachments are simple URLs plus integrity metadata.
- Encrypted attachments use a per-attachment symmetric key to avoid key reuse and allow granular sharing.
- For public notes, encryption keys should not be exposed in cleartext (or, if made public intentionally, considered “obfuscated” not secure).
- For DMs, keys live inside encrypted content; tags remain metadata-only.

## Definitions

- **Attachment**: A binary resource referenced by an event.
- **Ciphertext attachment**: The uploaded bytes are encrypted; clients must decrypt locally to render.
- **Per-attachment key**: A random 32-byte AES-256 key generated uniquely for each attachment.

## Specification

### 1. Unencrypted attachments (public notes)

Clients MAY attach resources using `attach` tags:

```
["attach", "<url>", "sha256=<hex>", "m=<mime>", "size=<bytes>", "fn=<filename>", "alt=<text>", "dim=<WxH>", "blurhash=<...>"]
```

**Required:** url, sha256, m, size  
**Recommended:** fn, alt, dim, blurhash  

Clients MUST verify sha256 before rendering.

### 2. Encrypted attachments

**Cipher:** AES-256-GCM  
- key: 32 bytes, base64  
- iv: 12 bytes, base64  
- tag: 16 bytes, base64  
- Ciphertext: raw GCM ciphertext at URL  

Integrity: sha256 MUST be computed over ciphertext.

#### 2.1 Public notes (`eattach` tags)

```
["eattach", "<url>", "sha256=<hex>", "m=<mime>", "size=<bytes>", "fn=<filename>", "algo=A256GCM", "ekref=<event_id_or_url>", "alt=<text>"]
```

- `algo` MUST be `"A256GCM"`.
- `ekref` points to where the decryption key is conveyed (DM, URL, or replaceable event).  
- Including `k/iv/t` directly in tags is discouraged (no confidentiality).

#### 2.2 Private DMs (NIP-17)

Keys MUST live inside the DM’s encrypted content, not tags.  
To avoid exposing symmetric keys in plaintext, this NIP specifies an envelope-wrapped key for DMs:

- Payload encryption: AES-256-GCM (per-attachment K)  
- Key wrapping: X25519-HKDF-AESGCM  
  - Sender generates an ephemeral X25519 keypair (epk, esk)  
  - Shared secret s = X25519(esk, recipient_static_x25519_pub)  
  - wrapKey = HKDF-SHA256(s, info="attachment-key-wrap", salt=random16)  
  - ek = AES-GCM-Encrypt(wrapKey, nonce=random12, K)

Plaintext (before NIP‑17 DM encryption) embedding the metadata:

```json
{
  "type": "message",
  "text": "optional message",
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
        "iv": "<b64-12-bytes>",
        "t": "<b64-16-bytes>",
        "ek": "<b64-wrapped-key-ciphertext>",
        "epk": "<b64-x25519-ephemeral-pub>",
        "wrap": {
          "alg": "X25519-HKDF-AESGCM",
          "nonce": "<b64-12-bytes>",
          "salt": "<b64-16-bytes>"
        }
      },
      "alt": "a cat"
    }
  ]
}
```

On receive, clients decrypt the DM, unwrap K using their static X25519 private key and epk, then decrypt the blob with K/iv/t. No plaintext symmetric keys appear in metadata.

#### 2.3 MLS group attachments

For MLS groups, the attachment AEAD key and nonce are derived from the MLS group secret and epoch via the MLS exporter (no ek/epk in metadata):

- key = MLS.exporter(label="attachment", context=concat(epoch, "|", blobId or messageId), length=32)  
- nonce = MLS.exporter(label="attachment-nonce", context=concat(epoch, "|", blobId or messageId), length=12)

Metadata embedded in the MLS application message (or carried adjacent as client policy) SHOULD include:

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
    "iv": "<b64-12-bytes>",
    "t": "<b64-16-bytes>",
    "mls": { "group_id": "<groupId>", "epoch": 42 }
  }
}
```

Receivers derive the same key/nonce via exporter using (groupId, epoch, context) and decrypt the blob. No key material is placed in metadata.

### 3. Relationship to Existing NIPs

#### 3.1 NIP-17 (DMs)
- Placement: For private messages, all attachment details that include encryption material MUST live inside the DM’s encrypted content (see 2.2). Do not place keys in public tags.
- Rendering: Receivers decrypt the DM per NIP‑17, fetch bytes, verify sha256 over ciphertext, then decrypt with enc.k/iv/t.

#### 3.2 NIP-92 (Media Attachments) — Interoperability
- Purpose: NIP‑92 defines “imeta” tags that annotate media URLs present in the event content. Many media‑focused clients render using imeta.
- Coexistence with NIP‑XXX:
  - attach/eattach MAY be used alongside NIP‑92 imeta in the same event.
  - When the event content contains a media URL, publishers SHOULD include a corresponding imeta tag so NIP‑92‑aware clients render consistently.
  - When both attach/eattach and imeta are present, fields SHOULD be kept consistent.
- Field mapping (informational):
  - url (positional in attach/eattach) ↔ imeta: "url <https://...>"
  - m ↔ imeta: "m <mime>"
  - size ↔ imeta: "size <bytes>" (if used)
  - sha256 ("sha256=<hex>" in attach/eattach) ↔ imeta: "x <hex>" (per NIP‑94)
  - alt, dim, blurhash ↔ imeta: "alt …", "dim WxH", "blurhash …"
  - NIP‑92 "fallback" URLs MAY be included in imeta; there is no attach/eattach equivalent.
- Encrypted media:
  - The imeta "url" MUST point to the ciphertext URL (the same as in eattach).
  - The imeta "x" hash MUST match the sha256 over ciphertext (same value as eattach).
  - Do NOT include keys in imeta or content.
- Recommended client behavior:
  - If a public note includes media URLs in content, add imeta derived from attach/eattach to maximize compatibility with NIP‑92 renderers.
  - If a note does not inline the URL in content (tags‑only publishing), imeta is not applicable; attach/eattach alone is sufficient.

#### 3.3 NIP-94 (File Metadata)
- Publication guidance (normative):
  - Publishers MAY emit a NIP‑94 file‑metadata event for each public attachment (attach or eattach) using the same url/m/size/sha256. This provides durable, relay‑indexable metadata.
  - Clients that publish a NIP‑94 event SHOULD reference it from the note (e.g., "e" or "a" tag per client policy).
  - For encrypted attachments, NIP‑94 events MUST describe the ciphertext (url/m/size/sha256) and MUST NOT include decryption keys; keys live only in private channels (e.g., NIP‑17 DM).
  - When both inline attach/eattach and a NIP‑94 record are present, clients SHOULD prefer inline fields for immediate render and also index the NIP‑94 record.
- Hash alignment:
  - In attach/eattach, sha256=<hex> corresponds to the NIP‑94 "x" field value used by NIP‑92 imeta. Implementations SHOULD ensure these values match across representations.

#### 3.4 NIP-96 (HTTP File Storage)
- Compatibility: Presigned upload/finalize flows align with NIP‑96. A NIP‑96‑compliant server can provide initiation, direct upload, and finalize endpoints returning canonical download URLs and server‑computed metadata.

#### 3.5 NIP-98 (HTTP Auth)
- Usage: Publishers and storage providers MAY require NIP‑98 for upload/finalize/download operations. Include an Authorization header per NIP‑98; servers verify signatures and apply rate limits/quotas.  

### 4. Client Behavior

- Verify sha256 before render  
- Show filename/thumbnail  
- Cache ciphertext and decrypted plaintext  
- Respect accessibility (`alt`)  

### 5. Security Considerations

- Do not leak keys in public tags (no confidentiality).  
- Do not include encryption material (k/iv/t) in NIP‑92 imeta or any public content.  
- Clients MUST verify sha256 and GCM auth tag before render/decrypt.  
- Clients MUST NOT auto‑resolve ekref via untrusted schemes; keys SHOULD be conveyed via private DMs (NIP‑17) or other trusted mechanisms.  
- Apply quotas/content scanning on downloads.  

## Examples

### Public note with two attachments

```json
{
  "kind": 1,
  "content": "trip photos",
  "tags": [
    ["attach","https://cdn.example/a.jpg","sha256=...","m=image/jpeg","size=24567","fn=beach.jpg","alt=beach","dim=1920x1080"],
    ["attach","https://cdn.example/itinerary.pdf","sha256=...","m=application/pdf","size=90123","fn=itinerary.pdf"]
  ]
}
```

### Public note with encrypted video

```json
{
  "kind": 1,
  "content": "members-only video (see your DM for the key)",
  "tags": [
    ["eattach","https://cdn.example/enc/v1/xyz","sha256=...","m=video/mp4","size=8329001","fn=talk.mp4","algo=A256GCM","ekref=event:9b3e..."]
  ]
}
```

### DM carrying encrypted attachment

```json
{
  "type": "message",
  "attachments": [
    {
      "url": "https://cdn.example/enc/xyz",
      "ct": "image/jpeg",
      "size": 23011,
      "sha256": "...",
      "fn": "photo.jpg",
      "enc": {
        "algo": "A256GCM",
        "k": "...",
        "iv": "...",
        "t": "..."
      }
    }
  ]
}
```

### Public note with attach + imeta (unencrypted image)

```json
{
  "kind": 1,
  "content": "beach pic https://cdn.example/a.jpg",
  "tags": [
    ["attach","https://cdn.example/a.jpg","sha256=2f3a...","m=image/jpeg","size=24567","fn=beach.jpg","alt=beach at dusk","dim=1920x1080","blurhash=..."],
    ["imeta","url https://cdn.example/a.jpg","m image/jpeg","x 2f3a...","dim 1920x1080","alt beach at dusk","blurhash ..."]
  ]
}
```

### Public note with eattach + imeta (encrypted video; key via DM)

```json
{
  "kind": 1,
  "content": "members-only video (see your DM for the key) https://cdn.example/enc/v1/xyz",
  "tags": [
    ["eattach","https://cdn.example/enc/v1/xyz","sha256=55aa...","m=video/mp4","size=8329001","fn=talk.mp4","algo=A256GCM","ekref=event:9b3e..."],
    ["imeta","url https://cdn.example/enc/v1/xyz","m video/mp4","x 55aa...","alt members-only talk"]
  ]
}
```

## Implementation Status

- Reference client implementation: **loxation-sw**
- Supports per-attachment AES-256-GCM, presigned upload/finalize, and UI rendering.
