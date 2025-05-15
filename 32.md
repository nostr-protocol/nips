NIP-32
======

Labeling
--------

`draft` `optional`

This NIP defines two new indexable tags to label events and a new event kind (`kind:1985`) to attach those labels to existing events. This supports several use cases, including distributed moderation, collection management, license assignment, and content classification.

New Tags:

- `L` denotes a label namespace
- `l` denotes a label

Label Namespace Tag
----

An `L` tag can be any string, but publishers SHOULD ensure they are unambiguous by using a well-defined namespace
(such as an ISO standard) or reverse domain name notation.

`L` tags are RECOMMENDED in order to support searching by namespace rather than by a specific tag. The special `ugc`
("user generated content") namespace MAY be used when the label content is provided by an end user.

`L` tags starting with `#` indicate that the label target should be associated with the label's value.
This is a way of attaching standard nostr tags to events, pubkeys, relays, urls, etc.

Label Tag
----

An `l` tag's value can be any string. If using an `L` tag, `l` tags MUST include a mark matching an `L`
tag value in the same event. If no `L` tag is included, a mark SHOULD still be included. If none is
included, `ugc` is implied.

Label Target
----

The label event MUST include one or more tags representing the object or objects being
labeled: `e`, `p`, `a`, `r`, or `t` tags. This allows for labeling of events, people, relays,
or topics respectively. As with NIP-01, a relay hint SHOULD be included when using `e` and
`p` tags.

Content
-------

Labels should be short, meaningful strings. Longer discussions, such as for an
explanation of why something was labeled the way it was, should go in the event's `content` field.

Self-Reporting
-------

`l` and `L` tags MAY be added to other event kinds to support self-reporting. For events
with a kind other than 1985, labels refer to the event itself.

Example events
--------------

A suggestion that multiple pubkeys be associated with the `permies` topic.

```jsonc
{
  "kind": 1985,
  "tags": [
    ["L", "#t"],
    ["l", "permies", "#t"],
    ["p", <pubkey1>, <relay_url>],
    ["p", <pubkey2>, <relay_url>]
  ],
  // other fields...
}
```

A report flagging violence toward a human being as defined by ontology.example.com.

```jsonc
{
  "kind": 1985,
  "tags": [
    ["L", "com.example.ontology"],
    ["l", "VI-hum", "com.example.ontology"],
    ["p", <pubkey1>, <relay_url>],
    ["p", <pubkey2>, <relay_url>]
  ],
  // other fields...
}
```

A moderation suggestion for a chat event.

```jsonc
{
  "kind": 1985,
  "tags": [
    ["L", "nip28.moderation"],
    ["l", "approve", "nip28.moderation"],
    ["e", <kind40_event_id>, <relay_url>]
  ],
  // other fields...
}
```

Assignment of a license to an event.

```jsonc
{
  "kind": 1985,
  "tags": [
    ["L", "license"],
    ["l", "MIT", "license"],
    ["e", <event_id>, <relay_url>]
  ],
  // other fields...
}
```

Publishers can self-label by adding `l` tags to their own non-1985 events. In this case, the kind 1 event's author
is labeling their note as being related to Milan, Italy using ISO 3166-2.

```jsonc
{
  "kind": 1,
  "tags": [
    ["L", "ISO-3166-2"],
    ["l", "IT-MI", "ISO-3166-2"]
  ],
  "content": "It's beautiful here in Milan!",
  // other fields...
}
```

Author is labeling their note language as English using ISO-639-1.

```jsonc
{
  "kind": 1,
  "tags": [
    ["L", "ISO-639-1"],
    ["l", "en", "ISO-639-1"]
  ],
  "content": "English text",
  // other fields...
}
```

Other Notes
-----------

When using this NIP to bulk-label many targets at once, events may be requested for deletion using [NIP-09](09.md) and a replacement
may be published. We have opted not to use addressable/replaceable events for this due to the
complexity in coming up with a standard `d` tag. In order to avoid ambiguity when querying,
publishers SHOULD limit labeling events to a single namespace.

Before creating a vocabulary, explore how your use case may have already been designed and
imitate that design if possible. Reverse domain name notation is encouraged to avoid
namespace clashes, but for the sake of interoperability all namespaces should be
considered open for public use, and not proprietary. In other words, if there is a
namespace that fits your use case, use it even if it points to someone else's domain name.

Vocabularies MAY choose to fully qualify all labels within a namespace (for example,
`["l", "com.example.vocabulary:my-label"]`). This may be preferred when defining more
formal vocabularies that should not be confused with another namespace when querying
without an `L` tag. For these vocabularies, all labels SHOULD include the namespace
(rather than mixing qualified and unqualified labels).

A good heuristic for whether a use case fits this NIP is whether labels would ever be unique.
For example, many events might be labeled with a particular place, topic, or pubkey, but labels
with specific values like "John Doe" or "3.18743" are not labels, they are values, and should
be handled in some other way.


Appendix: Known Ontologies
--------------------------

Below is a non-exhaustive list of ontologies currently in widespread use.

- [social ontology categories](https://github.com/CLARIAH/awesome-humanities-ontologies)
