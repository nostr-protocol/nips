NIP-XX
======

Responsive Image Variants
-------------------------

`draft` `optional`

This NIP extends [NIP-94](94.md) (File Metadata) to support multiple resolution variants of an image, enabling bandwidth-efficient responsive image delivery while preserving content-addressed integrity via Blossom.

## Motivation

Modern devices have vastly different display capabilities:
- Thumbnails in feeds need only ~128px width
- Mobile phones typically display 512-768px images
- Desktops benefit from 1280-1920px images
- Original files may be 4000px+ from modern cameras

Currently, Nostr clients either:
1. Serve full-resolution images to all devices (wasteful)
2. Rely on server-side transforms that break content addressing
3. Use a single thumbnail that looks poor on larger displays

Additionally, images from cameras contain EXIF metadata that may leak:
- GPS coordinates (location privacy)
- Camera serial numbers (device fingerprinting)
- Timestamps and other identifying information

This NIP enables clients to:
- Generate multiple resolution variants client-side
- Strip EXIF metadata before upload
- Publish a binding event linking all variants by their content hashes
- Allow other clients to select the appropriate variant for their viewport

## Specification

### Binding Event (Kind 1063)

A responsive image set is represented by a kind `1063` event (per [NIP-94](94.md)) containing multiple `imeta` tags, one per variant. This follows the pattern established by [NIP-71](71.md) for video variants.

Each `imeta` tag MUST include:
- `url` - Blossom URL for this variant
- `x` - SHA-256 hash of this variant's file content
- `m` - MIME type (same as original)
- `dim` - Dimensions as `<width>x<height>`
- `variant` - Size category identifier

The `variant` field identifies the resolution category:

| Variant | Target Width | Use Case |
|---------|--------------|----------|
| `thumb` | 128px | Previews, galleries, feed thumbnails |
| `mobile` | 512px | Mobile portrait viewing |
| `mobile-lg` | 768px | Mobile landscape, small tablets |
| `desktop` | 1280px | Laptops, small desktops |
| `desktop-lg` | 1920px | Large displays, retina |
| `original` | native | Full resolution, EXIF stripped |

### Variant Generation Rules

1. **No upscaling**: Only generate variants smaller than the original image width
2. **Preserve aspect ratio**: Scale height proportionally to maintain aspect ratio
3. **Preserve format**: Output format MUST match input (JPEG→JPEG, PNG→PNG)
4. **Strip metadata**: Remove all EXIF, IPTC, and XMP metadata from all variants
5. **Blurhash**: The `thumb` variant SHOULD include a `blurhash` for placeholder display

### Quality Settings

Recommended JPEG quality settings per variant:
- `thumb`: 70
- `mobile`: 75
- `mobile-lg`: 80
- `desktop`: 85
- `desktop-lg`: 90
- `original`: 90

For PNG images, use maximum compression without quality loss.

## Event Structure

### Example: Large Original (4032x3024)

All variants generated:

```json
{
  "kind": 1063,
  "pubkey": "<publisher-pubkey>",
  "created_at": 1234567890,
  "content": "Sunset over the mountains",
  "tags": [
    ["imeta",
      "url https://blossom.example.com/abc123def456.jpg",
      "x abc123def456789...",
      "m image/jpeg",
      "dim 4032x3024",
      "variant original"
    ],
    ["imeta",
      "url https://blossom.example.com/def456abc789.jpg",
      "x def456abc789012...",
      "m image/jpeg",
      "dim 1920x1440",
      "variant desktop-lg"
    ],
    ["imeta",
      "url https://blossom.example.com/789abc123def.jpg",
      "x 789abc123def345...",
      "m image/jpeg",
      "dim 1280x960",
      "variant desktop"
    ],
    ["imeta",
      "url https://blossom.example.com/012def456abc.jpg",
      "x 012def456abc678...",
      "m image/jpeg",
      "dim 768x576",
      "variant mobile-lg"
    ],
    ["imeta",
      "url https://blossom.example.com/345abc789def.jpg",
      "x 345abc789def901...",
      "m image/jpeg",
      "dim 512x384",
      "variant mobile"
    ],
    ["imeta",
      "url https://blossom.example.com/678def012abc.jpg",
      "x 678def012abc234...",
      "m image/jpeg",
      "dim 128x96",
      "variant thumb",
      "blurhash eVF$^OI:${M{o#*0-nNFxakD"
    ],
    ["x", "abc123def456789..."],
    ["x", "def456abc789012..."],
    ["x", "789abc123def345..."],
    ["x", "012def456abc678..."],
    ["x", "345abc789def901..."],
    ["x", "678def012abc234..."]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

**Note**: The separate `x` tags duplicate the hashes from the `imeta` tags. This redundancy enables standard NIP-01 tag queries (`#x`) to discover the binding event by any variant hash, while the `imeta` tags provide the full metadata for each variant.

### Example: Smaller Original (1000x750)

Only smaller variants generated (no `desktop` or `desktop-lg`):

```json
{
  "kind": 1063,
  "pubkey": "<publisher-pubkey>",
  "created_at": 1234567890,
  "content": "Quick snapshot",
  "tags": [
    ["imeta",
      "url https://blossom.example.com/small123.jpg",
      "x small123456789...",
      "m image/jpeg",
      "dim 1000x750",
      "variant original"
    ],
    ["imeta",
      "url https://blossom.example.com/small456.jpg",
      "x small456789012...",
      "m image/jpeg",
      "dim 768x576",
      "variant mobile-lg"
    ],
    ["imeta",
      "url https://blossom.example.com/small789.jpg",
      "x small789012345...",
      "m image/jpeg",
      "dim 512x384",
      "variant mobile"
    ],
    ["imeta",
      "url https://blossom.example.com/small012.jpg",
      "x small012345678...",
      "m image/jpeg",
      "dim 128x96",
      "variant thumb",
      "blurhash eVF$^OI:${M{o#*0"
    ]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

## Client Behavior

### Publishing Client

1. Load the image file and extract pixel data (discarding EXIF)
2. Determine which variants to generate based on original dimensions
3. Generate each variant using canvas-based scaling
4. Upload each variant to Blossom server(s)
5. Collect SHA-256 hashes and URLs for each uploaded blob
6. Publish kind 1063 event with all `imeta` tags
7. Reference the binding event in notes (via `e` tag or URL)

### Consuming Client

1. Fetch kind 1063 event by event ID or by querying for the `x` hash
2. Parse `imeta` tags to extract available variants
3. Select appropriate variant based on:
   - Current viewport width
   - Device pixel ratio
   - Network conditions (optional)
4. Display `blurhash` placeholder while loading
5. Load selected variant's URL
6. On load failure, fall back to next larger variant
7. Verify SHA-256 hash matches `x` tag (optional but recommended)

### Variant Selection Algorithm

```
function selectVariant(variants, viewportWidth, pixelRatio = 1):
    targetWidth = viewportWidth * pixelRatio

    # Sort variants by width ascending
    sorted = variants.sortBy(v => v.width)

    # Find smallest variant >= target width
    for variant in sorted:
        if variant.width >= targetWidth:
            return variant

    # If none large enough, return largest available
    return sorted.last()
```

## Relay Behavior

Relays SHOULD index kind 1063 events by all `x` hashes present in `imeta` tags. This enables clients to discover the binding event when they only have one variant's hash.

Query example:
```json
["REQ", "sub1", {"kinds": [1063], "#x": ["<any-variant-hash>"]}]
```

## Discovery Model

**Critical**: Blossom blob hashes alone are meaningless without the binding event. A client finding a hash on a Blossom server cannot determine:
- Whether it's a thumbnail, mobile, or original variant
- What other variants exist
- Who published it

The binding event (kind 1063) is the authoritative source. Discovery flow:
1. Client has a hash (from note content or `imeta` tag)
2. Client queries relays for kind 1063 events containing that hash
3. Binding event reveals all variants and their relationships
4. Client can then fetch appropriate variant from Blossom

## Security Considerations

### Hash Verification

Clients SHOULD verify that downloaded content matches the `x` hash in the `imeta` tag. This prevents:
- Server-side image manipulation
- CDN corruption
- Man-in-the-middle attacks

### No Server-Side Transforms

Unlike [NIP-96](96.md)'s `?w=` parameter, this NIP requires all transforms to happen client-side before upload. This preserves the content-addressing guarantee: the hash always matches the file content.

### EXIF Stripping

Publishing clients MUST strip EXIF and other metadata to protect user privacy. This includes:
- GPS coordinates
- Camera make/model/serial
- Timestamps
- Lens information
- Software used

### Immutability

Kind 1063 events are immutable. To update an image (e.g., add a missing variant), publish a new event and update references. Consider using addressable events (kind 31063 with `d` tag) if updates are needed frequently.

## Backward Compatibility

- Relays that don't understand `variant` will still store and serve the events
- Clients that don't support responsive images can use any variant URL
- The `original` variant ensures full-resolution access is always available
- Existing NIP-94 clients will see the first `imeta` tag as the primary file

## References

- [NIP-94: File Metadata](94.md)
- [NIP-92: Media Attachments](92.md)
- [NIP-71: Video Events](71.md)
- [Blossom Protocol](https://github.com/hzrd149/blossom)
- [Blurhash](https://blurha.sh/)
