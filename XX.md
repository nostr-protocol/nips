NIP-XX
======

Progress Event
-------

This NIP describes how `progress` objects may be defined. Progress objects may be used when tracking user progress toward some specific measurable objective (e.g. reading books, fitness challenges, guided learning).

Progress events' `d` tag is used to uniquely identify the object in progress and MAY take the form of a [NIP 73](./73.md) id. The `k` tag MAY be added as an optional pointer to allow clients to identify that an external identify exists for the given object and it has been used in the dervation of the `d` tag.

In all cases, the `content` field SHOULD include a human-readable text but remains optional.

# Progress Tags

Tags MUST include `current`, `max` and `unit` as the numerator, denominator and unit of measurement, respectively. 
Tags MAY also contain additional `started` and `ended` tags which take an integr unix timestamp in sections.

# Example

The below example uses the Sha256 hash of a book ISBN number (in this case, 9780141030586) and includes the `k` tag as a point to this external identifier. The progress information for the book has been given including a `started` tag with the start date/time, but `ended` has been omitted.

```json
{
  "kind": 30250,
  "content": "",
  "tags": [
    ["d", "648370d3279993b70d7f75625d765e08ddcbb4db5262ebd2e9db0d666c0b841"],
    ["k", "ibsn"]
    ["current", "250"],
    ["max", "364"],
    ["unit", "pages"],
    ["started", "1742731200"]
  ],
}
```