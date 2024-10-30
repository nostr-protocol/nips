NIP-fe
======

Custom Feeds
------------

`draft` `optional`

This NIP introduces a new data structure representing custom nostr feeds. These are to be
used in the context of an user's session to fetch a list of matching events.

# Data Format

Custom feeds are represented using lists of lists. The first parameter of every list is a `type`,
which determines the content of subsequent arguments to the feed.

## Address

A `address` feed includes one or more addresses of events to fetch.

```json
[
  "address",
  "30023:d97a7541e4603d393c61eaad810c2e2e72684fb5672bde962c75c023d70e763f:98127054",
  "30023:d97a7541e4603d393c61eaad810c2e2e72684fb5672bde962c75c023d70e763f:12877394"
]
```

## Author

A `author` feed includes one or more pubkeys to use in an `authors` filter.

```json
["author", "d97a7541e4603d393c61eaad810c2e2e72684fb5672bde962c75c023d70e763f"]
```

## Created At

A `created_at` feed includes one or more objects describing date ranges for events to fetch.
These MAY include values `since`, `until`, and `relative`, which may be a list containing
`since` and `until` as strings.

If included in the `relative` list, `since` and `until` values MUST be interpreted as
`seconds before now`. Negative numbers MUST be interpreted as `seconds after now`.

```json
["created_at", {"since": 1715293673, "until": 86400, "relative": ["until"]}]
```

## DVM

A `dvm` feed includes one or more objects describing a DVM request. Each object MUST
have a request `kind`, and MAY have a list of request `tags`, `relays` to send the
request to, and a list of `mappings` mapping response tags to feeds. If omitted,
applications SHOULD provide a reasonable set of default `mappings`.

```json
[
  "dvm",
  {
    "kind": 5300,
    "tags": [["i", "philosophy", "text"]],
    "mappings": [["e", ["tag", "#e"]]]
  }
]
```

## ID

A `id` feed includes one or more ids of events to fetch.

```json
["id", "b1ee83587c4ebab697719fd5bad22319741134e49933b0528b8cca426cafd59e"]
```

## Kind

A `kind` feed includes one or more kinds of events to fetch.

```json
["kind", 1, 30023]
```

## List

A `list` feed includes one or more objects defining one or more `addresses` and optional
`mappings` for how to translate list tags into feeds. If omitted, applications SHOULD
provide a reasonable set of default `mappings`.

```json
[
  "list",
  {
    "addresses": ["3:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"],
    "mappings": [["p", ["authors"]]]
  }
]
```

## Label

A `label` feed includes one or more objects defining filters for fetching `kind 1985 label` events
and optional `mappings` for how to translate label tags into feeds. If omitted, applications SHOULD
provide a reasonable set of default `mappings`.

Label items may have the following keys:

- `mappings` - a list of lists mapping tag names to filter keys
- `authors` - a list of authors
- `relays` - a list of relays to request events from
- Any single-letter tag filter (beginning with `#`)

```json
[
  "label",
  {
    "#l": ["#p"],
    "#L": ["pub.ditto.trends"],
    "authors": ["db0e60d10b9555a39050c258d460c5c461f6d18f467aa9f62de1a728b8a891a4"],
    "mappings": [["p", ["authors"]]]
  }
]
```

## WOT

A `wot` feed includes one or more objects with optional `min` and `max` properties. These
MUST be between 0 and 1 (inclusive) so that the interpeting application can scale the filter
to their own web of trust's score range. If empty, `min` MUST be interpreted as `0`, and
`max` as `1`.

```json
["wot", {"min": 0.3}]
```

## Relay

A `relay` feed includes one or more relay urls to request notes from. These can be composed
with other feeds using `intersection` to limit those feeds to the given relays.

```json
["relay", "wss://relay.example.com", "wss://relay.example.org"]
```

## Scope

A `scope` feed includes one or more strings representing groups of people relative to the
current user. Valid strings are:

- `followers` - Pubkeys who follow the current user
- `follows` - Pubkeys the current user follows
- `network` - Pubkeys followed by pubkeys the current user follows
- `self` - The current user's pubkey

```json
["scope", "follows", "self"]
```

## Search

A `search` feed includes one or more search terms. These should be acceptable based on NIP-50,
but can be interpreted as the application sees fit.

```json
["search", "tomato"]
```

## Tag

A `tag` feed includes a tag key and one or more values. These should be interpreted the same
as standard tag filters.

```json
["tag", "#t", "asknostr"]
```

## Union

A `union` feed includes zero or more feeds. An event may match any feed to match the parent feed.

Example:

```json
[
  "union",
  ["scope", "followers"],
  ["tag", "#t", "asknostr"]
]
```

## Intersection

An `intersection` feed includes zero or more feeds. An event must match all given feeds to
match the parent feed.

Example:

```json
[
  "intersection",
  ["wot", {"max": 0.2}],
  ["tag", "#t", "introductions"]
]
```

## Difference

A `difference` feed MAY include a base feed to fetch, and zero or more feeds used to exclude
events from the base feed.

Example:

```json
[
  "difference",
  [
    "list",
    {
      "addresses": [
        "10001:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"
      ]
    }
  ],
  ["wot", {"max": 0.1}]
]
```

# Implementation notes

If a `union`, `difference`, `intersection`, or `symmetric_difference` feed has no entries, it should
be treated as an empty feed. Likewise with other feed types that have no arguments; for example
`["authors"]` should be interprete the same way as a `{"authors": []}` filter.

# Feed Event

A `kind:31890` event defines a feed in an addressable way. The `content` SHOULD be a human-
readable description of the feed. The following tags SHOULD be included:

- A `d` tag
- A `title` tag indicating the feed's name
- A `feed` tag whose value is a JSON-encoded feed
