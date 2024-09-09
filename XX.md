NIP-XX: Nostr Verified Podcasts
======

`draft` `optional`

## Abstract

This NIP defines a method for podcast owners to announce and verify their podcasts on the Nostr network, enabling better discovery and integration of traditional RSS-based podcasts with nostr and mixing of Nostr-native podcast episodes with RSS-based podcast episodes.

## Introduction

While [NIP-XX Audio Track](https://github.com/nostr-protocol/nips/pull/1043) defines kind 31338 for podcast tracks, many traditional podcasts do not publish these events, making them undiscoverable on the Nostr network. This NIP addresses this issue by introducing podcast announcements and a verification mechanism.

Announcing podcasts on nostr allows nostr to serve as a decentralized index of podcasts which may ease dependence on centralized APIs like iTunes or Podcastindex.

Additionally, when an npub becomes a verified owner of an RSS feed, any kind `31338` podcast events owned by that npub may be directly associated with the verified RSS feed in podcasting clients. In this way, the verification creates a bridge between traditional RSS feeds and nostr-based podcast publishing.

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

The `i` tag follows the External Content IDs format as defined in [NIP-73](https://github.com/nostr-protocol/nips/blob/master/73.md).

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
    ["i", "podcast:guid:78ae77a3-b180-5cfa-a7ba-31ac82df8ba9", "https://example.com/podcast/feed.xml"],
    ["relays", "wss://example.com", "wss://optional.com"]
  ],
  "content": "",
  "sig": "..."
}
]]>
</podcast:txt>
```

This verification should ideally be published in the RSS feed before publishing the kind 1338 announcement event to relays.

## Client Behavior

### Podcast Discovery

Clients may filter for kind `1338` to obtain direct URIs to podcast RSS feeds. These feeds may then be fetched and parsed to display and play podcasts in the client UI.

Without this, podcast clients would need to rely on centralized APIs such as iTunes or Podcastindex to fetch podcast RSS feeds. Typically these APIs require a search query to return results, which doesn't help a client bootstrap it's homepage for a first-time visitors. Those APIs can serve "trending" or "recently updated" lists of podcasts but those algorithms may not be suitable for every client and they aren't always open source.

Without any user input, nostr clients can show "recently announced" podcasts by querying kind `1338` events. Deduplication and web-of-trust may be overlayed on this to curate podcast announcements further.

Note that anyone could publish a kind `1338` to relays for a podcast they do not own; this isn't necessarily a bad thing as people can simply seed nostr with podcasts they like for nostr-based podcasting clients to pick up and recommend. Simple client-side verification will fix common issues that may arise from this. See below.

### Podcast Episodes on Nostr

Clients may also filter for kind `31338` podcast tracks and inspect them for a [NIP-73](https://github.com/nostr-protocol/nips/blob/master/73.md) `i` tag referencing a podcast RSS feed. Just as above, the feeds may be fetched and parsed to display and play podcasts in the UI. If the fetched RSS feed contains Nostr Verification and the kind `31338` event was published by the verified npub, then the episode may be shown as an official episode of that podcast.

In this way, a kind `31338` podcast track with a NIP-73 `i` tag is functionally equivalent to a kind `1338` found on relays. However, the kind `1338` is still necessary as it enables Nostr Verification for podcasters who do not wish to publish on nostr.

### Comments, Zaps, and Interacting with a Discovered Podcast

User events that should reference a podcast or a podcast episode, such as a comment or review, should utilize [NIP-73](https://github.com/nostr-protocol/nips/blob/master/73.md) rather than referencing the kind `1338` event.

For zaps, the client should fetch the RSS feed and check it for the `<podcast:txt purpose="nostr">` tag which will contain a kind `1338` signed by the podcast owner's npub. After verifying the signature of the event, the zap can be sent to that npub.

### Npub Ownership

Having a nostr verified podcast allows for nostr podcasting clients to definitively associate an npub with a podcast (RSS feed). This allows nostr content to be layered on top of traditional podcast 2.0 data in any way clients desire.

When a podcast RSS feed is encountered which contains the `<podcast:txt purpose="nostr">` tag, the client should verify the signature of the kind `1338` event in the tag.

Once verified, the client may choose to associate whatever content from that npub it deems relevant with the podcast. For example:

- A feed of the npub's kind `1` notes could be displayed with the podcast as "official updates".
- Kind `31338` podcast episodes from the verified npub with the same `i` tag may be displayed intermingled with RSS episodes in the podcast's content feed.
- The most basic example would be to simply have a link to the npub's profile page from the podcast page.

The result of podcast verification MAY be cached for a reasonable duration (24 hours).

## Notes about Podcast Track Kind `31338`

- Kind `31338` episodes may be published without an associated podcast RSS feed. In this case, they will be shown as belonging to the pubkey.
- Kind `31338` episodes can be shown as "part" of an RSS feed if the feed has Nostr Verification, the kind `31338` episodes reference the RSS feed (using the same `i` tag as in the kind `1338` event), and the kind `31338` episodes are published by the verified npub.
- Publishing a kind `31338` podcast with an `i` tag referencing the podcast is functionally equivalent to a kind `1338` podcast announcement event, but if the pubkey won't be publishing Nostr-based episodes, the kind 1338 event is still necessary.
