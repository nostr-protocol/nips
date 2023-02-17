NIP-XX
--

Nostr-Specific Deterministic Private Key Generation from Ethereum Wallet Signature
--
`draft` `optional` `author:0xc0de4c0ffee` `author:sshmatrix`

## Abstract

This specification provides an optional method for Nostr clients to generate deterministic private keys from Ethereum wallet signatures.

## Terminology
### a) `username`
Username can be either of the following:

`username` or `user@domain.eth.limo` or `domain.eth.limo` or `sub.domain.eth.limo`, where,

- `username` is a [NIP-02](https://github.com/nostr-protocol/nips/blob/master/05.md) compatible name,
- `name@domain.eth.limo` is a [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) compatible name,
- `domain.eth.limo` is [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) equivalent of
`_@domain.eth.limo`,
- `sub.domain.eth.limo` is [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) equivalent of
`_@sub.domain.eth.limo`.
> Note : `sub@domain.eth.limo` and `sub.domain.eth.limo` are NOT same ID as their signatures will be different.  


### b) `password`
Password is optional string value used in HKDF salt,
```js
let password = "horse staple battery"
let salt = await sha256(`eip155:${chainId}:${username}:${password?password:""}:${signature.slice(68)}`);
```

### c) `message`
```js
let message = `Login to Nostr as ${username}\n\nImportant: Please verify the integrity and authenticity of your Nostr client before signing this message.\n${info}`
```
### d) `signature`
Deterministic signature from connected wallet. Signatures are 65 bytes long, `bytes1(v)+bytes32(r)+bytes32(s)`.
```js
let signature = wallet.signMessage(message); 
```
### e) `HKDF`
HKDF-SHA-256 is used to derive 42 bytes long hash key.
`hkdf(sha256, inputKey, salt, info, dkLen = 42)` 
- `Input key` is SHA-256 hash of signature bytes.
   ```js
   let inputKey = await sha256(hexToBytes(signature.slice(2)));
   ```
- `Salt` is SHA-256 hash of following identifier string. `signature.slice(68)` is hex `s` value of signature, last 32 bytes.
   ```js
   let salt = await sha256(`eip155:${chainId}:${username}:${password?password:""}:${signature.slice(68)}`);
   ```
- `Info` is string with following format.
   ```js
   let info = `eip155:${chainId}:${username}:${address}`;
   ```
- `Derived Key Length` is set to 42. FIPS 186/4 B.4.1 require hash length to be >=n+8 where, n is length of final private key. (42 >= 32 + 8)
   ```js
   let dkLen = 42; 
   ```
- `hashToPrivateKey` function is FIPS 186-4 B.4.1 implementation to convert derived hash keys from `HKDF`to valid `secp256k1` private keys. This function is implemented in js `@noble/secp256k1` as `hashToPrivateKey`.
   ```js
   let hashKey = hkdf(sha256, inputKey, salt, info, dkLen=42);
   let privKey = secp256k1.utils.hashToPrivateKey(hashKey);
   let pubKey = secp256k1.schnorr.getPublicKey(privKey);
   ```

## Implementation Requirements

- Connected Ethereum Wallet signer MUST be EIP191 and RFC6979 compatible.
- The message MUST be string formatted as `Login to Nostr as ${username}\n\nImportant: Please verify the integrity and authenticity of your Nostr client before signing this message.\n${info}`.
- HKDF input key MUST be generated as the SHA-256 hash of 65 bytes signature.
- HKDF salt MUST be generated as SHA-256 hash of string `eip155:${chainID}:${username}:${password?password:""}:${signature.slice(68)}`.
- HKDF derived key length MUST be 42.
- HKDF info MUST be string formatted as `eip155:${chainId}:${username}:${address}`

## JS Example 
```js
const secp256k1 = require('@noble/secp256k1');
const {hexToBytes, bytesToHex} = require('@noble/hashes/utils');
const {hkdf} = require('@noble/hashes/hkdf');
const {sha256} = require('@noble/hashes/sha256');

// const wallet = // connected ethereum wallet with ethers.js
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
- Users should ensure that they only input their Nostr username and password in trusted and secure clients.
- Implementing clients should ensure ~~..private key/security~~


## References:
- [RFC6979: Deterministic Usage of the DSA and ECDSA](https://datatracker.ietf.org/doc/html/rfc6979)
- [RFC5869: HKDF (HMAC-based Extract-and-Expand Key Derivation Function)](https://datatracker.ietf.org/doc/html/rfc5869)
- [Digital Signature Standard (DSS), FIPS 186-4 B.4.1](https://csrc.nist.gov/publications/detail/fips/186/4/final)
- [ERC191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)
- [EIP155: Simple replay attack protection](https://eips.ethereum.org/EIPS/eip-155)
- [@noble/hashes](https://github.com/paulmillr/noble-hashes)
- [@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1)