NIP-N
======

ETH address support
------------

`draft` `optional` `author:kernel1983` 

This NIP defines the alternative address system that the user may choose to use. New NIPs may  choose to support this NIP to work with the ETH compatible NFT, DID and token ecosystem. 


## Events and signatures

Each user has a secret/private key. Signatures, address, and encodings are done according to the Ethereum way.

In the `event`, will change the `pubkey` to `eth_addr` :

```json
{
  "id": <32-bytes lowercase hex-encoded sha256 of the the serialized event data, no "0x">
  "eth_addr": <42-bytes lowercase eth addr of the event creator started with "0x">,
  "created_at": <unix timestamp in seconds>,
  "kind": <integer>,
  "tags": [
    ["e", <32-bytes hex of the id of another event>, <recommended relay URL>],
    ["p", <32-bytes hex of the key>, <recommended relay URL>],
    ... // other kinds of tags may be included later
  ],
  "content": <arbitrary string>,
  "sig": <132-bytes hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field, started with "0x">
}
```

To obtain the `event.id`, we `sha256` the serialized event. The serialization is done over the UTF-8 JSON-serialized string (with no white space or line breaks) of the following structure:

```json
[
  0,
  <eth_addr, as a (lowercase) hex string>,
  <created_at, as a number>,
  <kind, as a number>,
  <tags, as an array of arrays of non-null strings>,
  <content, as a string>
]
```

The client and relay may detect the field `pubkey` or `eth_addr` and the length, 0x prefix to check which type user is using.

