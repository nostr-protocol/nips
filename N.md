NIP-N
======

Derive ETH address from existing pubkey
------------

`draft` `optional` `author:kernel1983` 

This NIP shows the way to display ETH address.
It is useful to work with the ETH-compatible NFT, DID, and token ecosystem. 

## Private key and Public key

Each user has a private(secret)/public key pair.
Nostr uses the curve `secp256k1`, and the private and public keys are 32 bytes (64 chars in the hex).

The ETH address uses the same curve, but `pubkey` is 64 bytes (128 in hex).
The address is from the SHA3 of the 64 bytes of public key with "0x" prefix and 20 bytes truncated of the hash result.

However, we can derive the 32 bytes public key to the uncompressed 64 bytes public key.
The following code shows we can get the correct ETH address:

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

It demos that we can get the ETH address from the existing `pubkey`.
It should work with any other language with a suitable library.
