NIP-XX
======

Repost Attribution
------------------

`draft` `optional`

When a user reacts to or replies to a note they saw through a [NIP-18](18.md) repost, their client MAY add the reposter as a `p` tag, together with a `via` tag that explains it:

```
["via", "<repost-event-id>", "<relay-url>", "<reposter-pubkey>"]
```

The `p` tag lets the reposter's client find the event with a `#p` filter. The `via` tag tells it why it was tagged, so it can show "Bob liked a note you shared" instead of a mention.

A `p` tag whose pubkey is named in a `via` tag is attribution only. It does not change the target, the recipient or the thread participants, and clients SHOULD NOT copy it into replies.

```jsonc
{
  "kind": 7,
  "content": "+",
  "tags": [
    ["e", "<dave-note-id>", "wss://relay.example", "<dave-pubkey>"],
    ["via", "<alice-repost-id>", "wss://relay.example", "<alice-pubkey>"],
    ["p", "<alice-pubkey>", "wss://relay.example"],
    ["p", "<dave-pubkey>", "wss://relay.example"]
  ]
}
```

Clients that don't support this NIP show the reposter a plain mention.

Bluesky has the same `via` reference on likes and reposts ([atproto#3882](https://github.com/bluesky-social/atproto/pull/3882)).
