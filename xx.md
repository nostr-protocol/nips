NIP-xx
======

Indexes
-------

`draft` `optional`

This NIP introduces the `~` tag, used to recommend durable indexes which can be used to find relevant notes. The first argument is an index address (dependent on index type, described below), and the second argument is an index type.

```json
["~", "b0635d6a9851", "gundb"]
```

# Indexes

Indexes may directly provide events published by a given pubkey, or references to other indexes. An index's content is a JSON-encoded object with the following properties optionally defined:

- `events`: an object mapping pubkeys to arrays of events signed by that pubkey. Indexes MAY include as many events as desired, but SHOULD prioritize kind 0 and kind 3.
- `indexes`: an object referring to additional indexes, keys of which are index types, and values are arrays of index addresses.

Example:

```
{
  "events": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      {
        "kind": 3,
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
    "nip05": ["username@example.com", "othername@example2.com"],
    "gundb": ["b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9", "b0635d6a"]
  }
}
```

# Index types

## `nip05`

[NIP 05](./05.md) is the original indexing scheme, and may be used as described in this NIP if supported, or used as described in NIP 05 as a fallback.

Example:

```json
["~", "user@example.com", "nip05"]
```

## `gundb`

[GunDB](https://gun.eco/) is an implementation of a DHT, and can be used to provide an index. A gundb index address may be any string.

Example:

```json
["~", "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9", "gundb"]
```

# Additional considerations

In general, indexes are not built by the users referred to, so care should be taken to consult multiple indexes if needed, and to validate event signatures to avoid forgery and censorship. Certain index types (e.g. `gundb`) can be written to by anyone, so care should be taken to defend against overly large index files, malformed data, or other malicious indexes.
