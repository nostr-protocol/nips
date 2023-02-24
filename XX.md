NIP-XX
======

Proof of Freshness
------------------

`draft` `optional` `author:shafemtol`

Proof of freshness proves that the id of an event, and thus its signature and
associated proof of work, was generated after some specific point in time.

The proof of freshness is provided in an `f` tag, with the tag value being the
hexadecimal representation of the hash of a recent Bitcoin block header.


Rationale
---------

Proof of work, described in `NIP-13`, can be used to deter spam by adding
computational cost to the creation of events. However, it does not prevent a
spammer from generating large amounts of events over time offline in order to
later flood the network by publishing all these events at once.

If required to also provide proof of freshness, a spammer is forced to perform
all their proof of work in near real time, making them unable to perform such a
flooding attack.

Another use case of proof of freshness is to prove that a message was not signed
ahead of time.

A single-letter tag `f` is used in order to allow filtering on tag values in
subscriptions, as described in `NIP-12`, thus protecting subscriptions from spam
attacks.


Choice of Block Hashes
----------------------

In the interest of reducing the subscription filter size for time ranges, block
hashes should be chosen from a limited set.

The first `f` tag provided in an event SHOULD contain the hash of the latest
safe block whose height is divisible by 144. A block is considered safe if it's
in the best chain with at least 5 blocks on top of it.

144 blocks is roughly the number of blocks mined in 24 hours. An event MAY
provide additional `f` tags with different divisibility choices.


Relay Behavior
--------------

A relay MAY reject an event with an `f` tag referencing a block with a timestamp
more than 2 hours ahead of the event's `created_at` timestamp.

A relay MAY reject an event if it does not recognize the hash given in an `f`
tag, as long as the relay has an up-to-date view of the best Bitcoin chain as of
the event's `created_at` timestamp.


Querying Example
-------------------

The following filter contains the hashes for blocks 777744 and 777888.
Assuming events follow the rules given above for choice of block hashes, the
filter subscribes to events with a certain proof of work made between
approximately 2023-02-22 03:46 and 2023-02-24 00:18:

```json
["REQ", "subid",
 {"ids": ["000000000"],
  "#f": ["00000000000000000004744ecc695175c314a076bd888ca990140605ce02cf62",
         "00000000000000000000470a063ad158dfb60983e6b0b81363aafc35dd5fcf77"]}]
```

By filtering this way, the client is guaranteed to only receive events whose
proof of work has been generated after the time of the earliest block hash
provided.
