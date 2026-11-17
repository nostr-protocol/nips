NIP-94 Provenance Extension
==========================

File Provenance and Upload Chain Tracking
------------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-94](94.md) that implements **provenance tracking** and **upload chain** for file metadata events. This allows NOSTR to track the origin and distribution history of files across the network.

## Overview

This extension enhances NIP-94 file metadata events by:

1. **Detecting duplicate files** by their hash (SHA256)
2. **Tracking the original author** of a file
3. **Creating an upload chain** showing all users who have shared the file
4. **Referencing the original event** to maintain attribution

## Motivation

When users share files on NOSTR:
- The same file may be uploaded multiple times by different users
- Attribution to the original creator is lost
- There's no way to track how content spreads across the network
- Copyright and provenance information is not preserved

This extension solves these problems by:
- Creating a verifiable chain of custody
- Ensuring original creators are always credited
- Building a social graph of content distribution
- Preventing unnecessary duplication of file storage

## Implementation

### Upload Process with Provenance Tracking

When a file is uploaded to IPFS via `upload2ipfs.sh`:

1. **Calculate file hash** (SHA256) - **BEFORE** any IPFS operations
2. **Search NOSTR relay** for existing NIP-94 events with the same hash (tag `x`)
3. **If found (file already exists):**
   - Extract original event ID and author
   - Extract original CID from the event's `url` tag
   - **Reuse existing CID** (no upload to IPFS)
   - Download and pin the existing file locally using `ipfs get` (helps distribute)
   - Fetch existing `info.json` metadata via `ipfs get`
   - Reuse all metadata (duration, dimensions, thumbnails, etc.)
   - Check if there's an existing `upload_chain` tag
   - Extend the chain or create a new one
   - Add provenance tags to the new event
   - **Result:** No redundant upload, instant processing (~1-2 seconds vs minutes)
4. **If not found:**
   - This is the first upload (original)
   - Upload file to IPFS normally
   - Generate thumbnails and metadata
   - No provenance tags needed

### New Tags

#### `upload_chain` Tag

Format: `["upload_chain", "pubkey1,pubkey2,pubkey3"]`

- **pubkey1**: Original uploader (first person to share this file)
- **pubkey2**: Second person to share
- **pubkey3**: Current uploader
- And so on...

The chain is **ordered** and **cumulative**: each new uploader is appended to the chain.

#### Provenance Tags

When a file is re-uploaded, the following standard NIP tags are added:

- `["e", "<original_event_id>", "", "mention"]`: Reference to the original NIP-94 event
- `["p", "<original_author_pubkey>"]`: Mention of the original author (if different from current user)

### Example Events

#### Original Upload (First Time)

```json
{
  "kind": 1063,
  "pubkey": "alice_pubkey",
  "content": "",
  "tags": [
    ["url", "https://ipfs.io/ipfs/QmABC123.../file.pdf"],
    ["x", "sha256_hash_of_file"],
    ["m", "application/pdf"],
    ["info", "QmInfoCID"]
  ]
}
```

**Note:** Only the `x` tag is used. The `ox` tag (original file hash before transformation) is NOT included because `upload2ipfs.sh` does not transform files. According to NIP-94, `ox` should only be used when the server modifies the file (compression, resizing, format conversion, etc.). Since we store files as-is on IPFS, `ox` would be redundant with `x`.

#### Re-Upload by Another User

```json
{
  "kind": 1063,
  "pubkey": "bob_pubkey",
  "content": "",
  "tags": [
    ["url", "https://ipfs.io/ipfs/QmABC123.../file.pdf"],
    ["x", "sha256_hash_of_file"],
    ["m", "application/pdf"],
    ["e", "original_event_id", "", "mention"],
    ["p", "alice_pubkey"],
    ["upload_chain", "alice_pubkey,bob_pubkey"],
    ["info", "QmInfoCID"]
  ]
}
```

**Note:** The URL uses the **same CID** (`QmABC123`) as the original event. The file is not re-uploaded to IPFS; instead, the existing CID is reused. Bob's node pins the content locally to help distribute it across the IPFS network.

#### Third Re-Upload

```json
{
  "kind": 1063,
  "pubkey": "charlie_pubkey",
  "content": "",
  "tags": [
    ["url", "https://ipfs.io/ipfs/QmABC123.../file.pdf"],
    ["x", "sha256_hash_of_file"],
    ["m", "application/pdf"],
    ["e", "original_event_id", "", "mention"],
    ["p", "alice_pubkey"],
    ["upload_chain", "alice_pubkey,bob_pubkey,charlie_pubkey"],
    ["info", "QmInfoCID"]
  ]
}
```

**Note:** The URL still uses the **same CID** (`QmABC123`) as the original. Charlie's node also pins the content locally. The network now has three nodes (Alice, Bob, Charlie) distributing this file, making it more resilient and faster to retrieve.

## info.json Integration

The provenance information is also stored in the `info.json` file (IPFS metadata):

```json
{
  "file": {
    "hash": "sha256_hash_of_file"
  },
  "provenance": {
    "original_event_id": "abc123...",
    "original_author": "alice_pubkey",
    "upload_chain": "alice_pubkey,bob_pubkey,charlie_pubkey",
    "is_reupload": true
  }
}
```

## Client Behavior

### Uploading Files

1. Clients SHOULD pass the user's public key (hex format) to the upload script
2. The script calculates the file hash (SHA256) **before** uploading to IPFS
3. The script queries the relay for existing NIP-94 events with matching hash
4. If found:
   - The script reuses the existing CID (skips `ipfs add`)
   - The script uses `ipfs get` to download and pin the file locally
   - The script reuses all metadata from the original `info.json`
   - Provenance tags are automatically added
   - **Processing time:** ~1-2 seconds (instead of minutes for large files)
5. If not found:
   - Normal upload process (ipfs add, metadata extraction, thumbnail generation)
   - No provenance tags

### Displaying Files

1. Clients SHOULD display the original author's information when showing a file
2. Clients MAY display the full upload chain to show distribution history
3. Clients SHOULD use the `e` tag to link to the original event

### Searching for Files

1. Clients can search for all uploads of a specific file by hash (tag `x`)
2. Clients can find the original upload by looking for events without an `e` tag referencing another NIP-94 event
3. Clients can trace the distribution path using the `upload_chain` tag

## Benefits

1. **Attribution**: Original creators are always credited
2. **De-duplication**: Complete avoidance of redundant IPFS uploads
3. **Performance**: Re-uploads are instant (~1-2 seconds) instead of minutes
4. **Bandwidth**: Saves massive bandwidth by reusing existing CIDs
5. **Storage**: Prevents redundant storage of duplicate files
6. **Provenance**: Complete history of who shared what
7. **Copyright**: Clear chain of custody for copyright verification
8. **Social Graph**: Visualize how content spreads through the network
9. **Discovery**: Find related uploads of the same content
10. **Distribution**: Each re-uploader helps distribute the file via IPFS pinning

## Privacy Considerations

- The `upload_chain` reveals who shared a file
- Users who want privacy SHOULD use a different public key for each upload
- Clients MAY implement an "anonymous upload" mode that omits provenance tracking

## Security Considerations

- Provenance is based on file hash (SHA256)
- Collision attacks are theoretically possible but computationally infeasible
- Clients SHOULD verify file hashes before trusting provenance information
- Malicious users could falsely claim to be the original uploader by not including provenance tags (but the actual original event would still exist on the relay)
- The `ipfs get` operation pins content locally, which helps distribute but also stores it on the user's node
- Users should be aware that re-uploading means they become a host for that content on IPFS

## Reference Implementation

- `UPassport/upload2ipfs.sh`: Bash script implementing provenance tracking
- `UPassport/54321.py`: Python backend passing user pubkey to upload script
- `Astroport.ONE/tools/nostr_get_events.sh`: NOSTR event query script

## Technical Details

### IPFS Operations Order

The script optimizes by performing operations in this specific order:

1. **Calculate file hash** (SHA256) - First operation, before any IPFS interaction
2. **Query NOSTR relay** - Search for existing events with matching hash
3. **Conditional IPFS upload:**
   - If duplicate found: Skip `ipfs add`, use `ipfs get` to pin existing CID
   - If new file: Perform normal `ipfs add` operation
4. **Metadata handling:**
   - If duplicate: Fetch existing `info.json` via `ipfs get`, reuse all metadata
   - If new file: Generate metadata via ffprobe/ffmpeg

This order ensures maximum efficiency and prevents redundant operations.

### IPFS Get vs HTTP Gateway

The implementation uses `ipfs get` instead of HTTP gateway (`curl`) for several reasons:

1. **Automatic pinning**: `ipfs get` downloads AND pins in one operation
2. **P2P reliability**: Direct IPFS network access, not dependent on specific gateways
3. **Decentralization**: No reliance on HTTP infrastructure
4. **Performance**: Often faster than HTTP gateway retrieval
5. **Network contribution**: User automatically helps distribute content

## Future Enhancements

1. **Licensing Tags**: Add standard licensing tags (CC, MIT, etc.)
2. **Signature Verification**: Verify that the original author signed the file
3. **Timestamp Verification**: Use NIP-03 OpenTimestamps for provable upload times
4. **Content Addressing**: Use NIP-94 tags to reference multiple IPFS gateways
5. **Automatic Attribution**: Clients automatically add attribution when sharing files
6. **Smart Pinning**: Implement LRU cache for pinned content to manage storage
7. **Reputation System**: Track users' contribution to content distribution

## Performance Characteristics

### Original Upload (Alice)
- **Time:** ~30-60 seconds (for 50MB video)
- **Bandwidth:** ~50MB upload to IPFS
- **Operations:** ipfs add, ffprobe, ffmpeg (thumbnails), metadata extraction

### Re-Upload (Bob, Charlie, etc.)
- **Time:** ~1-2 seconds
- **Bandwidth:** ~2-5KB (NOSTR event query + metadata retrieval)
- **Operations:** Hash calculation, NOSTR query, ipfs get (background pin)
- **Savings:** ~99.9% time reduction, ~99.99% bandwidth reduction

### Network Effect
- Each re-uploader becomes a new IPFS node hosting the content
- Content becomes more resilient and faster to retrieve
- No redundant storage or bandwidth waste
- Original creator is always credited

## Example Use Cases

### Content Creator Protection

Alice creates an image and uploads it. Bob downloads and re-uploads it. The provenance chain shows Alice as the original creator, protecting her copyright. Bob's upload is instant because it reuses Alice's CID.

### Viral Content Tracking

A meme spreads through the network. The upload chain shows the complete distribution path: Alice → Bob → Charlie → Dave → ... Each person's upload is instant, and they all help distribute the original content.

### File Discovery

Users can find all instances of a file by searching for its hash, discovering that multiple users are hosting it on IPFS, improving availability.

### Copyright Verification

A lawyer can prove original authorship by examining the provenance chain and verifying signatures. The original timestamp is preserved in the first NIP-94 event.

### Bandwidth Optimization

A university wants to share a large course video. The first upload takes 5 minutes. All subsequent "uploads" by students are instant and reuse the same CID, saving massive bandwidth.

## Compatibility

This extension is backward compatible with NIP-94:
- Standard NIP-94 clients can ignore provenance tags
- The file metadata (url, hash, mime type) remains unchanged
- Additional tags don't interfere with existing functionality

