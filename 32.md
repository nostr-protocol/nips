NIP-32
======

Labeling
---------

`draft` `optional` `author:staab` `author:gruruya` `author:s3x-jay`

A label is a `kind 1985` event that is used to label other entities. This supports a number of use cases, from distributed moderation and content recommendations to reviews and ratings.

Label Target
----

The label event MUST include one or more tags representing the object or objects being
labeled: `e`, `p`, `a`, `r`, or `t` tags. This allows for labeling of events, people, relays,
or topics respectively. As with NIP-01, a relay hint SHOULD be included when using `e` and
`p` tags.

Label Tag
----

This NIP introduces a new tag `l` which denotes a label, and a new `L` tag which denotes a label namespace.
A label MUST include a mark matching an `L` tag. `L` tags refer to a tag type within nostr, or a nomenclature
external to nostr defined either formally or by convention. Any string can be a namespace, but publishers SHOULD
ensure they are unambiguous by using a well-defined namespace (such as an ISO standard) or reverse domain name notation.

Namespaces starting with `#` indicate that the label target should be associated with the label's value.
This is a way of attaching standard nostr tags to events, pubkeys, relays, urls, etc.

Some examples:

- `["l", "footstr", "#t"]` - the publisher thinks the given entity should have the `footstr` topic applied.
- `["l", "<pubkey>", "#p"]` - the publisher thinks the given entity is related to `<pubkey>`
- `["l", "IT-MI", "ISO-3166-2"]` - Milano, Italy using ISO 3166-2.
- `["l", "VI-hum", "com.example.ontology"]` - Violence toward a human being as defined by ontology.example.com.

`L` tags containing the label namespaces MUST be included in order to support searching by
namespace rather than by a specific tag. The special `ugc` ("user generated content") namespace
MAY be used when the label content is provided by an end user.

`l` and `L` tags MAY be added to other event kinds to support self-reporting. For events
with a kind other than 1985, labels refer to the event itself.

Label Annotations
-----

A label tag MAY include a 4th positional element detailing extra metadata about the label in question. This string
should be a json-encoded object. Any key MAY be used, but the following are recommended:

- `quality` may have a value of 0 to 1. This allows for an absolute, granular scale that can be represented in any way (5 stars, color scale, etc).
- `confidence` may have a value of 0 to 1. This indicates the certainty which the author has about their rating.
- `context` may be an array of urls (including NIP-21 urls) indicating other context that should be considered when interpreting labels.

Content
-------

Labels should be short, meaningful strings. Longer discussions, such as for a review, or an
explanation of why something was labeled the way it was, should go in the event's `content` field.

Example events
--------------

A suggestion that multiple pubkeys be associated with the `permies` topic.

```json
{
  "kind": 1985,
  "tags": [
    ["L", "#t"],
    ["l", "permies", "#t"],
    ["p", <pubkey1>, <relay_url>],
    ["p", <pubkey2>, <relay_url>]
  ],
  "content": "",
  ...
}
```

A review of a relay.

```json
{
  "kind": 1985,
  "tags": [
    ["L", "com.example.ontology"],
    ["l", "relay/review", "com.example.ontology", "{\"quality\": 0.1}"],
    ["r", <relay_url>]
  ],
  "content": "This relay is full of mean people.",
  ...
}
```

Publishers can self-label by adding `l` tags to their own non-1985 events.

```json
{
  "kind": 1,
  "tags": [
    ["L", "com.example.ontology"],
    ["l", "IL-frd", "com.example.ontology"]
  ],
  "content": "Send me 100 sats and I'll send you 200 back",
  ...
}
```

Other Notes
-----------

When using this NIP to bulk-label many targets at once, events may be deleted and a replacement
may be published. We have opted not to use parameterizable/replaceable events for this due to the
complexity in coming up with a standard `d` tag. In order to avoid ambiguity when querying,
publishers SHOULD limit labeling events to a single namespace.

Before creating a vocabulary, explore how your use case may have already been designed and
imitate that design if possible. Reverse domain name notation is encouraged to avoid
namespace clashes, but for the sake of interoperability all namespaces should be
considered open for public use, and not proprietary. In other words, if there is a
namespace that fits your use case, use it even if it points to someone else's domain name.

Vocabularies MAY choose to fully qualify all labels within a namespace (for example,
`["l", "com.example.vocabulary:my-label"]`. This may be preferred when defining more
formal vocabularies that should not be confused with another namespace when querying
without an `L` tag. For these vocabularies, all labels SHOULD include the namespace
(rather than mixing qualified and unqualified labels).
