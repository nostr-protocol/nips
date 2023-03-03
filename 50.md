NIP-50
======

Search Capability
-----------------

`draft` `optional` `author:brugeman` `author:mikedilger` `author:fiatjaf`

## Abstract

Many Nostr use cases require some form of general search feature, in addition to structured queries by tags or ids. 
Specifics of the search algorithms will differ between event kinds, this NIP only describes a general 
extensible framework for performing such queries.

## `search` filter field 

A new `search` field is introduced for `REQ` messages from clients:
```json
{
  ...
  "search": <string>
}
```
`search` field is a string describing a query in a human-readable form, i.e. "best nostr apps". 
Relays SHOULD interpret the query to the best of their ability and return events that match it. 
Relays SHOULD perform matching against `content` event field, and MAY perform
matching against other fields if that makes sense in the context of a specific kind. 

A query string may contain `key:value` pairs (two words separated by colon), these are extensions, relays SHOULD ignore 
extensions they don't support.

Clients may specify several search filters, i.e. `["REQ", "", { "search": "orange" }, { "kinds": [1, 2], "search": "purple" }]`. Clients may 
include `kinds`, `ids` and other filter field to restrict the search results to particular event kinds.

Clients SHOULD use the supported_nips field to learn if a relay supports `search` filter. Clients MAY send `search` 
filter queries to any relay, if they are prepared to filter out extraneous responses from relays that do not support this NIP.

Clients SHOULD query several relays supporting this NIP to compensate for potentially different 
implementation details between relays.

Clients MAY verify that events returned by a relay match the specified query in a way that suits the
client's use case, and MAY stop querying relays that have low precision.

Relays SHOULD exclude spam from search results by default if they supports some form of spam filtering.

## Extensions

Relay MAY support these extensions:
- `include:spam` - turn off spam filtering, if it was enabled by default
