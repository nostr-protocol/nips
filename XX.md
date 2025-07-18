# NIP-XX

## Internet Radio

`draft` `optional`

This NIP defines a standard for publishing and discovering internet radio stations on Nostr, enabling decentralized radio station directories, streaming metadata, social features, and interoperability between radio applications.

## Rationale

Traditional internet radio directories are centralized services controlled by single entities, making them vulnerable to censorship, takedowns, and service discontinuation. Radio stations and listeners lack data portability between different platforms and applications.

This specification leverages Nostr's decentralized infrastructure to create an open, censorship-resistant radio ecosystem where:

- Radio stations can publish their metadata and streaming information directly
- Users maintain portable favorites lists across applications
- Developers can build interoperable radio clients without vendor lock-in
- Communities can engage around stations through comments and live chat
- Discovery happens through the network rather than centralized algorithms
- Organic, decentralized maintenance of station entries helps keep quality high and mitigate broken links
- Direct listener-to-station monetization becomes possible through Nostr's native micropayment capabilities

## Overview

This specification defines radio station events and describes how existing Nostr protocols can be used to create a complete radio ecosystem:

- **Radio Station Events** (`kind:31237`) - Station metadata and streaming information (defined in this NIP)
- **Live Chat Messages** - Real-time chat during streaming using existing live chat protocols
- **Station Comments** - Persistent discussion threads using existing comment protocols
- **Favorites Management** - Personal and curated station collections using [NIP-78](78.md)
- **Application Discovery** - Handler registration using [NIP-89](89.md)

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
    ["language", "<ISO-639-1-code>"],
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
- `language`: ISO 639-1 language codes (multiple allowed)
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
    ["d", "fip-radio-paris"],
    ["name", "FIP Radio"],
    ["t", "jazz"],
    ["t", "world"],
    ["t", "electronic"],
    ["language", "fr"],
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

Persistent discussion threads use existing comment protocols such as [NIP-25](25.md). Comments should reference the radio station event to create threaded discussions about stations.

## Implementation Notes

### Station Identification

- The `d` tag value SHOULD be descriptive and stable for the station
- Multiple stations can be published by the same pubkey using different `d` tags
- Clients SHOULD use the station name as a fallback identifier

### Streaming Compatibility

- Support multiple stream formats for broader client compatibility
- Include quality metadata to enable adaptive streaming
- Mark one stream as `primary` for default selection

### Content Indexing

- Use `t` tags for genre/category filtering
- Include `language` tags for internationalization
- Add `location` for geographical discovery

### Privacy Considerations

- Station owners can moderate chat/comments by maintaining block lists
- Consider rate limiting for chat messages to prevent spam

## Security Considerations

- Validate stream URLs before playback to prevent malicious redirects
- Sanitize station descriptions when rendering markdown content
- Implement reasonable limits on metadata size to prevent DoS attacks
- Verify signatures on all events before processing

## Backwards Compatibility

This specification introduces new event kinds that do not conflict with existing NIPs. Clients that don't understand `kind:31237` can safely ignore these events without affecting other functionality.

## Reference Implementation

A reference implementation is available at [WaveFunc](https://github.com/zeSchlausKwab/wavefunc), demonstrating station publishing, favorites management, and social features.

## Conclusion

This specification enables a decentralized internet radio ecosystem built on Nostr's foundation of censorship resistance and data portability. By standardizing station metadata, social features, and application discovery, it creates interoperability between radio clients while preserving user autonomy and freedom of choice.
