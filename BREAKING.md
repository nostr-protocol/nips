# Breaking Changes

This is a history of NIP changes that potentially break pre-existing implementations, in
reverse chronological order.

| Date        | Commit    | NIP      | Change |
| ----------- | --------- | -------- | ------ |
| 2024-02-16  | [cbec02ab](https://github.com/nostr-protocol/nips/commit/cbec02ab) | [NIP-49](49.md) | Password first normalized to NFKC |
| 2024-02-15  | [afbb8dd0](https://github.com/nostr-protocol/nips/commit/afbb8dd0) | [NIP-39](39.md) | PGP identity was removed |
| 2024-02-07  | [d3dad114](https://github.com/nostr-protocol/nips/commit/d3dad114)  | [NIP-46](46.md) | Connection token format was changed |
| 2024-01-30  | [1a2b21b6](https://github.com/nostr-protocol/nips/commit/1a2b21b6)  | [NIP-59](59.md) | 'p' tag became optional |
| 2023-01-27  | [c2f34817](https://github.com/nostr-protocol/nips/commit/c2f34817)  | [NIP-47](47.md) | optional expiration tag should be honored |
| 2024-01-10  | [3d8652ea](https://github.com/nostr-protocol/nips/commit/3d8652ea)  | [NIP-02](02.md) | list entries should be chronological |
| 2024-01-10  | [3d8652ea](https://github.com/nostr-protocol/nips/commit/3d8652ea)  | [NIP-51](51.md) | list entries should be chronological |
| 2023-12-30  | [29869821](https://github.com/nostr-protocol/nips/commit/29869821)  | [NIP-52](52.md) | 'name' tag was removed (use 'title' tag instead) |
| 2023-12-27  | [17c67ef5](https://github.com/nostr-protocol/nips/commit/17c67ef5)  | [NIP-94](94.md) | 'aes-256-gcm' tag was removed |
| 2023-12-03  | [0ba45895](https://github.com/nostr-protocol/nips/commit/0ba45895)  | [NIP-01](01.md) | WebSocket status code `4000` was replaced by 'CLOSED' message |
| 2023-12-02  | [d67988e6](https://github.com/nostr-protocol/nips/commit/d67988e6)  | NIP-22 | NIP-22 was deleted |

Breaking changes prior to 2024-01-01 are not yet documented.

## NOTES

- If it isn't clear that a change is breaking or not, we list it.
- The date is the date it was merged, not necessarily the date of the commit.
