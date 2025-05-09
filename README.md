# NIPs

NIPs stand for **Nostr Implementation Possibilities**.

They exist to document what may be implemented by [Nostr](https://github.com/nostr-protocol/nostr)-compatible _relay_ and _client_ software.

---

- [List](#list)
- [Event Kinds](#event-kinds)
- [Message Types](#message-types)
  - [Client to Relay](#client-to-relay)
  - [Relay to Client](#relay-to-client)
- [Standardized Tags](#standardized-tags)
- [Criteria for acceptance of NIPs](#criteria-for-acceptance-of-nips)
- [Is this repository a centralizing factor?](#is-this-repository-a-centralizing-factor)
- [How this repository works](#how-this-repository-works)
- [Breaking Changes](#breaking-changes)
- [License](#license)

---

## List

- [NIP-01: Basic protocol flow description](01.md)
- [NIP-02: Follow List](02.md)
- [NIP-03: OpenTimestamps Attestations for Events](03.md)
- [NIP-04: Encrypted Direct Message](04.md) --- **unrecommended**: deprecated in favor of [NIP-17](17.md)
- [NIP-05: Mapping Nostr keys to DNS-based internet identifiers](05.md)
- [NIP-06: Basic key derivation from mnemonic seed phrase](06.md)
- [NIP-07: `window.nostr` capability for web browsers](07.md)
- [NIP-08: Handling Mentions](08.md) --- **unrecommended**: deprecated in favor of [NIP-27](27.md)
- [NIP-09: Event Deletion Request](09.md)
- [NIP-10: Text Notes and Threads](10.md)
- [NIP-11: Relay Information Document](11.md)
- [NIP-13: Proof of Work](13.md)
- [NIP-14: Subject tag in text events](14.md)
- [NIP-15: Nostr Marketplace (for resilient marketplaces)](15.md)
- [NIP-17: Private Direct Messages](17.md)
- [NIP-18: Reposts](18.md)
- [NIP-19: bech32-encoded entities](19.md)
- [NIP-21: `nostr:` URI scheme](21.md)
- [NIP-22: Comment](22.md)
- [NIP-23: Long-form Content](23.md)
- [NIP-24: Extra metadata fields and tags](24.md)
- [NIP-25: Reactions](25.md)
- [NIP-26: Delegated Event Signing](26.md) --- **unrecommended**: adds unecessary burden for little gain
- [NIP-27: Text Note References](27.md)
- [NIP-28: Public Chat](28.md)
- [NIP-29: Relay-based Groups](29.md)
- [NIP-29a: Group-based channels](29a.md)
- [NIP-30: Custom Emoji](30.md)
- [NIP-31: Dealing with Unknown Events](31.md)
- [NIP-32: Labeling](32.md)
- [NIP-34: `git` stuff](34.md)
- [NIP-35: Torrents](35.md)
- [NIP-36: Sensitive Content](36.md)
- [NIP-37: Draft Events](37.md)
- [NIP-38: User Statuses](38.md)
- [NIP-39: External Identities in Profiles](39.md)
- [NIP-40: Expiration Timestamp](40.md)
- [NIP-42: Authentication of clients to relays](42.md)
- [NIP-44: Encrypted Payloads (Versioned)](44.md)
- [NIP-45: Counting results](45.md)
- [NIP-46: Nostr Remote Signing](46.md)
- [NIP-47: Nostr Wallet Connect](47.md)
- [NIP-48: Proxy Tags](48.md)
- [NIP-49: Private Key Encryption](49.md)
- [NIP-50: Search Capability](50.md)
- [NIP-51: Lists](51.md)
- [NIP-52: Calendar Events](52.md)
- [NIP-53: Live Activities](53.md)
- [NIP-54: Wiki](54.md)
- [NIP-55: Android Signer Application](55.md)
- [NIP-56: Reporting](56.md)
- [NIP-57: Lightning Zaps](57.md)
- [NIP-58: Badges](58.md)
- [NIP-59: Gift Wrap](59.md)
- [NIP-60: Cashu Wallet](60.md)
- [NIP-61: Nutzaps](61.md)
- [NIP-62: Request to Vanish](62.md)
- [NIP-64: Chess (PGN)](64.md)
- [NIP-65: Relay List Metadata](65.md)
- [NIP-66: Relay Discovery and Liveness Monitoring](66.md)
- [NIP-68: Picture-first feeds](68.md)
- [NIP-69: Peer-to-peer Order events](69.md)
- [NIP-70: Protected Events](70.md)
- [NIP-71: Video Events](71.md)
- [NIP-72: Moderated Communities](72.md)
- [NIP-73: External Content IDs](73.md)
- [NIP-75: Zap Goals](75.md)
- [NIP-78: Application-specific data](78.md)
- [NIP-7D: Threads](7D.md)
- [NIP-84: Highlights](84.md)
- [NIP-86: Relay Management API](86.md)
- [NIP-88: Polls](88.md)
- [NIP-89: Recommended Application Handlers](89.md)
- [NIP-90: Data Vending Machines](90.md)
- [NIP-92: Media Attachments](92.md)
- [NIP-94: File Metadata](94.md)
- [NIP-96: HTTP File Storage Integration](96.md)
- [NIP-98: HTTP Auth](98.md)
- [NIP-99: Classified Listings](99.md)
- [NIP-B0: Web Bookmarks](B0.md)
- [NIP-B7: Blossom](B7.md)
- [NIP-C0: Code Snippets](C0.md)
- [NIP-C7: Chats](C7.md)

## Event Kinds

| kind          | description                     | NIP                                    |
| ------------- | ------------------------------- | -------------------------------------- |
| `0`           | User Metadata                   | [01](01.md)                            |
| `1`           | Short Text Note                 | [10](10.md)                            |
| `2`           | Recommend Relay                 | 01 (deprecated)                        |
| `3`           | Follows                         | [02](02.md)                            |
| `4`           | Encrypted Direct Messages       | [04](04.md)                            |
| `5`           | Event Deletion Request          | [09](09.md)                            |
| `6`           | Repost                          | [18](18.md)                            |
| `7`           | Reaction                        | [25](25.md)                            |
| `8`           | Badge Award                     | [58](58.md)                            |
| `9`           | Chat Message                    | [C7](C7.md)                            |
| `10`          | Group Chat Threaded Reply       | 29 (deprecated)                        |
| `11`          | Thread                          | [7D](7D.md)                            |
| `12`          | Group Thread Reply              | 29 (deprecated)                        |
| `13`          | Seal                            | [59](59.md)                            |
| `14`          | Direct Message                  | [17](17.md)                            |
| `15`          | File Message                    | [17](17.md)                            |
| `16`          | Generic Repost                  | [18](18.md)                            |
| `17`          | Reaction to a website           | [25](25.md)                            |
| `20`          | Picture                         | [68](68.md)                            |
| `21`          | Video Event                     | [71](71.md)                            |
| `22`          | Short-form Portrait Video Event | [71](71.md)                            |
| `30`          | internal reference              | [NKBIP-03]                             |
| `31`          | external web reference          | [NKBIP-03]                            |
| `32`          | hardcopy reference              | [NKBIP-03]                            |
| `33`          | prompt reference                | [NKBIP-03]                            |
| `40`          | Channel Creation                | [28](28.md)                            |
| `41`          | Channel Metadata                | [28](28.md)                            |
| `42`          | Channel Message                 | [28](28.md)                            |
| `43`          | Channel Hide Message            | [28](28.md)                            |
| `44`          | Channel Mute User               | [28](28.md)                            |
| `62`          | Request to Vanish               | [62](62.md)                            |
| `64`          | Chess (PGN)                     | [64](64.md)                            |
| `818`         | Merge Requests                  | [54](54.md)                            |
| `1018`        | Poll Response                   | [88](88.md)                            |
| `1021`        | Bid                             | [15](15.md)                            |
| `1022`        | Bid confirmation                | [15](15.md)                            |
| `1040`        | OpenTimestamps                  | [03](03.md)                            |
| `1059`        | Gift Wrap                       | [59](59.md)                            |
| `1063`        | File Metadata                   | [94](94.md)                            |
| `1068`        | Poll                            | [88](88.md)                            |
| `1111`        | Comment                         | [22](22.md)                            |
| `1311`        | Live Chat Message               | [53](53.md)                            |
| `1337`        | Code Snippet                    | [C0](C0.md)                            |
| `1617`        | Patches                         | [34](34.md)                            |
| `1621`        | Issues                          | [34](34.md)                            |
| `1622`        | Git Replies (deprecated)        | [34](34.md)                            |
| `1630`-`1633` | Status                          | [34](34.md)                            |
| `1971`        | Problem Tracker                 | [nostrocket][nostrocket]               |
| `1984`        | Reporting                       | [56](56.md)                            |
| `1985`        | Label                           | [32](32.md)                            |
| `1986`        | Relay reviews                   |                                        |
| `1987`        | AI Embeddings / Vector lists    | [NKBIP-02]                             |
| `2003`        | Torrent                         | [35](35.md)                            |
| `2004`        | Torrent Comment                 | [35](35.md)                            |
| `2022`        | Coinjoin Pool                   | [joinstr][joinstr]                     |
| `4550`        | Community Post Approval         | [72](72.md)                            |
| `5000`-`5999` | Job Request                     | [90](90.md)                            |
| `6000`-`6999` | Job Result                      | [90](90.md)                            |
| `7000`        | Job Feedback                    | [90](90.md)                            |
| `7374`        | Reserved Cashu Wallet Tokens    | [60](60.md)                            |
| `7375`        | Cashu Wallet Tokens             | [60](60.md)                            |
| `7376`        | Cashu Wallet History            | [60](60.md)                            |
| `9000`-`9030` | Group Control Events            | [29](29.md)                            |
| `9031`-`9061` | Channel Control Events          | [29a](29a.md)                          |
| `9041`        | Zap Goal                        | [75](75.md)                            |
| `9321`        | Nutzap                          | [61](61.md)                            |
| `9467`        | Tidal login                     | [Tidal-nostr]                          |
| `9734`        | Zap Request                     | [57](57.md)                            |
| `9735`        | Zap                             | [57](57.md)                            |
| `9802`        | Highlights                      | [84](84.md)                            |
| `10000`       | Mute list                       | [51](51.md)                            |
| `10001`       | Pin list                        | [51](51.md)                            |
| `10002`       | Relay List Metadata             | [65](65.md), [51](51.md)               |
| `10003`       | Bookmark list                   | [51](51.md)                            |
| `10004`       | Communities list                | [51](51.md)                            |
| `10005`       | Public chats list               | [51](51.md)                            |
| `10006`       | Blocked relays list             | [51](51.md)                            |
| `10007`       | Search relays list              | [51](51.md)                            |
| `10009`       | User groups                     | [51](51.md), [29](29.md)               |
| `10013`       | Private event relay list        | [37](37.md)                            |
| `10015`       | Interests list                  | [51](51.md)                            |
| `10019`       | Nutzap Mint Recommendation      | [61](61.md)                            |
| `10030`       | User emoji list                 | [51](51.md)                            |
| `10050`       | Relay list to receive DMs       | [51](51.md), [17](17.md)               |
| `10063`       | User server list                | [Blossom][blossom]                     |
| `10096`       | File storage server list        | [96](96.md)                            |
| `10166`       | Relay Monitor Announcement      | [66](66.md)                            |
| `13194`       | Wallet Info                     | [47](47.md)                            |
| `17375`       | Cashu Wallet Event              | [60](60.md)                            |
| `21000`       | Lightning Pub RPC               | [Lightning.Pub][lnpub]                 |
| `22242`       | Client Authentication           | [42](42.md)                            |
| `23194`       | Wallet Request                  | [47](47.md)                            |
| `23195`       | Wallet Response                 | [47](47.md)                            |
| `24133`       | Nostr Connect                   | [46](46.md)                            |
| `24242`       | Blobs stored on mediaservers    | [Blossom][blossom]                     |
| `27235`       | HTTP Auth                       | [98](98.md)                            |
| `30000`       | Follow sets                     | [51](51.md)                            |
| `30001`       | Generic lists                   | 51 (deprecated)                        |
| `30002`       | Relay sets                      | [51](51.md)                            |
| `30003`       | Bookmark sets                   | [51](51.md)                            |
| `30004`       | Curation sets                   | [51](51.md)                            |
| `30005`       | Video sets                      | [51](51.md)                            |
| `30007`       | Kind mute sets                  | [51](51.md)                            |
| `30008`       | Profile Badges                  | [58](58.md)                            |
| `30009`       | Badge Definition                | [58](58.md)                            |
| `30015`       | Interest sets                   | [51](51.md)                            |
| `30017`       | Create or update a stall        | [15](15.md)                            |
| `30018`       | Create or update a product      | [15](15.md)                            |
| `30019`       | Marketplace UI/UX               | [15](15.md)                            |
| `30020`       | Product sold as an auction      | [15](15.md)                            |
| `30023`       | Long-form Content               | [23](23.md)                            |
| `30024`       | Draft Long-form Content         | [23](23.md)                            |
| `30030`       | Emoji sets                      | [51](51.md)                            |
| `30040`       | Curated Publication Index       | [NKBIP-01]                             |
| `30041`       | Curated Publication Content     | [NKBIP-01]                             |
| `30063`       | Release artifact sets           | [51](51.md)                            |
| `30078`       | Application-specific Data       | [78](78.md)                            |
| `30166`       | Relay Discovery                 | [66](66.md)                            |
| `30267`       | App curation sets               | [51](51.md)                            |
| `30311`       | Live Event                      | [53](53.md)                            |
| `30315`       | User Statuses                   | [38](38.md)                            |
| `30388`       | Slide Set                       | [Corny Chat][cornychat-slideset]       |
| `30402`       | Classified Listing              | [99](99.md)                            |
| `30403`       | Draft Classified Listing        | [99](99.md)                            |
| `30617`       | Repository announcements        | [34](34.md)                            |
| `30618`       | Repository state announcements  | [34](34.md)                            |
| `30818`       | Wiki article                    | [54](54.md)                            |
| `30819`       | Redirects                       | [54](54.md)                            |
| `31234`       | Draft Event                     | [37](37.md)                            |
| `31388`       | Link Set                        | [Corny Chat][cornychat-linkset]        |
| `31890`       | Feed                            | [NUD: Custom Feeds][NUD: Custom Feeds] |
| `31922`       | Date-Based Calendar Event       | [52](52.md)                            |
| `31923`       | Time-Based Calendar Event       | [52](52.md)                            |
| `31924`       | Calendar                        | [52](52.md)                            |
| `31925`       | Calendar Event RSVP             | [52](52.md)                            |
| `31989`       | Handler recommendation          | [89](89.md)                            |
| `31990`       | Handler information             | [89](89.md)                            |                         |
| `32267`       | Software Application            |                                        |                        |
| `34550`       | Community Definition            | [72](72.md)                            |
| `38383`       | Peer-to-peer Order events       | [69](69.md)                            |
| `39000-9`     | Group metadata events           | [29](29.md)                            |
| `39701`       | Web bookmarks                   | [B0](B0.md)                            |

[NUD: Custom Feeds]: https://wikifreedia.xyz/cip-01/
[nostrocket]: https://github.com/nostrocket/NIPS/blob/main/Problems.md
[lnpub]: https://github.com/shocknet/Lightning.Pub/blob/master/proto/autogenerated/client.md
[cornychat-slideset]: https://cornychat.com/datatypes#kind30388slideset
[cornychat-linkset]: https://cornychat.com/datatypes#kind31388linkset
[joinstr]: https://gitlab.com/1440000bytes/joinstr/-/blob/main/NIP.md
[NKBIP-01]: https://wikistr.com/nkbip-01*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1
[NKBIP-02]: https://wikistr.com/nkbip-02*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1
[NKBIP-03]: https://wikistr.com/nkbip-03*fd208ee8c8f283780a9552896e4823cc9dc6bfd442063889577106940fd927c1
[blossom]: https://github.com/hzrd149/blossom
[Tidal-nostr]: https://wikistr.com/tidal-nostr

## Message types

### Client to Relay

| type    | description                                         | NIP         |
| ------- | --------------------------------------------------- | ----------- |
| `EVENT` | used to publish events                              | [01](01.md) |
| `REQ`   | used to request events and subscribe to new updates | [01](01.md) |
| `CLOSE` | used to stop previous subscriptions                 | [01](01.md) |
| `AUTH`  | used to send authentication events                  | [42](42.md) |
| `COUNT` | used to request event counts                        | [45](45.md) |

### Relay to Client

| type     | description                                             | NIP         |
| -------- | ------------------------------------------------------- | ----------- |
| `EOSE`   | used to notify clients all stored events have been sent | [01](01.md) |
| `EVENT`  | used to send events requested to clients                | [01](01.md) |
| `NOTICE` | used to send human-readable messages to clients         | [01](01.md) |
| `OK`     | used to notify clients if an EVENT was successful       | [01](01.md) |
| `CLOSED` | used to notify clients that a REQ was ended and why     | [01](01.md) |
| `AUTH`   | used to send authentication challenges                  | [42](42.md) |
| `COUNT`  | used to send requested event counts to clients          | [45](45.md) |

## Standardized Tags

| name              | value                                | other parameters                | NIP                                                |
| ----------------- | ------------------------------------ | ------------------------------- | -------------------------------------------------- |
| `a`               | coordinates to an event              | relay URL                       | [01](01.md)                                        |
| `A`               | root address                         | relay URL                       | [22](22.md)                                        |
| `d`               | identifier                           | --                              | [01](01.md)                                        |
| `e`               | event id (hex)                       | relay URL, marker, pubkey (hex) | [01](01.md), [10](10.md)                           |
| `E`               | root event id                        | relay URL                       | [22](22.md)                                        |
| `f`               | currency code                        | --                              | [69](69.md)                                        |
| `g`               | geohash                              | --                              | [52](52.md)                                        |
| `h`               | group id                             | --                              | [29](29.md)                                        |
| `t`               | channel id                           | --                              | [29a](29a.md)                                      |
| `i`               | external identity                    | proof, url hint                 | [35](35.md), [39](39.md), [73](73.md)              |
| `I`               | root external identity               | --                              | [22](22.md)                                        |
| `k`               | kind                                 | --                              | [18](18.md), [25](25.md), [72](72.md), [73](73.md) |
| `K`               | root scope                           | --                              | [22](22.md)                                        |
| `l`               | label, label namespace, language name| --                              | [32](32.md), [C0](C0.md)                           |
| `L`               | label namespace                      | --                              | [32](32.md)                                        |
| `m`               | MIME type                            | --                              | [94](94.md)                                        |
| `p`               | pubkey (hex)                         | relay URL, petname              | [01](01.md), [02](02.md), [22](22.md)              |
| `P`               | pubkey (hex)                         | --                              | [22](22.md), [57](57.md)                           |
| `q`               | event id (hex)                       | relay URL, pubkey (hex)         | [18](18.md)                                        |
| `r`               | a reference (URL, etc)               | --                              | [24](24.md), [25](25.md)                           |
| `r`               | relay url                            | marker                          | [65](65.md)                                        |
| `s`               | status                               | --                              | [69](69.md)                                        |
| `t`               | hashtag                              | --                              | [24](24.md), [34](34.md), [35](35.md)              |
| `u`               | url                                  | --                              | [61](61.md), [98](98.md)                           |
| `x`               | hash                                 | --                              | [35](35.md), [56](56.md)                           |
| `y`               | platform                             | --                              | [69](69.md)                                        |
| `z`               | order number                         | --                              | [69](69.md)                                        |
| `-`               | --                                   | --                              | [70](70.md)                                        |
| `alt`             | summary                              | --                              | [31](31.md)                                        |
| `amount`          | millisatoshis, stringified           | --                              | [57](57.md)                                        |
| `bolt11`          | `bolt11` invoice                     | --                              | [57](57.md)                                        |
| `challenge`       | challenge string                     | --                              | [42](42.md)                                        |
| `client`          | name, address                        | relay URL                       | [89](89.md)                                        |
| `clone`           | git clone URL                        | --                              | [34](34.md)                                        |
| `content-warning` | reason                               | --                              | [36](36.md)                                        |
| `delegation`      | pubkey, conditions, delegation token | --                              | [26](26.md)                                        |
| `dep`             | Required dependency                  | --                              | [C0](C0.md)                                        |
| `description`     | description                          | --                              | [34](34.md), [57](57.md), [58](58.md), [C0](C0.md) |
| `emoji`           | shortcode, image URL                 | --                              | [30](30.md)                                        |
| `encrypted`       | --                                   | --                              | [90](90.md)                                        |
| `extension`       | File extension                       | --                              | [C0](C0.md)                                        |
| `expiration`      | unix timestamp (string)              | --                              | [40](40.md)                                        |
| `file`            | full path (string)                   | --                              | [35](35.md)                                        |
| `goal`            | event id (hex)                       | relay URL                       | [75](75.md)                                        |
| `image`           | image URL                            | dimensions in pixels            | [23](23.md), [52](52.md), [58](58.md)              |
| `imeta`           | inline metadata                      | --                              | [92](92.md)                                        |
| `license`         | License of the shared content        | --                              | [C0](C0.md)                                        |
| `lnurl`           | `bech32` encoded `lnurl`             | --                              | [57](57.md)                                        |
| `location`        | location string                      | --                              | [52](52.md), [99](99.md)                           |
| `name`            | name                                 | --                              | [34](34.md), [58](58.md), [72](72.md), [C0](C0.md) |
| `nonce`           | random                               | difficulty                      | [13](13.md)                                        |
| `preimage`        | hash of `bolt11` invoice             | --                              | [57](57.md)                                        |
| `price`           | price                                | currency, frequency             | [99](99.md)                                        |
| `proxy`           | external ID                          | protocol                        | [48](48.md)                                        |
| `published_at`    | unix timestamp (string)              | --                              | [23](23.md), [B0](B0.md)                           |
| `relay`           | relay url                            | --                              | [42](42.md), [17](17.md)                           |
| `relays`          | relay list                           | --                              | [57](57.md)                                        |
| `repo`            | Reference to the origin repository   | --                              | [C0](C0.md)                                        |
| `runtime`         | Runtime or environment specification | --                              | [C0](C0.md)                                        |
| `server`          | file storage server url              | --                              | [96](96.md)                                        |
| `subject`         | subject                              | --                              | [14](14.md), [17](17.md), [34](34.md)              |
| `summary`         | summary                              | --                              | [23](23.md), [52](52.md)                           |
| `thumb`           | badge thumbnail                      | dimensions in pixels            | [58](58.md)                                        |
| `title`           | title                                | --                              | [23](23.md), [B0](B0.md)                           |
| `tracker`         | torrent tracker URL                  | --                              | [35](35.md)                                        |
| `web`             | webpage URL                          | --                              | [34](34.md)                                        |
| `zap`             | pubkey (hex), relay URL              | weight                          | [57](57.md)                                        |

Please update these lists when proposing new NIPs.

## Criteria for acceptance of NIPs

1. They should be fully implemented in at least two clients and one relay -- when applicable.
2. They should make sense.
3. They should be optional and backwards-compatible: care must be taken such that clients and relays that choose to not implement them do not stop working when interacting with the ones that choose to.
4. There should be no more than one way of doing the same thing.
5. Other rules will be made up when necessary.

## Is this repository a centralizing factor?

To promote interoperability, we need standards that everybody can follow, and we need them to define a **single way of doing each thing** without ever hurting **backwards-compatibility**, and for that purpose there is no way around getting everybody to agree on the same thing and keep a centralized index of these standards. However the fact that such an index exists doesn't hurt the decentralization of Nostr. _At any point the central index can be challenged if it is failing to fulfill the needs of the protocol_ and it can migrate to other places and be maintained by other people.

It can even fork into multiple versions, and then some clients would go one way, others would go another way, and some clients would adhere to both competing standards. This would hurt the simplicity, openness and interoperability of Nostr a little, but everything would still work in the short term.

There is a list of notable Nostr software developers who have commit access to this repository, but that exists mostly for practical reasons, as by the nature of the thing we're dealing with the repository owner can revoke membership and rewrite history as they want -- and if these actions are unjustified or perceived as bad or evil the community must react.

## How this repository works

Standards may emerge in two ways: the first way is that someone starts doing something, then others copy it; the second way is that someone has an idea of a new standard that could benefit multiple clients and the protocol in general without breaking **backwards-compatibility** and the principle of having **a single way of doing things**, then they write that idea and submit it to this repository, other interested parties read it and give their feedback, then once most people reasonably agree we codify that in a NIP which client and relay developers that are interested in the feature can proceed to implement.

These two ways of standardizing things are supported by this repository. Although the second is preferred, an effort will be made to codify standards emerged outside this repository into NIPs that can be later referenced and easily understood and implemented by others -- but obviously as in any human system discretion may be applied when standards are considered harmful.

## Breaking Changes

[Breaking Changes](BREAKING.md)

## License

All NIPs are public domain.

## Contributors

<a align="center" href="https://github.com/nostr-protocol/nips/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=nostr-protocol/nips" />
</a>
