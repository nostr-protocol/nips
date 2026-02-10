NIP-PQ
======

Post-Quantum Support
---------------

`draft` `optional`

This NIP extends the [NIP-01](./01.md) signature scheme to provide post-quantum support for nostr events. 

The Module-Lattice-Based Digital Signature Algorithm (ML-DSA), as defined by NIST in FIPS 204, is a post-quantum digital signature scheme that aims to be secure against an adversary in possession of a Cryptographically Relevant Quantum Computer (CRQC). This NIP specifies the conventions for using the ML-DSA signature algorithm for signing nostr events that are required to be quantum-safe.

According to NIP-01, nostr events are by default signed with`secp256k1` using the Schnorr algorithm. To enable post-quantum signed events, they can optionally be signed using the `ML-DSA-44` signature algorithm specified in FIPS 204.

The size of the the post-quantum public key and signature are significantly larger - The length of `pubkey` is 2624 hex-string characters (1312 bytes) and `sig` is 4840 hex-string characters (2420 bytes). As `ML-DSA-44` introduces signficant overhead, PQC events should only be considered for events that are required to be long-lived and quantum-resistant.

The [NIP-01](./01.md) signed event format stays exactly the same except for relaxing the permitted lengh of the `pubkey` and `sig`

```yaml
{
  "id": <32-bytes lowercase hex-encoded sha256 of the serialized event data>,
  "pubkey": < lowercase hex-encoded public key of the event creator>,
  "created_at": <unix timestamp in seconds>,
  "kind": <integer between 0 and 65535>,
  "tags": [
    [<arbitrary string>...],
    // ...
  ],
  "content": <arbitrary string>,
  "sig": < lowercase hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}

```

Here is an example of a quantum-safe signed event. For legibility, the `pubkey` and `sig` lengths have been shortened.

```yaml
{ 'id': '3b40ce0236ba3fc7fca4e5938da6bc062c0d47772d23af1045433e7c212cafa1', 
  'pubkey': 'b6f36f3bcd972f58cd891a1925743bfcb1d8d6d73497b48df51118ec6....7251a09ab1c4c97d03ebdca8d5', 'created_at': 1767961493, 
  'kind': 1711, 
  'tags': [], 
  'content': 'quantum event again', 
  'sig': '5d7ecb828dc83cf95d159bb7eafa880660326339541...0000000000000000000000000000000000000000e1f2939'}
```

To validate a PQ-signed event, check to see the `pubkey` length is greater than 64 hex characters and, if so, invoke the `ML-DSA-44` verfification routine. If an implementation does not support a PQ-signed event, it will be invalid, and therefore, should not be accepted.

Following is an example of a Python `monstr` library `Event` class that is extended to handle PQ signed events. `oqs` is the quantum-safe library from the [Open Quantum Safe](https://openquantumsafe.org/)

```

from monstr.event.event import Event
from typing import Union
import json
import secp256k1

import oqs

class PQEvent(Event):
    test: str
    sigalg: str = "ML-DSA-44"

    def sign(self, priv_key):
        
        print(f"length of private key {len(priv_key)}")
        if len(priv_key) > 64: 
            signer = oqs.Signature(self.sigalg,secret_key=bytes.fromhex(priv_key))
            # print(f"sign with {priv_key}")
            self._get_id()
            id_bytes = (bytes(bytearray.fromhex(self._id)))
        
            signature = signer.sign(id_bytes)
            self._sig = signature.hex()
        else:
            self._get_id()

           
            pk = secp256k1.PrivateKey()
            pk.deserialize(priv_key)

            id_bytes = (bytes(bytearray.fromhex(self._id)))
            sig = pk.schnorr_sign(id_bytes, bip340tag='', raw=True)
            sig_hex = sig.hex()

            self._sig = sig_hex

    def is_valid(self):
        is_valid = False
        try:
            if len(self.pub_key) > 64:
            
                verifier = oqs.Signature(self.sigalg)

                id_bytes = (bytes(bytearray.fromhex(self.id)))
                sig_bytes = (bytes(bytearray.fromhex(self.sig)))
                pub_key_bytes = (bytes(bytearray.fromhex(self.pub_key)))

                is_valid = verifier.verify(id_bytes, sig_bytes, pub_key_bytes)
            else:
                
                pub_key = secp256k1.PublicKey(bytes.fromhex('02'+self._pub_key),
                                        raw=True)

                is_valid = pub_key.schnorr_verify(
                            msg=bytes.fromhex(self._id),
                            schnorr_sig=bytes.fromhex(self._sig),
                            bip340tag='', raw=True)
        except:
            is_valid = False   
                 
        return is_valid

```