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
- [NIP-22: Event created_at Limits](22.md)
- [NIP-25: Reactions](25.md)
- [NIP-27: Multicasting](27.md)

## Event Kinds

| kind | description               | NIP  |
|------|---------------------------|------|
| 0    | Metadata                  | 1, 5 |
| 1    | Text                      | 1    |
| 2    | Recommend Relay           | 1    |
| 3    | Contacts                  | 2    |
| 4    | Encrypted Direct Messages | 4    |
| 5    | Event Deletion            | 9    |
| 7    | Reaction                  | 25   |

Please update this list when proposing NIPs introducing new event kinds.

When experimenting with kinds, keep in mind the classification introduced by [NIP-16](16.md).

## Criteria for acceptance of NIPs

1. They should be implemented somewhere at least as a prototype somewhere.
2. They should make sense.
3. Other rules will be made up when necessary.

## License

All NIPs are public domain.
