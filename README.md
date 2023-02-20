# NIPs

NIPs stand for **Nostr Implementation Possibilities**. They exist to document what may be implemented by [Nostr](https://github.com/fiatjaf/nostr)-compatible _relay_ and _client_ software.

- [NIP-01: Basic protocol flow description](01.md)
- [NIP-02: Contact List and Petnames](02.md)
- [NIP-03: OpenTimestamps Attestations for Events](03.md)
- [NIP-04: Encrypted Direct Message](04.md)
- [NIP-05: Mapping Nostr keys to DNS-based internet identifiers](05.md)
- [NIP-06: Basic key derivation from mnemonic seed phrase](06.md)
- [NIP-07: `window.nostr` capability for web browsers](07.md)
- [NIP-08: Handling Mentions](08.md)
- [NIP-09: Event Deletion](09.md)
- [NIP-10: Conventions for clients' use of `e` and `p` tags in text events](10.md)
- [NIP-11: Relay Information Document](11.md)
- [NIP-12: Generic Tag Queries](12.md)
- [NIP-13: Proof of Work](13.md)
- [NIP-14: Subject tag in text events.](14.md)
- [NIP-15: End of Stored Events Notice](15.md)
- [NIP-16: Event Treatment](16.md)
- [NIP-19: bech32-encoded entities](19.md)
- [NIP-20: Command Results](20.md)
- [NIP-21: `nostr:` URL scheme](21.md)
- [NIP-22: Event `created_at` Limits](22.md)
- [NIP-23: Long-form Content](23.md)
- [NIP-25: Reactions](25.md)
- [NIP-26: Delegated Event Signing](26.md)
- [NIP-28: Public Chat](28.md)
- [NIP-33: Parameterized Replaceable Events](33.md)
- [NIP-36: Sensitive Content](36.md)
- [NIP-40: Expiration Timestamp](40.md)
- [NIP-42: Authentication of clients to relays](42.md)
- [NIP-46: Nostr Connect](46.md) 
- [NIP-50: Keywords filter](50.md)
- [NIP-56: Reporting](56.md)
- [NIP-57: Lightning Zaps](57.md)
- [NIP-65: Relay List Metadata](65.md)

## Event Kinds
| kind          | description                      | NIP                     |
| ------------- | -------------------------------- | ----------------------- |
| 0             | Metadata                         | [1](01.md), [5](05.md)  |
| 1             | Short Text Note                  | [1](01.md)              |
| 2             | Recommend Relay                  | [1](01.md)              |
| 3             | Contacts                         | [2](02.md)              |
| 4             | Encrypted Direct Messages        | [4](04.md)              |
| 5             | Event Deletion                   | [9](09.md)              |
| 7             | Reaction                         | [25](25.md)             |
| 40            | Channel Creation                 | [28](28.md)             |
| 41            | Channel Metadata                 | [28](28.md)             |
| 42            | Channel Message                  | [28](28.md)             |
| 43            | Channel Hide Message             | [28](28.md)             |
| 44            | Channel Mute User                | [28](28.md)             |
| 45-49         | Public Chat Reserved             | [28](28.md)             |
| 1984          | Reporting                        | [56](56.md)             |
| 9734          | Zap Request                      | [57](57.md)             |
| 9735          | Zap                              | [57](57.md)             |
| 10002         | Relay List Metadata              | [65](65.md)             |
| 22242         | Client Authentication            | [42](42.md)             |
| 24133         | Nostr Connect                    | [46](46.md)             |
| 30023         | Long-form Content                | [23](23.md)             |
| 1000-9999     | Regular Events                   | [16](16.md)             |
| 10000-19999   | Replaceable Events               | [16](16.md)             |
| 20000-29999   | Ephemeral Events                 | [16](16.md)             |
| 30000-39999   | Parameterized Replaceable Events | [33](33.md)             |



## Message types

### Client to Relay
| type  | description                                         | NIP         |
|-------|-----------------------------------------------------|-------------|
| EVENT | used to publish events                              | [1](01.md)  |
| REQ   | used to request events and subscribe to new updates | [1](01.md)  |
| CLOSE | used to stop previous subscriptions                 | [1](01.md)  |
| AUTH  | used to send authentication events                  | [42](42.md) |

### Relay to Client
| type   | description                                             | NIP         |
|--------|---------------------------------------------------------|-------------|
| EVENT  | used to send events requested to clients                | [1](01.md)  |
| NOTICE | used to send human-readable messages to clients         | [1](01.md)  |
| EOSE   | used to notify clients all stored events have been sent | [15](15.md) |
| OK     | used to notify clients if an EVENT was successuful      | [20](20.md) |
| AUTH   | used to send authentication challenges                  | [42](42.md) |

Please update these lists when proposing NIPs introducing new event kinds.

When experimenting with kinds, keep in mind the classification introduced by [NIP-16](16.md).

## Standardized Tags

| name       | value                   | other parameters  | NIP                      |
| ---------- | ----------------------- | ----------------- | ------------------------ |
| e          | event id (hex)          | relay URL, marker | [1](01.md), [10](10.md)  |
| p          | pubkey (hex)            | relay URL         | [1](01.md)               |
| a          | coordinates to an event | relay URL         | [33](33.md), [23](23.md) |
| r          | a reference (URL, etc)  |                   | [12](12.md)              |
| t          | hashtag                 |                   | [12](12.md)              |
| g          | geohash                 |                   | [12](12.md)              |
| nonce      | random                  |                   | [13](13.md)              |
| subject    | subject                 |                   | [14](14.md)              |
| d          | identifier              |                   | [33](33.md)              |
| expiration | unix timestamp (string) |                   | [40](40.md)              |

## Criteria for acceptance of NIPs

1. They should be implemented in at least two clients and one relay -- when applicable.
2. They should make sense.
3. They should be optional and backwards-compatible: care must be taken such that clients and relays that choose to not implement them do not stop working when interacting with the ones that choose to.
4. There should be no more than one way of doing the same thing.
5. Other rules will be made up when necessary.

## License

All NIPs are public domain.
