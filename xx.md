# NIP-XX
Nostr-Specific Deterministic Private Key Generation from Ethereum Wallet Signature
--
`draft` `optional` `author:0xc0de4c0ffee` `author:sshmatrix`

## Abstract

This specification provides an optional method for Nostr clients to generate deterministic private keys from Ethereum wallet signatures. This NIP proposes HMAC Key Derivation Function (HKDF) coupled with SHA-256 from ECDSA signatures (EIP-191) as an alternative to the Schnorr signatures (BIP-340), allowing Nostr to interact with Ethereum ecosystem.

## Terminology
### a) Username
Username can be either of the following:

`petname` or `petname@domain.eth.limo` or `domain.eth.limo` or `sub.domain.eth.limo`, where

- `petname` is a NIP-02 compatible name,
- `petname@domain.eth.limo` is a NIP-05 compatible name,
- `domain.eth.limo` is NIP-05 equivalent of `_@domain.eth.limo`,
- `sub.domain.eth.limo` is NIP-05 equivalent of `_@sub.domain.eth.limo`.
> a) `sub@domain.eth.limo` and `sub.domain.eth.limo` are NOT equivalent as their signatures will be different

> b) `petname` can be the same as `domain`

### b) Password
Password is an optional string value used in HKDF salt,
```js
let password = "horse staple battery"
let salt = await sha256(`eip155:${chainId}:${username}:${password?password:""}:${signature.slice(68)}`);
```

### c) Message
Message is text on screen that should warn the users to not sign messages indiscriminately,
```js
let message = `Login to Nostr as ${username}\n\nImportant: Please verify the integrity and authenticity of your Nostr client before signing this message.\n${info}`
```
### d) Signature
Signature is the deterministic signature from connected Ethereum wallet. Ethereum signatures `(v,r,s)` are 65 bytes long, i.e. `bytes1(v) + bytes32(r) + bytes32(s)`,
```js
let signature = wallet.signMessage(message);
```
### e) HKDF (HMAC Key Derivation Function)
HKDF-SHA-256 is used to derive the 42 bytes long hash key: `hkdf(sha256, inputKey, salt, info, dkLen = 42)`
- `Input key` is SHA-256 hash of signature bytes.
   ```js
   let inputKey = await sha256(hexToBytes(signature.slice(2)));
   ```
- `Salt` is SHA-256 hash of the following identifier string:
   ```js
   let salt = await sha256(`eip155:${chainId}:${username}:${password?password:""}:${signature.slice(68)}`);
   ```
   where, `signature.slice(68)` is hex `s` value of Ethereum signature, i.e. the last 32 bytes.

- `Info` is a string with the following format:
   ```js
   let info = `eip155:${chainId}:${username}:${address}`;
   ```
- Derived Key Length `dkLen` is set to 42.
   ```js
   let dkLen = 42;
   ```
   FIPS 186/4 B.4.1 requires hash length to be ≥ n+8, where n is the length of final private key, such that 42 ≥ 32 + 8.
   
- `hashToPrivateKey` function is FIPS 186-4 B.4.1 implementation to convert hash keys derived using HKDF to valid `secp256k1` private keys. This function is implemented in JavaScript library `@noble/secp256k1` as `hashToPrivateKey()`.
   ```js
   let hashKey = hkdf(sha256, inputKey, salt, info, dkLen=42);
   let privKey = secp256k1.utils.hashToPrivateKey(hashKey);
   let pubKey = secp256k1.schnorr.getPublicKey(privKey);
   ```

## Implementation Requirements

- Connected Ethereum wallet signer MUST be EIP191 and RFC6979 compatible.
- The message MUST be string formatted as `Login to Nostr as ${username}\n\nImportant: Please verify the integrity and authenticity of your Nostr client before signing this message.\n${info}`.
- HKDF input key MUST be generated as the SHA-256 hash of 65 bytes signature.
- HKDF salt MUST be generated as SHA-256 hash of string `eip155:${chainID}:${username}:${password?password:""}:${signature.slice(68)}`.
- HKDF derived key length MUST be 42.
- HKDF info MUST be string formatted as `eip155:${chainId}:${username}:${address}`.

## JS Example
```js
const secp256k1 = require('@noble/secp256k1');
const {hexToBytes, bytesToHex} = require('@noble/hashes/utils');
const {hkdf} = require('@noble/hashes/hkdf');
const {sha256} = require('@noble/hashes/sha256');

// const wallet = connected ethereum wallet with ethers.js
let username = "me@domain.eth.limo"
let chainId = wallet.getChainId(); // get chainid from connected wallet
let address = wallet.getAddress(); // get address from wallet
let info = `eip155:${chainId}:${username}:${address}`;

let message = `Login to Nostr as ${username}\n\nImportant: Please verify the integrity and authenticity of your Nostr client before signing this message.\n${info}`
let signature = wallet.signMessage(message); // request signature from wallet

let password = "horse staple battery"
let inputKey = await sha256(hexToBytes(signature.slice(2))); //skip "0x"
let salt = await sha256(`eip155:${chainId}:${username}:${password?password:""}:${signature.slice(68)}`);
let dkLen = 42;

let hashKey = await hkdf(sha256, inputKey, salt, info, dkLen);
let privKey = secp256k1.utils.hashToPrivateKey(hashKey);
let pubKey = secp256k1.schnorr.getPublicKey(privKey);
```

## Security Considerations

- Users should always verify the integrity and authenticity of the Nostr client before signing the message.
- Users should ensure that they only input their Nostr Username and Password in trusted and secure clients.

## References:
- [RFC6979: Deterministic Usage of the DSA and ECDSA](https://datatracker.ietf.org/doc/html/rfc6979)
- [RFC5869: HKDF (HMAC-based Extract-and-Expand Key Derivation Function)](https://datatracker.ietf.org/doc/html/rfc5869)
- [Digital Signature Standard (DSS), FIPS 186-4 B.4.1](https://csrc.nist.gov/publications/detail/fips/186/4/final)
- [BIP340: Schnorr Signature Standard](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [ERC191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)
- [EIP155: Simple replay attack protection](https://eips.ethereum.org/EIPS/eip-155)
- [NIP-02: Contact List and Petnames](https://github.com/nostr-protocol/nips/blob/master/02.md)
- [NIP-05: Mapping Nostr keys to DNS-based internet identifiers](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [@noble/hashes](https://github.com/paulmillr/noble-hashes)
- [@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1)
