NIP-XX
--

Nostr-Specific Private Keys from Deterministic Wallet Signatures (Sign-In-With-X)
--
`draft` `optional` `author:0xc0de4c0ffee` `author:sshmatrix`

## Abstract

This specification provides an optional method for Nostr clients and NIP-07 providers and coin wallet providers to generate deterministic private keys from Chain Agnostic `Sign-in-With-X`[(CAIP-122)](https://github.com/ChainAgnostic/CAIPs/pull/122) signature. Nostr-specific private key is derived from HKDF-SHA-256 using NIP02/NIP05 names, [(CAIP-02: Blockchain ID Specification)](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md), [CAIP-10: Account ID Specification](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md) identifiers, and deterministic signature from connected coin-wallet as inputs.

## Terminology

### a) Username
Username can be either of the following:

- `petname` is a NIP-02 compatible name,
- `petname@example.com` is a NIP-05 identifier,
- `example.com` is NIP-05 identifier `_@example.com`,
- `sub.example.com` is NIP-05 identifier `_@sub.example.com`.

### b) Password
Password is an optional string value used in HKDF salt,
```js
let password = "horse staple battery"
//...
let salt = await sha256(`${caip10}:${username}:${password?password:""}:${signature.slice(68)}`);
```

### c) Message
Deterministic message to be signed by coin-wallet provider.
```js
let message = `Login to Nostr as ${username}\n\nImportant: Please verify the integrity and authenticity of your Nostr client before signing this message.\n${info}`
```

### d) Signature
RFC6979 compatible deterministic signature from coin-wallet provider.
```js
let signature = wallet.signMessage(message);
```

### e) Blockchain and Address Identifier 
Chain Agnostic [CAIP-02: Blockchain ID Specification](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md) and [CAIP-10: Account ID Specification](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md) are used to generate blockchain and address identifiers.
```
let caip02 =
      `eip155:<evm_chain_id>` || 
      `cosmos:<hub_id_name>` ||
      `bip122:<16 bytes genesis/fork hash>`;

let caip10 = `${caip02}:<checksum_address>`;
```

### f) HKDF
HKDF-SHA-256 is used to derive the 42 bytes long hash key: `hkdf(sha256, inputKey, salt, info, dkLen = 42)`

- `Input key` is SHA-256 hash of signature bytes.
   ```js
   let inputKey = await sha256(hexToBytes(signature.slice(2)));
   ```
- `Info` is CAIP10 and NIP02/NIP05 identifier string formatted as :
   ```js
   let info = `${caip10}:${username}`;
   ```

- `Salt` is SHA-256 hash of the `info`, optional password and last 32 bytes of signature string formatted as :
   ```js
   let salt = await sha256(`${info}:${password?password:""}:${signature.slice(68)}`);
   ```
   where, `signature.slice(68)` last 32 bytes of deterministic signature.


- Derived Key Length `dkLen` is set to 42.
   ```js
   let dkLen = 42;
   ```
   FIPS 186/4 B.4.1 requires hashkey length to be `>= n + 8`. Where n = 32 bytes length of final `secp256k1` private key, such that `42 >= 32 + 8`.

- `hashToPrivateKey` function is FIPS 186-4 B.4.1 implementation to convert hashkey derived using HKDF to valid `secp256k1` private keys. This function is implemented in JavaScript library `@noble/secp256k1` as `hashToPrivateKey()`.

   ```js
   let hashKey = hkdf(sha256, inputKey, salt, info, dkLen=42);
   let privKey = secp256k1.utils.hashToPrivateKey(hashKey);
   let pubKey = secp256k1.schnorr.getPublicKey(privKey);
   ```

## Implementation Requirements

- Connected Ethereum wallet signer MUST be EIP191 and RFC6979 compatible.
- The message MUST be string formatted as `Login to Nostr as ${username}\n\nImportant: Please verify the integrity and authenticity of your Nostr client before signing this message.\n${info}`.
- HKDF input key MUST be generated as the SHA-256 hash of 65 bytes signature.
- HKDF salt MUST be generated as SHA-256 hash of string `${info}:${username}:${password?password:""}:${signature.slice(68)}`.
- HKDF derived key length MUST be 42.
- HKDF info MUST be string formatted as `${CAIP_10}:${address}:${username}`.

## JS Example
```js
import * as secp256k1 from '@noble/secp256k1'
import {hkdf} from '@noble/hashes/hkdf'
import {sha256} from '@noble/hashes/sha256'
import {queryProfile} from './nip05'
import {getPublicKey} from './keys'
import {ProfilePointer} from './nip19'


// const wallet = connected ethereum wallet with ethers.js
let username = "me@example.com"
let chainId = wallet.getChainId(); // get chainid from connected wallet
let address = wallet.getAddress(); // get address from wallet
let caip10 = `eip155:${chainId}:${address}`;
let message = `Login to Nostr as ${username}\n\nImportant: Please verify the integrity and authenticity of your Nostr client before signing this message.\n${caip10}`
let signature = wallet.signMessage(message); // request signature from wallet
let password = "horse staple battery"


/**
 * 
 * @param username nip02/nip05 identifier
 * @param caip10 CAIP identifier for the blockchain account
 * @param sig Deterministic signature from X-wallet provider
 * @param password Optional password
 * @returns Deterministic private key as hex string
 */
export async function privateKeyFromX(
  username: string,
  caip10: string,
  sig: string,
  password: string | undefined
): Promise < string > {
  if (sig.length < 64)
    throw new Error("Signature too short");
  let inputKey = await sha256(secp256k1.utils.hexToBytes(sig.toLowerCase().startsWith("0x") ? sig.slice(2) : sig))
  let info = `${caip10}:${username}`
  let salt = await sha256(`${info}:${password?password:""}:${sig.slice(-64)}`)
  let hashKey = await hkdf(sha256, inputKey, salt, info, 42)
  return secp256k1.utils.bytesToHex(secp256k1.utils.hashToPrivateKey(hashKey))
}

/**
 * 
 * @param username nip02/nip05 identifier
 * @param caip10 CAIP identifier for the blockchain account
 * @param sig Deterministic signature from X-wallet provider
 * @param password Optional password
 * @returns 
 */
export async function signInWithX(
  username: string,
  caip10: string,
  sig: string,
  password: string | undefined
): Promise < {
  petname: string,
  profile: ProfilePointer | null,
  privkey: string
} > {
  let profile = null
  let petname = username
  if (username.includes(".")) {
    try {
      profile = await queryProfile(username)
    } catch (e) {
      console.log(e)
      throw new Error("Nostr Profile Not Found")
    }
    if(profile == null){
      throw new Error("Nostr Profile Not Found")
    } 
    petname = (username.split("@").length == 2) ? username.split("@")[0] : username.split(".")[0]
  }
  let privkey = await privateKeyFromX(username, caip10, sig, password)
  let pubkey = getPublicKey(privkey)
  if (profile?.pubkey && pubkey !== profile.pubkey) {
    throw new Error("Invalid Signature/Password")
  }
  return {
    petname,
    profile,
    privkey
  }
}
```

## Implementations 
1) Nostr tools : https://github.com/nbd-wtf/nostr-tools/pull/132 (PR)
2) Nostr client: (WIP)


## Security Considerations

- Users should always verify the integrity and authenticity of the Nostr client before signing the message.
- Users should ensure that they only input their Nostr Username and Password in trusted and secure clients.

## References:
- [RFC6979: Deterministic Usage of the DSA and ECDSA](https://datatracker.ietf.org/doc/html/rfc6979)
- [RFC5869: HKDF (HMAC-based Extract-and-Expand Key Derivation Function)](https://datatracker.ietf.org/doc/html/rfc5869)
- [CAIP-02: Blockchain ID Specification](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md)
- [CAIP-10: Account ID Specification](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md)
- [CAIP-122: Sign-in-With-X)](https://github.com/ChainAgnostic/CAIPs/pull/122) 

- [Digital Signature Standard (DSS), FIPS 186-4 B.4.1](https://csrc.nist.gov/publications/detail/fips/186/4/final)
- [BIP340: Schnorr Signature Standard](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [ERC191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)
- [EIP155: Simple replay attack protection](https://eips.ethereum.org/EIPS/eip-155)
- [NIP-02: Contact List and Petnames](https://github.com/nostr-protocol/nips/blob/master/02.md)
- [NIP-05: Mapping Nostr keys to DNS-based internet identifiers](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [@noble/hashes](https://github.com/paulmillr/noble-hashes)
- [@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1)