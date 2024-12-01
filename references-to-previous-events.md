NIP-xx
======

References to previous events
-----------------------------

`draft` `optional` `author:milahu`

Events can contain references to previous events.

Implementation
--------------

Each reference to a previous events consists of

- the distance between this event and the previous event, as an integer number, greater-or-equal than 1
   - TODO: maybe allow float numbers for the event distance, to insert events between integer distances, to avoid collision of integer distances
- the ID of the previous event
- optional: relay URL

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
  "e_prev": [
    [<previous event distance>, <previous event ID>],
    [<previous event distance>, <previous event ID>],
    [<previous event distance>, <previous event ID>, <previous event relay URL>],
    ...
  ]
}
```

Soft chain of events
--------------------

This is useful to build a "soft chain" of events, so the recipient can detect missing events.
This chain is "soft", because it tolerates missing events.
A "hard" chain would store only the first previous event, and if that event is missing, the chain is broken.

Events can go missing because of

- cultural reasons (moderation)
- political reasons (censorship)
- technical reasons (data loss)

Political censorship can use the method of "shadow banning", also known as "selective scamming" in other contexts.
In that case, most events are **not** censored to create the illusion of "free speech", and only some events are censored.
To detect this form of censorship, we need a steady chain of events.

Cultural censorship (moderation) may remove "legal but annoying" content (for example: NSFW content), so we want to tolerate some missing events.
When broadcasting "politically incorrect" content, authors should avoid such events in their chain of events, to make verification easier.

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
We only know the distance `2` relative to `E0`, but not the event ID of `E2`.
Usually we would use the previous-event-reference with distance `1` relative to `E1`, but we dont have `E1`.

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

Inconsistencies
---------------

There is no guarantee that the merging of multiple previous-events-lists produces a consistent chain of events.
Eventual inconsistencies can be resolved by sorting events by time or event ID.
(Multiple diverging chains can be merged by sorting events by time or event ID.)

Such inconsistencies allow modification of the chain (insertion or deletion of previous events), so the chain is mutable.

Visualization
-------------

Clients should visualize:

- the reference to the first previous event
- missing previous events

If there are many missing previous events, these can be collapsed to a "N missing events" block.

TODO: rename key
----------------

```json
{
  ...,
  "e_prev": [
    ...
  ]
}
```

Rename the key to ...

- previous_events
- e_prev
- prevs
- history
- soft_chain
- chain

Related
-------

* Pinned posts: Services like Twitter allow users to "pin" posts to the top of their feed.
  In nostr, this could be implemented with references to previous events.

Keywords
--------

- blockchain
- censorship-resistance
- fault-tolerance
- tamper-proof
- append-only
- verification
- data integrity
