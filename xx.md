NIP-XX
======

Nostr specific keys from Ethereum wallet signatures
----------------------------------------------------

`draft` `optional` `author:0xc0de4c0ffee` `author:sshmatrix`

This NIP ?is optional specification for Nostr clients to generate private key from deterministic Ethereum wallet signatures.


A) Username : 
```
let username = "mypetname" || "mynip05@domain.eth.limo" || "domain.eth.limo" || "sub.domain.eth.limo"
```

   1) `mypetname` is NIP02 compatible name
   2) `mynip05@domain.eth.limo` is NIP05 compatible ID
   3) `domain.eth.limo` is NIP05 equivalent to `_@domain.eth.limo`
   4) `sub.domain.eth.limo` is NIP05 equivalent to `_@sub.domain.eth.limo`

~~Implementing clients should verify if generated public keys match NIP05 and NIP02 records.~~ 

B) Message : 
```
let message = `Login to Nostr as ${username}\n\nWARNING : DO NOT SIGN THIS REQUEST FROM UNTRUSTED NOSTR CLIENTS.\n${checksum(wallet.address)}`
```

C) Private Key : 

```js
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import * as secp256k1 from '@noble/secp256k1';

let username = 'name@domain.eth.limo';
let optPassword = "horse staple battery"; 
// optional pin/password

let address = wallet.getAddress(); 
// get checksum'd address from eth wallet
let signature = wallet.signMessage(message); 
// request signature from eth wallet
// 0x + bytes1 + bytes32 + bytes32 
//  2 + (2     +   64    +     64) = 132 length  

let inputKey = sha256(signature);
let salt = sha256(`nostr:${username}:${optPassword}:${signature.slice(68)}`); //68~132
// nostr:${username}:${signature.slice(68)}

let info = `nostr:${username}:${address}`;

let dkLen = 42; // 32 + 8 + 2
//FIPS 186 B.4.1 limit must be >=keylen+8

let hashKey = hkdf(sha256, inputKey, salt, info, dkLen);
let privKey = nobleSecp256k1.hashToPrivateKey(hashKey); 
//FIPS 186 B.4.1 @noble/secp256k1

let pubKey = nobleSecp256k1.getPublicKey(privKey)
```