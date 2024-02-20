# Breaking Changes

This is a history of NIP changes that potentially break pre-existing implementations, in
reverse chronological order.

| Date        | Commit    | NIP      | Change |
| ----------- | --------- | -------- | ------ |
| 2024-02-16  | [cbec02ab](https://github.com/nostr-protocol/nips/commit/cbec02ab) | [NIP-49](49.md) | Password first normalized to NFKC |
| 2024-02-15  | [afbb8dd0](https://github.com/nostr-protocol/nips/commit/afbb8dd0) | [NIP-39](39.md) | PGP identity was removed |
| 2024-02-07  | [d3dad114](https://github.com/nostr-protocol/nips/commit/d3dad114) | [NIP-46](46.md) | Connection token format was changed |
| 2024-01-30  | [1a2b21b6](https://github.com/nostr-protocol/nips/commit/1a2b21b6) | [NIP-59](59.md) | 'p' tag became optional |
| 2023-01-27  | [c2f34817](https://github.com/nostr-protocol/nips/commit/c2f34817) | [NIP-47](47.md) | optional expiration tag should be honored |
| 2024-01-10  | [3d8652ea](https://github.com/nostr-protocol/nips/commit/3d8652ea) | [NIP-02](02.md) | list entries should be chronological |
| 2024-01-10  | [3d8652ea](https://github.com/nostr-protocol/nips/commit/3d8652ea) | [NIP-51](51.md) | list entries should be chronological |
| 2023-12-30  | [29869821](https://github.com/nostr-protocol/nips/commit/29869821) | [NIP-52](52.md) | 'name' tag was removed (use 'title' tag instead) |
| 2023-12-27  | [17c67ef5](https://github.com/nostr-protocol/nips/commit/17c67ef5) | [NIP-94](94.md) | 'aes-256-gcm' tag was removed |
| 2023-12-03  | [0ba45895](https://github.com/nostr-protocol/nips/commit/0ba45895) | [NIP-01](01.md) | WebSocket status code `4000` was replaced by 'CLOSED' message |
| 2023-11-28  | [6de35f9e](https://github.com/nostr-protocol/nips/commit/6de35f9e) | [NIP-89](89.md) | 'client' tag value was changed |
| 2023-11-20  | [7822a8b1](https://github.com/nostr-protocol/nips/commit/7822a8b1) | [NIP-51](51.md) | `kind: 30000` and `kind: 30001` were deprecated |
| 2023-11-11  | [cbdca1e9](https://github.com/nostr-protocol/nips/commit/cbdca1e9) | [NIP-84](84.md) | 'range' tag was removed |
| 2023-11-07  | [108b7f16](https://github.com/nostr-protocol/nips/commit/108b7f16) | [NIP-01](01.md) | 'OK' message must have 4 items |
| 2023-10-17  | [cf672b76](https://github.com/nostr-protocol/nips/commit/cf672b76) | [NIP-03](03.md) | 'block' tag was removed |
| 2023-09-29  | [7dc6385f](https://github.com/nostr-protocol/nips/commit/7dc6385f) | [NIP-57](57.md) | optional 'a' tag was included in `zap receipt` |
| 2023-08-21  | [89915e02](https://github.com/nostr-protocol/nips/commit/89915e02) | [NIP-11](11.md) | 'min_prefix' was removed |
| 2023-08-20  | [37c4375e](https://github.com/nostr-protocol/nips/commit/37c4375e) | [NIP-01](01.md) | replaceable events with same timestamp should be retained event with lowest id |
| 2023-08-15  | [88ee873c](https://github.com/nostr-protocol/nips/commit/88ee873c) | [NIP-15](15.md) | 'countries' tag was renamed to 'regions' |
| 2023-08-14  | [72bb8a12](https://github.com/nostr-protocol/nips/commit/72bb8a12) | [NIP-12](12.md) | NIP-12, 16, 20 and 33 were merged into NIP-01 |
| 2023-08-14  | [72bb8a12](https://github.com/nostr-protocol/nips/commit/72bb8a12) | [NIP-16](16.md) | NIP-12, 16, 20 and 33 were merged into NIP-01 |
| 2023-08-14  | [72bb8a12](https://github.com/nostr-protocol/nips/commit/72bb8a12) | [NIP-20](20.md) | NIP-12, 16, 20 and 33 were merged into NIP-01 |
| 2023-08-14  | [72bb8a12](https://github.com/nostr-protocol/nips/commit/72bb8a12) | [NIP-33](33.md) | NIP-12, 16, 20 and 33 were merged into NIP-01 |
| 2023-08-11  | [d87f8617](https://github.com/nostr-protocol/nips/commit/d87f8617) | [NIP-25](25.md) | empty `content` should be considered as "+" |
| 2023-08-01  | [5d63b157](https://github.com/nostr-protocol/nips/commit/5d63b157) | [NIP-57](57.md) | 'zap' tag was changed |
| 2023-07-15  | [d1814405](https://github.com/nostr-protocol/nips/commit/d1814405) | [NIP-01](01.md) | `since` and `until` filters should be `since <= created_at <= until` |
| 2023-07-12  | [a1cd2bd8](https://github.com/nostr-protocol/nips/commit/a1cd2bd8) | [NIP-25](25.md) | custom emoji was supported |
| 2023-06-18  | [83cbd3e1](https://github.com/nostr-protocol/nips/commit/83cbd3e1) | [NIP-11](11.md) | 'image' was renamed to 'icon' |
| 2023-04-13  | [bf0a0da6](https://github.com/nostr-protocol/nips/commit/bf0a0da6) | [NIP-15](15.md) | different NIP was re-added as NIP-15 |
| 2023-04-09  | [fb5b7c73](https://github.com/nostr-protocol/nips/commit/fb5b7c73) | [NIP-15](15.md) | NIP-15 was merged into NIP-01 |
| 2023-03-15  | [e1004d3d](https://github.com/nostr-protocol/nips/commit/e1004d3d) | [NIP-19](19.md) | `1: relay` was changed to optionally |

Breaking changes prior to 2023-03-01 are not yet documented.

## NOTES

- If it isn't clear that a change is breaking or not, we list it.
- The date is the date it was merged, not necessarily the date of the commit.
