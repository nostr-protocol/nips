NIP-BB
======

Bulletin Boards
---------------

`draft` `optional`

A bulletin board is a relay-centric system of forums where users can post and reply to others, typically around a specific community. The relay operator controls and moderates who can post and view content.

A board is defined by `kind:30890`. Its naddr representation must provide the community's home relays, from which all posts should be gathered. No other relays should be used.

# Board Organization

```jsonc
{
  "kind": 30890,
  "tags": [
    ["d", "<unique_board_identifier>"],
    ["name", "<board_name>"],
    ["summary", "<short summary for preview>"]
    ["image", "<optional_image_url>"],
    ["relay", "wss://"], // home relay
    ["relay", "wss://"], // mirror relay
    ["forum", "<30891:pubkey:dTag>", "<category>"], // forum
    ["forum", "<30891:pubkey:dTag>", "<category>"], // forum
    ["forum", "<30891:pubkey:dTag>", "<category>"], // forum
    ["forum", "<30891:pubkey:dTag>", "<category>"] // forum
  ],
  "content": "<board_description and rules>",
}
```

Clients must download `kind:30890` and display the forum links in the specified order.

Forums are defined by `kind:30891` and organize threads within specific topics.

```jsonc
{
  "kind": 30891,
  "tags": [
    ["d", "<unique_forum_identifier>"],
    ["name", "<forum_name>"],
    ["summary", "<short summary for preview>"]
    ["image", "<optional_image_url>"],
  ],
  "content": "",
}
```

# Threads and replies

Threads are root posts, specified by `kind:892` in Markdown. They reference a forum using an `A` tag.
```jsonc
{
  "kind": 892,
  "tags": [
    ["d", "<unique_forum_identifier>"],
    ["name", "<forum_name>"],
    ["summary", "<short summary for preview>"]
    ["image", "<optional_image_url>"],

    ["A", "<30891:pubkey:dTag>", "<board's home relay>"] // the root topic
  ],
  "content": "<post_content>",
}
```

Replies to each thread are defined by `kind:893` and reference the root thread with an `E` tag. 

Replies do not reference parent replies and MUST be rendered strictly in `created_at` order. 

Users MUST use `>` to quote sections of a previous post if they wish to reply to specific authors.

```jsonc
{
  "kind": 893,
  "tags": [
    ["A", "<30891:pubkey:dTag>"] // the root topic
    ["E", "<event_id of kind 892>"], // Thread root

    ["p", "<32-bytes hex of a pubkey>", "<mentioned users' outbox relay>"],
  ],
  "content": "<reply_content>",
}
```

`q` tags MAY be used when citing events in the `.content` with [NIP-21](21.md).

```json
["q", "<event-id> or <event-address>", "<relay-url>", "<pubkey-if-a-regular-event>"]
```

`p` tags SHOULD be added for any user worth notifying, either from a direct mention in the post or because the user was an author of a post in that thread.

# Moderation

Content moderation is performed directly using relay management tools.
