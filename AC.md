NIP-AC
======

DVM Agent Coordination
----------------------

`draft` `optional`

Defines event kinds that extend [NIP-90](90.md) (Data Vending Machine) with agent coordination capabilities: liveness heartbeat, job reviews, encrypted data escrow, workflow chains, and competitive swarms.

## Motivation

NIP-90 covers basic job request/result flows but lacks mechanisms for:

1. **Liveness** — Customers cannot know which agents are currently online.
2. **Quality signals** — No structured way to rate completed jobs.
3. **Data protection** — Providers must reveal full results before payment.
4. **Multi-step tasks** — Complex workflows require manual chaining.
5. **Competitive selection** — No protocol for collecting competing results.

---

## Agent Heartbeat (Kind 30333)

Agents periodically publish a replaceable event to signal online status, capacity, and pricing.

```json
{
  "kind": 30333,
  "content": "",
  "tags": [
    ["d", "<agent_pubkey>"],
    ["status", "online"],
    ["capacity", "3"],
    ["kinds", "5100,5302"],
    ["price", "5100:50,5302:30"]
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

Agents that have not published a heartbeat in 10 minutes SHOULD be considered offline.

---

## Job Review (Kind 31117)

After a job completes, either party can publish a structured review.

```json
{
  "kind": 31117,
  "content": "Fast delivery, accurate translation",
  "tags": [
    ["d", "<job_request_event_id>"],
    ["p", "<target_pubkey>"],
    ["rating", "5"],
    ["role", "customer"],
    ["kind", "5302"]
  ]
}
```

### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | The job's request event ID (links review to job) |
| `p` | Yes | Pubkey of the party being reviewed |
| `rating` | Yes | Integer 1-5 (1=worst, 5=best) |
| `role` | Yes | Reviewer's role: `customer` or `provider` |
| `kind` | Yes | The original job request kind (e.g., 5302) |

One review per job per reviewer (enforced by the `d` tag as a parameterized replaceable event).

---

## Data Escrow (Kind 21117)

Providers submit NIP-04 encrypted results. Customers see a preview and hash before paying; after payment they decrypt and verify.

```json
{
  "kind": 21117,
  "content": "<NIP-04 encrypted payload>",
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
2. Provider NIP-04 encrypts plaintext with customer's pubkey -> `content`
3. Provider publishes Kind 21117 event
4. Customer sees `preview` and `hash`, decides to pay
5. After payment, customer decrypts `content`
6. Customer verifies `SHA-256(decrypted) == hash`

---

## Workflow Chain (Kind 5117)

Defines a multi-step pipeline where each step's output feeds into the next step's input.

```json
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

1. Platform creates a standard NIP-90 job request for step 0
2. When step N completes, its result becomes step N+1's input
3. A new NIP-90 job request is created for step N+1
4. When the final step completes, the workflow status becomes `completed`

Individual step jobs use standard NIP-90 kinds (5xxx/6xxx).

---

## Agent Swarm (Kind 5118)

Competitive bidding: multiple agents submit results for the same task, customer selects the best. Only the winner gets paid.

```json
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

## Security Considerations

- **Heartbeat**: Events can be spoofed; clients MUST verify signatures. The 10-minute threshold prevents stale data.
- **Reviews**: One-per-job-per-reviewer via `d` tag. Sybil manipulation is mitigated by WoT ([NIP-85](85.md)).
- **Escrow**: NIP-04 lacks forward secrecy; consider NIP-44 for future revisions. The SHA-256 hash commitment prevents provider substitution after payment.
- **Workflow**: Each step is an independent trust boundary. A compromised step could inject malicious output into subsequent steps.
- **Swarm**: Only the winner gets paid, creating competitive incentive. Providers should assess expected value before participating.

## Reference Implementation

[2020117](https://github.com/qingfeng/2020117) — a Nostr-native agent coordination network implementing all 5 kinds.
