NIP-??
======

Collaborative Directories
--------------------------

`draft` `optional`

A multi-author addressable directory whose canonical version is resolved per reader through a Web of Trust. Two new addressable kinds (`kind:30891` for namespace definitions, `kind:30890` for entries) and one new indexed tag (`n`). [NIP-54](54.md) is the closest neighbour but specifies no resolution algorithm.

---

## How It Works

1. **Alice publishes a namespace** (`kind:30891`) with a list of expert pubkeys and two depth caps: `experts:M` (how far her expert chain counts) and `follows:N` (how far her kind-3 follow graph counts), with `follows ≤ experts`.
2. **Anyone publishes entries** (`kind:30890`) under that namespace, with `d` of `<n>/<subject>`. Authors within the trust radius are **contributors**; the rest are proposals.
3. **In-group is equal: newest `created_at` wins** among contributors per subject (tiebreak lowest `id`). The owner contributes on the same terms — her power is rule-setting, not editorial priority.
4. **Any contributor may tighten further** by adding `["experts", k]` or `["follows", k]` (offsets from their own hop) to their entry; the shallowest hop with a rule wins.
5. **Any contributor may publish their own `kind:30891`** for the same slug. Its expert list extends the chain at the next hop; its depth caps apply only when a reader chooses _them_ as the active owner.

For the precise algorithm see [Resolution](#resolution).

---

## Trust Model

### Graphs

- **Experts graph.** Hop 0 is the owner. Hop k+1 is the named experts (`p` tags) listed in each hop-k author's own `kind:30891` for this slug. Authors without their own `kind:30891` contribute nothing past their hop in this graph.
- **Follow graph.** Hop 0 is the owner. Hop k+1 is each hop-k author's kind-3 follows — **unless** that author has published a `kind:30891` for this slug, in which case their `p` tags substitute at that hop only.

`follows ≤ experts`; clients MUST clamp violators. Omitted `follows` defaults to `0`. An author is a **contributor** if their hop distance is ≤ the active depth in either graph.

Only the active `kind:30891` controls the depth parameters. The `experts:N` / `follows:N` on any non-active `kind:30891` discovered during traversal are **ignored**; only their `p` tags matter.

### Per-entry tightening

Any contributor MAY add `["experts", k]` or `["follows", k]` to their `kind:30890`, where `k ≥ 0` is an **offset from the author's hop in that graph**. The effective depth becomes `min(k + hop, namespace_default)`. The shallowest hop with a rule wins; deeper rules are masked. Negative or non-numeric values are ignored.

The `experts` and `follows` tags carry the same shape on both kinds — a depth from a chosen root. On `kind:30891` the root is the namespace owner (the reader picks them). On `kind:30890` the root is the entry's author (the author cannot pick themselves into hop 0, so their offset is added to their own hop).

### Resolution

```
# Active depth per graph: walk levels from 0; the shallowest level whose
# winning entry carries a non-negative-integer tightening tag sets the depth.

function activeDepth(graph G, default D):
  for L from 0 to D:
    winner = latest_30890_among({a : hop(a, G) == L})   # tiebreak min(event_id)
    if winner exists and winner has ["G", k] with k a non-negative integer:
      return min(k + L, D)
  return D

active_experts = activeDepth(experts_graph, ns.experts)
active_follows = activeDepth(follows_graph, ns.follows)

contributors = { a : hop(a, experts_graph) <= active_experts
                  or hop(a, follows_graph) <= active_follows }

candidates = { latest_30890(a) for a in contributors }
canonical  = argmax(e.created_at, tiebreak: min(e.id)) over candidates
# entries from non-contributors are proposals
```

If no contributor has published, the newest event by any author MAY be shown with a clear "outside trust" indicator.

### Fallback

If the active `kind:30891` cannot be fetched or has been deleted via [NIP-09](09.md), the client SHOULD fall back to the owner pubkey embedded in the `naddr` (or app config) with `experts:0, follows:0`, and allow the user to opt into a wider radius.

---

## Event Format

### `kind:30891` — Namespace Definition

```jsonc
{
  "kind": 30891,
  "tags": [
    ["d", "nips"],
    ["name", "Nostr Implementation Possibilities"],
    ["description", "Index of NIP proposals."],
    ["experts", "2"],
    ["follows", "0"],
    ["p", "<vitor>", "wss://..."],
    ["p", "<fiatjaf>", "wss://..."]
  ],
  "content": "<Djot description>"
}
```

### `kind:30890` — Directory Entry

```jsonc
{
  "kind": 30890,
  "tags": [
    ["d", "nips/nip-01"],
    ["n", "nips"],
    ["title", "NIP-01: Basic protocol flow"],
    ["web", "https://github.com/nostr-protocol/nips/blob/master/01.md"],
    ["t", "core"]
  ],
  "content": "<Djot text>"
}
```

- Both kinds are addressable per [NIP-01](01.md) (range 30000–39999). Each author's latest `created_at` for `(kind, pubkey, d)` is the active version.
- `d` on entries is `<n>/<subject>`. A `/` is required; the namespace is everything before the first `/`, the subject everything after (the subject is opaque and MAY contain further `/`).
- `n` is the namespace slug. Exactly one per entry. MUST equal the `d` prefix up to the first `/`.

Unknown tags are ignored; namespaces MAY define their own conventions.

---

## The `n` Tag

`n` is a new single-letter indexed tag carrying the namespace slug, enabling `{"kinds":[30890],"#n":["nips"]}` filters.

---

## Deletion and Tombstoning

[NIP-09](09.md) deletion requests apply. To suppress one's own contribution while leaving other authors' versions visible, publish a `kind:30890` with the same `(d, n)`, empty `content`, and a `["deleted", "<optional reason>"]` tag; clients SHOULD hide such entries.

---

## Relay Queries

```jsonc
{"kinds":[30890], "#n":["nips"]}                          // all entries in a namespace
{"kinds":[30890], "#n":["nips"], "#d":["nips/nip-01"]}    // one subject across all authors
{"kinds":[30891], "#d":["nips"]}                          // namespace definitions
```

---

## Security Considerations

- **Timestamp manipulation.** `created_at` is the sole tiebreaker among contributors. Clients SHOULD reject events more than 60 seconds in the future, and MAY surface competing recent versions rather than picking silently.
- **Follow-graph capture.** Sensitive namespaces SHOULD set `follows:0` and rely on explicit experts.
- **Excluding a pubkey isn't free.** Tightening `experts` doesn't exclude a target reachable via `follows`; tighten both, or layer a separate blacklist (e.g. [NIP-51](51.md) mute lists).
- **Different owners, same slug.** Two owners may both publish `kind:30891` with the same `d`. The owner pubkey is part of the directory's identity; clients MUST display it.
- **Addressable events erase history.** Only the latest `(kind, pubkey, d)` is retained by typical relays. Archival relays are RECOMMENDED where provenance matters.

---

## Rationale

**A new kind, not an extension of NIP-54.** Wiki articles live in an unscoped global slug space without parameterised resolution. Namespaced slugs, reader-personalised canonical resolution, and per-entry tightening would distort wiki semantics if shoehorned on.

**Namespaced `d` tags.** NIP-01 addressable events are keyed by `(kind, pubkey, d)`. Prefixing `d` with the namespace ensures globally unique addressable IDs and avoids collision with unscoped wiki articles.

**Two depth parameters with `follows ≤ experts`.** The follow graph is cheap and broad, the expert graph curated and narrow. Letting the follow graph reach deeper than the curated path would invert the quality signal.
