NIP-01
======

Pubkey-based routing hints
--------------------------

`draft` `optional`

This NIP introduces the `~` tag, used to indicate authors of related data, and where to find their notes. The first argument is a hex pubkey, the second argument is an index type, and the third a an index address, for example:

```json
["~", "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9", "gundb", "b0635d6a985"]
```

# Indexes

Indexes may directly provide events published by a given pubkey, or references to other indexes. In any case, an index value is a JSON-encoded object, each value of which is an object mapping pubkeys to values as defined below. The following keys are defined (all keys are optional):

- `relays`: an object mapping pubkeys to arrays of relay urls. This SHOULD match the user's `write` relays as defined by [NIP 65](./65.md).
- `events`: an object mapping pubkeys to arrays of events signed by that pubkey.
- `indexes`: an object referring to additional indexes, keys of which are index types, and values are objects mapping pubkeys to an array of index addresses.

Example:

```
{
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://example.com",
      "wss://example2.com"
    ]
  },
  "events": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      {
        "kind": 1,
        "content": "Hello",
        "tags": [],
        "created_at": 1710607821,
        "pubkey": "8382758c082756265f88b726ca3679a8f91cf4d4e1e9b34d4fdcb1bc814fd8f7",
        "id": "9fca770c84daba9caa72426443488e269e7ede6aa8c4bfef97f5b05b1bfe2f25",
        "sig": "14b31fff964eab7ad77f03647001ad644ced0b265e46b8be5b21f4e01ec77949c129ef0e4875726e7d33ae55eb4b814ba9d73148d1adcee78b87b5a8760a08a5"
      }
    ]
  },
  "indexes": {
    "nip05": {
      "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
        "https://example.com/.well-known/nostr.json?name=username",
        "https://example2.com/.well-known/nostr.json?name=othername"
      ]
    },
    "gundb": {
      "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
        "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
        "b0635d6a"
      ]
    }
  }
}
```

# Index types

## `nip05`

[NIP 05](./05.md) is the original indexing scheme, and may be used as described in this NIP if supported, or used as described in NIP 05 as a fallback. Index addresses should use the following pattern: `https://example.com/.well-known/nostr.json?name=username`

## `gundb`

[GunDB](https://gun.eco/) is an implementation of a DHT, and can be used to provide an index. A gundb index address may be any string.
