NIP-XX
======

Repost Attribution
------------------

`draft` `optional`

When a user reacts to, replies to or reposts a note they found through somebody's [NIP-18](18.md) repost, their client can credit the reposter. This lets the reposter see what their share led to.

## The `via` tag

```
["via", "<repost-event-id>", "<relay-url>", "<reposter-pubkey>"]
```

The client that saw the note as part of a repost adds a `via` tag pointing to that repost (`kind 6` or `kind 16`), and a `p` tag with the reposter's pubkey so the reposter's client finds the event with a `#p` filter.

Only the repost the user actually saw is credited. If the reposted note was itself a repost, earlier reposters are not credited.

The `via` tag MAY be added to:

- `kind 7` reactions ([NIP-25](25.md))
- `kind 6` and `kind 16` reposts ([NIP-18](18.md))
- `kind 1` replies ([NIP-10](10.md)) and `kind 1111` comments ([NIP-22](22.md))

Zaps are not covered: a [NIP-57](57.md) zap request must have exactly one `p` tag.

All existing tags stay as they are, so the event still refers to the original note. The `via` tag only adds the reposter.

## Example

Alice reposts Dave's note. Bob sees the repost and likes the note:

```jsonc
{
  "kind": 7,
  "content": "+",
  "tags": [
    ["e", "<dave-note-id>", "wss://relay.example", "<dave-pubkey>"],
    ["via", "<alice-repost-id>", "wss://relay.example", "<alice-pubkey>"],
    ["p", "<alice-pubkey>", "wss://relay.example"],
    ["p", "<dave-pubkey>", "wss://relay.example"],
    ["k", "1"]
  ]
}
```

NIP-25 asks for the reacted-to author's `p` tag to come last, so the reposter's `p` tag goes before it.

## Client behavior

Reposter's client: when an event `p`-tags the user and has a `via` tag pointing to one of the user's reposts, the client SHOULD show it as activity on that repost ("Bob liked a note you shared"), not as a mention. A `via` tag that does not point to one of the user's reposts SHOULD be ignored.

Replies: clients copy the parent's `p` tags into a reply (NIP-10). Clients SHOULD NOT copy the `p` tag of a pubkey named in the parent's `via` tag, unless that pubkey is also part of the thread. Otherwise the reposter gets notified about the whole thread.

Privacy: a `via` tag shows how the user found the note. Clients MAY offer a setting to leave it out.

## Compatibility

Clients that don't support this NIP see an extra `p` tag. Most will show the event to the reposter as a plain mention, which is an acceptable fallback. Existing reaction, reply and repost counts don't change because the `e` tags stay the same.

## Prior art

Bluesky added an optional `via` reference to its like and repost records ([bluesky-social/atproto#3882](https://github.com/bluesky-social/atproto/pull/3882), 2025-05) and notifies reposters with the `like-via-repost` and `repost-via-repost` notification reasons.
