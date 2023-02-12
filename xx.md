NIP-XX
======

Nostr specific keys from Ethereum wallet signatures
----------------------------------------------------

`draft` `optional` `author:0xc0de4c0ffee` `author:sshmatrix`

This NIP ?is optional specification for Nostr clients to generate private key from deterministic Ethereum wallet signatures.


## A) Username : 
```
let username = "mypetname" || "mynip05@domain.eth.limo" || "domain.eth.limo" || "sub.domain.eth.limo"
```

   1) `mypetname` is NIP02 compatible name
   2) `mynip05@domain.eth.limo` is NIP05 compatible ID
   3) `domain.eth.limo` is NIP05 equivalent to `_@domain.eth.limo`
   4) `sub.domain.eth.limo` is NIP05 equivalent to `_@sub.domain.eth.limo`

~~Implementing clients should verify if generated public keys match NIP05 and NIP02 records.~~ 

## B) Password : 
Password is optional value used in HKDF salt:
```js
let username = "name@domain.eth.limo"
let password = "horse staple battery"
let signature = wallet.signMessage(message)
let salt = sha256(`nostr:${username}:${password}:${signature.slice(68)}`);
if(!password || password == ""){
   salt = sha256(`nostr:${username}:${signature.slice(68)}`)
}
```


## C) Message : 

```js
let message = `Login to Nostr as ${username}\n\nWARNING : DO NOT SIGN THIS REQUEST FROM UNTRUSTED NOSTR CLIENTS.\n${checksum(wallet.address)}`
```
## D) Signature :
Signature is 

## C) HKDF : 
We use HKDF with SHA256
```js
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import * as secp256k1 from '@noble/secp256k1';

//let username = 'name@domain.eth.limo';
//let optPassword = "horse staple battery"; 
// optional pin/password

//let address = wallet.getAddress(); 
// get checksum'd address from eth wallet
//let signature = wallet.signMessage(message); 
// request signature from eth wallet (v,r,s)
// 0x + bytes1(v) + bytes32(r) + bytes32(s)
//  2 + (2 + 64 + 64) = 132 String length  

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

## Reference :

1) ERC-191: Signed Data Standard - https://eips.ethereum.org/EIPS/eip-191

2) RFC6979: Deterministic Usage of the DSA and ECDSA - https://datatracker.ietf.org/doc/html/rfc6979

3) RFC5869: HMAC-based Extract-and-Expand Key Derivation Function (HKDF) - https://datatracker.ietf.org/doc/html/rfc5869

4) FIPS 186 B.4.1 - https://csrc.nist.gov/publications/detail/fips/186/4/final