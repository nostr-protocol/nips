NIP-XX
======

Relay Self-Declaration Manifest and Retention Horizon
-----------------------------------------------------

`draft` `optional` `relay` `client`

This NIP introduces two mechanisms for relay transparency: (1) a gossipable relay manifest event declaring endpoints, retention policy, and capabilities; and (2) a `HORIZON` relay message signaling temporal boundaries on stored data.

## Motivation

Relay discovery in Nostr relies on NIP-11 relay information documents served over HTTP. This has three limitations:

1. **Ungossipable.** NIP-11 data lives at each relay's HTTP endpoint and cannot propagate through the Nostr event network. Clients must contact each relay individually to learn its capabilities.

2. **No alternative transports.** Relays accessible via Tor hidden services or I2P tunnels cannot advertise these endpoints through NIP-11, which is bound to the relay's primary HTTP URL.

3. **Silent dead-ends.** When a client queries a relay for events older than its retention window, the relay returns an empty result indistinguishable from "no matching events exist." Clients cannot differentiate between "nothing happened" and "data was pruned."

This NIP solves all three with two minimal primitives.

### Relationship to Existing NIPs

**NIP-11** previously included a `retention` field (per-kind retention rules over HTTP). It was [removed in February 2026](https://github.com/nostr-protocol/nips/pull/1946) as unused. The HTTP-only delivery and lack of client incentive to consume it contributed to non-adoption. This NIP's gossipable approach and active HORIZON signaling address both failure modes.

**NIP-66** defines relay discovery events (kind 30166) published by third-party monitors. This NIP is complementary: NIP-66 is external observation ("what a monitor sees"), kind 10100 is self-declaration ("what the operator claims"). Both are useful — monitors verify, operators declare intent.

## Specification

### Relay Manifest Event (kind `10100`)

A relay manifest is a [replaceable event](nip-01.md) of kind `10100` published by the relay operator using their Nostr identity key.

The event's `content` field is empty. All manifest data is encoded in tags.

#### Required Tags

| Tag | Values | Description |
|-----|--------|-------------|
| `r` | `<url>` [, `<transport>`] | Relay endpoint URL. Transport hint is optional: `clearnet` (default), `tor`, `i2p`. Multiple `r` tags allowed. |
| `retention` | `<seconds>` | Rolling retention window in seconds. Events older than `now - retention` may be pruned. `0` means no retention limit (archive relay). |

#### Optional Tags

| Tag | Values | Description |
|-----|--------|-------------|
| `write_policy` | `open` \| `authenticated` \| `closed` | Who can publish events. Default: `open`. |
| `N` | `<nip_number>` | Supported NIP. One tag per NIP. |
| `software` | `<name>` [, `<version>`] | Relay software identifier. |

#### Example

```json
{
  "kind": 10100,
  "pubkey": "<relay_operator_pubkey>",
  "created_at": 1712966400,
  "tags": [
    ["r", "wss://relay.example.com:8880"],
    ["r", "ws://abc...xyz.onion:8881", "tor"],
    ["r", "ws://abc...xyz.b32.i2p:8881", "i2p"],
    ["retention", "7776000"],
    ["write_policy", "open"],
    ["N", "1"],
    ["N", "11"],
    ["N", "42"],
    ["software", "nostr-rs-relay", "0.9.0"]
  ],
  "content": "",
  "id": "<event_id>",
  "sig": "<signature>"
}
```

This manifest declares a relay accessible via clearnet, Tor, and I2P with a 90-day (7,776,000 second) retention window, open writes, supporting NIPs 1, 11, and 42.

#### Publication

The operator publishes the manifest to their own relay and optionally to others. Because it is a standard Nostr event, it propagates through the network like any other replaceable event. Clients discover manifests by querying for kind `10100` events.

#### Key Binding

Clients SHOULD verify that the manifest's `pubkey` matches the `pubkey` field in the relay's NIP-11 information document. This trust-on-first-use (TOFU) binding prevents third parties from publishing fake manifests for relays they do not operate.

If the NIP-11 document has no `pubkey` field, the client SHOULD treat the manifest as unverified and MAY still use it with reduced trust.

For Tor-only or I2P-only relays, the client MUST fetch NIP-11 over the corresponding transport to perform TOFU verification. If the client cannot reach the relay's transport, the manifest remains unverified.

### HORIZON Relay Message

A new relay-to-client message indicating that the relay's stored data does not cover the full time range requested by a subscription.

#### Format

```
["HORIZON", <subscription_id>, <earliest_timestamp>]
```

| Field | Type | Description |
|-------|------|-------------|
| `subscription_id` | string | The subscription ID from the client's `REQ`. |
| `earliest_timestamp` | integer | Unix timestamp. Events before this may have existed but were pruned. |

#### When to Send

A relay SHOULD send `HORIZON` when ALL of the following are true:

1. The relay enforces a retention policy (finite retention window).
2. The client's `REQ` filter extends before the relay's retention boundary (no `since` field, or `since` < `earliest_timestamp`).
3. No `HORIZON` has already been sent for this subscription ID in the current connection.

`HORIZON` MUST be sent before `EOSE` for the same subscription ID.

#### Relay Behavior

1. Compute `earliest = now() - retention_seconds`.
2. For each `REQ`, check whether the filter's time range extends past `earliest`.
3. If so, send `["HORIZON", sub_id, earliest]` before any `EVENT` messages and before `EOSE`.
4. Send at most one `HORIZON` per subscription ID per connection.

#### Client Behavior

On receiving `HORIZON`:

1. Clients SHOULD understand that the relay's response may be incomplete for timestamps before `earliest_timestamp`.
2. Clients MAY query other relays (via NIP-65 relay lists or kind `10100` manifests) for the missing time range.
3. Clients MAY display a visual indicator that historical data from this relay is bounded.
4. Clients MUST NOT treat `HORIZON` as an error.

#### Example Flow

```
Client → ["REQ", "timeline-1", {"kinds": [1], "authors": ["<pubkey>"]}]
Relay  → ["HORIZON", "timeline-1", 1704067200]
Relay  → ["EVENT", "timeline-1", {"kind": 1, "created_at": 1712000000, ...}]
Relay  → ["EVENT", "timeline-1", {"kind": 1, "created_at": 1710000000, ...}]
Relay  → ["EOSE", "timeline-1"]
```

The relay signals it only has data from January 1, 2024 (unix 1704067200) onward. The client knows to query other relays for older events.

## Security Considerations

### Manifest Spoofing

A malicious actor could publish a kind `10100` event claiming to represent a relay they do not operate. Clients MUST verify the TOFU key binding (manifest `pubkey` == NIP-11 `pubkey`) before trusting manifest data. Mismatched or unverifiable manifests SHOULD be discarded.

### Stale Manifests

Manifests are replaceable events with `created_at` timestamps. Clients SHOULD prefer the most recent manifest and MAY ignore manifests older than a threshold (suggested: 30 days). Operators SHOULD republish periodically.

### HORIZON Privacy

A relay's `earliest_timestamp` reveals its pruning schedule — generally public information. If a relay selectively prunes by author or topic, HORIZON could leak moderation policies. Relays with selective pruning SHOULD use the globally earliest timestamp, not per-author values.

### Sybil Manifests

An attacker could flood the network with fake manifests for non-existent relays. The TOFU key binding mitigates this: clients only trust manifests whose `pubkey` matches a relay independently contacted via NIP-11.

## Backwards Compatibility

**Relays:** Relays not implementing this NIP are unaffected. They publish no manifests and send no HORIZON messages. Current behavior (NIP-11 for info, empty results for pruned ranges) continues unchanged.

**Clients:** Clients not implementing this NIP ignore kind `10100` events (unknown kind) and `HORIZON` messages (unrecognized relay message). Per NIP-01, unrecognized messages SHOULD be ignored. No breakage.

## Implementation Guide (Non-normative)

### Relay: Computing `earliest_timestamp`

For rolling-window retention (e.g., 90-day prune cycle): `earliest = now() - retention_seconds`. Recompute per REQ — the boundary moves with time.

For event-count-based pruning: use the `created_at` of the oldest retained event. Query once per prune cycle and cache.

### Relay: HORIZON Insertion Point

In the WebSocket handler, after filter parsing but before iterating stored events. Check the subscription's effective time range against the retention boundary. If HORIZON applies, send it as the first message for that subscription.

### Relay: Manifest Publication

Create the manifest event with any Nostr client, sign with the relay operator key, publish. A cron job republishing weekly keeps `created_at` fresh. The manifest is a normal Nostr event — no relay code changes required.

### Client: Manifest Discovery

Query known relays for kind `10100` events. Cache locally (suggested TTL: 24 hours). When connecting to a new relay, check for a matching manifest to learn about alternative endpoints and retention before subscribing.

### Client: HORIZON Handling

Add a `HORIZON` handler in the WebSocket message parser. Store `earliest_timestamp` per relay per connection. When the user scrolls past the horizon: either (a) show "end of this relay's history" or (b) fan out to other relays from NIP-65 relay lists.

## Future Extensions

The following are planned as companion NIPs and are explicitly **out of scope** for this document:

- **DEFLECT vectors** — Extension to HORIZON including relay URLs where pruned data may be found. Requires real-world HORIZON deployment data before specifying.

- **Relay attestations** — Relay-signed `hash(event) + timestamp` as proof-of-publication receipts. Deferred due to implementation complexity (storage scaling, Merkle trees).

- **Resistance scoring** — Client-computed censorship resistance scores from manifest fields. Excluded from wire protocol to preserve client autonomy.

- **Adaptive AUTH friction** — Transport-aware authentication policies. Implementation guidance, not wire protocol.
