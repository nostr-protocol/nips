NIP-32
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

## CreatedAt

A `created_at` feed includes one or more objects describing date ranges for events to fetch.
These MAY include values `since`, `until`, and `relative`, which may be a list containing
`since` and `until` as strings.

If included in the `relative` list, `since` and `until` values MUST be interpreted as
`seconds before now`. Negative numbers MUST be interpreted as `seconds after now`.

```json
["created_at", {"since": 1715293673, "until": 86400, "relative": ["since"]}]
```

## DVM

A `dvm` feed includes one or more objects describing a DVM request. Each object MUST
have a request `kind`, and MAY have a list of request `tags`, `relays` to send the
request to, and a list of `mappings` mapping response tags to feeds. If omitted,
applications SHOULD provide a resonable set of default `mappings`.

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

A `id` feed

## Kind

A `kind` feed

## List

A `dvm` feed includes one or more objects defining one or more `addresses` and a set of
`mappings` for how to translate list tags into feeds. If omitted,
applications SHOULD provide a resonable set of default `mappings`.

```json
[
  "list",
  {
    "addresses": ["3:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"],
    "mappings": [["p", ["authors"]]]
  }
]
```

## WOT

A `wot` feed includes one or more objects with optional `min` and `max` properties. These
MUST be between 0 and 1 (inclusive) so that the interpeting application can scale the filter
to their own web of trust's score range. If empty, `min` MUST be interpreted as `0`, and
`max` as 1.

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

A `union` feed includes two or more feeds. An event may match any feed to match the parent feed.

Example:

```json
[
  "union",
  ["scope", "followers"],
  ["tag", "#t", "asknostr"]
]
```

## Intersection

An `intersection` feed includes two or more feeds. An event must match all given feeds to
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

A `difference` feed includes a base feed to fetch, and one or more feeds used to exclude
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

## Symmetric Difference

A `symmetric_difference` feed includes two or more feeds. An event must match only one feed to match
the parent feed.

Example:

```json
[
  "symdiff",
  [
    "list",
    {
      "addresses": [
        "10001:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"
      ]
    }
  ],
  [
    "list",
    {
      "addresses": [
        "10001:3375d9fe514d19bca737ba1ca2e7a43e19884385f0275a17999e05500bc177c6:"
      ]
    }
  ]
]
```

# Feed Tag

Any event MAY use a `feed` tag with a JSON-encoded feed as the value.

# Feed Event

A `kind:31890` event defines a feed in an addressable way. The `content` SHOULD be a human-
readable description of the feed. The following tags SHOULD be included:

- A `d` tag
- A `name` tag indicating the feed's name
- A `feed` tag whose value is a JSON-encoded feed
