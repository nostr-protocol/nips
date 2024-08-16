NIP-XXX
=======

Multiple Public Key Types and Signature Algorithms for Event Signing
-----

`draft` `optional`

This NIP defines a way for clients and relays to allow other types of ECC Public Keys and Signature Algorithms to be used in Nostr in a seamless manner.

### Motivation

As mentioned in [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md):

> Each user has a keypair. Signatures, public key, and encodings are done according to the [Schnorr signatures standard for the curve `secp256k1`](https://bips.xyz/340).

This is a limitation for Nostr adoption, as many Blockchains and other Cryptographic Networks have already identities in place using different ECC Public Key curves, and may use different Signature Algorithms. Even Bitcoin pre Taproot uses `ECDSA/secp256k1` and not `Schnorr/secp256k1`.

In this case it is just the signatures that differ, and the public key derivation is based out of the same `secp256k1` curve, so the public keys remain valid, but for other networks that use `ed25519` signatures, for instance, not even the public keys would be valid, as the curve used is `Curve25519` instead.

This means that Nostr identities would have to be different than the ones used in the other networks, making it impossible to consider a direct match between one network identity and the other, for instance, for having a smart contract as a Nostr identity (public key).

### References

This proposal came together with inputs from many other proposals and discussions, but these are the main ones:

[NIP-01: Basic protocol flow description](https://github.com/nostr-protocol/nips/blob/master/01.md)<br>
[NIP-06: Basic key derivation from mnemonic seed phrase](https://github.com/nostr-protocol/nips/blob/master/06.md)

### Public Key Types and Signature Algorithms

A small list of networks and their ECC Key Derivation curves and Signature Algorithms:

| Network | ECC Curve | Signature Algorithm |
|---|---|---|
| Bitcoin (legacy) | secp256k1 | ECDSA |
| Bitcoin (taproot) | secp256k1 | Schnorr |
| Ethereum | secp256k1 | ECDSA |
| Litecoin | secp256k1 | ECDSA |
| Monero | curve25519 | EdDSA |
| Cardano | curve25519 | EdDSA |
| Ripple | secp256k1 | ECDSA |
| TON (Telegram) | curve25519 | EdDSA |
| Cardano | curve25519 | EdDSA |
| Stellar | curve25519 | EdDSA |
| Tezos | curve25519 | EdDSA |
| Zcash | curve25519 | EdDSA |
| Zcash (shielded) | secp256k1 | ECDSA |

From this small list it is clear that more than half of the public keys from these selected networks wouldn't be compatible with Nostr, and only a Bitcoin taproot wallet would be able to generate compatible signatures for Nostr events.

We want to eliminate this problem, and it is quite simple...

### Signature Prefixes

This NIP introduces a prefix mechanism for the `.sig` field of Nostr events, that by default (without any prefix) falls back to `Schnorr/secp256k1`, but when present defines the signature algorithm and public key derivation curve.

#### Signature Algorithms

| Prefix | Signature Algorithm | ECC Curve (default) |
|---|---|---|
| schnorr | Schnorr | secp256k1 |
| ecdsa | ECDSA | secp256k1 |
| eddsa | EdDSA | curve25519 |

#### Public Key Derivation Curves

| Prefix | ECC Curve |
|---|---|
| secp256k1 | secp256k1 |
| secp256r1 | secp256r1 |
| curve25519 | Curve25519 |
| curve448 | Curve448 |

#### Signature Algorithm Prefix

To use a different Signature Algorithm, for instance ECDSA for legacy Bitcoin wallets, an event would look like this:

```json
{
  "id": "567b41fc9060c758c4216fe5f8d3df7c57daad7ae757fa4606f0c39d4dd220ef",
  "kind": "1",
  "pubkey": "8e0d3d3eb2881ec137a11debe736a9086715a8c8beeeda615780064d68bc25dd",
  "tags": [],
  "content": "some note",
  ...
  "sig": "ecdsa:3046022100a0e03de740d3a1136d443b0c24a252e08ae1ae4dd73f0f7dacfdc440c69ce45102210083b5ba4e0f34261b605848ad85ddf585637c7579e58e73058ab3c934a7ca05c2"
}
```

#### Signature Algorithm Prefix with a Different ECC Curve

To use another Signature Algorithm and another ECC Curve, an event would look like this:

```json
{
  "id": "567b41fc9060c758c4216fe5f8d3df7c57daad7ae757fa4606f0c39d4dd220ef",
  "kind": "1",
  "pubkey": "8e0d3d3eb2881ec137a11debe736a9086715a8c8beeeda615780064d68bc25dd",
  "tags": [],
  "content": "some note",
  ...
  "sig": "ecdsa/secp256r1:3046022100c04f4139d4d52aa516873a8a9fba77c54810ade51e7e1720b45934d51a9a1216022100a645e11aa3877f111caf486fbd199781dca85373da504f6eb3690439f7a1a222"
}
```

### Clients and Relays

Clients and Relays are free to choose what combinations of Signatures Algorithms and ECC Curves they support, the only mandatory one is `Schnorr/secp256k1`, which is the default for Nostr, but highly encouraged to support more, at least `ecdsa` and `eddsa` with their default curves. This way Nostr network will be increasingly more compatible and possible to interoperate with other networks.