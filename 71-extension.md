NIP-71 Extension
================

IPFS and info.json Integration for Video Events
------------------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-71](71.md) that leverages IPFS for decentralized video storage and uses `info.json` files for rich metadata storage, including animated GIF thumbnails.

## Overview

This extension enhances NIP-71 video events by:

1. Using IPFS CIDs instead of HTTP URLs for video content and thumbnails
2. Storing comprehensive metadata in `info.json` files on IPFS
3. Supporting both static thumbnails and animated GIF thumbnails
4. Centralizing metadata extraction in the upload process

## IPFS Integration

### Video Content Storage

Instead of using HTTP URLs in the `imeta` tag `url` field, this extension uses IPFS CIDs with the path format:

```
/ipfs/{CID}/{filename}
```

Clients should resolve IPFS URLs using their preferred IPFS gateway. The CID alone is sufficient to access the content from any IPFS node.

### Metadata Storage (info.json)

Each uploaded file generates an `info.json` file that contains comprehensive metadata about the file. This file is stored on IPFS and its CID is included in the NOSTR event.

#### info.json Structure

```json
{
  "file": {
    "name": "video.mp4",
    "size": 12345678,
    "type": "video/mp4",
    "hash": "sha256_hash"
  },
  "ipfs": {
    "cid": "Qm...",
    "url": "/ipfs/Qm.../video.mp4",
    "date": "2025-01-XX XX:XX +0000"
  },
  "image": {
    "dimensions": "1920x1080"
  },
  "media": {
    "duration": 123.456,
    "video_codecs": "h264",
    "audio_codecs": "aac",
    "dimensions": "1920x1080",
    "thumbnail_ipfs": "Qm...",
    "gifanim_ipfs": "Qm..."
  },
  "metadata": {
    "description": "Video description",
    "type": "video",
    "title": "$:/video/Qm.../video.mp4"
  },
  "nostr": {
    "nip94_tags": [
      ["url", "/ipfs/Qm.../video.mp4"],
      ["x", "sha256_hash"],
      ["ox", "sha256_hash"],
      ["m", "video/mp4"],
      ["dim", "1920x1080"]
    ]
  }
}
```

## Thumbnail Support

This extension supports two types of thumbnails for video content:

### Static Thumbnail (`thumbnail_ipfs`)

A single frame extracted from the video, typically at 1 second or 10% of the video duration (if longer than 10 seconds). Format: JPEG image stored on IPFS.

### Animated GIF Thumbnail (`gifanim_ipfs`)

An animated GIF extracted from a 1.6-second segment of the video, starting at the golden ratio point (0.618 of video duration). This provides a dynamic preview that gives better context about the video content.

Format: GIF animation stored on IPFS.

## NOSTR Event Tags

### info.json Reference

The CID of the `info.json` file can be referenced in NOSTR events using custom tags:

```json
{
  "tags": [
    ["title", "Video Title"],
    ["imeta",
      "dim 1920x1080",
      "url /ipfs/QmVideoCID/video.mp4",
      "m video/mp4",
      "image /ipfs/QmThumbnailCID",
      "gifanim /ipfs/QmGifanimCID"
    ],
    ["info", "QmInfoJsonCID"],
    ["thumbnail_ipfs", "QmThumbnailCID"],
    ["gifanim_ipfs", "QmGifanimCID"]
  ]
}
```

### Tag Descriptions

- `info`: CID of the `info.json` file containing all metadata
- `thumbnail_ipfs`: CID of the static thumbnail image (JPEG)
- `gifanim_ipfs`: CID of the animated GIF thumbnail

Note: The `imeta` tag `image` field can reference either the static thumbnail or animated GIF. Clients may implement preferences to choose which type to display.

## Implementation Example

### Upload Process

1. User uploads video file via `/api/fileupload`
2. File is processed by `upload2ipfs.sh`:
   - File is added to IPFS
   - Video metadata is extracted (duration, dimensions, codecs)
   - Static thumbnail is generated and added to IPFS
   - Animated GIF thumbnail is generated and added to IPFS
   - `info.json` is created with all metadata
   - `info.json` is added to IPFS
3. Backend returns JSON with:
   - `cid`: Video file CID
   - `info`: info.json CID
   - `thumbnail_ipfs`: Static thumbnail CID
   - `gifanim_ipfs`: Animated GIF CID
   - `duration`: Video duration in seconds
   - `dimensions`: Video dimensions (e.g., "1920x1080")

### Client Usage

Clients can:

1. **Load metadata from info.json**: Fetch `/ipfs/{info_cid}/info.json` to get complete metadata
2. **Display thumbnails**: Use either `thumbnail_ipfs` for static or `gifanim_ipfs` for animated previews
3. **Fallback handling**: If `info.json` is not available, use direct tags from the NOSTR event

## Benefits

1. **Decentralization**: Content and metadata stored on IPFS, accessible from any gateway
2. **Rich Metadata**: Comprehensive file information in a single JSON structure
3. **Dynamic Previews**: Animated GIFs provide better context than static thumbnails
4. **Extensibility**: Easy to add new metadata fields to `info.json` without changing NOSTR event structure
5. **Redundancy**: Metadata stored both in NOSTR event tags and `info.json` for maximum compatibility

## Compatibility

This extension is backward compatible with standard NIP-71:

- Standard NIP-71 clients can still parse events using `imeta` tags
- Additional tags (`info`, `thumbnail_ipfs`, `gifanim_ipfs`) are optional
- Clients can choose to load `info.json` for richer metadata or use direct tags
- Static thumbnails follow standard `image` tag conventions in `imeta`

## Client Recommendations

1. **Thumbnail Preference**: Allow users to choose between static and animated thumbnails
2. **Caching**: Cache `info.json` contents locally to reduce IPFS lookups
3. **Gateway Selection**: Allow users to configure preferred IPFS gateway
4. **Progressive Enhancement**: Use direct tags if `info.json` is unavailable

## Example NOSTR Event

```json
{
  "kind": 21,
  "content": "My awesome video",
  "tags": [
    ["title", "My Awesome Video"],
    ["url", "/ipfs/QmVideoCID/video.mp4"],
    ["m", "video/mp4"],
    ["imeta",
      "dim 1920x1080",
      "url /ipfs/QmVideoCID/video.mp4",
      "m video/mp4",
      "duration 123.456",
      "image /ipfs/QmThumbnailCID",
      "gifanim /ipfs/QmGifanimCID"
    ],
    ["info", "QmInfoJsonCID"],
    ["thumbnail_ipfs", "QmThumbnailCID"],
    ["gifanim_ipfs", "QmGifanimCID"],
    ["t", "VideoChannel"],
    ["t", "WebcamRecording"]
  ]
}
```

## Notes on URL Construction

This extension uses CID-only storage (`thumbnail_ipfs`, `gifanim_ipfs`) instead of full URLs. This is intentional:

- **Redundancy Avoidance**: URLs like `/ipfs/{CID}` can be constructed from CIDs when needed
- **Gateway Flexibility**: Clients can choose their preferred IPFS gateway at runtime
- **Storage Efficiency**: Only CIDs are stored in `info.json` and NOSTR event tags
- **URL Construction**: When URLs are needed (e.g., in `imeta` tags), they are constructed as `/ipfs/{CID}`

Clients should construct full URLs by prepending their gateway URL to `/ipfs/{CID}` when making HTTP requests.

## Reference Implementation

This extension is implemented in the following components:

- [`UPassport/upload2ipfs.sh`](https://github.com/papiche/UPassport/blob/main/upload2ipfs.sh): Centralized metadata extraction, and generation of both thumbnail and animated GIF files from video uploads.
- [`UPassport/54321.py`](https://github.com/papiche/UPassport/blob/main/54321.py): Backend API integration for processing video uploads, managing metadata, and publishing NOSTR events with IPFS links.
- [`UPassport/templates/youtube.html`](https://github.com/papiche/UPassport/blob/main/templates/youtube.html): Client-side UI for video/thumbnail selection and display, letting users choose between static and animated thumbnails.
- [`UPlanet/earth/common.js`](https://github.com/papiche/UPlanet/blob/main/earth/common.js): Frontend logic for handling IPFS uploads and parsing returned metadata.

Each implementation leverages CID-only storage (`thumbnail_ipfs`, `gifanim_ipfs`), constructing full URLs dynamically as needed by combining the user’s preferred IPFS gateway with the relevant CIDs.

All implementations use CID-only storage (`thumbnail_ipfs`, `gifanim_ipfs`) and construct URLs dynamically when needed.

