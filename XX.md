NIP-XX
======

Bitcoin Cash Key Bindings
-------------------------

`draft` `optional`

This NIP lets a Nostr key and a Bitcoin Cash key prove that they belong to the
same person. Each key signs a statement naming the other. The binding is an
addressable event of kind `30078` (NIP-78), so it needs no new kind. The full
rules, test vectors and a reference implementation are in
[BND-1](https://github.com/cashlet-labs/bnd/blob/main/spec/BND-1.md); this document summarises what Nostr clients and relays need.

## Motivation

Clients show BCH addresses taken from profiles and notes, which nothing proves
the author controls. A binding proves it, survives the loss or theft of one
key, and can be found from either key.

## Binding event

```jsonc
{
  "kind": 30078,
  "pubkey": "<bound Nostr key>",
  "created_at": <record.createdAt>,
  "tags": [
    ["d", "bnd1"],
    ["b", "<HASH160 of the compressed BCH public key, lowercase hex>"],
    ["s", "<ID of the binding this one replaces>"] // successors and revocations only
  ],
  "content": "<RFC 8785 canonical JSON>",
  // id, sig
}
```

The tags are exactly these, in this order. The content is the canonical JSON of
one of:

| Form       | Content members                              |
| ---------- | -------------------------------------------- |
| root       | `bchProof`, `record`                         |
| successor  | `approvals`, `bchProof`, `history`, `record` |
| revocation | `approvals`, `history`, `record`             |

`record` names the Nostr key, the BCH key hash and network (`mainnet` or
`chipnet`), `createdAt`, and optionally `previous`, `recovery` and `revoked`
(BND-1 section 3). Its binding ID is
`sha256("bnd/1/binding-id\n" || canonical(record))` in lowercase hex.

`bchProof` is the BCH key's approval of the binding ID: either a Bitcoin Signed
Message over a fixed text, or a signed BCH transaction that spends a virtual,
non-existent output and commits to the binding ID in an `OP_RETURN` (BND-1
section 4). The event signature is the Nostr key's approval.

The fixed `d` tag gives each Nostr key at most one live binding.

## Replacing a binding

A successor (new keys) or revocation names the binding it replaces in
`record.previous` and the `s` tag, and is valid only if two of the previous
binding's three keys approved it: the Nostr key, the BCH key and an optional
recovery key (an x-only key, usually kept offline). Because relays keep only the
newest event, a successor carries the signed steps before it in `history`, at
most 32 (BND-1 section 9).

The Nostr and recovery keys approve explicitly by signing this event, which is
**never published**; only its signature is carried in `approvals`:

```jsonc
{
  "kind": 30078,
  "pubkey": "<approving key>",
  "created_at": <new record.createdAt>,
  "tags": [["d", "bnd1-approval"], ["s", "<new binding ID>"]],
  "content": ""
}
```

Any NIP-07 or NIP-46 signer can produce it.

## Client behaviour

Clients find bindings with:

```jsonc
{ "kinds": [30078], "authors": ["<key>"], "#d": ["bnd1"] } // by Nostr key
{ "kinds": [30078], "#b": ["<BCH key hash>"] }             // by BCH key (claims)
{ "kinds": [30078], "#s": ["<binding ID>"] }               // successors
```

Clients MUST verify every event (BND-1 section 7) and SHOULD ask several
relays. A client follows `#s` from the newest bindings found until nothing new
appears. A binding that appears in another's `history` is old. If two valid
chains remain, the identity is disputed and clients MUST NOT show its address
as payable.

NIP-09 deletions of binding events revoke nothing; revocation is a signed
record.

## Relay behaviour

Relays need no change to store bindings. A relay MAY enforce succession: accept
a binding for a key only if it holds none for that key or the new one carries
the stored one in its `history`, and refuse NIP-09 deletions of bindings. This
stops a thief holding only the Nostr key from overwriting or deleting the real
binding on that relay.

An approval event (`d` = `bnd1-approval`) is not a binding, so it can never
replace one, and verifiers ignore it if it is published anyway.

## Login

BND-1 section 8 defines a challenge-response login using a NIP-98 event (kind
`27235`) with tags `u`, `method`, `challenge`, `binding` and `statement`, where
`statement` is the SHA-256 of a CAIP-122 sign-in message that the BCH key also
signs.

## Reference

- Specification and vectors: <https://github.com/cashlet-labs/bnd/tree/main/spec>
- DID method built on it: [did:bnd](https://github.com/cashlet-labs/bnd/blob/main/spec/did-bnd.md)
- Demo: <https://bnd.septemlabs.com>
