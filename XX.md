NIP-XX
======

Event Enrichment
----------------

`draft` `optional`

This NIP defines an addressable event for publishing objective enrichment of an existing Nostr event. Enrichment includes topics, moods, languages, a summary, an overall confidence score, and optional media summaries and model information.

Clients can use enrichments to classify feeds by topic and mood, filter or discover content by language, and display summaries of events and their media. They can reuse results from trusted publishers instead of evaluating every source event locally.

Enrichment can be produced by a model, a service, or a person, including the source event's author.

Clients can derive personal signals from Nostr interactions or manual user selections, then use those signals with fetched or locally generated enrichments to score new events and present the most relevant content. Filtering, ranking, moderation, payment, and trust selection remain client policy. See [D2: Personal Interest Signals](#d2-personal-interest-signals).

## Rationale

Content classification and summarization can require substantial local compute, remote model access, bandwidth, and time. Many clients may independently generate similar descriptions of the same immutable Nostr event.

Publishing signed enrichment events allows that work to be shared without requiring a central classification provider. Users can publish their own results, obtain results from their Web of Trust, explicitly select trusted publishers, or retrieve results from specialized relays.

Enrichment describes the source content rather than the publisher's personal interests, filtering preferences, ranking signals, or decision to hide the source event. These subjective decisions remain local so that different clients can reuse the same enrichment.

## Event

Event Enrichment uses addressable kind `31562`. Its `d` tag is the source event ID, giving each publisher one current enrichment per source event.

The event `content` MUST be empty. All enrichment data is stored in tags.

### Tags

| Tag | Required | Indexed | Meaning |
| --- | --- | --- | --- |
| `d` | yes | yes | Source event ID and addressable-event identifier |
| `e` | yes | yes | Source event reference with optional relay and author hints |
| `t` | yes, repeatable | yes | Free-form topic in the primary source language |
| `m` | yes, repeatable | yes | Free-form mood in the primary source language |
| `l` | yes, repeatable | yes | Lowercase ISO 639-1 source language, or `und` |
| `summary` | yes | no | Overall summary in the primary source language |
| `confidence` | yes | no | Overall confidence from `0` through `1` |
| `model` | no | no | Model identifier declared by the publisher |
| `media` | no, repeatable | no | Exact media URL and optional media summary |
| `taxonomy` | no | no | Optional taxonomy identifier |

### Source Reference

An enrichment MUST contain exactly one `d` tag and one `e` tag with the same 32-byte lowercase hexadecimal source event ID:

```json
["d", "<source-event-id>"]
["e", "<source-event-id>", "<relay-hint>", "<source-author-pubkey>"]
```

The relay hint and source author pubkey are optional and follow [NIP-01](01.md).

### Topics and Moods

An enrichment MUST contain at least one topic and one mood. Both are free-form; this NIP defines no universal vocabulary.

Values SHOULD be concise and consistently normalized because relay filters use exact string equality. Publishers SHOULD include useful broad and component labels alongside compound labels that preserve their specific relationship:

```json
["t", "cooking"]
["t", "festival"]
["t", "food"]
["t", "food-festival"]
["m", "inviting"]
["m", "enthusiastic"]
```

Publishing `food`, `festival`, and `food-festival` supports both broad and specific matching. A client can match either component independently, increase the relevance score when several topics or moods match together, and assign additional weight to an exact compound-label match. Keeping `food-festival` preserves the relationship that would be lost if only its components were published. This NIP does not prescribe a scoring algorithm.

Labels MUST use the source event's primary language.

### Language

Each `l` tag contains a lowercase ISO 639-1 language code. Region and script subtags such as `en-US` and `zh-Hant` MUST NOT be used. The special value `und` MAY be used when no language can be determined.

For multilingual events, publishers SHOULD repeat `l` for every substantially present language. The first `l` MUST be the primary language. Labels and summaries MUST use that primary language.

### Summary, Model, and Confidence

The `summary` tag contains one concise summary of the source event:

```yaml
["summary", "The author announces a neighborhood cooking workshop and food festival."]
```

Generic relays are not required to search this tag. Specialized indexers MAY use these shorter summaries as input to a lightweight full-text index instead of indexing complete source events.

If a model produced the enrichment, its identifier SHOULD be included:

```yaml
["model", "example-provider/example-model-v1"]
```

Human or otherwise user-controlled enrichment MAY omit `model`. Model names are publisher-declared and are not standardized or independently verified.

The `confidence` tag is the publisher's overall confidence in the enrichment:

```yaml
["confidence", "0.91"]
```

It MUST represent a finite number from `0` through `1`. [NIP-01](01.md) requires tag elements to be strings, so clients parse this decimal string as a number. Confidence is not assumed to be comparable across publishers.

### Media

Each media item is identified by the exact URL found in or referenced by the source event:

```yaml
["media", "https://example.com/workshop.jpg", "A group learning to prepare fresh pasta around a kitchen table."]
```

If the publisher identifies media but does not summarize it, the URL is still included:

```yaml
["media", "https://example.com/workshop.mp4"]
```

The absence of a summary does not distinguish skipped, unsupported, failed, or unevaluated media. Clients decide whether to evaluate it locally or notify the user. Media tags are not expected to be indexed, and URL equivalence or canonicalization is outside this NIP.

### Optional Taxonomy

A publisher MAY identify a taxonomy:

```yaml
["taxonomy", "com.example.taxonomy-v1"]
```

Its format and publication mechanism are not specified. Clients MUST accept otherwise valid free-form enrichment without this tag.

## Example

```yaml
{
  "id": "<enrichment-event-id>",
  "pubkey": "<enrichment-publisher-pubkey>",
  "created_at": 1789444800,
  "kind": 31562,
  "tags": [
    ["d", "<source-event-id>"],
    ["e", "<source-event-id>", "wss://relay.example.com", "<source-author-pubkey>"],
    ["t", "cooking"],
    ["t", "festival"],
    ["t", "food-festival"],
    ["t", "pasta-making"],
    ["m", "inviting"],
    ["m", "enthusiastic"],
    ["l", "en"],
    ["summary", "The author announces a neighborhood cooking workshop and food festival."],
    ["confidence", "0.91"],
    ["model", "example-provider/example-model-v1"],
    ["media", "https://cdn.example.com/workshop.jpg", "A group learning to prepare fresh pasta around a kitchen table."],
    ["media", "https://cdn.example.com/workshop.mp4"]
  ],
  "content": "",
  "sig": "<enrichment-publisher-signature>"
}
```

## Publishing

A publisher validates and objectively evaluates the source, includes all detected media URLs, signs the kind `31562` event, and publishes it to selected relays. Individuals MAY use their normal identity key so existing social trust applies. Services MAY use dedicated keys.

Publishers SHOULD publish enrichments to their own [NIP-65](65.md) write relays. To support bootstrap discovery, they SHOULD also publish to relays associated with the source event, including the source author's NIP-65 write relays when known and practical. Relays may reject third-party events, so clients cannot assume that every source relay stores enrichments.

## Querying and Discovery

Clients can fetch enrichments for known source events:

```json
{
  "kinds": [31562],
  "authors": ["<trusted-publisher-pubkey>"],
  "#d": ["<source-event-id>"]
}
```

They can discover source events through enrichment fields:

```json
{
  "kinds": [31562],
  "authors": ["<trusted-publisher-pubkey>"],
  "#t": ["cooking"],
  "#l": ["en"]
}
```

The same pattern applies to `#m`. Clients collect matching `d` or `e` values and fetch the original events by ID.

Clients do not need to query every Web of Trust member on every request. They may query candidate authors in bounded batches, periodically check which candidates publish kind `31562`, and cache an active enrichment-publisher set. This remains a discovery heuristic rather than a trust guarantee.

A client without configured enrichment publishers may query relays associated with source events for matching kind `31562` events. After discovering suitable publishers there, it can resolve those publishers' NIP-65 write relays and use them for subsequent queries.

Publisher and relay candidates may come from:

- Explicit local configuration.
- A configurable-depth social Web of Trust.
- [NIP-51](51.md) kind `30000` follow sets containing publisher `p` tags.
- NIP-51 kind `30002` relay sets containing relay URLs.
- Specialized or access-controlled relays.

A relay transports enrichment; it does not endorse its publisher. Paid relays can restrict retrieval but cannot prevent copying after delivery. Payments, subscriptions, marketplaces, and redistribution policy are outside this NIP.

## Client Policy

Several publishers may enrich the same source event. A client may select one, keep them separate, compare them, or merge their labels. When merging, clients SHOULD preserve provenance where practical and MUST NOT imply that the combined result was signed by one publisher.

Clients also decide whether an enrichment is trusted enough to replace local evaluation, how labels match local interests, how missing media is handled, and how results affect filtering, ranking, grouping, or presentation.

## Opt-Out

A source event MAY request that third parties not enrich it:

```yaml
["enrichment", "deny"]
```

An author's latest kind `0` event MAY use the same tag to request that third parties not enrich any of that author's events. The event-level signal applies only to that event. These requests do not prevent the author from enriching their own content.

Publishers SHOULD honor either signal. Clients SHOULD ignore third-party enrichments for opted-out content. Because public events can be copied and analyzed, this is an advisory consent signal, not technical access control. See [Q2: Opt-Out Mechanism](#q2-opt-out-mechanism).

## Relation to Other NIPs

[NIP-32](32.md) kind `1985` handles short labels but does not naturally represent the complete summary, confidence, model, and per-media record defined here. It also recommends limiting a labeling event to one namespace.

NIP-51 follow and relay sets can support publisher and relay discovery. This NIP defines no new list kind.

[NIP-85](85.md) kind `30383` is the closest alternative: it uses the source event ID as `d`, publishes computed tags, defines trusted-provider selection, and permits paid relays. This draft uses a separate kind because enrichment is a cohesive content-description record rather than event statistics, and separation avoids replacement collisions with other assertions. Reviewers should still consider whether these tags belong in an extension to NIP-85 instead. See [Q1: NIP-85 Compatibility](#q1-nip-85-compatibility).

## Security and Privacy

A valid signature proves who published enrichment, not that it is accurate, objective, complete, or model-generated. Clients SHOULD validate signatures, source references, tag shapes, ISO 639-1 values, confidence bounds, and local size limits. They SHOULD use publisher trust policies and MAY compare results with the source or other publishers.

Enrichment can make sensitive attributes easier to discover. Publishers should consider privacy and the opt-out signals before labeling people, locations, media, or inferred traits. See [Q2: Opt-Out Mechanism](#q2-opt-out-mechanism).

## Open Questions and Deferred Work

### Q1: NIP-85 Compatibility

A dedicated kind versus extending NIP-85 remains open for community feedback.

### Q2: Opt-Out Mechanism

The exact event-level and kind `0` opt-out mechanism needs community review.

### D1: Resource Limits

Maximum tag counts and lengths remain implementation-defined for now.

### D2: Personal Interest Signals

A companion personal-interest signal format is deferred. Signals may be derived by scoring a user's reactions, zaps, replies, reposts, and quotes against the corresponding enrichments, or created through manual and private signal-only client actions.

A user's signal database may remain local. A future specification should also consider encrypted relay storage for private cross-client synchronization and expansion without exposing interests, event associations, or labels in plaintext tags.

### D3: Taxonomies and Services

Taxonomy publication, service-key linkage, generator or prompt metadata, payment, service discovery, and marketplaces are deferred.

### D4: Summary Search

Full-text summary search is not standardized; specialized indexers may offer it.

### D5: Rich Media Enrichment

OCR, transcripts, timestamped video segments, and reasons for missing media summaries are deferred.

### D6: Client Policies

Conflict resolution, merging, and partial-enrichment behavior remain client policy.
