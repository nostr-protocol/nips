NIP-BE
======

Better Lists
------------

`draft` `optional`

A list is a `kind 3xxxx` replaceable event with tags enumerating its members.

Conventions for tags are defined independently for each kind but all lists MUST have a `d` tag containing a random string representing the `list shard`.

Lists MUST be updated using the following process to avoid conflicts:

- Clients SHOULD fetch all existing events for a given list by kind.
- If the client finds at least one event, it MAY modify its tags and re-publish it using the same `d` tag.
- Otherwise, the client MAY publish a new event of the same kind, with a new `d` tag.
- Clients MUST attempt to fetch and maintain any corresponding [NIP 51] list, for backwards compatibility.

Lists MUST be published to a user's [NIP 65](65.md) outbox relays.

## Example

Below is an example which covers some degenerate cases in list management, and how this NIP solves them.

Suppose Alice has created a [NIP 02](02.md) `kind 3` follow list on Client A with three pubkeys listed:

```jsonc
{
  "kind": 3,
  "tags": [
    ["p", "<pubkey 1>"],
    ["p", "<pubkey 2>"],
    ["p", "<pubkey 3>"]
  ],
  // other fields...
}
```

She then signs in to Client B, which attempts to fetch her current follow list and fails. Alice then follows `pubkey 4`. Before the introduction of this NIP, Client B would publish a fresh `kind 3` list with only `pubkey 4`, effectively deleting Alice's other follows. Now, Client B can instead publish a new follow shard with a fresh `d` tag:

```jsonc
{
  "kind": 33000,
  "tags": [
    ["d", "3584503"],
    ["p", "<pubkey 4>"]
  ],
  // other fields...
}
```

In this case, Client B SHOULD NOT publish an update to Alice's `kind 3`, but if it had retrieved a copy, it could. That way, Client A would have an up-to-date follows list regardless of whether it supports this NIP.

Suppose it does, however, and Alice returns to Client A, which fetches her new follow shard. It now has a complete copy of all four of Alice's follows. Alice then follows `pubkey 5`, resulting in that pubkey being added both to her `kind 3` (for compatibility) and to her existing `kind 33000`.

In the future Alice might use Client C, which successfully discovers her `kind 33000` list, but not her `kind 3`. This client will show her follows list as containing only pubkeys `4` and `5`. When Alice inevitably follows `pubkey 6`, it is added to her `kind 33000` again, resulting in a complete follow list including all 6 items when she returns to Client A.

A final scenario might occur when Alice uses Client C, an older client that doesn't yet support `kind 33000` lists. This client may fail to fetch her `kind 3` as well, and when she follows `pubkey 7`, it publishes a new `kind 3` with only that item in it. When Alice returns to Client A, she will find that even in the worst case she will still have pubkeys 4-7 in her follows list, having only lost the pubkeys added only to her `kind 3`.

Clients can further mitigate this scenario by proactively copying entries in a user's `kind 3` to a current `kind 33000` to prevent data loss.

## Named Lists

Every list kind MUST be defined as either `named` or `unnamed`. Named lists MUST contain a `=` tag containing a random string representing the `list ID`. Clients MUST consider lists including different `=` tags to be **different** lists, and MUST implement conflict resolution accordingly.

When mapping legacy list kinds to new list kinds, the `=` tag is equivalent to the `d` tag on the legacy list.

One or more of `title`, `image`, and `description` tags MAY be included, which define metadata for the `named` list.

## Private lists

Private and public lists MUST NOT be combined into the same event kind. Public lists include their members in a publicly-readable `tags` array, while private lists MUST JSON-encode and [NIP 44](44.md)-encrypt their to the user's own pubkey and put them in the event's `content` field.

## List Kinds

| Name              | Public Kind | Private Kind | Legacy Kind  | Description                             | Expected tag items                                                                                  |
| ---               | ---   | ---   | ---   | ---                                                         | ---                                                                                                 |
| Follow list       | 33000 | 34000 |     3 | microblogging basic follow list, see [NIP-02](02.md)        | `"p"` (pubkeys -- with optional relay hint and petname)                                             |
| Pinned notes      | 33001 | 34001 | 10001 | events the user intends to showcase in their profile page   | `"e"` (kind:1 notes)                                                                                |
| Mute list         | 33002 | 34002 | 10000 | things the user doesn't want to see                         | `"p"` (pubkeys), `"t"` (hashtags), `"word"` (lowercase string), `"e"` (threads)                     |
| Bookmarks         | 33003 | 34003 | 10003 | uncategorized, "global" list of things a user wants to save | `"e"` (kind:1 notes), `"a"` (kind:30023 articles), `"t"` (hashtags), `"r"` (URLs)                   |
| Blocked relays    | 33006 | 34006 | 10006 | relays clients should never connect to                      | `"relay"` (relay URLs)                                                                              |
| Search relays     | 33007 | 34007 | 10007 | relays clients should use when performing search queries    | `"relay"` (relay URLs)                                                                              |
| Simple groups     | 33009 | 34009 | 10009 | [NIP-29](29.md) groups the user is in                       | `"group"` ([NIP-29](29.md) group id + relay URL + optional group name), `"r"` for each relay in use |
| Relay feeds       | 33012 | 34012 | 10012 | user favorite browsable relays (and relay sets)             | `"relay"` (relay URLs) and `"a"` (kind:30002 relay set)                                             |
| Interests         | 33015 | 34015 | 10015 | topics a user may be interested in and pointers             | `"t"` (hashtags) and `"a"` (kind:30015 interest set)                                                |
| Media follows     | 33020 | 34020 | 10020 | multimedia (photos, short video) follow list                | `"p"` (pubkeys -- with optional relay hint and petname)                                             |
| Emojis            | 33030 | 34030 | 10030 | user preferred emojis and pointers to emoji sets            | `"emoji"` (see [NIP-30](30.md)) and `"a"` (kind:30030 emoji set)                                    |
| Good wiki authors | 33101 | 34101 | 10101 | [NIP-54](54.md) user recommended wiki authors               | `"p"` (pubkeys)                                                                                     |
| Good wiki relays  | 33102 | 34102 | 10102 | [NIP-54](54.md) relays deemed to only host useful articles  | `"relay"` (relay URLs)                                                                              |

**Note: [NIP 65](./65.md) and [NIP 17](17.md) relay lists are omitted from this list because they represent canonical routing information, not user social data. As such, they should be more widely available, and the latest update should be considered canonical.**
