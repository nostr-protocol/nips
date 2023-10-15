NIP-58
======

Badges
------

`draft` `optional` `author:cameri`

Three special events are used to define, award and display badges in
user profiles:

1. A "Badge Definition" event is defined as a parameterized replaceable event with kind `30009` having a `d` tag with a value that uniquely identifies the badge (e.g. `bravery`) published by the badge issuer. Badge definitions can be updated.

2. A "Badge Award" event is a kind `8` event with a single `a` tag referencing a "Badge Definition" event and one or more `p` tags, one for each pubkey the badge issuer wishes to award. Awarded badges are immutable and non-transferrable.

3. A "Profile Badges" event is defined as a parameterized replaceable event
with kind `30008` with a `d` tag with the value `profile_badges`.
Profile badges contain an ordered list of pairs of `a` and `e` tags referencing a `Badge Definition` and a `Badge Award` for each badge to be displayed.

### Badge Definition event

The following tags MUST be present:

- `d` tag with the unique name of the badge.

The following tags MAY be present:

- A `name` tag with a short name for the badge.
- `image` tag whose value is the URL of a high-resolution image representing the badge. The second value optionally specifies the dimensions of the image as  `width`x`height` in pixels. Badge recommended dimensions is 1024x1024 pixels.
- A `description` tag whose value MAY contain a textual representation of the
image, the meaning behind the badge, or the reason of it's issuance.
- One or more `thumb` tags whose first value is an URL pointing to a thumbnail version of the image referenced in the `image` tag. The second value optionally specifies the dimensions of the thumbnail as `width`x`height` in pixels.

### Badge Award event

The following tags MUST be present:

- An `a` tag referencing a kind `30009` Badge Definition event.
- One or more `p` tags referencing each pubkey awarded.

### Profile Badges Event

The number of badges a pubkey can be awarded is unbounded. The Profile Badge
event allows individual users to accept or reject awarded badges, as well
as choose the display order of badges on their profiles.

The following tags MUST be present:

- A `d` tag with the unique identifier `profile_badges`

The following tags MAY be present:

- Zero or more ordered consecutive pairs of `a` and `e` tags referencing a kind `30009` Badge Definition and kind `8` Badge Award, respectively. Clients SHOULD
ignore `a` without corresponding `e` tag and viceversa. Badge Awards referenced
by the `e` tags should contain the same `a` tag.

### Motivation

Users MAY be awarded badges (but not limited to) in recognition, in gratitude, for participation, or in appreciation of a certain goal, task or cause.

Users MAY choose to decorate their profiles with badges for fame, notoriety, recognition, support, etc., from badge issuers they deem reputable.

### Recommendations

Badge issuers MAY include some Proof of Work as per [NIP-13](13.md) when minting Badge Definitions or Badge Awards to embed them with a combined energy cost, arguably making them more special and valuable for users that wish to collect them.

Clients MAY whitelist badge issuers (pubkeys) for the purpose of ensuring they retain a valuable/special factor for their users.

Badge image recommended aspect ratio is 1:1 with a high-res size of 1024x1024 pixels.

Badge thumbnail image recommended dimensions are: 512x512 (xl), 256x256 (l), 64x64 (m), 32x32 (s) and 16x16 (xs).

Clients MAY choose to render less badges than those specified by users in the Profile Badges event or replace the badge image and thumbnails with ones that fits the theme of the client.

Clients SHOULD attempt to render the most appropriate badge thumbnail according to the number of badges chosen by the user and space available. Clients SHOULD attempt render the high-res version on user action (click, tap, hover).

### Example of a Badge Definition event

```json
{
  "pubkey": "alice",
  "kind": 30009,
  "tags": [
    ["d", "bravery"],
    ["name", "Medal of Bravery"],
    ["description", "Awarded to users demonstrating bravery"],
    ["image", "https://nostr.academy/awards/bravery.png", "1024x1024"],
    ["thumb", "https://nostr.academy/awards/bravery_256x256.png", "256x256"],
  ],
  ...
}
```

### Example of Badge Award event

```json
{
  "id": "<badge award event id>",
  "kind": 8,
  "pubkey": "alice",
  "tags": [
    ["a", "30009:alice:bravery"],
    ["p", "bob", "wss://relay"],
    ["p", "charlie", "wss://relay"],
  ],
  ...
}
```

### Example of a Profile Badges event

Honorable Bob The Brave:
```json
{
  "kind": 30008,
  "pubkey": "bob",
  "tags": [
    ["d", "profile_badges"],
    ["a", "30009:alice:bravery"],
    ["e", "<bravery badge award event id>", "wss://nostr.academy"],
    ["a", "30009:alice:honor"],
    ["e", "<honor badge award event id>", "wss://nostr.academy"],
  ],
  ...
}
```
