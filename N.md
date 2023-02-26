NIP-N
======

Derive ETH address from existing pubkey
------------

`draft` `optional` `author:kernel1983` 

This NIP shows the way to display ETH address.
It is useful to work with the ETH-compatible NFT, DID, and token ecosystem. 

## Private key and Public key

Each user has a private(secret)/public key pair.
Nostr uses the curve `secp256k1`, and the private key is 32 bytes (64 chars in the hex), same as BTC and ETH.
The nostr `pubkey` is 32 bytes, removed 02/03 prefix of a compressed 33 bytes public key.

The ETH address uses the same `secp256k1` curve, but public key is 64 bytes (128 in hex, or 65 bytes by insert 04 before the key).
The address is from the SHA3 of the 64 bytes of public key with "0x" prefix and 20 bytes truncated of the hash result.
The 33 bytes public key can be converted to 64/65 bytes uncompressed public key, then to the ETH address, however, the 32 bytes nostr `pubkey` does not have enough information to derive the ETH address.

We propose a optional `pubkey_prefix` field in the `tags`:

```json
{
  "id": <32-bytes lowercase hex-encoded sha256 of the the serialized event data>
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <unix timestamp in seconds>,
  "kind": <integer>,
  "tags": [
    ["e", <32-bytes hex of the id of another event>, <recommended relay URL>],
    ["p", <32-bytes hex of the key>, <recommended relay URL>],
    ["pubkey_prefix": <1-bytes hex-encoded 02 or 03 prefix of the 33 bytes compressed public key>],
    ... // other kinds of tags may be included later
  ],
  "content": <arbitrary string>,
  "sig": <64-bytes hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}
```

Similiarly, when generating the `event.id`, we `sha256` the serialized event.
It increases less than 30 bytes but keeps the compatible with existing protocol.

The following code shows we can get the correct ETH address with 33 bytes of public key:

```python
import secp256k1
import eth_keys

nostr_sk = secp256k1.PrivateKey()
nostr_pk = secp256k1.PublicKey(nostr_sk.pubkey.serialize(), True)

eth_sk = eth_keys.keys.PrivateKey(nostr_sk.private_key) # ETH public key from nostr 32 bytes private key
eth_sk.public_key.to_address() # the address from ETH 64 bytes public key

eth_pk = eth_keys.keys.PublicKey(nostr_pk.serialize(compressed=False)[1:]) # the uncompressed 65 bytes public with 04 prefix
eth_pk.to_address() # the address from Nostr 32 bytes public key

assert eth_sk.public_key.to_address() == eth_pk.to_address() # get the same address
```

It demos that we can get the ETH address from the existing `pubkey` and `pubkey_prefix`.
It should work with any other language with a suitable library.
