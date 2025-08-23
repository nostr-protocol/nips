---
nip: XXX
title: Binary Attachments for Notes and DMs
author: Jonathan Borden (jonathan@@openhealth.org)
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

Keys MUST live inside encrypted content, not tags.  
Plaintext before DM encryption:

```json
{
  "type": "message",
  "text": "optional message",
  "attachments": [
    {
      "url": "https://storage.example/encrypted/blob",
      "ct": "image/jpeg",
      "size": 23011,
      "sha256": "<hex_of_ciphertext>",
      "fn": "photo.jpg",
      "enc": {
        "algo": "A256GCM",
        "k": "<b64-32-bytes>",
        "iv": "<b64-12-bytes>",
        "t": "<b64-16-bytes>"
      },
      "alt": "a cat"
    }
  ]
}
```

### 3. Relationship to Existing NIPs

- **NIP-17 (DMs):** Keys/attachments inside encrypted payload.  
- **NIP-94 (File Metadata):** Optional companion metadata.  
- **NIP-96 (HTTP File Storage):** Compatible with presigned uploads.  
- **NIP-98 (HTTP Auth):** May secure uploads/downloads.  

### 4. Client Behavior

- Verify sha256 before render  
- Show filename/thumbnail  
- Cache ciphertext and decrypted plaintext  
- Respect accessibility (`alt`)  

### 5. Security Considerations

- Do not leak keys in public tags (no confidentiality).  
- Always verify sha256 and GCM auth tag.  
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

## Implementation Status

- Reference client implementation: **loxation-sw**
- Supports per-attachment AES-256-GCM, presigned upload/finalize, and UI rendering.
