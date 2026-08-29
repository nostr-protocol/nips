NIP-96 IPFS Extension
======================

IPFS-Optimized File Storage with Twin-Key Authentication
---------------------------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-96](96.md) that integrates **IPFS content addressing**, **provenance tracking** (see [NIP-94 Provenance Extension](94-provenance-extension.md)), and **Twin-Key authentication** (see [NIP-101](101.md)) for decentralized file storage.

## Overview

This extension enhances NIP-96 by:

1. **Native IPFS support** - Files are stored directly on IPFS with content-addressed CIDs
2. **Provenance tracking** - Automatic deduplication and upload chain tracking
3. **Twin-Key integration** - UPlanet geographic identity authentication
4. **Metadata centralization** - Single `info.json` file containing all file metadata
5. **Hybrid API** - REST API with NIP-98 authentication for file operations

## Motivation

Standard NIP-96 servers:
- ❌ Store files with arbitrary URLs (no content addressing)
- ❌ Cannot detect duplicate uploads
- ❌ Lack geographic context for content
- ❌ Require external metadata management

This extension solves these problems by:
- ✅ Using IPFS CIDs as canonical file identifiers
- ✅ Detecting duplicates via SHA256 hash matching
- ✅ Linking files to geographic UMAPs via Twin-Keys
- ✅ Centralizing metadata in `info.json` stored on IPFS

## Implementation

### Server Adaptation (NIP-96 Compatible)

Servers implementing this extension MUST provide the standard NIP-96 discovery endpoint:

```jsonc
// GET /.well-known/nostr/nip96.json
{
  "api_url": "https://u.copylaradio.com/upload2ipfs",
  "download_url": "https://ipfs.copylaradio.com",
  "supported_nips": [96, 98, 94],
  "tos_url": "https://copylaradio.com/terms",
  "content_types": ["image/*", "video/*", "audio/*", "application/pdf"],
  "plans": {
    "free": {
      "name": "Free IPFS Storage",
      "is_nip98_required": true,
      "max_byte_size": 104857600,
      "file_expiration": [0, 0],
      "media_transformations": {
        "image": ["thumbnail"],
        "video": ["thumbnail", "gif_animation"]
      }
    }
  },
  "extensions": {
    "ipfs": true,
    "provenance": true,
    "twin_key": true,
    "info_json": true
  }
}
```

### Upload Endpoint

`POST /upload2ipfs`

**Authentication:** [NIP-98](98.md) Authorization header (REQUIRED)

**Request:**
- `Content-Type: multipart/form-data`
- File in `file` field

**Response (Extended NIP-96):**
```jsonc
{
  "status": "success",
  "message": "File uploaded successfully",
  "new_cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "info": "QmInfoCID123...",
  "thumbnail_ipfs": "QmThumbCID456...",
  "gifanim_ipfs": "QmGifCID789...",
  "duration": 120.5,
  "dimensions": "1920x1080",
  "file_type": "video/mp4",
  "file_hash": "sha256_hash_of_file",
  "provenance": {
    "original_event_id": "abc123...",
    "original_author": "63fe6318dc...",
    "upload_chain": "alice_hex,bob_hex",
    "is_reupload": true
  },
  "nip94_event": {
    "tags": [
      ["url", "/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/video.mp4"],
      ["x", "sha256_hash_of_file"],
      ["ox", "sha256_hash_of_file"],
      ["m", "video/mp4"],
      ["size", "52428800"],
      ["dim", "1920x1080"],
      ["info", "QmInfoCID123..."],
      ["thumbnail_ipfs", "QmThumbCID456..."],
      ["gifanim_ipfs", "QmGifCID789..."],
      ["e", "original_event_id", "", "mention"],
      ["p", "original_author"],
      ["upload_chain", "alice_hex,bob_hex"]
    ]
  }
}
```

### info.json Structure

All file metadata is centralized in a single JSON file stored on IPFS:

```jsonc
{
  "file": {
    "name": "video.mp4",
    "type": "video/mp4",
    "size": 52428800,
    "hash": "sha256_hash_of_file",
    "ipfs": {
      "cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      "path": "/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/video.mp4"
    }
  },
  "media": {
    "duration": 120.5,
    "dimensions": "1920x1080",
    "video_codecs": "h264",
    "audio_codecs": "aac",
    "thumbnail_ipfs": "QmThumbCID456...",
    "gifanim_ipfs": "QmGifCID789..."
  },
  "metadata": {
    "description": "User-provided description",
    "type": "video",
    "uploaded": "2025-11-03T12:00:00Z"
  },
  "provenance": {
    "original_event_id": "abc123...",
    "original_author": "63fe6318dc...",
    "upload_chain": "alice_hex,bob_hex",
    "is_reupload": true
  }
}
```

### Provenance and Deduplication

The server MUST:
1. Calculate file SHA256 hash **before** IPFS upload
2. Query local Nostr relay for existing NIP-94 events with matching hash
3. If found:
   - Reuse existing CID (skip `ipfs add`)
   - Download and pin existing file locally via `ipfs get`
   - Reuse existing `info.json` metadata
   - Update `upload_chain` with current uploader
   - Add provenance tags (`e`, `p`, `upload_chain`)
4. If not found:
   - Upload file to IPFS normally
   - Generate thumbnails and metadata
   - Create new `info.json`

**Benefits:**
- ⚡ Re-uploads are instant (~1-2 seconds instead of minutes)
- 💾 Zero redundant storage
- 🌐 Each re-uploader helps distribute content via IPFS pinning
- 📜 Complete attribution and provenance chain

See [NIP-94 Provenance Extension](94-provenance-extension.md) for detailed implementation.

### Twin-Key Authentication

When users authenticate via NIP-98, the server MAY:
1. Extract the `pubkey` from the NIP-98 event
2. Resolve the DID Document (kind 30800) from the local relay
3. Associate uploaded files with the user's geographic UMAP
4. Tag files with geographic metadata (`latitude`, `longitude`, `g`)

Example:
```jsonc
{
  "kind": 1063,
  "pubkey": "user_hex",
  "tags": [
    ["url", "/ipfs/QmCID/file.mp4"],
    ["x", "sha256_hash"],
    ["did", "did:nostr:user_hex"],
    ["latitude", "43.60"],
    ["longitude", "1.44"],
    ["g", "spey6"],
    ["application", "UPlanet"]
  ]
}
```

This enables:
- 🗺️ Geographic discovery of content
- 🏘️ Localized media feeds per UMAP
- 🔗 Integration with UPlanet identity system

See [NIP-101](101.md) for Twin-Key system details.

## API Extensions

### File Upload with Geographic Context

`POST /api/fileupload`

**Authentication:** NIP-42 or form parameter `npub`

**Request:**
```
Content-Type: multipart/form-data

file: [binary]
npub: npub1...
latitude: 43.60  (optional)
longitude: 1.44  (optional)
```

**Response:** Same as `/upload2ipfs` plus:
```jsonc
{
  "auth_verified": true,
  "umap": "43.60,1.44",
  "did": "did:nostr:user_hex"
}
```

### Video Publishing with NIP-71 Integration

`POST /webcam`

Publishes video to IPFS and creates NIP-71 video event.

**Request:**
```
Content-Type: application/x-www-form-urlencoded

player: npub1...
ipfs_cid: QmCID
thumbnail_ipfs: QmThumbCID
gifanim_ipfs: QmGifCID
info_cid: QmInfoCID
title: Video Title
description: Video Description
publish_nostr: true
latitude: 43.60
longitude: 1.44
```

**Response:**
```jsonc
{
  "status": "success",
  "ipfs_url": "/ipfs/QmCID/video.mp4",
  "nostr_event_id": "event_id_hex",
  "umap": "43.60,1.44"
}
```

This creates a NIP-71 video event with:
- `imeta` tags with thumbnail and GIF
- Geographic tags (`latitude`, `longitude`, `g`)
- UPlanet application tag
- Provenance tags (if file was re-uploaded)

## Client Behavior

### Uploading Files

Clients SHOULD:
1. Sign NIP-98 event with user's keypair
2. Include `Authorization: Nostr <base64_event>` header
3. Send file via `multipart/form-data`
4. Optionally include geographic coordinates
5. Handle instant response for duplicate files

### Displaying Files

Clients SHOULD:
1. Use `/ipfs/CID` URLs for content addressing
2. Display provenance information (upload chain)
3. Show geographic context if available
4. Prefer animated GIF thumbnails when available
5. Load metadata from `info.json` if needed

## Compatibility

This extension is fully compatible with:
- ✅ [NIP-96](96.md) - HTTP File Storage Integration
- ✅ [NIP-98](98.md) - HTTP Auth
- ✅ [NIP-94](94.md) - File Metadata
- ✅ [NIP-71](71.md) - Video Events (via extension)
- ✅ [NIP-101](101.md) - UPlanet Identity

Standard NIP-96 clients can use this server by ignoring IPFS-specific fields.

## Security Considerations

- All files are content-addressed (tamper-proof)
- Provenance chain is cryptographically signed
- NIP-98 authentication prevents unauthorized uploads
- IPFS pinning is optional (users can choose distribution)
- Geographic tags may reveal user location (use with caution)

## Reference Implementation

- **Server:** `UPassport/54321.py` (FastAPI)
- **Upload Script:** `UPassport/upload2ipfs.sh` (Bash)
- **Frontend:** `UPassport/templates/webcam.html`, `UPlanet/earth/common.js`
- **Repository:** [github.com/papiche/UPassport](https://github.com/papiche/UPassport)

## License

This specification is released under **AGPL-3.0**.

## Authors

- **papiche** - [github.com/papiche](https://github.com/papiche)
- **CopyLaRadio SCIC** - Cooperative implementation

