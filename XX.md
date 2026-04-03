NIP-XX
======

Agent Reputation Attestations
-----------------------------

`draft` `optional`

This NIP defines kind `30085`, a parameterized replaceable event for publishing reputation attestations about Nostr agents. Attestations encode a structured rating, domain context, confidence level, and optional evidence. Clients compute reputation scores locally from their own relay set using a two-tier algorithm — Tier 1 (weighted average with temporal decay and commitment class multipliers) and Tier 2 (graph diversity metric) — unified by an alpha function that smoothly transitions between economic-proof-dominant and diversity-dominant scoring. No global reputation score exists. Different observers MAY compute different scores for the same subject. Attestation is trust-DELEGATION: publishing an attestation delegates the attestor's credibility to the subject, it does not verify the subject's identity or capabilities.

Motivation
----------

As autonomous agents proliferate on Nostr -- bots, AI assistants, automated service providers -- users and other agents need a decentralized mechanism to assess trustworthiness. Existing NIPs provide labeling ([NIP-32](32.md)) and reporting ([NIP-56](56.md)), but neither specifies a structured reputation attestation format with scoring algorithms, temporal decay, or sybil resistance.

This NIP addresses three gaps:

- **Temporal integrity** -- attestations must decay. Reputation is a flow, not a stock.
- **Negative attestations** -- the system must express disagreement, not only endorsement.
- **Observer independence** -- scores are computed locally. No authority, no global state.

The trust-DELEGATION framing (session 21) is central: an attestation delegates the attestor's credibility to the subject. It says "I stake my reputation on this claim about this agent." It does NOT verify the subject's identity, competence, or honesty — it transfers risk from the observer to the attestor. This distinction matters because it means the protocol's security reduces to the cost of acquiring attestor credibility, not the cost of verifying subjects directly.

Terminology
-----------

| Term | Definition |
|------|------------|
| **Attestor** | The entity (pubkey) that publishes a kind 30085 event. The attestor stakes their credibility on the claim. |
| **Subject** | The entity (pubkey) being attested. The `p` tag target. |
| **Observer** | The entity computing reputation scores from attestation events. Scores are observer-local. |
| **Alpha (α)** | Unified scoring function `alpha_0 = c * d^(1-c)` that smoothly combines network confidence and diversity. |
| **Network confidence (c)** | Evaluator-relative measure of a subject's neighborhood maturity, derived from weighted economic min-cut. Range [0, 1]. |
| **Individual diversity (d)** | Observer's diversity metric for a subject — ratio of independent attestor clusters to total attestors. Range [0, 1]. |
| **Commitment class** | Property of evidence accompanying an attestation, indicating Sybil cost: self-assertion, reference, computational proof, economic settlement, staked commitment. |
| **Trust layer** | Machine-readable tag (NIP-32 L-tag) indicating the *kind* of evidence: L1 (quality) or L2 (economic). Distinct from commitment class (which measures *strength*). |
| **Namespace** | Dot-separated context domain string (e.g., `payment.reliability`, `task/code-review`). Open vocabulary, not enumerated. |

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
    ["consistency_window", "<start-unix-timestamp>", "<end-unix-timestamp>"],
    ["L", "nip-xx.layer"],
    ["l", "quality", "nip-xx.layer"],
    ["l", "economic", "nip-xx.layer"],
    ["funding_utxo", "<txid>:<vout>"],
    ["ln_node_sig", "<hex-signature>"],
    ["l402_hash", "<sha256-hex>"],
    ["status", "active"],
    ["threshold_sats", "<sats-value>"],
    ["raw_capacity_sats", "<sats-value>"],
    ["seq", "<monotonic-integer>"]
  ],
  "content": "<JSON-stringified attestation object>"
}
```

#### Tags

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | MUST | Parameterized replaceable event identifier. Format: `<subject-pubkey>:<context>` |
| `p` | MUST | Subject's pubkey. Enables querying all attestations for a given agent via `{"#p": [...]}` filters. |
| `t` | MUST | Context category. Enables querying attestations by domain via `{"#t": [...]}` filters. |
| `expiration` | MUST | Unix timestamp after which this attestation SHOULD be considered expired. Relays MAY discard expired events per [NIP-40](40.md). |
| `v` | SHOULD | Schema version. Current version: `2`. Events with `v=1` remain valid with backward-compatible defaults. |
| `consistency_window` | RECOMMENDED | Observation period. Format: `["consistency_window", "<start-unix>", "<end-unix>"]`. |
| `L` | RECOMMENDED | NIP-32 label namespace declaration: `["L", "nip-xx.layer"]`. |
| `l` | RECOMMENDED | NIP-32 label for trust layer: `["l", "quality", "nip-xx.layer"]` or `["l", "economic", "nip-xx.layer"]`. |
| `funding_utxo` | MAY | UTXO backing this attestation's economic claim. Format: `["funding_utxo", "<txid>:<vout>"]`. |
| `ln_node_sig` | MAY | Signature from the attestor's Lightning node key over the event id, proving Nostr-to-LN key linkage. |
| `l402_hash` | MAY | SHA-256 hash of an L402 payment preimage for directional economic evidence. |
| `status` | MAY | Attestation lifecycle: `active` or `revoked`. Revoked attestations (also via NIP-09 deletion) MUST be excluded from scoring. |
| `threshold_sats` | MAY | The `threshold_sats` value used when computing alpha. Enables cross-observer auditability. |
| `raw_capacity_sats` | MAY | Channel capacity in sats for the `funding_utxo`. |
| `seq` | MAY | Monotonically increasing integer per `funding_utxo`. Enables fan-out tracking and fraud detection. |
| `channel_point` | MAY | UTXO backing the Lightning channel. Format: `["channel_point", "<txid>:<vout>"]`. Required when `funding_utxo` is present. |
| `task-type` | MAY | Task category with confirmation status. Format: `["task-type", "<type>", "<status>"]` where status is `attestor-proposed` or `requester-confirmed`. |

> **Note:** The `expiration` tag is REQUIRED, not optional. Attestations without expiration tags MUST be rejected by compliant clients.

#### Content Object

The `content` field MUST be a JSON-stringified object:

```jsonc
{
  "subject": "<32-byte hex pubkey of agent being attested>",
  "rating": 4,
  "context": "reliability",
  "confidence": 0.85,
  "evidence": "[{\"type\": \"lightning_preimage\", \"data\": \"...\"}, {\"type\": \"free_text\", \"data\": \"Completed 12 delegations\"}]"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | YES | 32-byte lowercase hex pubkey of the agent being attested. |
| `rating` | integer | YES | Rating on a 1-5 scale. See rating semantics below. |
| `context` | string | YES | Domain of attestation. Open namespace, dot-separated. |
| `confidence` | float | YES | Attestor's confidence in their rating, 0.0-1.0 inclusive. |
| `evidence` | string | NO | JSON array of typed evidence objects (see below), or plain string for backward compatibility. |

#### Structured Evidence

The `evidence` field SHOULD contain a JSON-stringified array of typed evidence objects. Each object has a `type` and `data` field. Clients SHOULD ignore unknown evidence types gracefully.

| Type | Description |
|------|-------------|
| `lightning_preimage` | Lightning payment preimage proving payment completion. |
| `dvm_job_id` | Reference to a DVM (Data Vending Machine) job ID. |
| `nip90_result_hash` | SHA-256 hash of DVM result payload, proving work delivery evaluation. |
| `nostr_event_ref` | Reference to a Nostr event ID as supporting evidence. |
| `free_text` | Human-readable free-text description. |
| `lightning_node` | Lightning Network node pubkey for channel capacity verification. |

Types are extensible. New types MAY be defined without a NIP update. Clients MUST NOT reject attestations containing unknown evidence types.

#### Commitment Classes

Evidence types vary in Sybil resistance. This section formalizes that as **commitment classes** — a property of the evidence, not the attestation itself.

| Class | Evidence Examples | Sybil Cost | Description |
|-------|-------------------|------------|-------------|
| **Self-assertion** | `free_text` | Near zero | Attestor claims something happened. No external verification. |
| **Reference** | `nostr_event_ref`, `dvm_job_id` | Low | References a verifiable event. Fabrication requires creating the event. |
| **Computational proof** | `nip90_result_hash` | Medium | Proves receipt of specific work output. Fabrication requires performing the computation. |
| **Economic settlement** | `lightning_preimage` | High | Proves Lightning payment. Cost bounded below by payment amount. |
| **Staked commitment** | *(reserved)* | Very high | Funds locked with slashing risk. Reserved for future DLC-based mechanisms. |

**Scoring multipliers:**

| Class | Multiplier | Rationale |
|-------|------------|-----------|
| Self-assertion | 1.0x | Baseline. |
| Reference | 1.0x | References are easy to create. |
| Computational proof | 1.1x | Modest premium for demonstrated work evaluation. |
| Economic settlement | 1.2x | Significant premium for cryptographic payment proof. |
| Staked commitment | 1.3x | Highest premium for funds-at-risk. (Reserved.) |

Multipliers are applied BEFORE capping at confidence 1.0. Multiple evidence types use the highest applicable class — they do not stack. The monotonic ordering MUST be preserved.

**Determining commitment class:** Clients inspect the `evidence` array and assign the class based on the highest-class evidence type present. Unknown evidence types default to Self-assertion.

> **Adaptive multipliers (OPTIONAL).** Under Sybil pressure, implementations MAY use adaptive multipliers:
>
> ```
> multiplier(class, t) = base_multiplier * (1 + alpha * sybil_pressure(t))
> ```
>
> where `sybil_pressure(t)` is observer-local (e.g., ratio of low-diversity to high-diversity attestations). Sensitivity `alpha` RECOMMENDED range: 0.1-0.5.

##### Theoretical Foundation: Costly Signaling

The commitment class hierarchy instantiates the *handicap principle* from biological signaling theory (Zahavi 1975). Honest signals must be costly to produce, and the cost must differ between honest and dishonest signalers — the *single-crossing condition* (Grafen 1990).

- **Self-assertion/Reference** (cost ~0): "Cheap talk." No separating equilibrium.
- **Computational proof** (cost = work): Weak separating condition — large-scale Sybil requires proportional compute.
- **Economic settlement** (cost = sats): Single-crossing holds when legitimate agents transact anyway.
- **Staked commitment** (cost = locked capital + slashing): Super-linear cost for dishonest signaling.

The multipliers (1.0x-1.3x) encode ordinal ranking, not exact equilibrium values. Implementers with domain-specific cost data MAY adjust, provided monotonic ordering is preserved.

#### Rating Semantics

| Rating | Meaning | Classification |
|--------|---------|----------------|
| `1` | Actively harmful, deceptive, or malicious | Negative |
| `2` | Unreliable, frequently fails or misleads | Negative |
| `3` | Neutral, insufficient basis for judgment | Neutral |
| `4` | Reliable, generally trustworthy | Positive |
| `5` | Highly trustworthy, consistent track record | Positive |

#### Context Domains (Open Namespace)

The `context` field uses a dot-separated namespace convention. No fixed enumeration — domains emerge from usage.

**Core domains** (RECOMMENDED):

| Context | Description |
|---------|-------------|
| `reliability` | Does the agent complete tasks as promised? |
| `accuracy` | Is the agent's output correct and truthful? |
| `responsiveness` | Does the agent respond in a timely manner? |

**Extended domains** (hierarchical dot-notation):

| Context | Description |
|---------|-------------|
| `task/code-review` | Code review quality |
| `task/translation` | Translation accuracy and fluency |
| `task/payment-routing` | Payment routing reliability |
| `task/data-extraction` | Data extraction completeness |

Clients SHOULD normalize context strings to lowercase. New domains MAY be introduced by any attestor.

#### Task-Type Tags

Attestations MAY include a `task-type` tag:

```jsonc
["task-type", "task/code-review", "requester-confirmed"]
```

| Status | Meaning |
|--------|---------|
| `attestor-proposed` | Provisional categorization. |
| `requester-confirmed` | Requester validated. Canonical. |

Unconfirmed (`attestor-proposed`) task-type tags SHOULD decay at 2x the normal rate.

#### Example Event

```jsonc
{
  "kind": 30085,
  "pubkey": "a1b2c3...attestor",
  "created_at": 1711152000,
  "tags": [
    ["d", "d4e5f6...subject:reliability"],
    ["p", "d4e5f6...subject", "wss://relay.example.com"],
    ["t", "reliability"],
    ["expiration", "1718928000"],
    ["v", "2"],
    ["consistency_window", "1703376000", "1711152000"],
    ["L", "nip-xx.layer"],
    ["l", "quality", "nip-xx.layer"],
    ["l", "economic", "nip-xx.layer"],
    ["funding_utxo", "abc123:0"],
    ["seq", "1"],
    ["threshold_sats", "20200000"]
  ],
  "content": "{\"subject\":\"d4e5f6...subject\",\"rating\":4,\"context\":\"reliability\",\"confidence\":0.85,\"evidence\":\"[{\\\"type\\\":\\\"lightning_preimage\\\",\\\"data\\\":\\\"deadbeef...\\\"},{\\\"type\\\":\\\"free_text\\\",\\\"data\\\":\\\"Completed 12 task delegations\\\"}]\"}"
}
```

#### Validation Rules

Clients MUST validate attestation events:

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
11. If a `v` tag is present, clients SHOULD validate the version. Unknown versions SHOULD be processed on a best-effort basis.
12. If a `consistency_window` tag is present, start MUST be less than end, and end MUST NOT be in the future.

Trust Layers
------------

Commitment classes describe evidence *strength*. Trust layer tags describe evidence *kind* — whether an attestation carries verifiable proof of output quality, economic exchange, or both. By encoding layers in NIP-32 labels, clients and relays can filter attestations by trust layer without parsing `content`.

#### Layer Definitions

| Layer | Label | What it proves | Schelling property |
|-------|-------|----------------|-------------------|
| L1 (Quality) | `quality` | Attestor received and evaluated actual work output. Evidence: `nip90_result_hash`, `nostr_event_ref`. | Converges via market selection. Subjective but competitive. |
| L2 (Economic) | `economic` | Money changed hands. Evidence: `lightning_preimage` with amount, or equivalent. | **Schelling point** — objective, self-validating. A preimage either exists or it doesn't. |

#### Tag Format

```jsonc
{
  "tags": [
    ["L", "nip-xx.layer"],
    ["l", "quality", "nip-xx.layer"],
    ["l", "economic", "nip-xx.layer"]
  ]
}
```

- `["L", "nip-xx.layer"]` declares the label namespace.
- Each `["l", "<layer>", "nip-xx.layer"]` asserts evidence for that layer.
- An attestation MAY carry one layer, both, or neither (legacy attestations).

#### Binding Rationale

L1 and L2 SHOULD be bound in the same event when both are present. Splitting quality and economic proof into separate events enables a decoupling attack: an attacker publishes fabricated L1 attestations without economic grounding. When both layers coexist in a single signed event, the attestor commits to the joint claim — "I paid AND I evaluated" — which is harder to fabricate than either alone.

> **Design principle:** The protocol seeks consensus on what is *expensive*, not what is *good*. L2 economic proof is the foundation because expense is objective and universally verifiable. L1 quality assessment rides on top — valuable but inherently subjective.

#### Relay-Level Filtering

Because trust layers are in tags, relays can serve layer-specific queries:

```jsonc
{"kinds": [30085], "#L": ["nip-xx.layer"], "#l": ["economic"]}
```

#### Interaction with Commitment Classes

- **Commitment classes** assign cost-based multipliers to confidence scores.
- **Trust layer tags** make evidence types machine-readable at the protocol level.

Clients SHOULD verify consistency: if an L2 tag is present, the evidence array SHOULD contain `lightning_preimage` or equivalent.

Scoring Algorithm
-----------------

Clients compute reputation scores locally. Two tiers are defined, unified by an optional alpha function. Clients MUST implement Tier 1. Clients SHOULD implement Tier 2. Clients MAY implement the alpha function.

### Tier 1: Weighted Average

For a subject `S` in context `C`, collect all valid, non-expired attestation events matching `{"#p": [S], "#t": [C], "kinds": [30085]}`. Compute:

```
score_T1 = sum(rating_i * weight_i) / sum(weight_i)
```

where:

```
weight_i = confidence_i * decay_i * neg_multiplier(rating_i) * commitment_multiplier_i * burst_decay(attestor_i)
```

Result is a value in `[1.0, 5.0]`. If no valid attestations exist, the score is undefined (not zero).

**Asymmetric negative weighting:** Negative attestations (rating <= 2) carry a 2x weight multiplier (`neg_multiplier`). This reflects the higher cost of producing negative signals and ensures credible negatives counteract larger volumes of positives. Capped at 2x to prevent weaponization.

#### Temporal Decay

```
decay(t) = 2^(-(now - created_at) / half_life)
```

An attestation created 90 days ago has weight 0.5. Default half-life: 90 days.

#### Domain-Dependent Decay

| Class | Half-life | Example domains | Rationale |
|-------|-----------|-----------------|-----------|
| `slow` | 180 days | `task/code-review`, `task/translation` | Competence drifts gradually |
| `standard` | 90 days | `reliability`, `accuracy` | Default for unclassified contexts |
| `fast` | 30 days | `task/payment-routing`, `responsiveness` | Performance depends on current state |

Clients MUST maintain a namespace-to-class mapping. When a namespace is not mapped, `standard` (90-day) MUST be used as fallback.

##### Principled Half-Life Derivation

The half-life values approximate the geometric mean of (1) the characteristic interaction timescale and (2) the strategy-switch detection timescale, multiplied by a confidence factor:

| Domain class | Interaction | Detection | Geometric mean | Multiplier | Derived |
|-------------|-------------|-----------|----------------|------------|---------|
| `fast` | ~1 day | ~7 days | ~2.6 days | x10 | ~30 days |
| `standard` | ~7 days | ~30 days | ~14.5 days | x6 | ~90 days |
| `slow` | ~14 days | ~90 days | ~35.5 days | x5 | ~180 days |

#### Commitment Class Multipliers

Applied per attestation based on highest evidence class present (see Commitment Classes above).

#### Temporal Burst Rate-Limiting

To penalize carpet-bombing, observers SHOULD apply burst decay per attestor:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `window` | 86400 (24h) | Sliding window in seconds. |
| `threshold` | 5 | Maximum attestations before decay applies. |

If `count > threshold`:

```
burst_decay(A) = 1 / sqrt(count)
```

If `count <= threshold`, `burst_decay(A) = 1.0`.

### Tier 1.5: Attestor Quality via Peer Prediction (Optional)

Tier 1.5 replaces self-reported `confidence` with computed attestor reliability using the Determinant Mutual Information (DMI) mechanism. Self-reported confidence is exploitable (rational attestors always report 1.0). DMI provides dominant-strategy incentive-compatible scoring.

**Prerequisites:** For each attestor pair `(A, B)` in context `C`, DMI requires at least `2c` shared subjects (c = 5 rating categories, so >= 10 shared subjects per pair).

**Algorithm:**

1. For pair `(A, B)` in context `C`, collect shared subjects `S`.
2. If `|S| < 10`, skip — fall back to raw `confidence`.
3. Build the 5x5 joint distribution matrix `M[i][j]` = fraction of shared subjects where A rated i and B rated j.
4. Compute `det(M)`. Uninformative strategies produce `det = 0`.
5. `dmi_score(A, C) = mean(det(M_AB) for all eligible pairs)`.
6. Normalize: `reliability(A, C) = dmi_score(A, C) / max(dmi_score(*, C))`.
7. Replace `confidence_i` with `reliability(attestor_i, C)` in Tier 1.

**Graceful degradation:** Sparse networks use raw confidence. DMI activates as density grows.

### Tier 2: Graph Diversity

Tier 2 measures structural independence among attestors.

1. Collect all attestors of subject `S` in context `C`.
2. Build the attestor interaction graph: edge if mutual attestation or shared target (other than `S`).
3. Compute connected components. `diversity = cluster_count / total_attestors`.
4. `score_T2 = diversity * score_T1`.

When `diversity = 1.0`, Tier 2 equals Tier 1. A sockpuppet flood of 100 in one component: `diversity = 0.01`, `score_T2 = 0.01 * 5.0 = 0.05`.

##### Degree-Weighted Diversity (DEPRECATED)

Previous versions of this specification recommended degree-weighted diversity. This mechanism is superseded by the HHI concentration discount (below), which addresses hub concentration risk without double-counting. Implementations SHOULD use basic diversity (cluster_count / total_attestors) for Tier 2, with HHI applied separately via the alpha function.

### Alpha Function: Unified Scoring (RECOMMENDED)

The alpha function smoothly transitions between economic-proof-dominant (cold start) and diversity-dominant (mature) scoring.

**Definition:**

```
alpha_0(c, d) = c * d^(1-c)
```

Where:
- `c` = **network confidence** (weighted min-cut, range [0, 1])
- `d` = **individual diversity** (basic or degree-weighted, range [0, 1])

Economic weight is incorporated through commitment class weighting in Tier 1, not directly in alpha.

Key properties:
- `c = 0` -> `alpha_0 = 0` (no confidence = no score)
- `c = 1, d = 1` -> `alpha_0 = 1` (full confidence + full diversity)
- Monotonically increasing in `c`
- Smooth — no sharp thresholds, no closed-form attacker solution

> **Design rationale:** Sharp thresholds create game-theoretic ledges. The smooth form means marginal returns are uncertain, which is the defense.

> **Relationship to tiers:** The alpha function subsumes Tier 1 and Tier 2. Minimal implementations MAY continue using `score_T2 = diversity * score_T1`. Standard and Full implementations SHOULD use alpha.

**Network confidence (c):**

```
c = min(1, log(min_cut_sats + 1) / log(threshold_sats))
```

Where:
- `min_cut_sats` = minimum weight of edges (in sats) to disconnect subject from observer's trust anchors
- `threshold_sats` = economic saturation threshold (see below)

**Why weighted min-cut:** Standard min-cut counts paths; an attacker splits capital cheaply. Weighted min-cut counts sats — total economic commitment is preserved regardless of distribution.


##### Trust Anchors

The observer's **trust anchors** are the set of pubkeys the observer has designated as trusted starting points for graph traversal. By default, trust anchors are the observer's NIP-02 (kind 3) contact list.

- If the observer has no kind 3 list, `c` is undefined and alpha cannot be computed.
- Implementations MAY allow manual trust anchor configuration.
- Trust anchors are observer-local — different observers have different anchors, producing different `c` values for the same subject.

##### threshold_sats Adaptation

```
threshold_sats = max(FLOOR, median_channel_capacity * K)
```

Where:
- **FLOOR** = 100,000 sats (protocol constant)
- **K** = 10 (fixed multiplier)
- **median_channel_capacity** from Lightning gossip

Provides price adaptation, no governance dependency, poisoning resistance (FLOOR prevents downward manipulation), and observer locality.

##### UTXO Fan-Out Mitigation

When a single UTXO backs multiple attestations:

```
c_effective = c_raw / seq_max
```

Where `seq_max` = highest `seq` value for that UTXO. An attestor backing 10 attestations with one UTXO: `c_effective = c_raw / 10`.

##### Hub Concentration Discount (RECOMMENDED)

The Herfindahl-Hirschman Index (HHI) supplements path diversity by detecting upstream hub concentration:

```
HHI = sum(w_i^2)    for i = 1..n attestors on scoring paths
alpha_adjusted = alpha * (1 - HHI + 1/n)
```

Boundary conditions:
- `HHI = 1/n` (uniform): no adjustment
- `HHI -> 1` (single hub): maximum penalty
- `n = 1`: no adjustment (no diversity illusion to correct)

##### Attestation Temporal Decay

Alpha is an **attestation-event snapshot** — computed once at creation, NOT recomputed live.

```
alpha_T = alpha_0 * exp(-lambda * T)
```

**Decay rate:**

```
lambda = base_rate * (1 + log(1 + R_e / R_0))
```

Where:
- `base_rate` = 0.0019/day (~1-year half-life)
- `R_e` = `distinct active days with L402 receipts in the measurement window / window_size`
- `R_0` = EMA_30(`R_e`) at protocol launch

##### Consolidation Response

When Lightning network topology consolidates (fewer, larger channels), implementations MAY adjust decay and threshold parameters. See Appendix A for a RECOMMENDED consolidation response formula.

The normative decay rate remains:

```
lambda = base_rate * (1 + log(1 + R_e/R_0))
```

> **Safety invariant:** `threshold_eff` MUST never fall below `FLOOR`. The `max(FLOOR, ...)` clamp prevents division-by-zero in the `c` formula when extreme consolidation drives `exp(-delta * EMA_k(dT/dt))` toward zero.


##### Protocol Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `base_rate` | 0.0019/day | Base decay rate (~1-year half-life) |
| `gamma_lambda` | 0.1 day^-1 | Base decay rate multiplier |
| `delta` | r * gamma_lambda = 0.115 | Threshold adaptation rate |
| `r` | 1.15 | Compensation ratio (delta/gamma_lambda) |
| `R_0` | 5 | Baseline active days for relationship |
| `c_bootstrap` | 0.05 | Maximum c for flow-only (Tier 3) attestations |
| `h` | 0.85 | Hop discount factor for path aggregation |
| `K` | 10 | Protocol-fixed cross-observer normalization constant |
| `FLOOR` | 100,000 sats | Minimum threshold_sats |
| `hop_limit` | 5 | Maximum path length in attestation graph |

##### Attestation Graph Distance

Attestations from nearby entities carry more weight:

```
distance_discount = exp(-0.3 * hops)
```

Where `hops` = shortest path on attestation graph. At 1 hop: ~0.74. At 3 hops: ~0.41.

> **EMA Initialization:** See Appendix A for EMA_k initialization and smoothing parameters. Early scores are dampened.

**Protocol output:**

Implementations SHOULD expose structured output:

```jsonc
{
  "alpha_0": 0.73,
  "c": 0.85,
  "d": 0.68,
  "regime": "mature"
}
```

**Regime enum:**

| Regime | Condition | Interpretation |
|--------|-----------|----------------|
| `bootstrap` | low c, low d | Graph immature. `alpha_0 ~ 0`. |
| `mature` | high c, high d | Graph differentiated. `alpha_0 ~ d`. |
| `concentrated` | high c, low d | Few independent attestors. Low trust warranted. |
| `suspicious` | low c, high d | Sybil-with-capital pattern. Diversity easy to fake in undifferentiated neighborhoods. |

Recommended defaults: c < 0.3 = "low c", c >= 0.3 = "high c"; d < 0.4 = "low d", d >= 0.4 = "high d".

Kind 30086: Fraud Proofs
------------------------

Kind `30086` is a parameterized replaceable event for publishing fraud proofs against attestors who violate protocol rules.

#### Event Structure

```jsonc
{
  "kind": 30086,
  "pubkey": "<fraud-reporter-pubkey>",
  "tags": [
    ["d", "<H(reporter_pubkey || txid:vout || seq || evidence_hash)>"],
    ["p", "<accused-attestor-pubkey>"],
    ["e", "<evidence-event-id-1>"],
    ["e", "<evidence-event-id-2>"],
    ["fraud_type", "seq_reuse|seq_gap|utxo_mismatch"]
  ],
  "content": "<human-readable explanation of the fraud>"
}
```



The `d` tag ensures each fraud proof is uniquely identified by the specific equivocation it reports. Multiple fraud proofs from the same reporter about different violations coexist because their `d` tags differ. Corrections to a fraud proof (e.g., additional evidence) replace the previous version for the same `d` tag.
#### Fraud Types

- **`seq_reuse`**: Two attestations from the same attestor reference the same `funding_utxo` with the same `seq` value but different subjects or contexts.
- **`seq_gap`**: Published `seq` values for a UTXO skip numbers (e.g., 1, 2, 5), suggesting hidden attestations.
- **`utxo_mismatch`**: The referenced UTXO does not correspond to a channel involving the attestor's linked Lightning node.

#### Penalty Scope

Fraud proofs trigger penalties scoped to the specific UTXO. When validated:

- All attestations from the accused attestor referencing that UTXO have `c_effective` zeroed.
- Attestations referencing OTHER UTXOs are NOT affected.
- Per-UTXO scoping prevents griefing where a single fraud proof destroys an attestor's entire reputation.

Clients SHOULD validate fraud proofs by fetching referenced evidence events and checking the claimed violation.

Security Considerations
-----------------------

### 8.1 Scope of Claims

Alpha is a cost function, not an oracle. It measures the economic and structural cost of fabricating an attestation set, not whether the claims are true. A high alpha score means "this would be expensive to fake," not "this is true."

### 8.2 Sybil Resistance

#### Sockpuppet Flood

*Attack:* N fake identities attest to a malicious agent.

*Tier 1:* Fooled (counts inflated). *Tier 2:* Catches (star topology, near-zero diversity).

*Mitigation:* Tier 2 is the primary defense. Clients MAY require proof-of-work or Lightning micropayment per attestation.

*Structural defense:* HHI concentration discount catches false diversity when edge-disjoint paths share upstream hubs.

#### Collusion Rings (2a/2b/2c)

**2a. Structural defense:** Tier 2 diversity scoring penalizes star topology. HHI catches false diversity.

**2b. Collusion rings:** K real agents form a clique, mutually attesting a target. Implementations SHOULD scan for complete subgraphs (K_4+ cliques). Cost model: K participants create K*(K-1) edges — quadratic attestation volume from linear capital cost. This asymmetry makes rings more dangerous than equivalently-sized Sybil clusters.

**2c. Hybrid attacks (Ring + Sybil):** A ring uses Sybil nodes for reach while maintaining diversity. Defense: HHI discount catches hub concentration in the ring core; structural Sybil ceiling caps extension influence.

> **Fundamental limitation:** Cluster collusion and eclipse attacks exploit the same structural ambiguity — legitimate community endorsement is topologically identical to coordinated deception. No reputation protocol can distinguish them without external information.

#### Bridge Attacks

*Attack:* Fake nodes bridge real clusters, simulating structural diversity.

*Mitigation:* Bridge activity minimums — bridge nodes must have verifiable bilateral interactions, not just graph presence.

#### Structural Sybil Ceiling

Maximum alpha achievable by a Sybil cluster:

```
S_max = d_sybil * h^(L+1)
```

Where:
- `d_sybil` = path diversity of Sybil cluster as seen from honest observer
- `h` = hop discount (0.85)
- `L` = hops from observer to nearest Sybil node

Capital cost below this ceiling: `cost = seq_max * threshold_sats * N_attestations`. Topology limits maximum influence; economics prices the approach to that limit.

#### UTXO Reuse

Per-attestor UTXO budget with channel-key binding. Each `funding_utxo` has a `seq` counter. Fan-out is penalized via `c_effective = c_raw / seq_max`. Attestations referencing Lightning channel evidence MUST include a `channel_point` tag. Verifiers SHOULD check the UTXO remains unspent; spent UTXOs SHOULD have economic weight zeroed.

### 8.3 Temporal Attacks

**Burst:** Agent builds genuine reputation, then goes malicious.

*Mitigation:* Mandatory attestation decay. Negative attestations propagate quickly after defection.

**Replay:** Old attestations from defunct agents presented as current endorsements.

*Mitigation:* Mandatory `expiration` tag. Zero benefit once TTL is enforced.

### 8.4 Eclipse/Observer Manipulation

*Attack:* Adversary controls relay infrastructure, filtering negative attestations.

*Mitigation:* Observer relay diversity. Clients MUST query multiple independent relay sets. At 10+ independent relays, eclipse cost exceeds most agents' reputation value.

*Selective delay:* Adversary withholds attestations from specific relay sets, causing observer divergence. Implementations SHOULD query N independent relays and take the union.

**Multi-layer network bounds:** The Nostr network comprises at least three layers: relay transport, follow graph (NIP-02), and attestation graph. Sybil resistance is bounded by the *sparsest* layer. Relay concentration is often the binding constraint. The Cheeger constant of the relay-layer graph bounds the expansion of the composite network.

> **Heuristic:** If >50% of attestations for a subject came from relays operated by the same entity, discount the effective diversity score regardless of attestation graph structure.

### 8.5 Fee-Rate Dependency

The economic proof layer is denominated in sats. Bitcoin fee-rate fluctuations affect the real cost of channel creation. During high-fee periods, Sybil cost increases; during low-fee periods, it decreases. The `threshold_sats` adaptation mechanism partially mitigates long-term drift but does not address short-term volatility. This is an inherent limitation of any economic proof system anchored to a fee-bearing network.

### 8.6 Bulk Revocation Cascades

When a highly-connected hub revokes attestations or is compromised, all paths through that hub lose alpha contribution simultaneously. Revocation MUST be immediate — relay-level rate-limiting would create a window of false trust. The cascade is a consequence of hub concentration (measurable via HHI). Implementations MAY apply display-layer grace periods ("score under review") but MUST NOT delay underlying score computation. No rate-limiting — accepted design choice.

### 8.7 UTXO Reuse

**Flash-loan attack:** Attacker opens a channel, creates an attestation, immediately closes. The attestation persists but economic backing is gone.

*Mitigation:* Attestations referencing Lightning channels MUST include `channel_point` (`["channel_point", "<txid>:<vout>"]`). Verifiers SHOULD check that the UTXO remains unspent. Spent UTXOs have economic weight zeroed. This creates ongoing capital lockup cost.

**Per-attestor budget:** Each attestor has a finite UTXO budget. The `seq` tag tracks how many attestations each UTXO backs. Channel-key binding (via `ln_node_sig`) proves the attestor controls the Lightning node that owns the channel, preventing UTXO hijacking.

Privacy Considerations
----------------------

### Tiered Economic Evidence

The protocol supports three evidence tiers with different privacy properties:

- **Public evidence** (L-tags, `funding_utxo`): Fully visible. Enables relay-level filtering and third-party verification.
- **Committed evidence** (`l402_hash`): Hash commitment. Proves existence of payment without revealing the preimage publicly. Verifiers with the preimage can check.
- **No evidence** (self-assertion only): Minimal privacy exposure but lowest scoring weight.

Attestors choose their evidence tier based on privacy preferences vs. scoring weight tradeoffs.

### Graph Topology Visibility

`p` tags in kind 30085 events are cleartext. Any relay operator can reconstruct the who-trusts-whom graph. This is necessary for observer-independent verification. Encrypted attestations (NIP-44) visible only to chosen verifiers are possible but reduce path diversity.

### Temporal Correlation

`funding_utxo` tags combined with on-chain timing analysis can link Nostr identities to Lightning channel openings. Implementations SHOULD add timing jitter to attestation publication.

### Blinded Verification

Future extensions MAY support blinded verification schemes where attestation existence can be proven without revealing the attestor-subject pair. This remains an open research area.

### Observer-Local Computation as Privacy Feature

All scoring is observer-local. No entity learns what scores an observer computes. This is a privacy feature: an observer's trust model is private by default.

**Mitigations:**
- Query multiple independent relays to avoid single-operator query pattern leakage.
- Purpose-specific keypairs for attestation activity.
- Mandatory `expiration` provides eventual data minimization.
- Clients SHOULD NOT display raw attestor pubkeys — aggregated scores reveal less.

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

> **Design principle:** The cheapest trust mechanism wins. Reputation is justified only when verification cost exceeds interaction cost.

Cold-Start Bootstrapping
-------------------------

A new agent has zero attestations and undefined reputation.

> **Important:** Clients MUST treat undefined reputation as "unknown", NOT as "zero" or "bad".

**Recommended bootstrapping:**

1. Agents complete low-stakes tasks to accumulate initial attestations.
2. First attestations carry full weight — no minimum threshold required.
3. Clients SHOULD distinguish three UI states: *unknown*, *controversial*, *trusted*.

**Alpha at cold start:** `c_bootstrap = 0.05` — maximum network confidence for flow-only attestations. With `c = 0`, `alpha_0 = 0`. Bootstrapping comes from Tier 1 scoring (commitment class weights). As the agent accumulates attestations and the graph differentiates, `c` rises above zero smoothly.

> **Note:** The protocol deliberately does NOT include a "vouch" or "introduce" mechanism. Introduction without interaction history is the gateway to Sybil attacks.

Conformance Levels
------------------

Implementations fall into three levels:

#### Minimal (MUST)

Parse and validate kind `30085` events. Compute Tier 1 scores using standard 90-day decay. Display per-namespace scores.

#### Standard (SHOULD)

Domain-dependent decay classes. Tier 2 graph diversity (degree-weighted). Burst rate-limiting. Task-type tag processing. Alpha function with network confidence. Trust layer filtering.

#### Full (MAY)

Tier 1.5 DMI peer prediction. Alpha function with HHI discount. Cross-namespace aggregation. Attestor graph visualization. Custom decay class mappings. Fraud proof validation.

| Spec Section | Minimal | Standard | Full |
|-------------|---------|----------|------|
| Event format & validation | MUST | MUST | MUST |
| Tier 1 scoring (standard decay) | MUST | MUST | MUST |
| Domain-dependent decay classes | | SHOULD | SHOULD |
| Burst rate-limiting | | SHOULD | SHOULD |
| Task-type tags | | SHOULD | SHOULD |
| Tier 2 graph diversity (degree-weighted) | | SHOULD | SHOULD |
| Alpha function | | SHOULD | SHOULD |
| Trust layer tags (L/l) | | SHOULD | SHOULD |
| HHI concentration discount | | | MAY |
| Tier 1.5 DMI peer prediction | | | MAY |
| Fraud proof processing (kind 30086) | | | MAY |
| Cross-namespace aggregation | | | MAY |
| Attestor graph visualization | | | MAY |

Relay Behavior
--------------

Relays SHOULD treat kind `30085` events as parameterized replaceable events per [NIP-01](01.md). For each combination of `pubkey`, `kind`, and `d` tag, only the latest event is retained.

Relays MAY discard events whose `expiration` timestamp has passed, per [NIP-40](40.md).

Relays SHOULD support filtering by `#p`, `#t`, `#L`, and `#l` tags to enable efficient attestation queries.

#### Kind Collision and d-tag Disambiguation

Kind `30085` may be used by other applications for unrelated purposes (e.g., [NIP-111](111.md) WebRTC game signaling). Conforming implementations MUST NOT assume that all kind `30085` events are NIP-XX attestations.

NIP-XX attestations are identifiable by their `d`-tag format: `<64-char-hex-pubkey>:<namespace>`. Clients SHOULD validate this format before processing an event as an attestation. Specifically:

1. The `d` tag value MUST contain exactly one colon separator.
2. The portion before the colon MUST be a 64-character lowercase hexadecimal string (the subject pubkey).
3. The portion after the colon MUST be a non-empty namespace string.
4. A `p` tag referencing the subject MUST be present.

Events failing these checks SHOULD be silently discarded by attestation-processing clients. This d-tag structure provides natural disambiguation without requiring a dedicated kind number or additional tags.

#### Relay Divergence Recommendation

Implementations SHOULD query the union of:
- The target pubkey's NIP-65 relay list
- The observer's own relay set
- Any relay hints in the kind 30085 event's relay tags

Trust scores are relay-set-dependent. Implementations SHOULD log the relay set used for reproducibility.

Interoperability
----------------

NIP-XX connects to the Nostr agent ecosystem through several complementary NIPs. These are recommendations, not requirements.

#### NIP-A5 (Service Agreements) — Settlement-Anchored Complement

NIP-A5 defines a *settlement-anchored* trust model (reputation from completed transactions). NIP-XX defines a *social-anchored* model (reputation from attestation graph structure). These are complementary.

Post-service attestations (kind `38403`) can feed NIP-XX scoring. After a NIP-A5 agreement, the requester MAY publish a kind `30085` attestation referencing the agreement event as evidence.

#### NIP-AC (DVM Coordination)

Job reviews (kind `31117`) map naturally to attestation contexts. The `task-type` tag aligns with NIP-AC's job type taxonomy.

#### NIP-90 (Data Vending Machines)

DVM interactions provide the most natural attestation pipeline. Every job cycle (request -> result -> payment) produces bilateral evidence for kind `30085` attestations.

```jsonc
{
  "kind": 30085,
  "tags": [
    ["d", "<sp-pubkey>:dvm.translation"],
    ["p", "<sp-pubkey>"],
    ["t", "dvm.translation"],
    ["task_type", "5005"],
    ["v", "2"]
  ],
  "content": "{\"subject\": \"<sp-pubkey>\", \"rating\": 4, \"context\": \"dvm.translation\", \"confidence\": 0.9, \"evidence\": \"[{\\\"type\\\": \\\"dvm_job_id\\\", \\\"data\\\": \\\"<job-request-event-id>\\\"}, {\\\"type\\\": \\\"nip90_result_hash\\\", \\\"data\\\": \\\"<sha256-of-result>\\\"}, {\\\"type\\\": \\\"lightning_preimage\\\", \\\"data\\\": \\\"<payment-preimage>\\\"}]\"}"
}
```

#### NIP-AA (Agent Citizenship)

NIP-AA defines agent identity and autonomy levels but defers its reputation algorithm. NIP-XX could serve as that module. Autonomy levels could map to trust tier thresholds.

Related NIPs
------------

- [NIP-01](01.md): Base protocol. Defines parameterized replaceable events (kind 30000-39999).
- [NIP-09](09.md): Event deletion. Used for attestation revocation.
- [NIP-32](32.md): Labeling. Trust layer tags use the NIP-32 L-tag system.
- [NIP-40](40.md): Expiration timestamp. This NIP requires the `expiration` tag.
- [NIP-56](56.md): Reporting. Complementary — reports flag content, attestations rate agents.
- [NIP-65](65.md): Relay list metadata. Used for relay divergence recommendations.

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

The following test vectors allow implementers to validate their scoring implementation. All vectors use `2026-04-01T00:00:00Z` (unix `1743465600`) as "now" and a half-life of 90 days (`7776000` seconds).

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

Backward Compatibility
----------------------

Kind `30085` is a new event kind. Clients that do not implement NIP-XX will ignore these events per standard Nostr behavior. No backward compatibility issues with existing event kinds.

#### Schema Versioning

Current schema version: `v=2`. Clients encountering `v=1` events SHOULD apply defaults:

- `task-type`: absent (omit from scoring)
- `decay` class: `standard` (90-day half-life)

Future versions MUST increment the `v` tag. Unknown versions SHOULD be ignored rather than partially parsed.

Computational Complexity
------------------------

Let *n* = attestations for a subject in a context, *a* = distinct attestors, *s* = shared subjects between pairs.

| Tier | Complexity | Notes |
|------|------------|-------|
| Tier 1 | O(*n*) | Single pass weighted average. |
| Tier 1.5 (DMI) | O(*a*^2 x *s*) | Pairwise comparisons. SHOULD be cached. |
| Tier 2 | O(*a*^2 + *a*) | Interaction graph + union-find. |
| Alpha function | O(*a*^2 + *a* x *E*) | Weighted min-cut (*E* = edges). SHOULD be cached. |

#### Storage

Each event ~500 bytes. 1,000 attestors x 10 subjects x 5 contexts = 50,000 events ~ 25 MB.


Appendix A: Consolidation Response (Non-normative)
---------------------------------------------------

This appendix describes a RECOMMENDED approach for responding to Lightning network consolidation (fewer, larger channels).

### EMA-smoothed Consolidation Detection

Track the rate of change of median `threshold_sats` via exponential moving average:

```
EMA_k(dT/dt) — smoothed rate of change of median threshold_sats
alpha_ema = 2/(k+1) — EMA smoothing factor
EMA_k at t=0 = 0
```

### Adaptive Formulas

```
lambda_eff = base_rate * (1 + log(1 + R_e/R_0)) * (1 + gamma_lambda * max(0, EMA_k(dT/dt)))
threshold_eff = max(FLOOR, threshold * exp(-delta * EMA_k(dT/dt)))
```

Where:
- `dT/dt` = rate of change of median `threshold_sats`
- `gamma_lambda` = decay rate multiplier (default: 0.1 day^-1)
- `delta = r * gamma_lambda` (compensation ratio)
- `max(0, ...)` in lambda_eff: lambda only increases during consolidation
- `threshold_eff` uses bidirectional `exp()` — no pole singularity

**Coupling constraint:** `r = delta / gamma_lambda` SHOULD be in [1.0, 1.5]. Default `r` = 1.15.

> **Note:** These formulas remain theoretical. Practical deployment requires calibration against observed Lightning consolidation patterns.

Revision History
----------------

| Date | Change | Reviewer |
|------|--------|----------|
| 2026-03-23 | Added structured evidence types with extensibility. | `aec9180edbe1` |
| 2026-03-24 | Added `nip90_result_hash` evidence type. | `aec9180edbe1` |
| 2026-03-23 | Added asymmetric negative attestation weighting (2x). | `aec9180edbe1` |
| 2026-03-23 | Added temporal burst rate-limiting. | `aec9180edbe1` |
| 2026-03-24 | Open namespace system. | `e0e247e9514f` |
| 2026-03-24 | Tier 1.5 DMI peer prediction. | `e0e247e9514f` |
| 2026-03-26 | v5.3: Domain-dependent decay, task-type tags, schema v=2. | -- |
| 2026-03-27 | v5.5-5.7: NIP-A5 interop, commitment classes, costly signaling theory. | `e0e247e9514f`, `refined-element`, `kai` |
| 2026-03-27 | v6.0: Degree-weighted diversity, multi-layer bounds, principled half-lives. | `kai` |
| 2026-03-29 | v7.0: Trust layer tags (NIP-32 L-tags), relay-level filtering. | `glyph` |
| 2026-03-30 | v8.0-8.3: Alpha function, threshold_sats adaptation, attestation decay, consolidation response. | `glyph`, `kai` |
| 2026-03-30 | v9.0-9.1: Corrected alpha formula, seq tag, fraud proofs, Sybil ceiling. | `glyph`, `kai` |
| 2026-03-30 | v10.0: Evidence hierarchy, UTXO binding, L402, path diversity, revocation. | `glyph`, `kai` |
| 2026-03-31 | v10.3: Comprehensive update incorporating 23 design sessions. Fixed spec contradictions (delta=r*gamma_lambda). Restructured into canonical NIP format with Terminology, Trust Layers, Conformance Levels, and Privacy Considerations sections. | `kai` |
