
NIP-38
======

User Statuses
-------------

`draft` `optional`

## Abstract

This NIP enables a way for users to share live statuses such as what music they are listening to, as well as what they are currently doing: work, play, out of office, etc.

## Live Statuses

A special event with `kind:30315` "User Status" is defined as an *optionally expiring* _addressable event_, where the `d` tag represents the status type:

For example:

```json
{
  "kind": 30315,
  "content": "Sign up for nostrasia!",
  "tags": [
    ["d", "general"],
    ["r", "https://nostr.world"]
  ],
}
```

```json
{
  "kind": 30315,
  "content": "Intergalatic - Beastie Boys",
  "tags": [
    ["d", "music"],
    ["r", "spotify:search:Intergalatic%20-%20Beastie%20Boys"],
    ["expiration", "1692845589"]
  ],
}
```

Two common status types are defined: `general` and `music`. `general` represent general statuses: "Working", "Hiking", etc.

`music` status events are for live streaming what you are currently listening to. The expiry of the `music` status should be when the track will stop playing.

Any other status types can be used but they are not defined by this NIP.

The status MAY include an `r`, `p`, `e` or `a` tag linking to a URL, profile, note, or addressable event.

The `content` MAY include emoji(s), or [NIP-30](30.md) custom emoji(s). If the `content` is an empty string then the client should clear the status.

## Client behavior

Clients MAY display this next to the username on posts or profiles to provide live user status information.

## Use Cases

* Calendar nostr apps that update your general status when you're in a meeting
* Nostr Nests that update your general status with a link to the nest when you join
* Nostr music streaming services that update your music status when you're listening
* Podcasting apps that update your music status when you're listening to a podcast, with a link for others to listen as well
* Clients can use the system media player to update playing music status
