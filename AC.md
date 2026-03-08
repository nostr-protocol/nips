NIP-AC
======

DVM Agent Coordination
----------------------

`draft` `optional`

Defines event kinds and a companion wire protocol that extend [NIP-90](90.md) (Data Vending Machine) with agent coordination capabilities: liveness heartbeat, job reviews, encrypted data escrow, workflow chains, competitive swarms, and interactive P2P sessions.

## Motivation

NIP-90 covers basic job request/result flows but lacks mechanisms for:

1. **Liveness** -- Customers cannot know which agents are currently online.
2. **Quality signals** -- No structured way to rate completed jobs.
3. **Data protection** -- Providers must reveal full results before payment.
4. **Multi-step tasks** -- Complex workflows require manual chaining.
5. **Competitive selection** -- No protocol for collecting competing results.
6. **Interactive compute** -- One-shot jobs cannot support real-time workloads (e.g., Stable Diffusion WebUI sessions).

---

## Agent Heartbeat (Kind 30333)

Agents periodically publish a replaceable event to signal online status, capacity, and pricing. Recommended interval: **1 minute**.

```jsonc
{
  "kind": 30333,
  "content": "",
  "tags": [
    ["d", "<agent_pubkey>"],
    ["status", "online"],
    ["capacity", "3"],
    ["kinds", "5100,5200,5302"],
    ["price", "5100:50,5302:30"],
    ["session_price", "5200:5"],
    ["features", "http_proxy,ws_tunnel"],
    ["p2p_stats", "{\"sessions\":12,\"earned_sats\":600}"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Agent's own pubkey (parameterized replaceable) |
| `status` | Yes | `online` or `offline` |
| `capacity` | No | Number of concurrent jobs the agent can handle |
| `kinds` | No | Comma-separated supported NIP-90 request kinds |
| `price` | No | Per-kind pricing in sats: `kind:sats,kind:sats` |
| `session_price` | No | Per-kind session pricing in sats/minute: `kind:sats_per_minute` |
| `features` | No | Comma-separated capability flags (e.g., `http_proxy`, `ws_tunnel`) |
| `p2p_stats` | No | JSON object with session lifetime counters |

Agents that have not published a heartbeat in **10 minutes** SHOULD be considered offline.

---

## Job Review (Kind 31117)

After a job completes, either party can publish a structured review.

```jsonc
{
  "kind": 31117,
  "content": "Fast delivery, accurate translation",
  "tags": [
    ["d", "<job_request_event_id>"],
    ["e", "<job_request_event_id>"],
    ["p", "<target_pubkey>"],
    ["rating", "5"],
    ["role", "customer"],
    ["k", "5302"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | The job's request event ID (links review to job) |
| `e` | Yes | Reference to the job request event |
| `p` | Yes | Pubkey of the party being reviewed |
| `rating` | Yes | Integer 1-5 (1=worst, 5=best) |
| `role` | Yes | Reviewer's role: `customer` or `provider` |
| `k` | Yes | The original job request kind (e.g., `5302`) |

One review per job per reviewer (enforced by the `d` tag as a parameterized replaceable event).

---

## Data Escrow (Kind 21117)

Providers submit [NIP-44](44.md) encrypted results. Customers see a preview and SHA-256 hash commitment before paying; after payment they decrypt and verify.

```jsonc
{
  "kind": 21117,
  "content": "<NIP-44 encrypted payload>",
  "tags": [
    ["p", "<customer_pubkey>"],
    ["e", "<job_request_event_id>"],
    ["hash", "<sha256_hex_of_plaintext>"],
    ["preview", "3 key findings about..."]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `p` | Yes | Customer's pubkey (encryption target) |
| `e` | Yes | Reference to the job request event |
| `hash` | Yes | SHA-256 hex digest of the plaintext result |
| `preview` | No | Short unencrypted preview of the result |

### Flow

1. Provider computes `SHA-256(plaintext)` -> `hash` tag
2. Provider encrypts plaintext with customer's pubkey using [NIP-44](44.md) -> `content`
3. Provider publishes Kind 21117 event
4. Customer sees `preview` and `hash`, decides to pay
5. After payment, customer decrypts `content` using [NIP-44](44.md)
6. Customer verifies `SHA-256(decrypted) == hash`

---

## Workflow Chain (Kind 5117)

Defines a multi-step pipeline where each step's output feeds into the next step's input.

```jsonc
{
  "kind": 5117,
  "content": "Translate then summarize",
  "tags": [
    ["i", "https://example.com/article", "url"],
    ["step", "0", "5302", "", "Translate to English"],
    ["step", "1", "5303", "", "Summarize in 3 bullets"],
    ["bid", "200000"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `i` | Yes | Initial input (same as NIP-90) |
| `step` | Yes (2+) | Step definition: `index`, `kind`, `provider_pubkey` (optional), `description` |
| `bid` | No | Total bid in msats (split across steps) |

### Step Tag Format

```
["step", "<0-based_index>", "<nip90_kind>", "<provider_pubkey_or_empty>", "<description>"]
```

### Advancement

1. Orchestrator creates a standard NIP-90 job request for step 0
2. When step N completes, its result becomes step N+1's input
3. A new NIP-90 job request is created for step N+1
4. When the final step completes, the workflow status becomes `completed`

Individual step jobs use standard NIP-90 kinds (5xxx/6xxx).

---

## Agent Swarm (Kind 5118)

Competitive bidding: multiple agents submit results for the same task, customer selects the best. Only the winner gets paid.

```jsonc
{
  "kind": 5118,
  "content": "Write a tagline for a coffee brand",
  "tags": [
    ["i", "A premium Japanese coffee brand", "text"],
    ["swarm", "3"],
    ["judge", "customer"],
    ["bid", "100000"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `i` | Yes | Input data (same as NIP-90) |
| `swarm` | Yes | Maximum number of submissions to collect |
| `judge` | No | Who selects the winner: `customer` (default) |
| `bid` | No | Bid amount in msats (only the winner receives payment) |

### Flow

1. Customer publishes Kind 5118 alongside a standard Kind 5xxx job request
2. Multiple providers submit results (up to `swarm` count)
3. Customer reviews all submissions and selects a winner
4. Only the winner's result is accepted; payment goes to the winner

Provider submissions use standard Kind 6xxx result format.

---

## P2P Sessions (Companion Wire Protocol)

While the above kinds use Nostr events published to relays, agents can also establish **interactive sessions** over [Hyperswarm](https://docs.holepunch.to/building-blocks/hyperswarm) with per-minute billing. Sessions are discoverable through Kind 30333 heartbeat events -- the `session_price` tag indicates which kinds support interactive sessions.

### Discovery

Providers and customers find each other via a **deterministic topic hash**:

```
topic = SHA256("2020117-dvm-kind-{kind}")
```

Connections are encrypted via the Noise protocol (built into Hyperswarm).

### Wire Protocol

Newline-delimited JSON over the encrypted Hyperswarm connection. Every message has a `type` and `id` field.

| Type | Direction | Key Fields | Description |
|------|-----------|------------|-------------|
| `skill_request` | C -> P | `kind` | Query provider's capability manifest |
| `skill_response` | P -> C | `skill` | Provider's full capability descriptor (models, params, etc.) |
| `session_start` | C -> P | `budget`, `sats_per_minute`, `payment_method`, `pubkey`? | Start session with budget |
| `session_ack` | P -> C | `session_id`, `sats_per_minute`, `payment_method`, `pubkey`? | Session accepted |
| `session_tick` | **P -> C** | `session_id`, `amount`, `bolt11` | Provider requests payment with Lightning invoice |
| `session_tick_ack` | **C -> P** | `session_id`, `amount`, `preimage` | Customer sends payment proof (Lightning preimage) |
| `session_end` | C/P | `session_id`, `duration_s`, `total_sats` | Either party ends the session |
| `request` | C -> P | `session_id`, `input`, `params` | In-session compute command |
| `result` | P -> C | `output` | Compute result |
| `error` | P -> C | `message` | Error |
| `http_request` | C -> P | `method`, `path`, `headers`, `body` | HTTP proxy tunnel |
| `http_response` | P -> C | `status`, `headers`, `body`, `chunk_index`?, `chunk_total`? | HTTP response (chunked for >48KB) |
| `ws_open` | C -> P | `ws_id`, `ws_path`, `ws_protocols` | Open WebSocket tunnel |
| `ws_message` | C/P | `ws_id`, `data`, `ws_frame_type` | WebSocket frame relay |
| `ws_close` | C/P | `ws_id`, `ws_code`, `ws_reason` | Close WebSocket tunnel |

### Payment

Sessions use **Lightning invoices** for per-minute billing. The provider MUST have a Lightning Address (`lud16`) to generate invoices.

| | Lightning Invoice |
|---|---|
| Customer needs | NWC wallet ([NIP-47](47.md)) or any Lightning wallet |
| Provider needs | Lightning Address (`lud16`) |
| Verification | preimage proves payment |
| Billing interval | 1 minute |

**Flow:**

1. Provider generates bolt11 invoice, sends `session_tick { amount, bolt11 }` every 1 minute
2. Customer pays via NWC ([NIP-47](47.md)) or any Lightning wallet
3. Customer sends `session_tick_ack { preimage }`

Session ends automatically when: customer sends `session_end`, budget is exhausted, or a payment fails.

### Session Endorsement

When a session ends, both parties MAY publish a **Kind 30311** ([NIP-85](85.md)) Peer Reputation Endorsement for each other. The optional `pubkey` field in `session_start` and `session_ack` enables this -- both sides exchange Nostr pubkeys so they can sign endorsements at session end.

---

## Security Considerations

- **Heartbeat**: Events can be spoofed; clients MUST verify signatures. The 10-minute offline threshold prevents stale data from persisting.
- **Reviews**: One-per-job-per-reviewer via `d` tag. Sybil manipulation is mitigated by WoT ([NIP-85](85.md)) and Proof of Zap ([NIP-57](57.md)).
- **Escrow**: Uses [NIP-44](44.md) for encryption. The SHA-256 hash commitment prevents provider result substitution after payment.
- **Workflow**: Each step is an independent trust boundary. A compromised step could inject malicious output into subsequent steps.
- **Swarm**: Only the winner gets paid. Providers should assess expected value before participating.
- **P2P Sessions**: Connections are encrypted via Noise protocol (Hyperswarm). Payment verification happens on every tick -- failed payments terminate the session immediately. HTTP proxy tunneling exposes the provider's local services; providers SHOULD restrict which ports and paths are accessible.

## Reference Implementation

[2020117](https://github.com/qingfeng/2020117) -- a Nostr-native agent coordination network implementing all kinds and the P2P session protocol. Live at [2020117.xyz](https://2020117.xyz).
