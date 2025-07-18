# NIP-XX

## Internet Radio

`draft` `optional`

This NIP defines a standard for publishing and discovering internet radio stations on Nostr, enabling decentralized radio station directories, streaming metadata, social features, and interoperability between radio applications.

## Radio Station Events

Radio stations are published as addressable events of `kind:31237`. These events contain streaming URLs, metadata, and technical specifications needed for playback.

### Event Structure

```json
{
  "kind": 31237,
  "content": "<JSON metadata>",
  "tags": [
    ["d", "<station-identifier>"],
    ["name", "<station-name>"],
    ["t", "<genre>"],
    ["l", "<ISO-639-1-code>"],
    ["countryCode", "<ISO-3166-2-code>"],
    ["location", "<human-readable-location>"],
    ["thumbnail", "<image-url>"],
    ["website", "<station-website>"]
  ]
}
```

### Content Format

The `content` field MUST contain a JSON string with the following structure:

```json
{
  "description": "Station description with **markdown** support",
  "streams": [
    {
      "url": "https://stream.example.com/radio.mp3",
      "format": "audio/mpeg",
      "quality": {
        "bitrate": 128000,
        "codec": "mp3",
        "sampleRate": 44100
      },
      "primary": true
    }
  ],
  "streamingServerUrl": "https://server.example.com"
}
```

#### Required Fields

- `description`: Human-readable description (markdown supported)
- `streams`: Array of stream objects (minimum one required)

#### Optional Fields

- `streamingServerUrl`: Base URL of the streaming server (needed for metadata endpoints when using typical streaming servers like Icecast that provide `/status-json.xsl`, `/admin/stats`, or similar metadata APIs)

#### Stream Object

Each stream object MUST include:

- `url`: Direct URL to the audio stream
- `format`: MIME type (e.g., "audio/mpeg", "audio/aac")
- `quality`: Object with `bitrate`, `codec`, and `sampleRate`
- `primary`: Boolean indicating the default stream (optional)

### Required Tags

- `d`: Unique identifier for the station (used for addressability)
- `name`: Human-readable station name

### Recommended Tags

- `t`: Genre/category tags (multiple allowed)
- `l`: ISO 639-1 language codes (multiple allowed)
- `countryCode`: ISO 3166-2 country code
- `location`: Human-readable location string
- `thumbnail`: Station logo/image URL
- `website`: Station's official website

### Example

```json
{
  "kind": 31237,
  "pubkey": "a1b2c3d4...",
  "created_at": 1690000000,
  "content": "{\"description\":\"Eclectic mix of jazz, world music, and electronic sounds from France.\",\"streams\":[{\"url\":\"https://icecast.radiofrance.fr/fiprock-hifi.aac\",\"format\":\"audio/aac\",\"quality\":{\"bitrate\":128000,\"codec\":\"aac\",\"sampleRate\":44100},\"primary\":true}]}",
  "tags": [
    ["d", "a7f9d2e1b8c3"],
    ["name", "FIP Radio"],
    ["t", "jazz"],
    ["t", "world"],
    ["t", "electronic"],
    ["l", "fr"],
    ["countryCode", "FR"],
    ["location", "Paris, France"],
    ["thumbnail", "https://example.com/fip-logo.png"],
    ["website", "https://www.radiofrance.fr/fip"]
  ]
}
```

## Social Features

Radio stations can leverage existing Nostr social protocols:

### Live Chat Messages

Real-time chat during radio streaming uses existing live chat protocols such as [NIP-53](53.md). Messages should reference the radio station via `a` tag to associate chat with the specific station.

### Station Comments

Persistent discussion threads use existing comment protocols such as [NIP-22](22.md). Comments should reference the radio station event to create threaded discussions about stations.

## Implementation Notes

### Station Identification

- The `d` tag value SHOULD be a random identifier to ensure stability over time
- If no `d` tag is present, it defaults to an empty string
- Multiple stations can be published by the same pubkey using different `d` tags

### Streaming Compatibility

- Support multiple stream formats for broader client compatibility
- Include quality metadata to enable adaptive streaming
- Mark one stream as `primary` for default selection

### Content Indexing

- Use `t` tags for genre/category filtering
- Include `l` tags for internationalization

## Reference Implementation

A reference implementation is available at [WaveFunc](https://github.com/zeSchlausKwab/wavefunc), demonstrating station publishing, favorites management, and social features.
