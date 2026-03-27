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
    ["v", "2"],
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

#### Commitment Classes

Evidence types vary in their Sybil resistance — the cost an attacker must incur to fabricate a false attestation. This section formalizes that variation as **commitment classes**, a property of the evidence accompanying an attestation, not the attestation itself.

| Class | Evidence Examples | Sybil Cost | Description |
|-------|-------------------|------------|-------------|
| **Self-assertion** | `free_text` | Near zero | Attestor claims something happened. No external verification possible. Unlimited generation at negligible cost. |
| **Reference** | `nostr_event_ref`, `dvm_job_id` | Low | Attestor references a verifiable Nostr event or job. Fabrication requires creating the referenced event, but this is free on Nostr. |
| **Computational proof** | `nip90_result_hash` | Medium | Attestor proves they received and can reference a specific work output. Fabrication requires performing or simulating the computation. |
| **Economic settlement** | `lightning_preimage` | High | Attestor proves a Lightning payment occurred. Fabrication requires spending real sats. Cost is bounded below by the payment amount. |
| **Staked commitment** | *(reserved)* | Very high | Attestor locks funds that can be slashed for misbehavior. Not yet implemented in any NIP but reserved for future payment channel or DLC-based mechanisms. |

**Scoring implications:** Clients implementing Tier 1 scoring SHOULD apply commitment-class multipliers to the base `confidence` value. Recommended multipliers:

| Class | Multiplier | Rationale |
|-------|------------|-----------|
| Self-assertion | 1.0× | Baseline. No adjustment. |
| Reference | 1.0× | References are easy to create; no premium. |
| Computational proof | 1.1× | Modest premium for demonstrated work evaluation. |
| Economic settlement | 1.2× | Significant premium for cryptographic payment proof. |
| Staked commitment | 1.3× | Highest premium for funds-at-risk. (Reserved.) |

Multipliers are applied BEFORE capping at confidence 1.0. Multiple evidence types in the same attestation use the highest applicable class — they do not stack.

> **Optional enhancement: Adaptive multipliers.** Under Sybil pressure, fixed commitment multipliers do not adapt — an attacker's low-cost attestations receive the same discount regardless of attack intensity. Implementations MAY use adaptive multipliers that increase the value of high-commitment evidence when the network appears to be under attack:
>
> ```
> multiplier(class, t) = base_multiplier × (1 + α × sybil_pressure(t))
> ```
>
> where `sybil_pressure(t)` is an observer-local estimate — for example, the ratio of low-diversity attestations (Tier 2 diversity below a threshold) to high-diversity attestations in the observer's recent window. The sensitivity parameter `α` is configurable (recommended range: 0.1–0.5). This makes higher-commitment evidence MORE valuable precisely when the network is under attack, dynamically widening the gap between cheap and costly signals. The monotonic ordering of commitment classes MUST be preserved at all times.

**Determining commitment class:** Clients inspect the `evidence` array and assign the attestation's commitment class based on the highest-class evidence type present. Unknown evidence types default to the Self-assertion class.

> **Design note:** Commitment classes formalize an insight from cross-protocol analysis: NIP-A5's settlement-anchored attestations (kind `38403` with payment proof) carry fundamentally different trust weight than social-only attestations. Rather than hard-coding this for one protocol, commitment classes provide a general framework that any future economic proof mechanism can plug into.


##### Theoretical Foundation: Costly Signaling

The commitment class hierarchy is not arbitrary — it instantiates the *handicap principle* from biological signaling theory (Zahavi 1975). Honest signals must be costly to produce, and the cost must differ between honest and dishonest signalers (Grafen 1990). This differential cost — the *single-crossing condition* — is what prevents cheap mimicry.

Each commitment class corresponds to a signal cost regime:

- **Self-assertion/Reference** (cost ≈ 0): Equivalent to "cheap talk" in signaling games. Any agent can produce unlimited attestations at negligible cost. No separating equilibrium exists — honest and dishonest agents are indistinguishable from evidence alone.
- **Computational proof** (cost = work): Fabrication requires performing or simulating computation. The cost is bounded below by the computational work, creating a weak separating condition: large-scale Sybil attestation requires proportional compute expenditure.
- **Economic settlement** (cost = sats): Lightning payment proofs impose monetary cost on fabrication. The single-crossing condition holds if legitimate agents transact anyway (the attestation is a byproduct of real economic activity) while attackers must spend specifically to create false evidence.
- **Staked commitment** (cost = locked capital + slashing risk): The strongest separating condition. Attackers face not just expenditure but potential loss exceeding their stake, creating super-linear cost for dishonest signaling.

The recommended multipliers (1.0×–1.3×) are deliberately conservative — they encode ordinal ranking (higher cost → higher weight) rather than attempting to derive exact values from equilibrium conditions. Implementers with domain-specific cost data MAY adjust multipliers, provided the monotonic ordering is preserved: self-assertion ≤ reference ≤ computational proof ≤ economic settlement ≤ staked commitment.

> **Research note:** The formal connection between Grafen's (1990) signaling equilibrium model and digital commitment mechanisms is developed in Donath (2007, "Signals in Social Supernets"). The composition property — that multi-class evidence provides multiplicative rather than additive Sybil resistance — follows from the independence of cost channels. This area remains underexplored; protocol designers are encouraged to derive commitment weights from empirical cost data rather than theoretical equilibrium alone.

#### Rating Semantics

| Rating | Meaning | Classification |
|--------|---------|----------------|
| `1` | Actively harmful, deceptive, or malicious | Negative |
| `2` | Unreliable, frequently fails or misleads | Negative |
| `3` | Neutral, insufficient basis for judgment | Neutral |
| `4` | Reliable, generally trustworthy | Positive |
| `5` | Highly trustworthy, consistent track record | Positive |

Negative attestations (ratings 1-2) serve the role of rejection signals. A separate negative attestation mechanism is unnecessary -- the rating scale encodes valence directly. This simplifies the protocol while preserving the rejection capability required for convergent inference (see [Convergence Properties](#convergence-properties)).

#### Context Domains (Open Namespace)

The `context` field uses a dot-separated namespace convention. No fixed enumeration — domains emerge from usage.

**Core domains** (RECOMMENDED as starting vocabulary):

| Context | Description |
|---------|-------------|
| `reliability` | Does the agent complete tasks as promised? |
| `accuracy` | Is the agent's output correct and truthful? |
| `responsiveness` | Does the agent respond in a timely manner? |

**Extended domains** use hierarchical dot-notation (convention, not enforced):

| Context | Description |
|---------|-------------|
| `task/code-review` | Code review quality |
| `task/translation` | Translation accuracy and fluency |
| `task/payment-routing` | Payment routing reliability |
| `task/data-extraction` | Data extraction completeness |

Clients SHOULD normalize context strings to lowercase. New domains MAY be introduced by any attestor without protocol changes.

#### Task-Type Tags

Attestations MAY include a `task-type` tag that categorizes the specific work performed:

```jsonc
["task-type", "task/code-review", "requester-confirmed"]
```

The third element indicates confirmation status:

| Status | Meaning |
|--------|---------|
| `attestor-proposed` | Attestor suggested this categorization. Provisional. |
| `requester-confirmed` | Requester validated the categorization. Canonical. |

**Mechanism:** The attestor proposes a task type when publishing the attestation. If the requester (the entity who requested the work) publishes their own attestation for the same interaction, they either confirm or override the type.

**Scoring implications:** Unconfirmed (`attestor-proposed`) task-type tags SHOULD decay at 2x the normal rate for their domain class. This makes provisional claims expire faster, incentivizing confirmation.

**Convention emergence:** Once a task-type accumulates sufficient requester confirmations across the network, it becomes a de facto standard. No registry or governance is needed — categories that describe real work persist; categories that don't, decay away.

Tags
----

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | MUST | Parameterized replaceable event identifier. Format: `<subject-pubkey>:<context>` |
| `p` | MUST | Subject's pubkey. Enables querying all attestations for a given agent via `{"#p": [...]}` filters. |
| `t` | MUST | Context category. Enables querying attestations by domain via `{"#t": [...]}` filters. |
| `expiration` | MUST | Unix timestamp after which this attestation SHOULD be considered expired. Relays MAY discard expired events per [NIP-40](40.md). |
| `v` | SHOULD | Schema version. Clients use this to determine which evidence types and scoring rules apply. Current version: `2`. Events with `v=1` remain valid and are processed with backward-compatible defaults. |
| `consistency_window` | RECOMMENDED | Unix timestamps defining the observation period for this attestation. Format: `["consistency_window", "<start-unix>", "<end-unix>"]`. Allows scoring algorithms to distinguish a 2-week snapshot from a 3-month track record. When present, clients SHOULD weight attestations with longer observation windows higher (all else equal). |
| `task-type` | MAY | Task category with confirmation status. Format: `["task-type", "<type>", "<status>"]` where status is `attestor-proposed` or `requester-confirmed`. See Task-Type Tags above. |

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
    ["v", "2"],
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

#### Domain-Dependent Decay

Different attestation domains degrade at different rates. Skill-based competence drifts slowly; operational reliability changes fast. A single decay constant compresses two orthogonal degradation processes.

Three decay classes are defined:

| Class | Half-life | Example domains | Rationale |
|-------|-----------|-----------------|-----------|
| `slow` | 180 days | `task/code-review`, `task/translation`, skill-based domains | Competence drifts gradually |
| `standard` | 90 days | `reliability`, `accuracy`, general domains | Default for unclassified contexts |
| `fast` | 30 days | `task/payment-routing`, `responsiveness`, operational domains | Performance depends on current network/system state |

Clients MUST maintain a namespace-to-class mapping. When a namespace is not in the mapping, the `standard` class (90-day half-life) MUST be used as fallback. The mapping is observer-configurable — different clients MAY classify the same namespace differently.

The decay function becomes:

```
half_life = half_life_for(context)  // 180d, 90d, or 30d
decay(t) = 2^(-(now - created_at) / half_life)
```

This is backward-compatible: clients that ignore decay classes use the 90-day default, which was the previous single value.

##### Principled Half-Life Derivation

The half-life values (30/90/180 days) can be derived from first principles rather than chosen ad hoc. The appropriate half-life for a domain approximates the geometric mean of two timescales: (1) the **characteristic interaction timescale** — how often agents in this domain typically interact — and (2) the **strategy-switch detection timescale** — how quickly defection from cooperation can be observed by peers. A multiplier accounts for the number of interactions needed for statistical confidence in detecting a strategy change.

| Domain class | Interaction timescale | Detection timescale | Geometric mean | Confidence multiplier | Derived half-life |
|-------------|----------------------|--------------------|-----------------|-----------------------|-------------------|
| `fast` (payment routing) | ~1 day | ~7 days | √(1×7) ≈ 2.6 days | ×10 | ≈ 26 days ≈ **30 days** |
| `standard` (general reliability) | ~7 days | ~30 days | √(7×30) ≈ 14.5 days | ×6 | ≈ 87 days ≈ **90 days** |
| `slow` (skill-based competence) | ~14 days | ~90 days | √(14×90) ≈ 35.5 days | ×5 | ≈ 178 days ≈ **180 days** |

The confidence multiplier decreases for slower domains because agents in those domains have longer track records per interaction, requiring fewer observations for statistical significance. This derivation grounds the half-life choices in observable network properties rather than arbitrary selection.

#### Tier 1: Weighted Average

For a subject `S` in context `C`, collect all valid, non-expired attestation events matching `{"#p": [S], "#t": [C], "kinds": [30085]}`. Compute:

```
score_T1 = sum(rating_i * confidence_i * decay_i) / sum(confidence_i * decay_i)
```

Result is a value in `[1.0, 5.0]`. If no valid attestations exist, the score is undefined (not zero). Clients MAY aggregate across a domain prefix (e.g., all `payment.*` namespaces) for summary display, but per-namespace scores are the canonical unit.

**Asymmetric negative weighting:** Negative attestations (rating <= 2) carry a 2x weight multiplier. This reflects the higher cost of producing negative signals (burning a relationship with the subject) and ensures that a small number of credible negative attestations can meaningfully counteract a larger volume of positive ones. The multiplier is capped at 2x to prevent reputation weaponization — a single negative attestation cannot dominate arbitrarily many positive ones.

#### Tier 1.5: Attestor Quality via Peer Prediction (Optional)

Tier 1.5 replaces self-reported `confidence` with computed attestor reliability using peer prediction — specifically the Determinant Mutual Information (DMI) mechanism. Self-reported confidence is exploitable (rational attestors always report 1.0). DMI provides dominant-strategy incentive-compatible scoring: truthful reporting maximizes expected payoff without requiring ground truth.

**Prerequisites:**

Tier 1.5 activates when sufficient data density exists. For each attestor pair `(A, B)` in context `C`, DMI requires at least `2c` shared subjects (subjects both `A` and `B` have attested in context `C`), where `c` is the number of rating categories. For a 5-point scale, this means ≥10 shared subjects per pair.

**Algorithm:**

1. For attestor pair `(A, B)` in context `C`, collect all subjects `S` that both `A` and `B` have attested.
2. If `|S| < 2c` (where `c = 5`), skip this pair — insufficient data for DMI. Fall back to raw `confidence` values.
3. Build the `c × c` joint distribution matrix `M`, where `M[i][j]` = fraction of shared subjects where `A` rated `i` and `B` rated `j`.
4. Compute `det(M)`. The determinant factorizes through the strategy matrix:

```
det(M) = det(Strategy_A) × det(Strategy_B) × det(TrueDistribution)
```

If either attestor uses an uninformative strategy (constant ratings, random ratings, or any rank-deficient strategy), their strategy matrix has `det = 0`, making `det(M) = 0`. Only informative, truthful strategies produce positive determinant.

5. Compute DMI score for attestor `A`:

```
dmi_score(A, C) = mean(det(M_AB) for all eligible pairs (A, B) in context C)
```

6. Normalize DMI scores across all attestors in context `C` to `[0.0, 1.0]`:

```
reliability(A, C) = dmi_score(A, C) / max(dmi_score(*, C))
```

If `max = 0` (no eligible pairs), all attestors fall back to raw `confidence`.

7. In the Tier 1 formula, replace `confidence_i` with `reliability(attestor_i, C)` when Tier 1.5 is active:

```
weight_i = reliability_i * decay_i * neg_multiplier(rating_i) * burst_decay(attestor_i)
```

**Graceful degradation:** In sparse networks (few shared subjects), Tier 1.5 is inactive and Tier 1 uses raw confidence. As network density grows and attestor pairs accumulate shared subjects, DMI activates automatically. This progression requires no configuration:

| Network state | Scoring |
|---------------|---------|
| Sparse (< 10 shared subjects per pair) | Tier 1 with raw confidence |
| Moderate (≥ 10 shared subjects for some pairs) | Tier 1.5 for eligible pairs, raw confidence for others |
| Dense (≥ 10 shared subjects for most pairs) | Full Tier 1.5 replaces confidence |

> **Rationale:** The namespace system provides the multi-task structure DMI requires. Attestors rating different subjects within `payment.reliability` naturally accumulate the shared observations needed for DMI computation. The mechanism rewards attestors who provide genuinely informative ratings and penalizes those who rubber-stamp or randomize — without any authority deciding who is trustworthy.

> **Agent advantage:** Software attestors can be programmed to follow the dominant strategy that DMI assumes. The comprehension barrier — the primary practical failure mode in human peer prediction deployments — is structurally absent in agent-to-agent systems. This means DMI, which has zero production deployments with human participants, may be viable specifically in agent reputation contexts.

> **Open research question:** DMI is dominant-strategy incentive compatible (DSIC) in static mechanism design — honest reporting is optimal regardless of others' strategies. Whether this property persists under evolutionary dynamics (where attestor strategies evolve by fitness) is an open question. Specifically: is honest reporting an Evolutionarily Stable Strategy (ESS) under the DMI mechanism? If so, this would provide the strongest known robustness guarantee for peer prediction in reputation systems. The Allen et al. (2017) structure coefficient framework may provide the tools for this proof.

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

> **Interpretation:** A sockpuppet flood with 100 fake attestors in a single connected component produces `diversity = 1/100 = 0.01`. Even with all ratings at 5 and confidence at 1.0, the Tier 2 score is `0.01 * 5.0 = 0.05`. The star topology is structurally penalized.

##### Degree-Weighted Diversity (Recommended Enhancement)

The basic diversity metric treats all attestors equally, but hub compromise is disproportionately dangerous — a compromised node with degree `k_hub` affects `k_hub` connections, making its capture probability scale as `ρ_hub ~ r^k_hub / N`. To account for this, Standard-level implementations SHOULD use degree-weighted diversity:

```
For each connected component C_j in the attestor interaction graph:
  degree_weight(C_j) = sum of degrees of all nodes in C_j

weighted_diversity = (sum over all components j of 1/degree_weight(C_j)) / total_attestors
```

This ensures that a single large cluster of highly-connected nodes (hubs) produces a LOWER diversity score than the same number of nodes spread across disconnected components. A cluster containing high-degree hubs has a large `degree_weight`, contributing less to the numerator.

**Example:** Four attestors with degrees [5, 5, 1, 1]. Components: `{A(5), B(5)}`, `{C(1)}`, `{D(1)}`.

```
Basic diversity:    3 / 4 = 0.75
Weighted diversity: (1/10 + 1/1 + 1/1) / 4 = 2.1 / 4 = 0.525
```

The weighted version correctly penalizes the hub-containing cluster. Implementations MAY use the basic `cluster_count / total_attestors` formula (Minimal level) or the degree-weighted formula (Standard level and above).

#### Temporal Burst Rate-Limiting

To penalize attestors who publish many attestations in a short window (carpet-bombing), observers SHOULD apply a confidence decay factor per attestor based on their recent attestation velocity.

**Parameters (configurable by observer):**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `window` | 86400 (24h) | Sliding window in seconds. |
| `threshold` | 5 | Maximum attestations in the window before decay applies. |

**Algorithm:**

For each attestor `A`, count the number of kind `30085` events published by `A` within the sliding window ending at `now`. Let `count` = number of events in the window. If `count > threshold`:

```
burst_decay(A) = 1 / sqrt(count)
```

If `count <= threshold`, `burst_decay(A) = 1.0` (no penalty).

The `burst_decay` factor is applied multiplicatively to each attestation's weight in the Tier 1 and Tier 2 scoring formulas:

```
weight_i = confidence_i * decay_i * neg_multiplier(rating_i) * burst_decay(attestor_i)
```

> **Rationale:** An attestor publishing 25 attestations in 24 hours has their weight reduced to `1/sqrt(25) = 0.2`. This penalizes carpet-bombing without blocking legitimate high-volume attestors who space their work across multiple windows. Observers compute this locally — no protocol-level enforcement is needed.

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

When these three conditions hold, the acceptance probability for attestations follows the Metropolis-Hastings criterion: the community's collective attestation behavior converges toward accurate shared beliefs about agent trustworthiness, as if all observers were performing coordinated Bayesian inference — without any central coordinator.

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

*Mitigation:* Bridge activity minimums — bridge nodes must have verifiable bilateral interactions, not just graph presence.

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

> **Fundamental limitation:** Cluster collusion and eclipse attacks exploit the same structural ambiguity — legitimate community endorsement is topologically identical to coordinated deception. No reputation protocol can distinguish them without external information. This NIP makes the limitation explicit: Tier 2 flags concentration but cannot determine whether concentration implies collusion or community.

#### 7. Multi-Layer Network Bounds

The Nostr network is not a single graph — it is a multi-layer network comprising at least three distinct layers: the **relay transport layer** (which relays an observer connects to), the **follow graph layer** (NIP-02 contact lists), and the **attestation graph layer** (kind `30085` events). Sybil resistance for reputation computation is bounded by the *sparsest* layer, not the most diverse one.

In practice, relay concentration is often the binding constraint. If an observer queries attestations from a small number of relays controlled by overlapping operators, then even perfect attestation graph diversity provides no protection — the adversary filters attestations at the relay layer before the observer ever sees them (a generalized eclipse attack).

Formally, the Cheeger constant (isoperimetric number) of the relay-layer graph provides an upper bound on the expansion — and therefore the Sybil resistance — of the composite reputation network. A relay layer with low expansion (few relays, high operator concentration) cannot be compensated by high expansion in the attestation layer.

> **Implication for implementers:** Clients computing Tier 2 diversity scores SHOULD also assess relay-layer diversity. A practical heuristic: if more than 50% of attestations for a subject were fetched from relays operated by the same entity, the effective diversity score should be discounted regardless of attestation graph structure. The eclipse attack defense (querying 10+ independent relays) is the minimum prerequisite for Tier 2 scores to be meaningful.

When NOT to Use
---------------

Reputation is overhead. When direct verification is cheaper than trust, use direct verification.

**Use reputation when:**

- Multi-step workflows where early failure is expensive (agent chains, payment pipelines).
- Repeated interactions where historical reliability is a meaningful signal.
- Agent discovery in large networks where testing every option is impractical.

**Do NOT use reputation when:**

- The interaction is cheap to verify directly (query a DVM, check the result, done).
- Anonymity plus diversification is sufficient (try multiple agents, keep the ones that work).
- The cost of maintaining attestation infrastructure exceeds the cost of occasional failure.

> **Design principle:** The cheapest trust mechanism wins. Reputation is justified only when verification cost exceeds interaction cost. For many agent interactions, "try and see" with diversification is more efficient than "check reputation first."

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
    "context": "payment.reliability",
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
        ["expiration", str(now() + 90 * 86400)]  # 90-day TTL
    ],
    "content": json.dumps(attestation)
}

sign_and_publish(event)
```

#### Computing Tier 1 Score

```python
DECAY_CLASSES = {
    "slow": 180 * 86400,
    "standard": 90 * 86400,
    "fast": 30 * 86400,
}

NAMESPACE_MAP = {
    "task/code-review": "slow",
    "task/translation": "slow",
    "task/payment-routing": "fast",
    "responsiveness": "fast",
}

def half_life_for(context):
    cls = NAMESPACE_MAP.get(context, "standard")
    return DECAY_CLASSES[cls]

def tier1_score(subject, context, events):
    half_life = half_life_for(context)
    numerator = 0.0
    denominator = 0.0

    for event in events:
        att = json.loads(event["content"])
        if att["subject"] != subject: continue
        if att["context"] != context: continue
        if att["rating"] < 1 or att["rating"] > 5: continue
        if att["confidence"] < 0.0 or att["confidence"] > 1.0: continue
        if event["pubkey"] == subject: continue

        age = now() - event["created_at"]
        decay = 2 ** (-age / half_life)
        
        # Unconfirmed task-type tags decay at 2x rate
        task_type_tag = get_tag(event, "task-type")
        if task_type_tag and len(task_type_tag) >= 3 and task_type_tag[2] == "attestor-proposed":
            decay *= 0.5
        
        weight = att["confidence"] * decay
        numerator += att["rating"] * weight
        denominator += weight

    if denominator == 0:
        return None
    return numerator / denominator
```

Test Vectors
------------

The following test vectors allow implementers to validate their scoring implementation against known-correct results. All vectors use `2026-04-01T00:00:00Z` (unix `1743465600`) as "now" and a half-life of 90 days (`7776000` seconds) for deterministic output.

**Pubkey conventions:**

- Subject: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
- Attestor A: `bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`
- Attestor B: `cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc`
- Attestor C: `dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd`
- Attestor D: `eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`

#### Test Vector 1: Basic Tier 1 Scoring

Three attestations for subject `aaaa...` in context `payment.reliability`:

**Attestor A** (rating 5, confidence 0.9, created 10 days ago):

```jsonc
{
  "kind": 30085,
  "pubkey": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "created_at": 1742601600,
  "tags": [
    ["d", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:payment.reliability"],
    ["p", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["t", "payment.reliability"],
    ["expiration", "1751241600"]
  ],
  "content": "{\"subject\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"rating\":5,\"context\":\"payment.reliability\",\"confidence\":0.9,\"evidence\":\"Test vector\"}"
}
```

**Attestor B** (rating 4, confidence 0.7, created 45 days ago):

```jsonc
{
  "kind": 30085,
  "pubkey": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "created_at": 1739577600,
  "tags": [
    ["d", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:payment.reliability"],
    ["p", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["t", "payment.reliability"],
    ["expiration", "1751241600"]
  ],
  "content": "{\"subject\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"rating\":4,\"context\":\"payment.reliability\",\"confidence\":0.7,\"evidence\":\"Test vector\"}"
}
```

**Attestor C** (rating 2, confidence 0.8, created 5 days ago — negative):

```jsonc
{
  "kind": 30085,
  "pubkey": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  "created_at": 1743033600,
  "tags": [
    ["d", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:payment.reliability"],
    ["p", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["t", "payment.reliability"],
    ["expiration", "1751241600"]
  ],
  "content": "{\"subject\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"rating\":2,\"context\":\"payment.reliability\",\"confidence\":0.8,\"evidence\":\"Test vector\"}"
}
```

**Expected computation:**

```
half_life = 7776000

Attestor A:
  age        = 1743465600 - 1742601600 = 864000 seconds (10 days)
  decay      = 2^(-864000 / 7776000)   = 2^(-0.111111) = 0.925875
  neg_mult   = 1.0  (rating 5 > 2)
  weight     = 0.9 * 0.925875 * 1.0    = 0.833287
  numerator  = 5 * 0.833287            = 4.166436

Attestor B:
  age        = 1743465600 - 1739577600 = 3888000 seconds (45 days)
  decay      = 2^(-3888000 / 7776000)  = 2^(-0.5)      = 0.707107
  neg_mult   = 1.0  (rating 4 > 2)
  weight     = 0.7 * 0.707107 * 1.0    = 0.494975
  numerator  = 4 * 0.494975            = 1.979899

Attestor C:
  age        = 1743465600 - 1743033600 = 432000 seconds (5 days)
  decay      = 2^(-432000 / 7776000)   = 2^(-0.055556) = 0.962224
  neg_mult   = 2.0  (rating 2 <= 2)
  weight     = 0.8 * 0.962224 * 2.0    = 1.539558
  numerator  = 2 * 1.539558            = 3.079116

score_T1 = (4.166436 + 1.979899 + 3.079116) / (0.833287 + 0.494975 + 1.539558)
         = 9.225451 / 2.867820
         = 3.216886
```

An implementer whose Tier 1 score for this vector does not round to `3.2169` (four decimal places) has a bug.

#### Test Vector 2: Self-Attestation Rejection

The following event MUST be discarded because `pubkey` equals the `subject` field in the content:

```jsonc
{
  "kind": 30085,
  "pubkey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "created_at": 1743033600,
  "tags": [
    ["d", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:payment.reliability"],
    ["p", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["t", "payment.reliability"],
    ["expiration", "1751241600"]
  ],
  "content": "{\"subject\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"rating\":5,\"context\":\"payment.reliability\",\"confidence\":1.0,\"evidence\":\"Self-attestation test\"}"
}
```

Expected result: Event is rejected at validation step 9. It MUST NOT contribute to any score computation.

#### Test Vector 3: Burst Rate-Limiting

Attestor D (`eeee...`) publishes 25 kind `30085` events within a 24-hour window. Default burst parameters: `window = 86400`, `threshold = 5`.

```
count = 25  (> threshold of 5)
burst_decay = 1 / sqrt(25) = 1 / 5 = 0.2
```

Each of Attestor D's attestations has its weight multiplied by `0.2`. For example, if Attestor D has a single attestation with rating 5, confidence 1.0, and decay 1.0:

```
weight_without_burst = 1.0 * 1.0 * 1.0           = 1.000
weight_with_burst    = 1.0 * 1.0 * 1.0 * 0.2     = 0.200
contribution         = 5 * 0.200                   = 1.000
```

The burst penalty reduces Attestor D's effective influence by 80%.

#### Test Vector 4: Tier 2 Diversity

Four attestors (A, B, C, D) attest to subject `aaaa...` in context `payment.reliability`. The attestor interaction graph has the following structure:

- A and B share a common attestation target (other than `aaaa...`) — **connected**
- C has no edges to any other attestor — **independent**
- D has no edges to any other attestor — **independent**

Connected components: `{A, B}`, `{C}`, `{D}` — `cluster_count = 3`

```
total_attestors = 4
cluster_count   = 3
diversity       = 3 / 4 = 0.75
```

Using the Tier 1 score from Test Vector 1 as an example:

```
score_T1 = 3.216886
score_T2 = diversity * score_T1 = 0.75 * 3.216886 = 2.412665
```

A maximally independent set (4 components out of 4 attestors) would produce `diversity = 1.0` and `score_T2 = score_T1`. A fully connected set (1 component) would produce `diversity = 0.25` and `score_T2 = 0.804222`.

Privacy Considerations
----------------------

The public attestation graph created by kind `30085` events has inherent privacy implications that implementers and users should understand.

**Social graph exposure.** Every attestation event links an attestor pubkey to a subject pubkey in a specific context domain. The aggregate set of attestations constitutes a directed, weighted, timestamped social graph. Anyone with relay access can reconstruct who trusts whom, in what domains, and how that trust evolved over time. This is a feature for reputation computation but a cost for privacy.

**Temporal correlation.** Attestation timestamps can be used to deanonymize attestors through correlation with external activity. If an attestor publishes attestations at times that correlate with known behavioral patterns (timezone, work hours, event attendance), the attestor's identity may be inferred even when using a pseudonymous pubkey.

**Persistent conflict records.** Negative attestations (ratings 1-2) create visible records of conflict or distrust. Unlike private reputation systems where negative signals are hidden, Nostr attestations are public events that persist on relays until expiration. This may discourage honest negative attestations — a chilling effect that weakens the convergence properties described in this NIP.

**Relay-side graph observation.** Relay operators can build complete attestor-subject graphs from the events they store and forward. A relay that handles a significant fraction of kind `30085` traffic has a comprehensive view of the reputation network topology, including which agents are controversial (many negative attestations) and which attestors are influential (high volume, high confidence).

**Mitigations:**

- Clients SHOULD query multiple independent relays when fetching attestations, to avoid giving any single relay operator a complete view of the client's reputation queries. This also serves the eclipse attack defense described in Security Considerations.
- Attestors MAY use purpose-specific keypairs dedicated to attestation activity, separating their reputation-giving identity from their primary Nostr identity. This limits social graph leakage to the attestation-specific pubkey.
- The mandatory `expiration` tag provides eventual data minimization. Expired attestation events MAY be deleted by relays per [NIP-40](40.md), reducing the long-term persistence of the social graph. Attestors SHOULD set expiration periods no longer than necessary for the context domain.
- Clients SHOULD NOT display raw attestor pubkeys in user interfaces when showing reputation scores. Aggregated scores reveal less about individual relationships than itemized attestation lists.

Backward Compatibility
----------------------

Kind `30085` is a new event kind introduced by this NIP. Clients that do not implement NIP-XX will ignore these events per standard Nostr behavior. There are no backward compatibility issues with existing event kinds.

#### Relationship to NIP-32 (Labeling)

Attestations complement labels. [NIP-32](32.md) labels classify content; NIP-XX attestations rate agents over time. Clients MAY interpret existing NIP-32 `"positive"` / `"negative"` labels as informal attestations but MUST NOT mix them in scoring algorithms. Label events lack the structured fields (confidence, decay class, evidence) required for Tier 1 computation, and including them would compromise score semantics.

#### Relationship to NIP-56 (Reporting)

[NIP-56](56.md) reports are one-shot flags indicating content violations. NIP-XX attestations are ongoing assessments of agent behavior over time. The two are complementary, not conflicting. A report says "this event is bad"; an attestation says "this agent's performance in this domain, over this period, is rated X."

#### Schema Versioning

The current schema version is `v=2`. Clients encountering `v=1` events SHOULD apply the following defaults for missing v2 fields:

- `task-type`: absent (omit from scoring; treat as untyped attestation)
- `decay` class: `standard` (90-day half-life)

Future schema versions MUST increment the `v` tag value. Clients encountering an unrecognized version SHOULD ignore the event rather than attempting partial parsing.

Client Implementation Levels
----------------------------

Implementations of this NIP fall into three levels. Each level builds on the previous.

#### Minimal (MUST)

Parse and validate kind `30085` events per the validation rules in this NIP. Compute Tier 1 scores using standard 90-day decay. Display per-namespace scores to the user.

#### Standard (SHOULD)

Domain-dependent decay classes (slow, standard, fast). Tier 2 graph diversity scoring with degree-weighted diversity. Burst rate-limiting with sliding window. Task-type tag processing and filtering.

#### Full (MAY)

Tier 1.5 DMI peer prediction for attestor quality weighting. Cross-namespace aggregation display. Attestor interaction graph visualization. Custom decay class mappings.

| Spec Section | Minimal | Standard | Full |
|-------------|---------|----------|------|
| Event format & validation | ✓ | ✓ | ✓ |
| Tier 1 scoring (standard decay) | ✓ | ✓ | ✓ |
| Domain-dependent decay classes | | ✓ | ✓ |
| Burst rate-limiting | | ✓ | ✓ |
| Task-type tags | | ✓ | ✓ |
| Tier 2 graph diversity (degree-weighted) | | ✓ | ✓ |
| Tier 1.5 DMI peer prediction | | | ✓ |
| Cross-namespace aggregation | | | ✓ |
| Attestor graph visualization | | | ✓ |

Interoperability
----------------

NIP-XX connects to the emerging Nostr agent ecosystem through several complementary NIPs. These connections are recommendations, not requirements. Each NIP operates independently.

#### NIP-A5 (Service Agreements) — Settlement-Anchored Complement

NIP-A5 defines a *settlement-anchored* trust model: reputation derives from completed economic transactions with cryptographic payment proof (L402/Lightning). NIP-XX defines a *social-anchored* model: reputation derives from attestation graph structure and scoring algorithms. These two approaches are complementary, not competing.

Post-service attestations (kind `38403`) can feed NIP-XX scoring. After completing a NIP-A5 service agreement, the requester MAY publish a kind `30085` attestation referencing the agreement event as evidence using the `nostr_event_ref` evidence type, and including a `lightning_preimage` evidence entry from the L402 settlement. This creates a verifiable link between a completed service and a reputation signal.

**Evidence weighting:** Attestations backed by settlement proof (Lightning payment hash/preimage) carry stronger evidence than social-only attestations. Clients implementing Tier 1 scoring SHOULD apply a weight multiplier to the `confidence` value when `lightning_preimage` evidence is present and verified. A recommended multiplier is 1.2× (capped at confidence 1.0).

##### Cross-Protocol Query Pattern

To join NIP-A5 and NIP-XX data by task category, clients can: (1) query kind `38403` events filtered by NIP-A5's task categorization, (2) query kind `30085` events filtered by `#t` tag for the corresponding context domain. The `task-type` tag in NIP-XX events MAY be used for finer-grained matching but is not relay-indexed — clients perform this join locally. Implementers who need relay-level `task-type` filtering SHOULD request relay support for custom tag indexing per NIP-01's extensible filter mechanism.

#### NIP-AC (DVM Coordination)

Job reviews (kind `31117`) from NIP-AC are domain-specific evaluations that map naturally to attestation contexts. Clients MAY compute NIP-XX scores from NIP-AC review events as input signals. The `task-type` tag aligns with NIP-AC's job type taxonomy.

#### NIP-AA (Agent Citizenship)

NIP-AA defines agent identity and autonomy levels but defers its reputation algorithm. NIP-XX could serve as that module. NIP-AA's autonomy levels could map to trust tier thresholds — for example, a Tier 1 score >= 4.0 required for AL-3 (fully autonomous) operations.

#### NIP-90 (Data Vending Machines)

DVM result hashes are already supported as the `nip90_result_hash` evidence type in this NIP. DVM interactions — job requests, results, and payments — provide natural attestation opportunities where both requester and provider can attest to the other's behavior.

Cold-Start Bootstrapping
-------------------------

A new agent has zero attestations and undefined reputation. This section addresses that cold-start problem.

> **Important:** Clients MUST treat undefined reputation as "unknown", NOT as "zero" or "bad". Penalizing agents for having no history creates a barrier that only established agents can overcome, concentrating trust in incumbents.

**Recommended bootstrapping path:**

1. Agents complete low-stakes tasks to accumulate initial attestations.
2. First attestations carry full weight — no minimum threshold is required for score computation.
3. Clients SHOULD distinguish three states in their UI: *unknown* (no data), *controversial* (mixed positive and negative data), and *trusted* (consistently positive data).

> **Note:** The protocol deliberately does NOT include a "vouch" or "introduce" mechanism. Introduction without interaction history is the gateway to Sybil attacks. Trust must be earned through bilateral interaction that produces attestation evidence.

Computational Complexity
------------------------

Cost analysis for implementers. Let *n* = number of attestations for a subject in a context, *a* = number of distinct attestors, *s* = number of shared subjects between attestor pairs.

| Tier | Complexity | Notes |
|------|------------|-------|
| Tier 1 | O(*n*) | Single pass through attestation set. One weighted-average computation. |
| Tier 1.5 (DMI) | O(*a*² × *s*) | Dominated by pairwise attestor comparisons across shared subjects. For 100 attestors with 50 shared subjects: ~500,000 operations. SHOULD be cached and updated incrementally. |
| Tier 2 | O(*a*² + *a*) | Dominated by building attestor interaction graph (pairwise check) + connected components via union-find. For 100 attestors: ~10,000 operations. |

#### Storage

Each kind `30085` event is approximately 500 bytes. A representative deployment of 1,000 attestors × 10 subjects × 5 contexts produces 50,000 events ≈ 25 MB. This is well within the capacity of a standard relay.

Related NIPs
------------

- [NIP-01](01.md): Base protocol. Defines parameterized replaceable events (kind 30000-39999).
- [NIP-32](32.md): Labeling. Complementary — labels classify content, attestations assess agents.
- [NIP-40](40.md): Expiration timestamp. This NIP requires the `expiration` tag defined there.
- [NIP-56](56.md): Reporting. Complementary — reports flag content, attestations rate agents over time.

Revision History
----------------

| Date | Change | Reviewer |
|------|--------|----------|
| 2026-03-23 | Added structured evidence types (`lightning_preimage`, `dvm_job_id`, `nostr_event_ref`, `free_text`) with extensibility. Evidence field now accepts typed JSON array. | `aec9180edbe1` |
| 2026-03-24 | Added `nip90_result_hash` evidence type for proving DVM result delivery. | `aec9180edbe1` |
| 2026-03-23 | Added asymmetric negative attestation weighting (2x multiplier for ratings <= 2) to Tier 1 scoring. | `aec9180edbe1` |
| 2026-03-23 | Added temporal burst rate-limiting with configurable sliding window and sqrt-based confidence decay. | `aec9180edbe1` |
| 2026-03-24 | Replaced closed context enum with open namespace system. Attestation types are now freeform with dot-namespaced convention. Tier 2 scores computed per-namespace. | `e0e247e9514f` |
| 2026-03-24 | Added Tier 1.5: Attestor Quality via Peer Prediction (DMI mechanism) for computed attestor reliability replacing self-reported confidence. Graceful degradation from sparse to dense networks. | `e0e247e9514f` |
| 2026-03-26 | v5.3: Domain-dependent decay (slow/standard/fast half-life classes), open context namespace with extended domains, task-type tags with attestor-proposed/requester-confirmed status, schema version bumped to v=2. | — |
| 2026-03-27 | v5.5: Enhanced NIP-A5 interoperability — settlement vs social anchoring, evidence weighting, cross-protocol query pattern | `e0e247e9514f` |
| 2026-03-27 | v5.6: Added commitment class taxonomy — formalized evidence-strength hierarchy (self-assertion → reference → computational proof → economic settlement → staked commitment) with scoring multipliers. Cross-protocol design from NIP-A5 collaboration. | `refined-element` |
| 2026-03-27 | v5.7: Added theoretical foundation for commitment classes — Zahavian costly signaling theory, Grafen single-crossing condition, Donath bridge to digital identity. Multiplier ordering grounded in signal cost regimes. | `kai` |
| 2026-03-27 | v6.0: Evolutionary game theory improvements — degree-weighted diversity for Tier 2, adaptive commitment multipliers under Sybil pressure, multi-layer network bounds in security analysis, DMI-ESS open research question, principled half-life derivation from interaction/detection timescales. | `kai` |
