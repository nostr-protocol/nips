NIP: XX - Cashu Data
---

`optional` `draft`

## Abstract

This NIP proposes the introduction of three new event kinds to the Nostr protocol to facilitate the announcement of cashu mint and burn events, cashu mints identities, and the end of an epoch along with the mints' outstanding balances.

## Motivation

The proposed event kinds aim to enhance the transparency of cashu mint and burn operations, while also providing cashu wallets with a way of querying data of interest without compromising their privacy.

## Specification

### Event Kind 4919: `CASHU_DATA`

Cashu Mints should use this event kind to publish batches of blind signatures and spent secrets, along with other information.

* `kind`: 4919;
* `created_at`: unix timestamp in seconds, same as [NIP-01](01.md);
* `tags`: 
  * `e`: optional event ID of the previous event kind 4919;
* `content`: base64-encoded string representing the payload described in [NUT-XX](https://github.com/cashubtc/nuts/pull/155);
* `id`: same as [NIP-01](01.md);
* `pubkey`: same as [NIP-01](01.md);
* `sig`: same as [NIP-01](01.md);

Example:
```json
{
  "kind": 4919,
  "tags": [
    ["e", "5c83da77af1dec6d7289834998ad7aafbd9e2191396d75ec3cc27f5a77226f36"]
  ],
  "content": "gqNlZXBvY2gAZWV2ZW50ZEJVUk5oY29udGVudHODeEIwMmY3NjhmYmQ3MzJiNDNhNDNjOWQxNDYxMTIxOTFkNmFkOWJlZDI5NTIyOTM5MzFkMWQzYTJmZGVkMjJiOTNjYzd4QjAyZWNmZWM2OTk2ZDUwNWUzYzMxN2U3NWQwY2U0OWExZTY5YmUyZTBmNTU1OGQ1ODM3ZWJjNzgwOWNjOTZmZDU1Y3hCMDM0NWE5OGY2ZTQwZTdkNmM5M2QyNjczY2Y1MWZiZjk1OWM3NjM5YjAwZDY5OWU4YmMyYWJlNzJhMGRlZjk3N2Q4o2VlcG9jaABlZXZlbnRkTUlOVGhjb250ZW50c4F4QjAzOGRjNzE4OTE3MTE3ZmFlNzkyN2M3ZWVjODZjOGM0MDZmYTZlODYzNmM2MGQ5NTY3OWVjZGExNDk2NmU1NTI2Yg==",
  "created_at": 1725290441,
  "pubkey": "b83900fd01bac9294ae23a2cb6e2904ce8a618c9f649cdb0e2e2246f4ba1df74",
  "id": "19f03f1bfafde28a133143f95cee055f08ef9509f8307eb9891abbc67ac85878", 
  "sig": "6ac2b47015666927f2f0b2405fbe1c75b991c63ed83ed75d742b44fc1e0a6ee54d3c0af2b9ab6b102581e9bc68bf4002a87662ad2a73f06b215229e81272f799"
}
```

### Replaceable Event Kind 11467: `CASHU_MINT_IDENTITY`

Cashu mints use this event kind to announce themselves to the network. The construction of this event is equivalent to kind 4919, except for `tags` that should be left empty and `content` should contain a base64-encoded string representing the identity payload described in [NUT-XX](https://github.com/cashubtc/nuts/pull/155).

Example:
```json
{
  "kind": 11467,
  "content": "qGRuYW1la1NtaWxleSBNaW50ZnB1YmtleXhCMDM3YTUyODZmMTU3NDg0MDQ0MzhkMDQ2NmZiOTkxY2E2NTMzZmM0MzBlYTg3YjdjNmNkNzQ5YTdlOWNhMjVkMGQ2Z3ZlcnNpb25vTnV0c2hlbGwvMC4xNi4wa2Rlc2NyaXB0aW9ueCJBIFVTRCBNaW50IGJhY2tlZCBieSBzeW50aGV0aWMgVVNEcGRlc2NyaXB0aW9uX2xvbmd4QkRlcG9zaXRlZCBzYXRzIGFyZSBjb252ZXJ0ZWQgdG8gc3ludGhldGljIFVTIGRvbGxhcnMgb24gTE5NYXJrZXRzLmdjb250YWN0gaJmbWV0aG9kZW5vc3RyZGluZm94P25wdWIxdTA3eHcwNzlseHd2MjR4c2xhcmgyZXU0djM3anRqbXd2ZXYwanlrM3pqaHhnMndudDU2c2V5ZXo5N2Rtb3RkYkdNZG51dHOpYTSiZ21ldGhvZHOBomZtZXRob2RmYm9sdDExZHVuaXRjdXNkaGRpc2FibGVk9GE1omdtZXRob2RzgaJmbWV0aG9kZmJvbHQxMWR1bml0Y3VzZGhkaXNhYmxlZPRhN6Fpc3VwcG9ydGVk9WE4oWlzdXBwb3J0ZWT1YTmhaXN1cHBvcnRlZPViMTChaXN1cHBvcnRlZPViMTGhaXN1cHBvcnRlZPViMTKhaXN1cHBvcnRlZPViMTehaXN1cHBvcnRlZIGjZm1ldGhvZGZib2x0MTFkdW5pdGN1c2RoY29tbWFuZHOCcWJvbHQxMV9tZWx0X3F1b3Rla3Byb29mX3N0YXRl",
  "created_at": 1725290441,
  "pubkey": "19f03f1bfafde28a133143f95cee055f08ef9509f8307eb9891abbc67ac85878",
  "id": "51c79749c91e72668a2115c7901b14455aaaa670156c22005245d88259f9a123",
  "sig": "1bce76961f75373c9ba42bcd326e605946103976daf31267a7b5fe54980fea7bf08ba80659684b8397eb52e1c8716a778728f5cf98b9d06b809f36f99c59e8dc"
}
```

### Event Kind 1337: `FIN_EPOCH`

Cashu mints should use this event kind to signal the end of the current epoch (keys rotation).
The construction of this event is equivalent to kind 13467, except that `content` should be a base64-encoded string representing the `FIN_EPOCH` payload, containing unit and outstanding balance as described in [NUT-XX](https://github.com/cashubtc/nuts/pull/155).
