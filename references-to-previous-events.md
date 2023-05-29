NIP-xx
======

References to previous events
-----------------------------

`draft` `optional` `author:milahu`

Events contain references to previous events.

<!-- "can"? Events CAN contain references to previous events. -->

Implementation
--------------

Each reference to a previous events consists of

- the distance between this event and the previous event, as an integer number, greater-or-equal than 1
- the ID of the previous event

The choice of distances is arbitrary.
Some choices:

- exponentially increasing distances, for example: 1, 10, 100, 1000, 10000, ...
- linearly increasing distances, for example: 1, 10, 20, 30, 40, 50, ...
- random distances, for example: 1, 15, 32, 58, 93, 139, 185, ...

```json
{
  "id": ...,
  "kind": ...,
  ...,
  ...,
  "chain": [
    <previous event distance>, <previous event ID>,
    <previous event distance>, <previous event ID>,
    ...
  ]
}
```

Soft chain of events
--------------------

This is useful to build a "soft chain" of events, so the recipient can detect missing events.

Events can go missing because of

- political reasons (censorship)
- technical reasons (data loss)

Redundancy
----------

Each event can contain multiple references to previous events.

The next-previous event (distance 1) SHOULD always be referenced.

The number of referenced previous events is arbitrary.
It can be as low as one previous event, or as high as all previous events.

This gives a tolerance for missing events:
When a previous event is missing, the recipient can seek back to another previous event.

Forward search for missing events
---------------------------------

When an event is missing, and cannot be found on any other relay, the recipient will want to "seek forward" from another previous event.

Example:
The last received event `E0` contains references to previous events `[E1, E3, E7]` with the distances `[1, 3, 7]`.
`E1` is missing (cannot be found on any relay).
`E3` is found and received.

Problem:
How can we find `E2`?
Usually we would use the previous-event-reference with distance 1 of `E1`, but we dont have `E1`.

Solution:
We ask relays for events with references to `E3` or `E7` (or any other previous event in this chain).
So relays SHOULD implement a "lookup of events by reference-to-previous-events".

Limitations
-----------

Missing events can be detected only for past events, relative to a received event.

Adoption
--------

Events created before the adoption of this NIP can be referenced in future events.
To improve space-efficiency, it can make sense to distribute these back-references across multiple events ("sparse chains", "fragmented chains").

TODO: rename "chain"
--------------------

```json
{
  ...,
  "chain": [
    ...
  ]
}
```

Rename the key "chain" to ...

- previous_events
- prevs
- history
- soft_chain

Keywords
--------

- blockchain
- censorship-resistance
- tamper-proof
- append-only
