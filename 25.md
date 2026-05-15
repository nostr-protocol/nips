
NIP-25
======

Reactions
---------

`draft` `optional`

A reaction is a `kind 7` event that is used to indicate user reactions to other events. A
reaction's `content` field MUST include user-generated-content indicating the value of the
reaction (conventionally `+`, `-`, or an emoji).

A reaction with `content` set to `+` or an empty string MUST be interpreted as a "like" or "upvote".
A reaction with `content` set to `-` MUST be interpreted as a "dislike" or "downvote".

A reaction with `content` set to an emoji or [NIP-30](30.md) custom emoji SHOULD NOT be interpreted
as a "like" or "dislike". Clients MAY instead display this emoji reaction on the post.

Tags
----

There MUST be always an `e` tag set to the `id` of the event that is being reacted to. The `e` tag SHOULD include a relay hint pointing to a relay where the event being reacted to can be found. If a client decides to include other `e`, which not recommended, the target event `id` should be last of the `e` tags.

There SHOULD be a `p` tag set to the `pubkey` of the event being reacted to. If a client decides to include other `p` tags, which not recommended, the target event `pubkey` should be last the `p` tags.

If the event being reacted to is an addressable event, an `a` SHOULD be included together with the `e` tag, it must be set to the coordinates (`kind:pubkey:d-tag`) of the event being reacted to.

The `e` and `a` tags SHOULD include relay and pubkey hints. The `p` tags SHOULD include relay hints.

The reaction event MAY include a `k` tag with the stringified kind number of the reacted event as its value.

**Example code**

```swift
func make_like_event(pubkey: String, privkey: String, liked: NostrEvent, hint: String) -> NostrEvent {
    var tags: [[String]] = []
    tags.append(["e", liked.id, hint, liked.pubkey])
    tags.append(["p", liked.pubkey, hint])
    tags.append(["k", String(liked.kind)])
    let ev = NostrEvent(content: "+", pubkey: pubkey, kind: 7, tags: tags)
    ev.calculate_id()
    ev.sign(privkey: privkey)
    return ev
}
```

External Content Reactions
---------------------

If the target of a reaction is not a native nostr event, the reaction MUST be a `kind 17` event and MUST include [NIP-73](73.md) external content `k` + `i` tags to properly reference the content.

_Reacting to a website:_
```jsonc
{
  "kind": 17,
  "content": "⭐",
  "tags": [
    ["k", "web"],
    ["i", "https://example.com"]
  ],
}
```

_Reacting to a podcast episode:_
```jsonc
{
  "kind": 17,
  "content": "+",
  "tags": [
    ["k", "podcast:guid"],
    ["i", "podcast:guid:917393e3-1b1e-5cef-ace4-edaa54e1f810", "https://fountain.fm/show/QRT0l2EfrKXNGDlRrmjL"],
    ["k", "podcast:item:guid"],
    ["i", "podcast:item:guid:PC20-229", "https://fountain.fm/episode/DQqBg5sD3qFGMCZoSuLF"]
  ],
}
```




Custom Emoji Reaction
---------------------

The client may specify a custom emoji ([NIP-30](30.md)) `:shortcode:` in the
reaction content. The client should refer to the emoji tag and render the
content as an emoji if shortcode is specified.

```jsonc
{
  "kind": 7,
  "content": ":soapbox:",
  "tags": [
    ["emoji", "soapbox", "https://gleasonator.com/emoji/Gleasonator/soapbox.png"]
  ],
  // other fields...
}
```

The content can be set only one `:shortcode:`. And emoji tag should be one.
