NIP-10
======

Text Notes and Threads
----------------------

`draft` `optional`

This NIP defines `kind:1` as a simple plaintext note.

## Abstract

The `.content` property contains some human-readable text. 

`e` tags can be used to define note thread roots and replies. They SHOULD be sorted by the reply stack from root to the direct parent.

`q` tags MAY be used when citing events in the `.content` with [NIP-21](21.md).

```json
["q", "<event-id> or <event-address>", "<relay-url>", "<pubkey-if-a-regular-event>"]
```

Authors of the `e` and `q` tags SHOULD be added as `p` tags to notify of a new reply or quote.

Markup languages such as markdown and HTML SHOULD NOT be used. 

## Marked "e" tags (PREFERRED)

Kind 1 events with `e` tags are replies to other kind 1 events. Kind 1 replies MUST NOT be used to reply to other kinds, use [NIP-22](22.md) instead. 

`["e", <event-id>, <relay-url>, <marker>, <pubkey>]`

Where:

 * `<event-id>` is the id of the event being referenced.
 * `<relay-url>` is the URL of a recommended relay associated with the reference. Clients SHOULD add a valid `<relay-url>` field, but may instead leave it as `""`.
 * `<marker>` is optional and if present is one of `"reply"`, `"root"`.
 * `<pubkey>` is optional, SHOULD be the pubkey of the author of the referenced event

Those marked with `"reply"` denote the id of the reply event being responded to.  Those marked with `"root"` denote the root id of the reply thread being responded to. For top level replies (those replying directly to the root event), only the `"root"` marker should be used. 

A direct reply to the root of a thread should have a single marked "e" tag of type "root".

>This scheme is preferred because it allows events to mention others without confusing them with `<reply-id>` or `<root-id>`.

`<pubkey>` SHOULD be the pubkey of the author of the `e` tagged event, this is used in the outbox model to search for that event from the authors write relays where relay hints did not resolve the event.

## The "p" tag
Used in a text event contains a list of pubkeys used to record who is involved in a reply thread.

When replying to a text event E the reply event's "p" tags should contain all of E's "p" tags as well as the `"pubkey"` of the event being replied to.

Example:  Given a text event authored by `a1` with "p" tags [`p1`, `p2`, `p3`] then the "p" tags of the reply should be [`a1`, `p1`, `p2`, `p3`]
in no particular order.

## Deprecated Positional "e" tags

This scheme is not in common use anymore and is here just to keep backward compatibility with older events on the network. 

Positional `e` tags are deprecated because they create ambiguities that are difficult, or impossible to resolve when an event references another but is not a reply.

They use simple `e` tags without any marker. 

`["e", <event-id>, <relay-url>]` as per NIP-01.

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
They are citing from this event.  `root-id` and `reply-id` are as above.