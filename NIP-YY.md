# NIP-YY

## Nostr Web Pages

`draft` `optional`

This NIP defines a set of event kinds for hosting static websites on Nostr, enabling censorship-resistant web publishing through the Nostr protocol.

## Abstract

Nostr Web Pages (NWP) allows publishing static websites as Nostr events. Web assets (HTML, CSS, JavaScript, fonts, etc.) are stored as regular events (kind 1125), page manifests (1126) define routes, the entrypoint (11126) provides the current entry to a site, and the site index (31126) maps routes using addressable events. This enables decentralized, verifiable, and censorship-resistant websites.

## Motivation

Traditional web hosting relies on centralized servers that can be censored, taken down, or compromised. By publishing websites as Nostr events:

- Content becomes censorship-resistant through relay replication
- Sites are independently verifiable via cryptographic signatures
- No central origin servers are required
- Publishing works with existing Nostr infrastructure

## Event Kinds

This NIP defines the following event kinds:

| Kind    | Description   | Type        |
| ------- | ------------- | ----------- |
| `1125`  | Asset         | Regular     |
| `1126`  | Page Manifest | Regular     |
| `31126` | Site Index    | Addressable |
| `11126` | Entrypoint    | Replaceable |

### Regular Assets (1125)

Content-addressed assets for web pages. All web assets (HTML, CSS, JavaScript, fonts, etc.) use kind `1125` with MIME type specified in the `m` tag.

**Required tags:**

- `m` - MIME type (e.g., `text/html`, `text/css`, `text/javascript`, `application/wasm`, `font/woff2`, 'image/png', etc.)
- `x` - Hex-encoded SHA-256 hash of the `content` field (for content deduplication)

**Optional tags:**

- `alt` - Alternative text or description for the asset

**Example HTML asset:**

```json
{
  "kind": 1125,
  "pubkey": "<site-pubkey>",
  "created_at": 1234567890,
  "tags": [
    ["m", "text/html"],
    ["x", "a1b2c3..."],
    ["alt", "Home Page"]
  ],
  "content": "<!DOCTYPE html><html>...</html>",
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Page Manifest (1126)

Regular event that links assets for a specific page. Each page version is a separate event.

**Required tags:**

- `e` - Asset event IDs (kind 1125): `["e", "<event-id>", "<recommended relay URL, optional>"]`
  - Assets are identified by their event ID; MIME type is specified in the asset's `m` tag

**Optional tags:**

- `title` - Page title
- `description` - Page description

**Example:**

```json
{
  "kind": 1126,
  "pubkey": "<site-pubkey>",
  "created_at": 1234567890,
  "tags": [
    ["e", "<html-event-id>", "wss://relay.example.com"],
    ["e", "<css-event-id-1>", "wss://relay.example.com"],
    ["e", "<css-event-id-2>", "wss://relay.example.com"],
    ["e", "<js-event-id>", "wss://relay.example.com"],
    ["e", "<image-event-id>", "wss://relay.example.com"],
    ["title", "Home"],
    ["description", "Welcome to my Nostr Web site"]
  ],
  "content": "",
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Site Index (31126)

Addressable event that maps routes to their current page manifest IDs. The `d` tag is used for versioning.

**Required tags:**

- `d` - Version identifier (e.g., `"v1.2.3"`, `"v1.0.0"`, `"main"`, `"staging"`)
- `rt` - Route mapping: `["rt", "<route-path>", "<page-manifest-event-id>", "<relay-url, optional>", "<marker, optional>"]`
  - One `rt` tag per route
  - Route path (e.g., `"/"`, `"/about"`, `"/blog/post-1"`)
  - Page manifest event ID (kind 1126)
  - Optional relay URL hint
  - Optional marker: `"default"` or `"404"` to indicate special routes
  - If no route is marked as `"default"`, clients SHOULD use the `"/"` route as default
  - If no route is marked as `"404"`, clients SHOULD display a generic error page

**Optional tags:**

- `title` - Site title
- `description` - Site description

**Example:**

```json
{
  "kind": 31126,
  "pubkey": "<site-pubkey>",
  "created_at": 1234567890,
  "tags": [
    ["d", "v1.2.3"],
    [
      "rt",
      "/",
      "<page-manifest-event-id-1>",
      "wss://relay1.example.com",
      "default"
    ],
    ["rt", "/about", "<page-manifest-event-id-2>", "wss://relay1.example.com"],
    [
      "rt",
      "/blog/post-1",
      "<page-manifest-event-id-3>",
      "wss://relay2.example.com"
    ],
    ["rt", "/404", "<page-manifest-event-id-4>", "", "404"],
    ["title", "My Nostr Website"],
    ["description", "A decentralized website on Nostr"]
  ],
  "content": "",
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Entrypoint (11126)

Replaceable event that points to the current site index. Only the latest event per author is stored by relays.

**Required tags:**

- `a` - Address coordinates to the current site index: `["a", "31126:<pubkey>:<d-tag>", "<relay-url>"]`
  - The `<d-tag>` is the version identifier used in the site index's `d` tag (e.g., `"v1.2.3"`)

**Example:**

```json
{
  "kind": 11126,
  "pubkey": "<site-pubkey>",
  "created_at": 1234567890,
  "tags": [["a", "31126:<site-pubkey>:v1.2.3", "wss://relay1.example.com"]],
  "content": "",
  "id": "<event-id>",
  "sig": "<signature>"
}
```

## Client Behavior

### Publishing

1. Generate asset events (kind 1125) with SHA-256 hashes and MIME types
2. Publish assets to relays
3. Create page manifest (1126) for each page, referencing asset event IDs
4. Create/update site index (31126) with route-to-manifest mapping using `rt` tags
5. Update entrypoint (11126) to point to the current site index version
6. Generate DNS TXT record (see NIP-ZZ)

### Fetching and Rendering

1. Query DNS for `_nweb.<domain>` TXT record to get site pubkey and relays
2. Fetch entrypoint (11126) from relays: `{"kinds": [11126], "authors": ["<pubkey>"]}`
3. Extract site index address from the `a` tag in entrypoint
4. Fetch site index (31126) using the address coordinates
5. Parse site index tags to extract routes (`rt`), identifying which route is marked as `"default"` and which is marked as `"404"`
6. Get page manifest ID for requested route from the `rt` tags
   - If route not found and a `"default"` route exists, use the default route
   - If route not found and no `"default"` route exists, use the `"/"` route
   - If the `"/"` route doesn't exist, display a 404 error
   - If a `"404"` route exists, display the 404 page
   - If no `"404"` route exists, display a generic client-generated error page
7. Fetch page manifest (1126): `{"ids": ["<manifest-id>"]}`
8. Fetch all referenced assets (kind 1125) by event ID
9. Parse each asset's `m` tag to determine MIME type (HTML, CSS, JavaScript, etc.)
10. Assemble HTML with CSS and JS references
11. Render in sandboxed environment

### Security Considerations

**Author Verification:**

- All events MUST be authored by the pubkey specified in DNS TXT record
- Clients MUST reject events from other pubkeys

**Content Addressing:**

- All assets (kind 1125) MUST include `x` tag with SHA-256 hash of the content
  - Enables content deduplication: relays MAY use the `x` tag to identify and deduplicate identical content
  - Allows content sharing: multiple sites can reference the same asset by its hash
- Site indexes (31126) use the `d` tag for versioning
  - The `d` tag SHOULD follow semantic versioning (e.g., `"v1.2.3"`) or use environment identifiers (e.g., `"main"`, `"staging"`)
  - Allows publishers to reference specific versions via the entrypoint

**Sandboxing:**

- Content SHOULD be rendered in isolated environment (iframe sandbox)
- Network requests outside Nostr SHOULD be blocked

## Caching

**DNS Records:**

- Cache only as offline fallback
- Always attempt fresh DNS lookup

**Entrypoint (11126):**

- Always fetch fresh (TTL = 0)
- Required to get current site index

**Site Index (31126):**

- Cache with short TTL (30-60 seconds)
- Required to detect site updates

**Page Manifests (1126):**

- Cache with reasonable TTL (content-addressed by ID)
- Validate against current site index

**Regular Assets (1125):**

- Cache with reasonable TTL (content-addressed)
- Use SHA-256 hash (from `x` tag) for cache key validation
- Can be indexed by MIME type (from `m` tag) for efficient queries

## Reference Implementation

- Website: nweb.shugur.com
- Browser extension:
  - Chrome Web Store: [nostr-web-browser](https://chromewebstore.google.com/detail/nostr-web-browser/hhdngjdmlabdachflbdfapkogadodkif)
  - Firefox Add-on: [nostr-web-browser on AMO](https://addons.mozilla.org/en-US/firefox/addon/nostr-web-browser/)
- Publisher CLI:
  - [nw-publisher on npm](https://www.npmjs.com/package/nw-publisher) (Recommended)
  - [publisher](https://github.com/Shugur-Network/nw-nips/tree/main/publisher)
