NIP-XX
======

Trusted Relay Assertions
------------------------

`draft` `optional`

This NIP defines a standard for publishing trust assertions about Nostr relays. Assertion providers compute trust scores from observed metrics (NIP-66), operator reputation, and user reports. Clients query these assertions to make informed relay connection decisions.

## Relationship to Other NIPs

| NIP | Role |
|-----|------|
| NIP-11 | What relay *claims* (self-description) |
| NIP-66 | What we *measured* (observed metrics) |
| NIP-XX | What we *conclude* (trust evaluation) |

Providers SHOULD consume NIP-66 data to compute scores. This NIP adds the trust layer.

## Assertion Events

### Kind 30385: Trusted Relay Assertion

A parameterized replaceable event with `d` tag containing the relay's canonical WebSocket URL (lowercase, no trailing slash).

```json
{
  "kind": 30385,
  "pubkey": "<provider_pubkey>",
  "created_at": 1704067200,
  "tags": [
    ["d", "wss://relay.example.com"],
    ["status", "evaluated"],
    ["algorithm", "v0.3.0"],
    ["algorithm_url", "https://github.com/Letdown2491/trustedrelays/blob/main/ALGORITHM.md"],
    ["score", "82"],
    ["reliability", "94"],
    ["quality", "76"],
    ["accessibility", "81"],
    ["confidence", "high"],
    ["observations", "12450"],
    ["observation_period", "30d"],
    ["first_seen", "1640000000"],
    ["operator", "<operator_pubkey>"],
    ["operator_verified", "nip11"],
    ["operator_confidence", "70"],
    ["operator_trust", "88"],
    ["policy", "moderated"],
    ["policy_confidence", "85"],
    ["country_code", "DE"],
    ["region", "Bavaria"],
    ["is_hosting", "true"]
  ],
  "content": ""
}
```

### Required Tags

| Tag | Format | Description |
|-----|--------|-------------|
| `d` | `wss://...` | Relay WebSocket URL |
| `status` | string | `evaluated`, `insufficient_data`, or `unreachable` (`blocked` is reserved for future use and not currently emitted) |
| `score` | 0-100 | Overall trust score (required if status=`evaluated`) |

### Score Tags

| Tag | Description |
|-----|-------------|
| `score` | Overall trust score (weighted combination: 40% reliability + 35% quality + 25% accessibility) |
| `reliability` | Availability, outage resilience, consistency, and latency (0-100) |
| `quality` | Policy documentation, security (TLS), and operator accountability (0-100) |
| `accessibility` | Access barriers, limits, jurisdiction freedom, and surveillance risk (0-100) |
| `confidence` | `low` (<100 obs), `medium` (100-499 obs), or `high` (500+ obs) |

### Observation Tags

| Tag | Format | Description |
|-----|--------|-------------|
| `algorithm` | string | Algorithm version (e.g., `v0.3.0`) |
| `algorithm_url` | URL | Methodology documentation |
| `observations` | int | Number of data points |
| `observation_period` | string | Time period (e.g., `30d`) |
| `first_seen` | timestamp | When first observed |

### Operator Tags

| Tag | Format | Description |
|-----|--------|-------------|
| `operator` | pubkey | Relay operator's pubkey |
| `operator_verified` | string | `nip11_signed`, `dns`, `wellknown`, `nip11`, `vouched`, or `claimed` |
| `operator_confidence` | 0-100 | Confidence in operator verification |
| `operator_trust` | 0-100 | Operator's WoT trust score (from NIP-85) |

### Policy Tags

| Tag | Format | Description |
|-----|--------|-------------|
| `policy` | string | `open`, `moderated`, `curated`, or `specialized` |
| `policy_confidence` | 0-100 | Confidence in policy classification |
| `policy_discrepancy` | `true` | Present only when monitor-observed behavior (NIP-66) contradicted the relay's self-claimed NIP-11 limitation; the observation was used for classification |

### Jurisdiction Tags

| Tag | Format | Description |
|-----|--------|-------------|
| `country_code` | string | ISO 3166-1 alpha-2 country code (`XX` for anonymous networks) |
| `region` | string | State/province/region name |
| `is_hosting` | boolean | Whether relay runs in datacenter/hosting |
| `network` | string | Network type: `tor` or `i2p`. Omitted for clearnet relays (absence implies `clearnet`). |

## Declaring Trusted Providers

Kind `10385` lists the user's trusted relay assertion providers:

```json
{
  "kind": 10385,
  "tags": [
    ["p", "<provider_pubkey_1>", "wss://relay.example.com"],
    ["p", "<provider_pubkey_2>", "wss://relay2.example.com"]
  ],
  "content": ""
}
```

Clients SHOULD check the user's kind 10385 to determine which providers to query. If none exists, clients MAY use well-known defaults.

## Submitting Reports

Users submit relay reports using kind 1985 (NIP-32 Labels):

```json
{
  "kind": 1985,
  "tags": [
    ["L", "relay-report"],
    ["l", "spam", "relay-report"],
    ["r", "wss://relay.example.com"]
  ],
  "content": "Excessive spam, no moderation"
}
```

Label values: `spam`, `censorship`, `unreliable`, `malicious`

Providers SHOULD aggregate reports, optionally weighting by reporter's Web of Trust position.

## Client Integration

### NIP-46 Remote Signers

When processing connection URIs (`nostrconnect://` or `bunker://`):
1. Extract relay URLs from the URI
2. Query trust assertions for each relay
3. Display trust indicators in the UI

For `nostrconnect://` URIs (app-specified relays), this helps users evaluate unfamiliar relays before accepting a connection.

For `bunker://` URIs (signer-specified relays), this helps users verify their configured relays remain trustworthy before sharing.

### Relay Discovery

Combined with NIP-66:
1. NIP-66 provides discovery (what exists)
2. NIP-XX provides evaluation (what's good)

## Final Considerations

Providers SHOULD update assertions when scores change materially, not on every observation.

Providers MAY limit access via paid relays.

Clients SHOULD cache assertions (recommended TTL: 1 hour fresh, 24 hours stale).

When multiple providers return different scores, clients MAY average them, show a range, or let users select a preferred provider.

## Relay Appeals

Relay operators MAY dispute scores by publishing kind 1985 events with `L` = `relay-appeal`:

```json
{
  "kind": 1985,
  "tags": [
    ["L", "relay-appeal"],
    ["l", "spam", "relay-appeal"],
    ["r", "wss://relay.example.com"],
    ["e", "<event_id_of_evidence>"]
  ],
  "content": "Explanation of why the score should be reconsidered..."
}
```

Label values for appeals: `spam`, `censorship`, `score`, `policy`, `other`

The `e` tag MAY reference evidence events. Appeals from verified operators (high confidence) SHOULD be prioritized by providers.

## References

- [NIP-11 - Relay Information Document](https://github.com/nostr-protocol/nips/blob/master/11.md)
- [NIP-32 - Labeling](https://github.com/nostr-protocol/nips/blob/master/32.md)
- [NIP-66 - Relay Discovery and Liveness Monitoring](https://github.com/nostr-protocol/nips/blob/master/66.md)
- [NIP-85 - Trusted Assertions](https://github.com/vitorpamplona/nips/blob/user-summaries/85.md)
