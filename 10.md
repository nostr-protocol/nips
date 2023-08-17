NIP-10
======


On "e" and "p" tags in Text Events (kind 1).
--------------------------------------------

`draft` `optional` `author:unclebobmartin`

## Abstract
This NIP describes how to use "e" and "p" tags in text events, especially those that are replies to other text events.  It helps clients thread the replies into a tree rooted at the original event.

## Positional "e" tags (DEPRECATED)
>This scheme is in common use; but should be considered deprecated.

`["e", <event-id>, <relay-url>]`  as per NIP-01.

Where:

 * `<event-id>` is the id of the event being referenced.
 * `<relay-url>` is the URL of a recommended relay associated with the reference.  Many clients treat this field as optional.

**The positions of the "e" tags within the event denote specific meanings as follows**:

 * No "e" tag: <br>
 This event is not a reply to, nor does it refer to, any other event.

 * One "e" tag: <br>
 `["e", <id>]`: The id of the event to which this event is a reply.

 * Two "e" tags:  `["e", <root-id>]`, `["e", <reply-id>]` <br>
 `<root-id>` is the id of the event at the root of the reply chain.  `<reply-id>` is the id of the article to which this event is a reply.

 * Many "e" tags: `["e", <root-id>]` `["e", <mention-id>]`, ..., `["e", <reply-id>]`<br>
There may be any number of `<mention-ids>`.  These are the ids of events which may, or may not be in the reply chain.
They are citings from this event.  `root-id` and `reply-id` are as above.

>This scheme is deprecated because it creates ambiguities that are difficult, or impossible to resolve when an event references another but is not a reply.

## Marked "e" tags (PREFERRED)
`["e", <event-id>, <relay-url>, <marker>]`

Where:

 * `<event-id>` is the id of the event being referenced.
 * `<relay-url>` is the URL of a recommended relay associated with the reference. Clients SHOULD add a valid `<relay-URL>` field, but may instead leave it as `""`.
 * `<marker>` is optional and if present is one of `"reply"`, `"root"`, or `"mention"`.

Those marked with `"reply"` denote the id of the reply event being responded to.  Those marked with `"root"` denote the root id of the reply thread being responded to. For top level replies (those replying directly to the root event), only the `"root"` marker should be used. Those marked with `"mention"` denote a quoted or reposted event id.

A direct reply to the root of a thread should have a single marked "e" tag of type "root".

>This scheme is preferred because it allows events to mention others without confusing them with `<reply-id>` or `<root-id>`.


## The "p" tag
Used in a text event contains a list of pubkeys used to record who is involved in a reply thread.

When replying to a text event E the reply event's "p" tags should contain all of E's "p" tags as well as the `"pubkey"` of the event being replied to.

Example:  Given a text event authored by `a1` with "p" tags [`p1`, `p2`, `p3`] then the "p" tags of the reply should be [`a1`, `p1`, `p2`, `p3`]
in no particular order.
