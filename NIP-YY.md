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

- `m` - MIME type (e.g., `text/html`, `text/css`, `text/javascript`, `application/wasm`, `font/woff2`)
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
- `route` - Page route/path for reference (e.g., `/`, `/about`)
- `csp` - Content Security Policy directives to override the default CSP for this specific page

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
    ["route", "/"],
    ["title", "Home"],
    ["description", "Welcome to my Nostr Web site"]
  ],
  "content": "",
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Site Index (31126)

Addressable event that maps routes to their current page manifest IDs. The `d` tag uses a truncated hash (like Git short hashes) for content-addressed versioning.

**Required tags:**

- `d` - First 7-12 characters of the SHA-256 hash of the `content` field (e.g., `"a1b2c3d"`, `"a1b2c3d4e5f6"`)
- `x` - Full hex-encoded SHA-256 hash of the `content` field (to verify the `d` tag is correctly derived)

**Optional tags:**

- `alt` - Human-readable identifier (e.g., `"main"`, `"staging"`, `"v1.2.3"`) for convenience

**Content:** JSON object with route mappings and optional metadata

**Required fields:**

- `routes` - Object mapping route paths to page manifest event IDs (kind 1126)

**Optional fields:**

- `version` - Semantic version string (e.g., `"1.2.3"`) for tracking site versions
- `defaultRoute` - Default route to display when no specific route is requested (e.g., `"/"`)
- `notFoundRoute` - Route to display for 404 errors (e.g., `"/404"`) or `null` if not specified

**Example:**

```json
{
  "kind": 31126,
  "pubkey": "<site-pubkey>",
  "created_at": 1234567890,
  "tags": [
    ["d", "a1b2c3d"],
    ["x", "a1b2c3d4e5f6789...full-hash..."],
    ["alt", "main"]
  ],
  "content": "{
    \"routes\": {
      \"/\": \"<page-manifest-event-id-1>\",
      \"/about\": \"<page-manifest-event-id-2>\",
      \"/blog/post-1\": \"<page-manifest-event-id-3>\"
    },
    \"version\": \"1.2.3\",
    \"defaultRoute\": \"/\",
    \"notFoundRoute\": \"/404\"
  }",
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Entrypoint (11126)

Replaceable event that points to the current site index. Only the latest event per author is stored by relays.

**Required tags:**

- `a` - Address coordinates to the current site index: `["a", "31126:<pubkey>:<d-tag-hash>", "<relay-url>"]`
  - The `<d-tag-hash>` is the truncated hash used in the site index's `d` tag

**Example:**

```json
{
  "kind": 11126,
  "pubkey": "<site-pubkey>",
  "created_at": 1234567890,
  "tags": [["a", "31126:<site-pubkey>:a1b2c3d", "wss://relay.example.com"]],
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
4. Create/update site index (31126) with route-to-manifest mapping
5. Update entrypoint (11126) to point to the current site index
6. Generate DNS TXT record (see NIP-ZZ)

### Fetching and Rendering

1. Query DNS for `_nweb.<domain>` TXT record to get site pubkey and relays
2. Fetch entrypoint (11126) from relays: `{"kinds": [11126], "authors": ["<pubkey>"]}`
3. Extract site index address from the `a` tag in entrypoint
4. Fetch site index (31126) using the address coordinates
5. Parse site index content to extract `routes`, `version`, `defaultRoute`, and `notFoundRoute` fields
6. Get page manifest ID for requested route from `content.routes`
7. Fetch page manifest (1126): `{"ids": ["<manifest-id>"]}`
8. Fetch all referenced assets (kind 1125) by event ID
9. Parse each asset's `m` tag to determine MIME type (HTML, CSS, JavaScript, etc.)
10. Assemble HTML with CSS and JS references
11. Render in sandboxed environment with CSP enforcement

### Security Considerations

**Author Verification:**

- All events MUST be authored by the pubkey specified in DNS TXT record
- Clients MUST reject events from other pubkeys

**Content Addressing:**

- All assets (kind 1125) MUST include `x` tag with SHA-256 hash of the content
  - Enables content deduplication: relays MAY use the `x` tag to identify and deduplicate identical content
  - Allows content sharing: multiple sites can reference the same asset by its hash
- Site indexes (31126) MUST include `x` tag with SHA-256 hash of the content
  - The `x` tag is used to verify that the `d` tag (truncated hash) is correctly derived from the full hash
  - Clients SHOULD verify that the first 7-12 characters of the `x` tag match the `d` tag

**Content Security Policy:**

- Default CSP: `default-src 'self'; script-src 'sha256-<hash>'`
- Per-page CSP can be specified via the `csp` tag in Page Manifest (1126)
- Custom CSP allows pages to:
  - Allow specific external API connections (`connect-src`)
  - Permit inline styles if needed (`style-src`)
  - Control frame embedding (`frame-ancestors`)
- Clients SHOULD enforce CSP to prevent code injection
- If a page has a `csp` tag, it overrides the default CSP for that page only

**Sandboxing:**

- Content SHOULD be rendered in isolated environment (iframe sandbox)
- Network requests outside Nostr/Blossom SHOULD be blocked

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
