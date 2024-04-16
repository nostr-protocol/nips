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

## Filter

A `filter` feed includes one or more `dynamic filter` objects. These are normal `filter` objects
with the following additional fields:

- `scopes` - a list of scopes to be translated by an application to a filter's `authors` field. May be one of:
  - `followers` - pubkeys who follow the current user
  - `follows` - pubkeys the current user follows
  - `global` - no selection
  - `network` - pubkeys who the current user does not follow, but which are followed by pubkeys the current user follows.
  - `self` - the user's own pubkey
- `min_wot` - a number between 0 and 1 corresponding to pubkeys with a web of trust score greater than `min_wot`% of known pubkeys.
- `max_wot` - a number between 0 and 1 corresponding to pubkeys with a web of trust score less than `min_wot`% of known pubkeys.
- `until_ago` - a number of seconds to subtract from the current time to be used in an `until` filter.
- `since_ago` - a number of seconds to subtract from the current time to be used in a `since` filter.

Example:

```json
["filter", {"kinds": [1], "scopes": "follows"}, {"kinds": [1], "min_wot": 0.5}]
```

## List

A `list` feed includes one or more list addresses. These lists should be fetched and parsed
to build a standard nostr filter. `p` tags from the target lists become `authors`, `e` tags
become `ids`, and `t` tags become `#t` entries. `a` tags should be used to inform the `authors`,
`kinds`, and `#d` fields.

```json
["list", "10001:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"]
```

## List of Lists

A `lol` feed includes one or more list addresses. These lists should be fetched, and each `a`
entry should in turn be fetched and parsed to build a standard nostr filter as described in the
`list` type above.

Example:

```json
["lol", "30085:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:12983740"]
```

## DVM

A `dvm` feed includes one or more DVM request objects. Each request MUST have a `kind`, and
MAY include an `input` and `pubkey`. Tags returned by the DVM should be used as described for
[#List](lists).

Example:

```json
[
  "dvm",
  {
    "kind": 5300,
    "pubkey": "e64323c026f751c6851cb00c902646ef5f81464d272c62f36569e5d489b749e9"
  }
]
```

## Relay

A `relay` feed includes a list of normalized relay urls, and one or more other feeds. These
feeds should be handled recursively as described above, but the application should only fetch
events from the specified relays.

Example:

```json
[
  "relay",
  ["wss://relay.example.com/", "wss://relay2.example.com/"],
  ["list", "10001:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"],
  ["list", "10001:b97111618cef001d2a74cf5f7f62fcdaa51167691a6b338f2aa6a5f4bc847180:"]
]
```

## Union

A `union` feed includes two or more other feeds to combine using logical OR.

Example:

```json
[
  "union",
  ["list", "10001:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"],
  ["filter", {"#t": ["nostr"], "since_ago": 86400}]
]
```

## Intersection

An `intersection` feed includes two or more feeds. An event must match all given feeds to
match the parent feed.

Example:

```json
[
  "intersection",
  ["list", "10001:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"],
  ["lol", "30084:039f4899c97734bb1503ce437784ac2131d552e1ef909e8f9775df7c843d0df8:983243"],
]
```

## Difference

A `difference` feed includes a base feed to fetch, and one or more feeds used to exclude
events from the base feed.

Example:

```json
[
  "difference",
  ["list", "10001:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"],
  ["filter", {"max_wot": 0.1}],
]
```

## Symmetric Difference

A `symdiff` feed includes two or more feeds. An event must match only one feed to match
the parent feed.

Example:

```json
[
  "symdiff",
  ["list", "10001:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"],
  ["list", "10003:4d7600c1da0b69185fcbcb6b86cbaa010c9ea137fa83a3f4be4c713e1f217dad:"],
]
```

# Feed Tag

Any event MAY use a `feed` tag with a JSON-encoded feed as the value.

# Feed Event

A `kind:31890` event defined a feed in an addressable way. The `content` MUST be a JSON-encoded
feed.
