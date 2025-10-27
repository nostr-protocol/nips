# NIP-ZZ

## DNS Bootstrap for Nostr Web Pages

`draft` `optional`

This NIP standardizes DNS TXT record format for bootstrapping Nostr Web Pages clients with site metadata including pubkey, relay URLs for discovery.

## Abstract

To make Nostr Web Pages accessible via traditional domain names, this NIP defines a DNS TXT record format at `_nweb.<domain>` that provides:

- Site public key (for event verification)
- Relay URLs where site events are published

Clients query relays for the entrypoint (kind 11126) from the specified pubkey, which points to the current site index (kind 31126), enabling automatic updates without DNS changes.

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

A space-separated key-value token string with the following format:

```
v=<version> pk=<pubkey> relays=<relay1>[,<relay2>,<relay3>...]
```

| Component | Required | Description                                   |
| --------- | -------- | --------------------------------------------- |
| `v=`      | Yes      | Schema version (currently `1`)                |
| `pk=`     | Yes      | Site pubkey (npub or hex)                     |
| `relays=` | Yes      | Comma-separated WSS relay URLs (at least one) |

### Example Records

**Minimal record:**

```
v=1 pk=npub1abc123... relays=wss://relay.example.com
```

**Multiple relays:**

```
v=1 pk=5e56a2e48c4c5eb902e062bc30f92eabcf2e2fb96b5e7... relays=wss://relay.example.com,wss://relay.example2.com,wss://relay.example3.com
```

## Public Key Format

The `pk=` value accepts two formats:

**npub (bech32):**

```
v=1 pk=npub1abc123def456... relays=wss://relay.example.com
```

**Hex:**

```
v=1 pk=5e56a2e48c4c5eb902e062bc30f92eabcf2e2fb96b5e7... relays=wss://relay.example.com
```

Clients MUST support both formats.

## Relay URLs

**Format:**

- MUST use `wss://` scheme (WebSocket Secure)
- MUST be valid WebSocket URLs
- SHOULD be publicly accessible
- Comma-separated in the `relays=` value

**Example:**

```
v=1 pk=npub1... relays=wss://relay.example.com,wss://relay.example3.com,wss://relay.example2.com
```

**Recommendations:**

- Include at least 3 relays for redundancy (don't include many relays to avoid bloat)
- Use well-known public relays
- Ensure relays support NIP-YY event kinds (1125, 1126, 31126, 11126)
- No spaces allowed in relay URLs (or use percent-encoding)

## Client Behavior

### DNS Lookup

1. User navigates to `example.com`
2. Client checks for `_nweb.example.com` TXT record
3. If found, parse the tokenized string and validate
4. If not found or invalid, handle as regular HTTP navigation

### Record Validation

**Required checks:**

- Record contains `v=1` token (version check)
- Record contains `pk=` token with valid npub or hex pubkey
- Record contains `relays=` token with at least one `wss://` URL
- Unknown parameters MUST be ignored for forward compatibility

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
if (event.pubkey !== parsedDnsRecord.pubkey) {
  throw new Error("Event author does not match DNS pubkey");
}
```

This prevents relay impersonation attacks.

## DNS Provider Considerations

### Token Formatting

The tokenized format is simpler than JSON and works universally across DNS providers:

**Standard format:**

```
v=1 pk=npub1... relays=wss://relay.example.com,wss://relay.example2.com
```

### Record Length Limits

TXT records have size limits:

- Single string: 255 characters
- Multiple strings: Concatenated to ~4KB

For large records, consider:

- Using hex pubkey instead of npub (slightly shorter)
- Limiting the number of relay URLs
- Prioritizing the most reliable relays

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
Content: v=1 pk=npub1... relays=wss://relay.example.com
TTL: Auto or 3600 (DNS rarely needs updating)
```

**Route 53:**

```
Type: TXT
Name: _nweb.example.com
Value: "v=1 pk=npub1... relays=wss://relay.example.com"
TTL: 3600 (DNS rarely needs updating)
```

### Client Lookup

```javascript
// DNS-over-HTTPS lookup
const response = await fetch(
  `https://dns.google/resolve?name=_nweb.example.com&type=TXT`
);
const data = await response.json();

// Parse TXT record (remove quotes if present)
const txtRecord = data.Answer?.[0]?.data.replace(/^"|"$/g, "");

// Parse key-value tokens
const tokens = txtRecord.split(/\s+/);
const params = {};

for (const token of tokens) {
  const [key, value] = token.split("=");
  if (key && value) {
    params[key] = value;
  }
}

// Validate format
if (params.v !== "1") {
  throw new Error("Unsupported version or invalid format");
}

if (!params.pk || !params.relays) {
  throw new Error("Invalid record: missing pk or relays");
}

// Extract pubkey and relays
const pubkey = params.pk;
const relays = params.relays.split(",").filter((r) => r.startsWith("wss://"));

if (relays.length === 0) {
  throw new Error("Invalid record: no valid relay URLs");
}

// Use config
const parsedPubkey = parseNpub(pubkey); // handles both npub and hex
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
