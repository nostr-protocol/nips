NIP-30
======

Custom Emoji
------------

`draft` `optional` `author:alexgleason`

Custom emoji may be added to **kind 0** and **kind 1** events by including one or more `"emoji"` tags, in the form:

```
["emoji", <shortcode>, <image-url>]
```

Where:

- `<shortcode>` is a name given for the emoji, which MUST be comprised of only alphanumeric characters and underscores.
- `<image-url>` is a URL to the corresponding image file of the emoji.

For each emoji tag, clients should parse emoji shortcodes (aka "emojify") like `:shortcode:` in the event to display custom emoji.

Clients may allow users to add custom emoji to an event by including `:shortcode:` identifier in the event, and adding the relevant `"emoji"` tags.

### Kind 0 events

In kind 0 events, the `name` and `about` fields should be emojified.

```json
{
  "kind": 0,
  "content": "{\"name\":\"Alex Gleason :soapbox:\"}",
  "tags": [
    ["emoji", "soapbox", "https://gleasonator.com/emoji/Gleasonator/soapbox.png"]
  ],
  "pubkey": "79c2cae114ea28a981e7559b4fe7854a473521a8d22a66bbab9fa248eb820ff6",
  "created_at": 1682790000
}
```

### Kind 1 events

In kind 1 events, the `content` should be emojified.

```json
{
  "kind": 1,
  "content": "Hello :gleasonator: 😂 :ablobcatrainbow: :disputed: yolo",
    "tags": [
    ["emoji", "ablobcatrainbow", "https://gleasonator.com/emoji/blobcat/ablobcatrainbow.png"],
    ["emoji", "disputed", "https://gleasonator.com/emoji/Fun/disputed.png"],
    ["emoji", "gleasonator", "https://gleasonator.com/emoji/Gleasonator/gleasonator.png"]
  ],
  "pubkey": "79c2cae114ea28a981e7559b4fe7854a473521a8d22a66bbab9fa248eb820ff6",
  "created_at": 1682630000
}
```
