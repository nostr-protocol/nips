NIP-B7
======

Blossom media
-------------

`draft` `optional`

This NIP specifies how Nostr clients can use [Blossom][] for handling media.

Blossom is a set of standards (called BUDs) for dealing with servers that store files addressable by their SHA-256 sums. Nostr clients may make use of all the BUDs for allowing users to upload files, manage their own files and so on, but most importantly Nostr clients SHOULD make use of [BUD-03][] to fetch `kind:10063` lists of servers for each user:

```json
{
  "id": "e4bee088334cb5d38cff1616e964369c37b6081be997962ab289d6c671975d71",
  "pubkey": "781208004e09102d7da3b7345e64fd193cd1bc3fce8fdae6008d77f9cabcd036",
  "content": "",
  "kind": 10063,
  "created_at": 1708774162,
  "tags": [
    ["server", "https://blossom.self.hosted"],
    ["server", "https://cdn.blossom.cloud"]
  ],
  "sig": "cc5efa74f59e80622c77cacf4dd62076bcb7581b45e9acff471e7963a1f4d8b3406adab5ee1ac9673487480e57d20e523428e60ffcc7e7a904ac882cfccfc653"
}
```

Whenever a Nostr client finds a URL in an event published by a given user and that URL ends a 64-character hex string (with or without an ending file extension) and that URL is not available anymore, that means that string is likely a representation of a sha256 and that the user may have a `kind:10063` list of Blossom servers published.

Given that, the client SHOULD look into the `kind:10063` list for other Blossom servers and lookup for the same 64-character hex string in them, by just using the hex string as a path (optionally with the file extension at the end), producing a URL like `https://blossom.self.hosted/<hex-string>.png`.

When downloading such files Nostr clients SHOULD verify that the sha256-hash of its contents matches the 64-character hex string.

More information can be found at [BUD-03][].

### More complex interactions

Clients may use other facilities exposed by Blossom servers (for example, for checking if a file exists in a Blossom server, instead of actually downloading it) which are better documented in the [BUDs][Blossom].

[Blossom]: https://github.com/hzrd149/blossom
[BUD-03]: https://github.com/hzrd149/blossom/blob/master/buds/03.md
