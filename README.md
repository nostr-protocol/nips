- [List](#list)
- [Event Kinds](#event-kinds)
  - [Event Kind Ranges](#event-kind-ranges)
- [Message Types](#message-types)
  - [Client to Relay](#client-to-relay)
  - [Relay to Client](#relay-to-client)
- [Standardized Tags](#standardized-tags)
- [Criteria for acceptance of NIPs](#criteria-for-acceptance-of-nips)
- [License](#license)

---

## List

- [NIP-01: Basic protocol flow description](01.md)
- [NIP-02: Contact List and Petnames](02.md)
- [NIP-03: OpenTimestamps Attestations for Events](03.md)
- [NIP-04: Encrypted Direct Message](04.md)
- [NIP-05: Mapping Nostr keys to DNS-based internet identifiers](05.md)
- [NIP-06: Basic key derivation from mnemonic seed phrase](06.md)
- [NIP-07: `window.nostr` capability for web browsers](07.md)
- [NIP-08: Handling Mentions](08.md) --- **unrecommended**: deprecated in favor of [NIP-27](27.md)
- [NIP-09: Event Deletion](09.md)
- [NIP-10: Conventions for clients' use of `e` and `p` tags in text events](10.md)
- [NIP-11: Relay Information Document](11.md)
- [NIP-12: Generic Tag Queries](12.md)
- [NIP-13: Proof of Work](13.md)
- [NIP-14: Subject tag in text events.](14.md)
- [NIP-15: Nostr Marketplace (for resilient marketplaces)](15.md)
- [NIP-16: Event Treatment](16.md)
- [NIP-18: Reposts](18.md)
- [NIP-19: bech32-encoded entities](19.md)
- [NIP-20: Command Results](20.md)
- [NIP-21: `nostr:` URL scheme](21.md)
- [NIP-22: Event `created_at` Limits](22.md)
- [NIP-23: Long-form Content](23.md)
- [NIP-25: Reactions](25.md)
- [NIP-26: Delegated Event Signing](26.md)
- [NIP-27: Text Note References](27.md)
- [NIP-28: Public Chat](28.md)
- [NIP-30: Custom Emoji](30.md)
- [NIP-31: Dealing with Unknown Events](31.md)
- [NIP-32: Labeling](32.md)
- [NIP-33: Parameterized Replaceable Events](33.md)
- [NIP-36: Sensitive Content](36.md)
- [NIP-39: External Identities in Profiles](39.md)
- [NIP-40: Expiration Timestamp](40.md)
- [NIP-42: Authentication of clients to relays](42.md)
- [NIP-45: Counting results](45.md)
- [NIP-46: Nostr Connect](46.md)
- [NIP-47: Wallet Connect](47.md)
- [NIP-50: Keywords filter](50.md)
- [NIP-51: Lists](51.md)
- [NIP-53: Live Activities](53.md)
- [NIP-56: Reporting](56.md)
- [NIP-57: Lightning Zaps](57.md)
- [NIP-58: Badges](58.md)
- [NIP-65: Relay List Metadata](65.md)
- [NIP-69: Zap Polls](69.md)
- [NIP-78: Application-specific data](78.md)
- [NIP-89: Recommended Application Handlers](89.md)
- [NIP-94: File Metadata](94.md)
- [NIP-98: HTTP Auth](98.md)

## Event Kinds

| kind    | description                | NIP         |
| ------- | -------------------------- | ----------- |
| `0`     | Metadata                   | [1](01.md)  |
| `1`     | Short Text Note            | [1](01.md)  |
| `2`     | Recommend Relay            | [1](01.md)  |
| `3`     | Contacts                   | [2](02.md)  |
| `4`     | Encrypted Direct Messages  | [4](04.md)  |
| `5`     | Event Deletion             | [9](09.md)  |
| `6`     | Repost                     | [18](18.md) |
| `7`     | Reaction                   | [25](25.md) |
| `8`     | Badge Award                | [58](58.md) |
| `16`    | Generic Repost             | [18](18.md) |
| `40`    | Channel Creation           | [28](28.md) |
| `41`    | Channel Metadata           | [28](28.md) |
| `42`    | Channel Message            | [28](28.md) |
| `43`    | Channel Hide Message       | [28](28.md) |
| `44`    | Channel Mute User          | [28](28.md) |
| `1063`  | File Metadata              | [94](94.md) |
| `1311`  | Live Chat Message          | [53](53.md) |
| `1984`  | Reporting                  | [56](56.md) |
| `1985`  | Label                      | [32](32.md) |
| `6969`  | Zap Poll                   | [69](69.md) |
| `9734`  | Zap Request                | [57](57.md) |
| `9735`  | Zap                        | [57](57.md) |
| `10000` | Mute List                  | [51](51.md) |
| `10001` | Pin List                   | [51](51.md) |
| `10002` | Relay List Metadata        | [65](65.md) |
| `13194` | Wallet Info                | [47](47.md) |
| `22242` | Client Authentication      | [42](42.md) |
| `23194` | Wallet Request             | [47](47.md) |
| `23195` | Wallet Response            | [47](47.md) |
| `24133` | Nostr Connect              | [46](46.md) |
| `27235` | HTTP Auth                  | [98](98.md) |
| `30000` | Categorized People List    | [51](51.md) |
| `30001` | Categorized Bookmark List  | [51](51.md) |
| `30008` | Profile Badges             | [58](58.md) |
| `30009` | Badge Definition           | [58](58.md) |
| `30017` | Create or update a stall   | [15](15.md) |
| `30018` | Create or update a product | [15](15.md) |
| `30023` | Long-form Content          | [23](23.md) |
| `30078` | Application-specific Data  | [78](78.md) |
| `30311` | Live Event                 | [53](53.md) |
| `31989` | Handler recommendation     | [89](89.md) |
| `31990` | Handler information        | [89](89.md) |

### Event Kind Ranges

| range            | description                      | NIP         |
| ---------------- | -------------------------------- | ----------- |
| `1000`--`9999`   | Regular Events                   | [16](16.md) |
| `10000`--`19999` | Replaceable Events               | [16](16.md) |
| `20000`--`29999` | Ephemeral Events                 | [16](16.md) |
| `30000`--`39999` | Parameterized Replaceable Events | [33](33.md) |

## Message types

### Client to Relay

| type    | description                                         | NIP         |
| ------- | --------------------------------------------------- | ----------- |
| `AUTH`  | used to send authentication events                  | [42](42.md) |
| `CLOSE` | used to stop previous subscriptions                 | [1](01.md)  |
| `COUNT` | used to request event counts                        | [45](45.md) |
| `EVENT` | used to publish events                              | [1](01.md)  |
| `REQ`   | used to request events and subscribe to new updates | [1](01.md)  |

### Relay to Client

| type     | description                                             | NIP         |
| -------- | ------------------------------------------------------- | ----------- |
| `AUTH`   | used to send authentication challenges                  | [42](42.md) |
| `COUNT`  | used to send requested event counts to clients          | [45](45.md) |
| `EOSE`   | used to notify clients all stored events have been sent | [1](01.md)  |
| `EVENT`  | used to send events requested to clients                | [1](01.md)  |
| `NOTICE` | used to send human-readable messages to clients         | [1](01.md)  |
| `OK`     | used to notify clients if an EVENT was successful       | [20](20.md) |

Please update these lists when proposing NIPs introducing new event kinds.

When experimenting with kinds, keep in mind the classification introduced by [NIP-16](16.md) and [NIP-33](33.md).

## Standardized Tags

| name              | value                                | other parameters     | NIP                      |
| ----------------- | ------------------------------------ | -------------------- | ------------------------ |
| `a`               | coordinates to an event              | relay URL            | [33](33.md), [23](23.md) |
| `alt`             | Alt tag                              | --                   | [31](31.md)              |
| `d`               | identifier                           | --                   | [33](33.md)              |
| `e`               | event id (hex)                       | relay URL, marker    | [1](01.md), [10](10.md)  |
| `g`               | geohash                              | --                   | [12](12.md)              |
| `i`               | identity                             | proof                | [39](39.md)              |
| `l`               | label, label namespace               | annotations          | [32](32.md)              |
| `L`               | label namespace                      | --                   | [32](32.md)              |
| `p`               | pubkey (hex)                         | relay URL            | [1](01.md)               |
| `r`               | a reference (URL, etc)               | --                   | [12](12.md)              |
| `t`               | hashtag                              | --                   | [12](12.md)              |
| `amount`          | millisats                            | --                   | [57](57.md)              |
| `bolt11`          | `bolt11` invoice                     | --                   | [57](57.md)              |
| `challenge`       | challenge string                     | --                   | [42](42.md)              |
| `content-warning` | reason                               | --                   | [36](36.md)              |
| `delegation`      | pubkey, conditions, delegation token | --                   | [26](26.md)              |
| `description`     | badge description                    | --                   | [58](58.md)              |
| `description`     | invoice description                  | --                   | [57](57.md)              |
| `emoji`           | shortcode, image URL                 | --                   | [30](30.md)              |
| `expiration`      | unix timestamp (string)              | --                   | [40](40.md)              |
| `image`           | image URL                            | dimensions in pixels | [23](23.md), [58](58.md) |
| `lnurl`           | `bech32` encoded `lnurl`             | --                   | [57](57.md)              |
| `name`            | badge name                           | --                   | [58](58.md)              |
| `nonce`           | random                               | --                   | [13](13.md)              |
| `poll_option`     | option key value (string)            | --                   | [57](57.md), [69](69.md) |
| `preimage`        | hash of `bolt11` invoice             | --                   | [57](57.md)              |
| `published_at`    | unix timestamp (string)              | --                   | [23](23.md)              |
| `relay`           | relay url                            | --                   | [42](42.md)              |
| `relays`          | relay list                           | --                   | [57](57.md)              |
| `subject`         | subject                              | --                   | [14](14.md)              |
| `summary`         | article summary                      | --                   | [23](23.md)              |
| `thumb`           | badge thumbnail                      | dimensions in pixels | [58](58.md)              |
| `title`           | article title                        | --                   | [23](23.md)              |
| `zap`             | profile name                         | type of value        | [57](57.md)              |

## Criteria for acceptance of NIPs

1. They should be implemented in at least two clients and one relay -- when applicable.
2. They should make sense.
3. They should be optional and backwards-compatible: care must be taken such that clients and relays that choose to not implement them do not stop working when interacting with the ones that choose to.
4. There should be no more than one way of doing the same thing.
5. Other rules will be made up when necessary.

## License

All NIPs are public domain.
