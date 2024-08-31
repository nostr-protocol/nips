NIP: XX - Cashu Data
---

`optional` `draft`

## Abstract

This NIP proposes the introduction of three new event kinds to the Nostr protocol to facilitate the announcement of cashu mint and burn events, cashu mints identities, and the end of an epoch along with the mints' outstanding balances.

## Motivation

The proposed event kinds aim to enhance the transparency of cashu mint and burn operations, while also providing cashu wallets with a way of querying data of interest without compromising their privacy.

## Specification

### Event Kind 4919: Mint and Burn Operations

Cashu Mints should use this event kind to publish batches of blind signatures and spent secrets, along with other information.

* `kind`: 4919;
* `created_at`: unix timestamp in seconds;
* `tags`: 
  * `e`: event ID of the previous event kind 4919;
* `content`: a cbor-serialized, base64 encoded string representation of the payload as described in [NUT-XX]();
* `id`: 32-bytes lowercase hex-encoded sha256 of the serialized event data, as described in [NIP-01](01.md);
* `pubkey`: 32-bytes lowercase hex-encoded x-only public key of the publishing mint.

Example:
```json
{
  "kind": 4919,
  "tags": [
    ["e", "5c83da77af1dec6d7289834998ad7aafbd9e2191396d75ec3cc27f5a77226f36"]
  ],
  "content": "gqNlZXBvY2gAZWV2ZW50ZEJVUk5oY29udGVudHODeEIwMmY3NjhmYmQ3MzJiNDNhNDNjOWQxNDYxMTIxOTFkNmFkOWJlZDI5NTIyOTM5MzFkMWQzYTJmZGVkMjJiOTNjYzd4QjAyZWNmZWM2OTk2ZDUwNWUzYzMxN2U3NWQwY2U0OWExZTY5YmUyZTBmNTU1OGQ1ODM3ZWJjNzgwOWNjOTZmZDU1Y3hCMDM0NWE5OGY2ZTQwZTdkNmM5M2QyNjczY2Y1MWZiZjk1OWM3NjM5YjAwZDY5OWU4YmMyYWJlNzJhMGRlZjk3N2Q4o2VlcG9jaABlZXZlbnRkTUlOVGhjb250ZW50c4F4QjAzOGRjNzE4OTE3MTE3ZmFlNzkyN2M3ZWVjODZjOGM0MDZmYTZlODYzNmM2MGQ5NTY3OWVjZGExNDk2NmU1NTI2Yg==",
  "created_at": 1725120764,
  "pubkey": "29a7d8c5c0b8f4f7f1f2e3d4c5b6a7e8f9d0c1b2a3f4e5d6c7b8a9c0d1e2f3f4",
  "id": "ddd87b52373c8cfc575f29b130c5842002d77abbbd741484e7399d5c4dd4bee4"
}
```

### Replaceable Event Kind 11467: Mint Nostr Identity

Cashu mints use this event kind to announce themselves to the network. The construction of this event is equivalent to kind 4919, except for `tags` that should be left empty and `content` should contain the cbor-serialized, base64 encoded identity payload described in [NUT-XX]().

Example:
```json
{
  "kind": 11467,
  "content": "qGRuYW1la1NtaWxleSBNaW50ZnB1YmtleXhCMDM3YTUyODZmMTU3NDg0MDQ0MzhkMDQ2NmZiOTkxY2E2NTMzZmM0MzBlYTg3YjdjNmNkNzQ5YTdlOWNhMjVkMGQ2Z3ZlcnNpb25vTnV0c2hlbGwvMC4xNi4wa2Rlc2NyaXB0aW9ueCJBIFVTRCBNaW50IGJhY2tlZCBieSBzeW50aGV0aWMgVVNEcGRlc2NyaXB0aW9uX2xvbmd4QkRlcG9zaXRlZCBzYXRzIGFyZSBjb252ZXJ0ZWQgdG8gc3ludGhldGljIFVTIGRvbGxhcnMgb24gTE5NYXJrZXRzLmdjb250YWN0gaJmbWV0aG9kZW5vc3RyZGluZm94P25wdWIxdTA3eHcwNzlseHd2MjR4c2xhcmgyZXU0djM3anRqbXd2ZXYwanlrM3pqaHhnMndudDU2c2V5ZXo5N2Rtb3RkYkdNZG51dHOpYTSiZ21ldGhvZHOBomZtZXRob2RmYm9sdDExZHVuaXRjdXNkaGRpc2FibGVk9GE1omdtZXRob2RzgaJmbWV0aG9kZmJvbHQxMWR1bml0Y3VzZGhkaXNhYmxlZPRhN6Fpc3VwcG9ydGVk9WE4oWlzdXBwb3J0ZWT1YTmhaXN1cHBvcnRlZPViMTChaXN1cHBvcnRlZPViMTGhaXN1cHBvcnRlZPViMTKhaXN1cHBvcnRlZPViMTehaXN1cHBvcnRlZIGjZm1ldGhvZGZib2x0MTFkdW5pdGN1c2RoY29tbWFuZHOCcWJvbHQxMV9tZWx0X3F1b3Rla3Byb29mX3N0YXRl",
  "created_at": 1725122106,
  "pubkey": "29a7d8c5c0b8f4f7f1f2e3d4c5b6a7e8f9d0c1b2a3f4e5d6c7b8a9c0d1e2f3f4",
  "id": "c51b5784259768fba39c0b9dedcd6efb7fbd5801055a2bf04a85d363d5229578"
}
```

### Event Kind 1337: Fin-Epoch

Cashu mints should use this event to signal the end of the current epoch (keys rotation).
The construction of this event is equivalent to kind 4919, except for `tags` that should be left empty and `content` should contain the cbor-serialized, base64 encoded fin-epoch payload, as described in [NUT-XX]().