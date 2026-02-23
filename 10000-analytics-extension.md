# NIP-10000: UPlanet Analytics Events

## Abstract

This NIP defines a standardized event kind (`kind: 10000`) for sending analytics data as NOSTR events. This allows analytics to be stored on decentralized NOSTR relays instead of centralized servers, providing users with control over their data and enabling queryable, verifiable analytics.

**Both encrypted and unencrypted analytics use the same kind 10000.** The encryption status is determined by the content field and tags. Encrypted analytics have encrypted content (NIP-44) and may include `["t", "encrypted"]` tag.

## Motivation

Traditional analytics systems rely on centralized servers that collect user data without user control. By using NOSTR events for analytics:

- **Decentralized**: Data stored on user-controlled relays
- **Verifiable**: Cryptographically signed by the user
- **Queryable**: Can be queried via standard NOSTR filters
- **Privacy**: User chooses which relays store their analytics
- **Transparency**: All analytics events are publicly verifiable

## Event Structure

### Event Kind: 10000

Analytics events use `kind: 10000` and follow this structure:

```json
{
  "kind": 10000,
  "content": "{\"type\":\"page_view\",\"source\":\"email\",\"timestamp\":\"2024-01-01T12:00:00.000Z\",...}",
  "tags": [
    ["t", "analytics"],
    ["t", "page_view"],
    ["source", "email"],
    ["email", "user@example.com"],
    ["url", "https://ipfs.domain.tld/page"],
    ["referer", "https://referer.com"]
  ],
  "created_at": 1704110400,
  "pubkey": "user_pubkey_hex",
  "id": "event_id_hex",
  "sig": "signature"
}
```

### Content Field

The `content` field contains a JSON stringified object with analytics data:

```json
{
  "type": "page_view|button_click|multipass_card_usage|...",
  "source": "email|web|api|...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "email": "user@example.com",  // optional
  "current_url": "https://...",
  "user_agent": "...",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "referer": "https://...",
  "uspot_url": "https://u.domain.tld",
  // ... custom fields
}
```

### Tags

Required tags:
- `["t", "analytics"]` - Identifies this as an analytics event
- `["t", "<event_type>"]` - The specific analytics event type (e.g., "page_view", "button_click")

Optional tags:
- `["source", "<source>"]` - Source of the analytics (e.g., "email", "web", "api")
- `["email", "<email>"]` - User email (if available and user consents)
- `["url", "<url>"]` - Current page URL
- `["referer", "<referer>"]` - Referer URL (if not "direct")
- `["uplanet", "<uplanet_id>"]` - UPlanet identifier
- Custom tags as needed

## Usage

### JavaScript Integration

When `common.js` is loaded and NOSTR is connected, analytics can be sent as NOSTR events:

```javascript
// Load common.js first (for NOSTR connection)
<script src="path/to/common.js"></script>
<script src="path/to/astro.js"></script>

<script>
  // Smart send: uses NOSTR if available, falls back to HTTP /ping
  uPlanetAnalytics.smartSend({
    type: 'page_view',
    source: 'email',
    email: 'user@example.com'
  });
  
  // Or force NOSTR event (requires NOSTR connection)
  uPlanetAnalytics.sendAsNostrEvent({
    type: 'button_click',
    button_id: 'myButton'
  });
</script>
```

### Querying Analytics Events

Analytics events can be queried using standard NOSTR filters:

```javascript
// Query all analytics events from a user
{
  "kinds": [10000],
  "authors": ["<user_pubkey>"]
}

// Query specific event type
{
  "kinds": [10000],
  "#t": ["analytics", "page_view"],
  "authors": ["<user_pubkey>"]
}

// Query by source
{
  "kinds": [10000],
  "#source": ["email"],
  "authors": ["<user_pubkey>"]
}
```

## Privacy Considerations

- Users control which relays store their analytics
- Events are cryptographically signed, ensuring authenticity
- Users can delete analytics events using NIP-09 (kind 5)
- Email addresses and other PII should only be included with user consent
- Consider using ephemeral events (NIP-40) for sensitive analytics

## Implementation Notes

- The `uPlanetAnalytics` system in `astro.js` automatically detects if NOSTR is available
- Falls back to HTTP POST to `/ping` endpoint if NOSTR is not connected
- Uses `publishNote()` from `common.js` to publish events
- Events are published silently (no user alerts) to avoid interrupting UX

## Compatibility

- Compatible with all NOSTR relays that support kind 10000
- Works with standard NOSTR clients and filters
- Can be extended with additional tags as needed
- Integrates with NIP-101 (DID) for user identity

## Examples

### Page View Analytics

```json
{
  "kind": 10000,
  "content": "{\"type\":\"page_view\",\"source\":\"web\",\"timestamp\":\"2024-01-01T12:00:00.000Z\",\"current_url\":\"https://ipfs.domain.tld/page\",\"viewport\":{\"width\":1920,\"height\":1080}}",
  "tags": [
    ["t", "analytics"],
    ["t", "page_view"],
    ["source", "web"],
    ["url", "https://ipfs.domain.tld/page"]
  ]
}
```

### MULTIPASS Card Usage Analytics

```json
{
  "kind": 10000,
  "content": "{\"type\":\"multipass_card_usage\",\"source\":\"email\",\"email\":\"user@example.com\",\"timestamp\":\"2024-01-01T12:00:00.000Z\"}",
  "tags": [
    ["t", "analytics"],
    ["t", "multipass_card_usage"],
    ["source", "email"],
    ["email", "user@example.com"]
  ]
}
```

## References

- [NIP-01](01.md): Basic protocol flow
- [NIP-09](09.md): Event Deletion
- [NIP-40](40.md): Expiration Timestamp
- [NIP-101](101.md): DID Document
- [UPLANET_EXTENSIONS.md](UPLANET_EXTENSIONS.md): UPlanet NIP Extensions Overview


