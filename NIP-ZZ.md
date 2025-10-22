# NIP-ZZ

## DNS Bootstrap for Nostr Web Pages

`draft` `optional`

This NIP standardizes DNS TXT record format for bootstrapping Nostr Web Pages clients with site metadata including pubkey, relay URLs for discovery.

## Abstract

To make Nostr Web Pages accessible via traditional domain names, this NIP defines a DNS TXT record format at `_nweb.<domain>` that provides:

- Site author's public key (for event verification)
- Relay URLs where site events are published

The DNS record does NOT contain the site index event ID. Instead, clients query relays for the most recent entrypoint (kind 11126) from the specified pubkey, which points to the current site index (kind 31126), enabling automatic updates without DNS changes.

## Motivation

While Nostr events are identified by pubkey and event IDs, users expect to navigate via domain names (e.g., `example.com`). DNS bootstrap provides:

- **Human-readable addresses** - Users type domains, not npubs
- **Author pinning** - DNS record pins the canonical site pubkey, preventing impersonation
- **Relay discovery** - Clients know where to fetch events
- **Automatic updates** - DNS is set once; clients query for latest events by pubkey, eliminating DNS updates on republish

## DNS TXT Record Format

### Record Name

```
_nweb.<domain>
```

Examples:

- `_nweb.example.com`
- `_nweb.blog.example.com`
- `_nweb.mysite.org`

### Record Value

A single-line JSON string with the following fields:

| Field    | Type    | Required | Description                            |
| -------- | ------- | -------- | -------------------------------------- |
| `v`      | integer | Yes      | Schema version (currently `1`)         |
| `pk`     | string  | Yes      | Site pubkey (npub or hex)              |
| `relays` | array   | Yes      | WSS relay URLs (at least one)          |
| `policy` | object  | No       | Client hints (reserved for future use) |

### Example Records

**Minimal record:**

```json
{
  "v": 1,
  "pk": "npub1abc123...",
  "relays": ["wss://relay.damus.io"]
}
```

**Complete record:**

```json
{
  "v": 1,
  "pk": "5e56a2e48c4c5eb902e062bc30f92eabcf2e2fb96b5e7...",
  "relays": ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.nostr.band"],
  "policy": {
    "min_relays": 2
  }
}
```

## Public Key Format

The `pk` field accepts two formats:

**npub (bech32):**

```json
"pk": "npub1abc123def456..."
```

**Hex:**

```json
"pk": "5e56a2e48c4c5eb902e062bc30f92eabcf2e2fb96b5e7..."
```

Clients MUST support both formats.

## Relay URLs

**Format:**

- MUST use `wss://` scheme (WebSocket Secure)
- MUST be valid WebSocket URLs
- SHOULD be publicly accessible

**Examples:**

```json
"relays": [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol"
]
```

**Recommendations:**

- Include at least 2-3 relays for redundancy
- Use well-known public relays
- Ensure relays support NIP-YY event kinds (1125, 1126, 31126, 11126)

## Policy Object

Reserved for future client hints:

```json
"policy": {
  "min_relays": 2,
  "ttl": 3600,
  "cache_strategy": "aggressive"
}
```

Current version ignores this field. Future NIPs may define standard policy fields.

## Why No Site Index in DNS?

**Design Decision:** The DNS record intentionally omits the site index event ID. This is a key architectural choice with significant benefits:

### Benefits of Query-Based Discovery

1. **Zero DNS Updates After Initial Setup**

   - DNS is configured once with pubkey and relays
   - All content updates happen via event publishing only
   - No waiting for DNS propagation (which can take hours)
   - No risk of DNS misconfiguration breaking updates

2. **Instant Content Updates**

   - Publishers republish by creating new events with fresh timestamps
   - Clients query for latest event by `created_at`
   - Updates visible immediately (relay propagation is seconds, not hours)

3. **Supports Multiple Sites Per Pubkey**

   - Multiple domains can point to the same pubkey
   - Each site uses different `d` tags for site indices
   - Clients distinguish sites by domain name, not just pubkey

4. **Resilient to DNS Poisoning**

   - Attacker can't point DNS to old/malicious site version
   - DNS only contains pubkey (identity), not content pointer
   - Latest content is always determined by on-chain timestamps

5. **Simpler Publisher Workflow**
   - No need to update DNS TXT record on every publish
   - No need to wait for propagation to verify changes
   - Reduces human error in DNS management

### How It Works

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. User visits example.com
       ▼
┌─────────────────┐
│   DNS Lookup    │ ◄─── Query _nweb.example.com
│  (ONE TIME)     │      Returns: {pk, relays}
└────────┬────────┘
         │
         │ 2. Connect to relays
         ▼
┌──────────────────┐
│ Query Entrypoint │ ◄─── Filter: kind 11126, author=pk
│  (EVERY VISIT)   │      Get latest replaceable event
└────────┬─────────┘
         │
         │ 3. Extract site index address from 'a' tag
         ▼
┌──────────────────┐
│ Fetch Site Index │ ◄─── Get addressable event: 31126:pk:d-hash
│   (kind 31126)   │      Contains route mappings
└────────┬─────────┘
         │
         │ 4. Got latest site index!
         ▼
┌──────────────────┐
│  Load Site       │
│  Content         │
└──────────────────┘
```

Publishers republish → New entrypoint with newer timestamp → Points to new site index → Clients automatically fetch the new version.

## Client Behavior

### DNS Lookup

1. User navigates to `example.com`
2. Client checks for `_nweb.example.com` TXT record
3. If found, parse JSON and validate schema
4. If not found or invalid, handle as regular HTTP navigation

### Record Validation

**Required checks:**

- `v` field equals `1`
- `pk` field is valid npub or hex pubkey
- `relays` array has at least one valid `wss://` URL

**If validation fails:**

- Ignore record and handle as regular navigation
- Log warning for debugging

### Relay Connection and Site Discovery

1. Connect to all relays in parallel
2. Query for the most recent entrypoint event (kind 11126) from the pubkey:
   ```javascript
   {
     kinds: [11126],
     authors: [pubkey],
     limit: 1
   }
   ```
3. Extract the site index address from the `a` tag in the entrypoint event:
   - The `a` tag format is: `["a", "31126:<pubkey>:<d-tag-hash>", "<relay-url>"]`
   - Parse to get: `kind`, `pubkey`, and `d` tag value
4. Query for the site index (kind 31126) using the extracted address coordinates:
   ```javascript
   {
     kinds: [31126],
     authors: [pubkey],
     "#d": ["<d-tag-hash>"]
   }
   ```
5. Aggregate results from multiple relays
6. Use the event with the most recent `created_at` timestamp

**Alternative Query Method:**

If you want to discover all available site index versions (for version history or debugging), you can query without the `#d` filter:

```javascript
{
  kinds: [31126],
  authors: [pubkey]
}
```

Then sort by `created_at` to get the latest version, or filter by specific `d` tags to get particular versions.

**Note:** The entrypoint (kind 11126) is a replaceable event, so relays only store the latest one. This ensures clients always discover the current site index through the entrypoint's `a` tag reference.

This two-step approach (Entrypoint → Site Index) ensures clients always load the latest published version without requiring DNS updates.

### Author Verification

**Critical security requirement:**

All fetched events MUST be authored by the pubkey from DNS record:

```javascript
if (event.pubkey !== dnsRecord.pk) {
  throw new Error("Event author does not match DNS pubkey");
}
```

This prevents relay impersonation attacks.

## DNS Provider Considerations

### JSON Formatting

Some DNS providers require specific formatting:

**Single-line JSON:**

```
{"v":1,"pk":"npub1...","relays":["wss://relay.damus.io"]}
```

**Escaped quotes (automatic by some providers):**

```
{\"v\":1,\"pk\":\"npub1...\",\"relays\":[\"wss://relay.damus.io\"]}
```

Verify the actual TXT record value resolves to valid JSON.

### Record Length Limits

TXT records have size limits:

- Single string: 255 characters
- Multiple strings: Concatenated to ~4KB

For large records, consider:

- Using hex pubkey instead of npub (shorter)
- Limiting relay array length
- Omitting optional fields

## DNSSEC

DNSSEC is **strongly recommended** to prevent DNS spoofing:

```bash
# Enable DNSSEC for your domain
# (Provider-specific configuration)
```

Clients SHOULD verify DNSSEC signatures when available.

## Example Implementation

### Setting DNS Record

**Cloudflare:**

```
Type: TXT
Name: _nweb
Content: {"v":1,"pk":"npub1...","relays":["wss://relay.damus.io"]}
TTL: Auto or 3600 (DNS rarely needs updating)
```

**Route 53:**

```
Type: TXT
Name: _nweb.example.com
Value: "{"v":1,"pk":"npub1...","relays":["wss://relay.damus.io"]}"
TTL: 3600 (DNS rarely needs updating)
```

### Client Lookup

```javascript
// DNS-over-HTTPS lookup
const response = await fetch(
  `https://dns.google/resolve?name=_nweb.example.com&type=TXT`
);
const data = await response.json();

// Parse TXT record
const txtRecord = data.Answer?.[0]?.data;
const nwebConfig = JSON.parse(txtRecord.replace(/^"|"$/g, ""));

// Validate
if (nwebConfig.v !== 1) throw new Error("Unsupported version");
if (!nwebConfig.pk || !nwebConfig.relays) throw new Error("Invalid record");

// Use config
const pubkey = parseNpub(nwebConfig.pk);
const relays = nwebConfig.relays;
```

## Security Considerations

### Author Pinning

The DNS record acts as a trust anchor:

- **MUST** verify all events match DNS pubkey
- **MUST** reject events from other authors
- Prevents relay injection attacks

### DNS Spoofing

Without DNSSEC:

- Attacker could serve fake DNS record
- Points to malicious pubkey
- User sees impersonated site

**Mitigation:**

- Enable DNSSEC
- Use DNS-over-HTTPS (DoH) for client lookups
- Cache validated records

### Relay Censorship

If all listed relays censor content:

- Site becomes inaccessible via DNS
- Users can manually specify alternative relays
- Consider including diverse relay set

## Caching Strategy

**DNS TTL:**

- DNS TTL can be set high (3600+ seconds) since the record rarely changes
- The DNS record only contains pubkey and relay information
- Site content updates happen via new events, not DNS changes
- Re-query DNS only on TTL expiration or manual refresh
- Cache DNS record for offline fallback

**Site Content Updates:**

- Clients query relays for the latest entrypoint (kind 11126) on each visit
- The entrypoint points to the current site index (kind 31126) via the `a` tag
- Use `created_at` timestamp to determine the most recent version
- No DNS propagation delay for content updates
- Publishers can update sites instantly by publishing new entrypoint events

**Key Insight:** Separating DNS bootstrap (pubkey + relays) from content discovery (query latest entrypoint → site index) means:

- DNS is configured once during initial setup
- All subsequent site updates are instant (no DNS changes needed)
- Clients automatically fetch the newest version from relays
