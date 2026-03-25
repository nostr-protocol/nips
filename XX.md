NIP-XX
======

Agent Reputation Attestations
-----------------------------

`draft` `optional`

This NIP defines a parameterized replaceable event kind for publishing reputation attestations about Nostr agents. Attestations encode a structured rating, domain context, confidence level, and optional evidence. Clients compute reputation scores locally from their own relay set using a two-tier algorithm: Tier 1 (weighted average with temporal decay) and Tier 2 (graph diversity metric). No global reputation score exists. Different observers MAY compute different scores for the same subject.

Motivation
----------

As autonomous agents proliferate on Nostr -- bots, AI assistants, automated service providers -- users and other agents need a decentralized mechanism to assess trustworthiness. Existing NIPs provide labeling ([NIP-32](32.md)) and reporting ([NIP-56](56.md)), but neither specifies a structured reputation attestation format with scoring algorithms, temporal decay, or sybil resistance.

This NIP addresses three gaps:

- **Temporal integrity** -- attestations must decay. Reputation is a flow, not a stock.
- **Negative attestations** -- the system must express disagreement, not only endorsement.
- **Observer independence** -- scores are computed locally. No authority, no global state.

Event Kind
----------

This NIP defines kind `30085` as a *parameterized replaceable event* for reputation attestations. Being in the 30000-39999 range, these events are addressable by their `kind`, `pubkey`, and `d` tag value. For each combination, only the latest event is stored by relays.

The `d` tag MUST be set to the subject's pubkey concatenated with the context domain, separated by a colon:

```
["d", "<subject-pubkey>:<context>"]
```

This ensures one attestation per attestor, per subject, per context domain. Updating an attestation replaces the previous one.

Event Structure
---------------

```jsonc
{
  // other fields...
  "kind": 30085,
  "pubkey": "<attestor-pubkey>",
  "created_at": <unix-timestamp>,
  "tags": [
    ["d", "<subject-pubkey>:<context>"],
    ["p", "<subject-pubkey>", "<relay-hint>"],
    ["t", "<context>"],
    ["expiration", "<unix-timestamp>"],
    ["v", "1"],
    ["consistency_window", "<start-unix-timestamp>", "<end-unix-timestamp>"]
  ],
  "content": "<JSON-stringified attestation object>"
}
```

Content Object
--------------

The `content` field MUST be a JSON-stringified object with the following structure:

```jsonc
{
  "subject": "<32-byte hex pubkey of agent being attested>",
  "rating": 4,
  "context": "reliability",
  "confidence": 0.85,
  "evidence": "Completed 12 task delegations without failure over 30 days"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | YES | 32-byte lowercase hex pubkey of the agent being attested. |
| `rating` | integer | YES | Rating on a 1-5 scale. See rating semantics below. |
| `context` | string | YES | Domain of attestation. One of the defined context values. |
| `confidence` | float | YES | Attestor's confidence in their rating, 0.0-1.0 inclusive. |
| `evidence` | string | NO | JSON array of typed evidence objects (see Structured Evidence below), or a plain string for backward compatibility. |

> **Note:** The `consistency_window` tag in the event tags provides temporal context for the evidence. When present, it indicates the observation period over which the attestor gathered their evidence. Clients SHOULD consider this window when interpreting evidence claims.

#### Structured Evidence

The `evidence` field SHOULD contain a JSON-stringified array of typed evidence objects. Each object has a `type` and `data` field. Clients SHOULD ignore unknown evidence types gracefully to allow extensibility.

**Defined evidence types:**

| Type | Description |
|------|-------------|
| `lightning_preimage` | Lightning payment preimage proving payment completion. |
| `dvm_job_id` | Reference to a DVM (Data Vending Machine) job ID. |
| `nip90_result_hash` | SHA-256 hash of the DVM (NIP-90) result payload, proving the attestor received and can reference the actual work output. Bridges the gap between proving work was requested (`dvm_job_id`) and proving work was delivered and evaluated. |
| `nostr_event_ref` | Reference to a Nostr event ID (hex) as supporting evidence. |
| `free_text` | Human-readable free-text description. |
| `lightning_node` | Lightning Network node pubkey. Clients MAY use this to verify channel capacity as a proxy for economic stake. See Tier 1.5. |

**Example:**

```jsonc
"evidence": "[{\"type\": \"dvm_job_id\", \"data\": \"abc123\"}, {\"type\": \"nip90_result_hash\", \"data\": \"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\"}, {\"type\": \"free_text\", \"data\": \"Completed translation job accurately\"}]"
```

Types are extensible. New types MAY be defined by clients without requiring a NIP update. Clients MUST NOT reject attestations containing unknown evidence types.

#### Rating Semantics

| Rating | Meaning | Classification |
|--------|---------|----------------|
| `1` | Actively harmful, deceptive, or malicious | Negative |
| `2` | Unreliable, frequently fails or misleads | Negative |
| `3` | Neutral, insufficient basis for judgment | Neutral |
| `4` | Reliable, generally trustworthy | Positive |
| `5` | Highly trustworthy, consistent track record | Positive |

Negative attestations (ratings 1-2) serve the role of rejection signals. A separate negative attestation mechanism is unnecessary -- the rating scale encodes valence directly. This simplifies the protocol while preserving the rejection capability required for convergent inference (see [Convergence Properties](#convergence-properties)).

#### Context Domains

The `context` field MUST be one of the following defined values. Additional contexts MAY be defined in future NIPs.

| Context | Description |
|---------|-------------|
| `reliability` | Does the agent complete tasks as promised? |
| `accuracy` | Is the agent's output correct and truthful? |
| `responsiveness` | Does the agent respond in a timely manner? |

Tags
----

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | MUST | Parameterized replaceable event identifier. Format: `<subject-pubkey>:<context>` |
| `p` | MUST | Subject's pubkey. Enables querying all attestations for a given agent via `{"#p": [...]}` filters. |
| `t` | MUST | Context category. Enables querying attestations by domain via `{"#t": [...]}` filters. |
| `expiration` | MUST | Unix timestamp after which this attestation SHOULD be considered expired. Relays MAY discard expired events per [NIP-40](40.md). |
| `v` | SHOULD | Schema version. Clients use this to determine which evidence types and scoring rules apply. Current version: `1`. |
| `consistency_window` | RECOMMENDED | Unix timestamps defining the observation period for this attestation. Format: `["consistency_window", "<start-unix>", "<end-unix>"]`. Allows scoring algorithms to distinguish a 2-week snapshot from a 3-month track record. When present, clients SHOULD weight attestations with longer observation windows higher (all else equal). |

> **Note:** The `expiration` tag is REQUIRED, not optional. This is a deliberate design choice addressing the temporal decay gap identified in attack scenario analysis. Attestations without expiration tags MUST be rejected by compliant clients.

#### Example Event

```jsonc
{
  // other fields...
  "kind": 30085,
  "pubkey": "a1b2c3...attestor",
  "created_at": 1711152000,
  "tags": [
    ["d", "d4e5f6...subject:reliability"],
    ["p", "d4e5f6...subject", "wss://relay.example.com"],
    ["t", "reliability"],
    ["expiration", "1718928000"],
    ["v", "1"],
    ["consistency_window", "1703376000", "1711152000"]
  ],
  "content": "{\"subject\":\"d4e5f6...subject\",\"rating\":4,\"context\":\"reliability\",\"confidence\":0.85,\"evidence\":\"Completed 12 task delegations without failure over 30 days\"}"
}
```

Validation Rules
----------------

Clients MUST validate attestation events according to the following rules:

1. Event kind MUST be `30085`.
2. The `content` field MUST parse as valid JSON containing all required fields.
3. The `subject` field in content MUST match the `p` tag value.
4. The `context` field in content MUST match the `t` tag value.
5. The `d` tag MUST equal `<p-tag-value>:<t-tag-value>`.
6. `rating` MUST be an integer in `[1, 5]`.
7. `confidence` MUST be a number in `[0.0, 1.0]`.
8. An `expiration` tag MUST be present. Events without it MUST be discarded.
9. Self-attestations (`pubkey` == `subject`) MUST be discarded.
10. Expired events (current time > expiration timestamp) SHOULD be discarded or weighted at zero.
11. If a `v` tag is present, clients SHOULD validate that the version is recognized. Unknown versions SHOULD be processed on a best-effort basis (forward compatibility).
12. If a `consistency_window` tag is present, the start timestamp MUST be less than the end timestamp, and the end timestamp MUST NOT be in the future.

Scoring Algorithms
------------------

Clients compute reputation scores locally. Two tiers are defined. Clients MUST implement Tier 1. Clients MAY implement Tier 2.

#### Temporal Decay

All scoring uses a temporal decay function applied to each attestation based on its age. The recommended half-life is 90 days (7,776,000 seconds).

```
decay(t) = 2^(-(now - created_at) / half_life)
```

An attestation created 90 days ago has weight 0.5. At 180 days, weight 0.25. Clients SHOULD use a half-life between 30 and 180 days. The default SHOULD be 90 days.

#### Tier 1: Weighted Average

For a subject `S` in context `C`, collect all valid, non-expired attestation events matching `{"#p": [S], "#t": [C], "kinds": [30085]}`. Compute:

```
score_T1 = sum(rating_i * confidence_i * decay_i) / sum(confidence_i * decay_i)
```

Result is a value in `[1.0, 5.0]`. If no valid attestations exist, the score is undefined (not zero).

#### Tier 2: Graph Diversity Metric

Tier 2 measures structural independence among attestors. It penalizes concentrated attestation sources and rewards diverse, independent signals.

**Algorithm:**

1. Collect all attestors of subject `S` in context `C`.
2. Build the attestor interaction graph: two attestors share an edge if they have mutually attested each other (on any subject) or share a common attestation target (other than `S`).
3. Compute connected components among attestors. Let `cluster_count` = number of connected components. Let `total_attestors` = number of attestors.
4. Compute the diversity ratio:

```
diversity = cluster_count / total_attestors
```

5. Compute the Tier 2 score:

```
score_T2 = diversity * score_T1
```

When `diversity = 1.0` (every attestor is in its own component, maximally independent), Tier 2 equals Tier 1. When `diversity -> 0` (all attestors in one cluster), Tier 2 approaches zero regardless of ratings.

#### Tier 1.5: Economic Commitment (Optional)

Nostr identity creation cost is zero -- generating a keypair is free, making it the most Sybil-vulnerable identity system in production. This means Tier 1 scores are trivially inflatable and Tier 2 graph analysis is expensive. Tier 1.5 bridges this gap using a Nostr-native commitment device: Lightning Network channel capacity.

An attestor MAY include a `lightning_node` evidence type in their attestation, referencing their Lightning node pubkey. Clients MAY look up that node's public channel capacity (via LN gossip or a routing graph snapshot) and weight the attestation accordingly. Locked sats in channels represent non-zero, verifiable economic stake -- they cannot be faked without actual capital commitment.

**Weighting (optional, client-defined):**

Clients implementing Tier 1.5 SHOULD define a capacity-to-weight function. A simple example:

```
ln_weight(capacity_sats) = min(1.0, log2(1 + capacity_sats / 100000) / 10)
```

This produces diminishing returns: 100k sats ≈ 0.1, 1M sats ≈ 0.33, 10M sats ≈ 0.67. The exact function is observer-defined -- this NIP does not mandate a specific curve.

**Constraints:**

- Tier 1.5 is NOT mandatory. Clients MAY implement it. It is a signal, not a gate.
- An attestation without `lightning_node` evidence is not penalized -- it simply receives no economic commitment bonus.
- The Lightning node pubkey in evidence MUST be independently verifiable via LN gossip protocol. Clients MUST NOT trust the claimed pubkey without verification.
- This tier does not replace Tier 2 graph analysis. It supplements Tier 1 by making Sybil attacks more expensive (attacker must lock real capital per fake identity).

> **Interpretation:** A sockpuppet flood with 100 fake attestors in a single connected component produces `diversity = 1/100 = 0.01`. Even with all ratings at 5 and confidence at 1.0, the Tier 2 score is `0.01 * 5.0 = 0.05`. The star topology is structurally penalized.

Observer Independence
---------------------

There is no global reputation score. Each client computes scores from the attestation events available on its own relay set. Two observers querying different relays MAY compute different scores for the same subject. This is by design, not a bug.

Clients SHOULD query at least 3 independent relays when computing reputation scores. Clients SHOULD document which relay set was used when presenting a score to users.

> **Warning:** An observer using a single relay controlled by an adversary will compute scores from a manipulated attestation set. Relay diversity is the primary defense against eclipse attacks. See [Security Considerations](#security-considerations).

Convergence Properties
----------------------

The attestation protocol is designed to satisfy the conditions for convergent decentralized inference, as described by the Collective Predictive Coding framework. Attestation is a naming game: an attestor "names" an agent as trustworthy (or not). Convergence to accurate shared beliefs requires:

1. **Bilateral observation.** Attestors SHOULD have direct experience with the subject. Transitive trust (attesting based on others' attestations without independent experience) weakens inference. Clients MAY weight direct-experience attestations higher.
2. **Rejection capability.** Negative ratings (1-2) provide the rejection channel. Without them, the naming game is biased toward acceptance and cannot converge. This is why the rating scale includes negative values rather than using a separate mechanism.
3. **Temporal coherence.** The mandatory `expiration` tag and decay function ensure the posterior is continuously updated. Stale observations are automatically discounted.

When these three conditions hold, the acceptance probability for attestations follows the Metropolis-Hastings criterion: the community's collective attestation behavior converges toward accurate shared beliefs about agent trustworthiness, as if all observers were performing coordinated Bayesian inference -- without any central coordinator.

Applicability: When NOT to Use This Protocol
----------------------------------------------

The cheapest trust mechanism wins. In order of preference: direct test > Tier 1 self-attestation > Tier 2 graph analysis. Reputation is a proxy -- it substitutes past behavior for future prediction -- and proxies always lose to direct evidence.

**When reputation is overhead:**

- If verifying an agent costs less than looking up its reputation, just verify directly. An agent that answers a $0.001 test query does not need a reputation score -- the test *is* the reputation.
- For stateless, idempotent interactions (e.g., "translate this sentence"), the cost of failure is bounded and retryable. Reputation adds latency without reducing risk.

**When reputation is justified:**

- Multi-step workflows where early failure is expensive. Example: an agent takes 4 hours on a complex task and fails at step 3. You cannot retroactively escrow that time. Reputation scoring before delegation is the only pre-commitment signal available.
- Delegations involving irreversible side effects (sending payments, publishing content, making API calls). The cost of a bad agent exceeds the cost of attestation lookup.
- High-fan-out orchestration where an orchestrator delegates to N agents simultaneously. Checking reputation for each is O(N) lookups; testing each is O(N) full executions.

**The core heuristic:** Reputation scoring is justified ONLY when verification cost exceeds attestation lookup cost. This protocol is a 3-step proxy (identity → past behavior → assumed future behavior). When you can eliminate any of those inference steps by testing directly, do so.

Security Considerations
-----------------------

Six attack scenarios have been analyzed in detail. Summary of defenses:

#### 1. Sockpuppet Flood

*Attack:* N fake identities attest to a malicious agent.

*Tier 1:* Fooled (counts are inflated).

*Tier 2:* Catches (star topology produces near-zero diversity score).

*Mitigation:* Tier 2 is the primary defense. Clients MAY additionally require proof-of-work or Lightning micropayment per attestation event.

#### 2. Cluster Collusion

*Attack:* K real agents in a tight cluster falsely vouch for a malicious agent.

*Tier 1:* Fooled.

*Tier 2:* Partially fooled (low diversity, but indistinguishable from legitimate community endorsement).

*Mitigation:* Require attestations from multiple independent clusters for high-trust status. Reputation slashing on detection.

#### 3. Sybil Bridge

*Attack:* Fake nodes bridge real clusters, simulating structural diversity.

*Tier 1:* Fooled.

*Tier 2:* Partially fooled (bridge nodes inflate diversity score).

*Mitigation:* Bridge activity minimums -- bridge nodes must have verifiable bilateral interactions, not just graph presence.

#### 4. Temporal Burst

*Attack:* Agent builds genuine reputation, then goes malicious.

*Both tiers:* Fooled (reputation was genuinely earned).

*Mitigation:* Mandatory attestation decay. Negative attestations propagate quickly after defection. Reputation requires continuous maintenance.

#### 5. Attestation Replay

*Attack:* Old attestations from defunct agents presented as current endorsements.

*Both tiers:* Fooled without TTL enforcement.

*Mitigation:* Mandatory `expiration` tag. Expired events are automatically discounted. This attack has zero benefit once TTL is enforced.

#### 6. Eclipse Attack on Observers

*Attack:* Adversary controls relay infrastructure, filtering negative attestations.

*Both tiers:* Fooled (computed over fabricated data).

*Mitigation:* Observer relay diversity. Clients MUST query multiple independent relay sets. At 10+ independent relays, eclipse cost exceeds most agents' reputation value.

> **Fundamental limitation:** Cluster collusion and eclipse attacks exploit the same structural ambiguity -- legitimate community endorsement is topologically identical to coordinated deception. No reputation protocol can distinguish them without external information. This NIP makes the limitation explicit: Tier 2 flags concentration but cannot determine whether concentration implies collusion or community.

Relay Behavior
--------------

Relays SHOULD treat kind `30085` events as parameterized replaceable events per [NIP-01](01.md). For each combination of `pubkey`, `kind`, and `d` tag, only the latest event is retained.

Relays MAY discard events whose `expiration` timestamp has passed, per [NIP-40](40.md).

Relays SHOULD support filtering by `#p` and `#t` tags to enable efficient attestation queries.

Reference Implementation
------------------------

Full working implementation in Python (zero dependencies):

- Source: [`nip_xx_reputation.py`](https://kai.eco/nip_reference_impl.html)

#### Publishing an Attestation

```python
attestation = {
    "subject": "d4e5f6...subject",
    "rating": 4,
    "context": "reliability",
    "confidence": 0.85,
    "evidence": "Completed 12 delegations over 30 days"
}

event = {
    "kind": 30085,
    "created_at": now(),
    "tags": [
        ["d", attestation["subject"] + ":" + attestation["context"]],
        ["p", attestation["subject"], preferred_relay],
        ["t", attestation["context"]],
        ["expiration", str(now() + 90 * 86400)],  # 90-day TTL
        ["v", "1"]
    ],
    "content": json.dumps(attestation)
}

sign_and_publish(event)
```

#### Computing Tier 1 Score

```python
HALF_LIFE = 90 * 86400  # 90 days in seconds

def tier1_score(subject, context, events):
    numerator = 0.0
    denominator = 0.0

    for event in events:
        att = json.loads(event["content"])

        # Validate
        if att["subject"] != subject: continue
        if att["context"] != context: continue
        if att["rating"] < 1 or att["rating"] > 5: continue
        if att["confidence"] < 0.0 or att["confidence"] > 1.0: continue
        if event["pubkey"] == subject: continue  # no self-attestation

        age = now() - event["created_at"]
        decay = 2 ** (-age / HALF_LIFE)
        weight = att["confidence"] * decay

        numerator += att["rating"] * weight
        denominator += weight

    if denominator == 0:
        return None
    return numerator / denominator
```

Related NIPs
------------

- [NIP-01](01.md): Base protocol. Defines parameterized replaceable events (kind 30000-39999).
- [NIP-32](32.md): Labeling. Complementary -- labels classify content, attestations assess agents.
- [NIP-40](40.md): Expiration timestamp. This NIP requires the `expiration` tag defined there.
- [NIP-56](56.md): Reporting. Complementary -- reports flag content, attestations rate agents over time.
