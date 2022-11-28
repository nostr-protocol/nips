# NIPs

NIPs stand for **Nostr Implementation Possibilities**. They exist to document what MUST, what SHOULD and what MAY be implemented by [Nostr](https://github.com/fiatjaf/nostr)-compatible _relay_ and _client_ software.

- [NIP-01: Basic protocol flow description](01.md)
- [NIP-02: Contact List and Petnames](02.md)
- [NIP-03: OpenTimestamps Attestations for Events](03.md)
- [NIP-04: Encrypted Direct Message](04.md)
- [NIP-05: Mapping Nostr keys to DNS-based internet identifiers](05.md)
- [NIP-06: Basic key derivation from mnemonic seed phrase](06.md)
- [NIP-07: `window.nostr` capability for web browsers](07.md)
- [NIP-08: Handling Mentions](08.md)
- [NIP-09: Event Deletion](09.md)
- [NIP-10: Conventions for clients' use of `e` and `p` tags in text events.](10.md)
- [NIP-11: Relay Information Document](11.md)
- [NIP-12: Generic Tag Queries](12.md)
- [NIP-13: Proof of Work](13.md)
- [NIP-14: Subject tag in text events.](14.md)
- [NIP-15: End of Stored Events Notice](15.md)
- [NIP-16: Event Treatment](16.md)
- [NIP-20: Command Results](20.md)
- [NIP-22: Event created_at Limits](22.md)
- [NIP-25: Reactions](25.md)
- [NIP-26: Delegated Event Signing](26.md)
- [NIP-28: Public Chat](28.md)
- [NIP-35: User Discovery](35.md)

## Event Kinds

| kind        | description                 | NIP                    |
|-------------|-----------------------------|------------------------|
| 0           | Metadata                    | [1](01.md), [5](05.md) |
| 1           | Text                        | [1](01.md)             |
| 2           | Recommend Relay             | [1](01.md)             |
| 3           | Contacts                    | [2](02.md)             |
| 4           | Encrypted Direct Messages   | [4](04.md)             |
| 5           | Event Deletion              | [9](09.md)             |
| 7           | Reaction                    | [25](25.md)            |
| 40          | Channel Creation            | [28](28.md)            |
| 41          | Channel Metadata            | [28](28.md)            |
| 42          | Channel Message             | [28](28.md)            |
| 43          | Channel Hide Message        | [28](28.md)            |
| 44          | Channel Mute User           | [28](28.md)            |
| 45-49       | Public Chat Reserved        | [28](28.md)            |
| 10000-19999 | Replaceable Events Reserved | [16](16.md)            |
| 20000-29999 | Ephemeral Events Reserved   | [16](16.md)            |


## Message types

### Client to Relay
| type  | description                                         | NIP        |
|-------|-----------------------------------------------------|------------|
| EVENT | used to publish events                              | [1](01.md) |
| REQ   | used to request events and subscribe to new updates | [1](01.md) |
| CLOSE | used to stop previous subscriptions                 | [1](01.md) |

### Relay to Client
| type   | description                                             | NIP         |
|--------|---------------------------------------------------------|-------------|
| EVENT  | used to send events requested to clients                | [1](01.md)  |
| NOTICE | used to send human-readable messages to clients         | [1](01.md)  |
| EOSE   | used to notify clients all stored events have been sent | [15](15.md) |
| OK     | used to notify clients if an EVENT was successuful      | [20](20.md) |

Please update these lists when proposing NIPs introducing new event kinds.

When experimenting with kinds, keep in mind the classification introduced by [NIP-16](16.md).

## Criteria for acceptance of NIPs

1. They should be implemented somewhere at least as a prototype somewhere.
2. They should make sense.
3. Other rules will be made up when necessary.

## License

All NIPs are public domain.
