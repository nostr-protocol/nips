NIP-XX: Nostr Verified Podcasts
======

`draft` `optional`

## Abstract

This NIP defines a method for podcast owners to announce and verify their podcasts on the Nostr network, enabling better discovery and integration of traditional RSS-based podcasts with Nostr-native podcast episodes.

## Introduction

While [NIP-XX Audio Track](https://github.com/nostr-protocol/nips/pull/1043) defines kind 31338 for podcast tracks, many traditional podcasts do not publish these events, making them undiscoverable on the Nostr network. This NIP addresses this issue by introducing podcast announcements and a verification mechanism.

When an npub becomes a verified owner of an RSS feed, kind `31338` podcast events owned by that npub may be directly associated with the verified RSS feed in podcasting clients. In this way, the verification creates a bridge between traditional RSS feeds and nostr-based podcast publishing.

## Podcast Announcements

A podcast owner can publish an announcement on Nostr to make their podcast discoverable:

```json
{
  "kind": 1338,
  "tags": [
    ["i", "podcast:guid:78ae77a3-b180-5cfa-a7ba-31ac82df8ba9", "https://example.com/podcast/feed.xml"]
  ],
  "content": ""
}
```

Clients can request kind 1338 to discover RSS feeds without the need of an API like podcastindex. The RSS feed URI can be fetched directly to obtain the podcast's data. The podcast announcement event MUST specify the podcast guid ([NIP-73](https://github.com/nostr-protocol/nips/blob/master/73.md)) and MUST specify the direct feed URI.

The `i` tag follows the External Content IDs format as defined in [NIP-XX](https://github.com/nostr-protocol/nips/pull/1185/files).

## Nostr Podcast Verification

To verify ownership of a podcast, the owner should include the full signed kind 1338 event in the `<content>` tag of their RSS feed:

```xml
<podcast:txt purpose="nostr">
<![CDATA[
{
  "id": "...",
  "pubkey": "...",
  "created_at": ...,
  "kind": 1338,
  "tags": [
    ["i", "podcast:guid:78ae77a3-b180-5cfa-a7ba-31ac82df8ba9", "https://example.com/podcast/feed.xml"]
  ],
  "content": "",
  "sig": "..."
}
]]>
</podcast:txt>
```

This verification should ideally be published in the RSS feed before publishing the kind 1338 announcement event to relays.

## Client Behavior

Having a nostr verified podcast allows for nostr podcasting clients to definitively associate an npub with a podcast. This allows nostr content to be layered on top of traditional podcast 2.0 data in any way clients desire.

Upon seeing a kind 1338 podcast announcement, clients should fetch the RSS feed and verify the signature in the `<podcast:txt>` event. This verifies which npub owns the podcast.

Once verified, the client may choose to associate whatever content from that npub it deems relevant with the podcast. For example, a feed of the npub's kind 1 notes may be displayed with the podcast as "official updates". Kind 31338 events from the verified npub with the same `i` tag may be displayed intermingled with RSS episodes in the podcast's content feed.

The result of podcast verification should be cached for a reasonable duration (24 hours) to reduce repeated fetching of the feed.

## Kind 31338 Notes 

- Kind 31338 episodes may be published without an associated RSS podcast. In this case, they will be shown as belonging to the pubkey.
- Kind 31338 episodes can be closely linked to an RSS podcast if the RSS podcast has Nostr Verification, the kind 31338 episodes reference the RSS feed (using the same `i` tag as in the kind 1338 event), and the kind 31338 episodes are published by the verified npub.
- A Nostr Verified podcast can appear in the client even if no kind 31338 episodes exist, as long as a kind 1338 Announcement is made by the same pubkey.
- Publishing a kind 31338 podcast with an `i` tag referencing the podcast is functionally equivalent to a podcast Announcement event, but if the pubkey won't be publishing Nostr-based episodes, the kind 1338 event is still necessary.
