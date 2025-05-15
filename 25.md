
NIP-25
======

Reactions
---------

`draft` `optional`

A reaction is a `kind 7` event that is used to react to other events.

The generic reaction, represented by the `content` set to a `+` string, SHOULD
be interpreted as a "like" or "upvote".

A reaction with `content` set to `-` SHOULD be interpreted as a "dislike" or
"downvote". It SHOULD NOT be counted as a "like", and MAY be displayed as a
downvote or dislike on a post. A client MAY also choose to tally likes against
dislikes in a reddit-like system of upvotes and downvotes, or display them as
separate tallies.

The `content` MAY be an emoji, or [NIP-30](30.md) custom emoji in this case it MAY be interpreted as a "like" or "dislike",
or the client MAY display this emoji reaction on the post. If the `content` is an empty string then the client should
consider it a "+".

Tags
----

There MUST be always an `e` tag set to the `id` of the event that is being reacted to. The `e` tag SHOULD include a relay hint pointing to a relay where the event being reacted to can be found. If a client decides to include other `e`, which not recommended, the target event `id` should be last of the `e` tags.

The SHOULD be a `p` tag set to the `pubkey` of the event being reacted to. If a client decides to include other `p` tags, which not recommended, the target event `pubkey` should be last the `p` tags.

If the event being reacted to is an addressable event, an `a` SHOULD be included together with the `e` tag, it must be set to the coordinates (`kind:pubkey:d-tag`) of the event being reacted to.

The reaction SHOULD include a `k` tag with the stringified kind number of the reacted event as its value.

**Example code**

```swift
func make_like_event(pubkey: String, privkey: String, liked: NostrEvent) -> NostrEvent {
    tags.append(["e", liked.id, liked.source_relays.first ?? ""])
    tags.append(["p", liked.pubkey])
    tags.append(["k", String(liked.kind)])
    let ev = NostrEvent(content: "+", pubkey: pubkey, kind: 7, tags: tags)
    ev.calculate_id()
    ev.sign(privkey: privkey)
    return ev
}
```

Reactions to a website
---------------------

If the target of the reaction is a website, the reaction MUST be a `kind 17` event and MUST include an `r` tag with the website's URL.

```jsonc
{
  "kind": 17,
  "content": "⭐",
  "tags": [
    ["r", "https://example.com/"]
  ],
  // other fields...
}
```

URLs SHOULD be [normalized](https://datatracker.ietf.org/doc/html/rfc3986#section-6), so that reactions to the same website are not omitted from queries.
A fragment MAY be attached to the URL, to react to a section of the page.
It should be noted that a URL with a fragment is not considered to be the same URL as the original.

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
