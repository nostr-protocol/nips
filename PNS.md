# NIP-PNS

## Private Note Storage

`draft` `optional`

## Abstract

Private Note Storage (PNS) empowers Nostr users with a secure and seamless way to store personal notes—like diaries, drafts, or private application settings—across devices while keeping them completely private. Built on client-side encryption, PNS ensures that only the user can read or manage their notes, even as they sync effortlessly via Nostr relays. Unlike traditional local storage or cumbersome encrypted file solutions, PNS offers privacy without sacrificing convenience, using deterministic keys tied to each user or device. It integrates directly with Nostr’s open infrastructure, enabling private data to coexist with public events—secure, synchronized, and under your control.

## Comparison to Gift Wraps

See [NIP-59][nip59]

- Only the owner of the key can publish PNS events. So there is no risk of DoS or spam attacks. 
- Seal (giftwrap inner event) is no longer needed, since knowledge of the outer key implies authenticity of the inner note.

## Terminology & Notation

- `nsec` – Bech32-encoded secp256k1 secret key (per NIP-19), specific to the user or device.
- `device_key` – Raw secp256k1 secret key decoded from nsec.
- `pns_key` – 32-byte secret key derived from `device_key`, used to locate and further derive encryption keys.
- `pns_keypair` – Deterministic secp256k1 keypair derived from `pns_key`, used to sign PNS events.
- `pns_nip44_key` – Symmetric key derived from `pns_key`, used for encryption/decryption.
- `PNS event` – A Nostr event conforming to this specification.
- `nip44_encrypt/decrypt` – NIP-44 v2 authenticated encryption functions.
- `MUST`, `SHOULD`, `MAY` – As defined in RFC 2119.

## Specification

### 1. Key Derivation

```
device_key = bech32_decode(nsec)
pns_key = hkdf_extract(ikm=device_key, salt="nip-pns")
pns_keypair = derive_secp256k1_keypair(pns_key)
```

- `device_key` – 32-byte secp256k1 secret key specific to the user or device.
- `pns_key`: deterministic key for PNS-specific use
- `pns_keypair`: secp256k1 keypair derived from pns_key for signing. 

### 2. Symmetric Key Derivation for Encryption

```
pns_nip44_key = hkdf_extract(ikm=pns_key, salt="nip44-v2")
```

- `pns_nip44_key`: symmetric key used for NIP-44 v2 encryption of the note content.

### 3. Event Kind Reservation

PNS events use **kind 1080**.

### 4. Event Structure

The inner plaintext note **MUST** be any **unsigned** Nostr event (any `kind`). This is called the `rumor`. If you want to use this scheme for arbitrary data, use a different application-specific kind, or consider using a [NIP-78][nip78] note as the rumor.

The inner note can always be signed and broadcasted if needed, but by default they are always a `rumor` so that they are not accidentally broadcasted.

### 5. Encryption

1. Encode the plaintext note as a valid Nostr event (`kind` flexible).
2. Ensure the `sig` field is empty, if not, remove it.
3. Derive `pns_key = hkdf_extract(ikm=device_key, salt="nip-pns")`.
4. Derive `pns_keypair = derive_secp256k1_keypair(pns_key)`.
5. Derive `pns_nip44_key = hkdf_extract(ikm=pns_key, salt="nip44-v2")`.
6. Generate a random 32-byte nonce.
7. Encrypt the inner note using `pns_nip44_key` and the nonce via **NIP-44 v2**.
8. Base64-encode the ciphertext and assign it to `content`.

### 6. Publishing Workflow

```javascript
inner_event = {
  kind: 1,
  pubkey: device_nsec_pubkey,
  created_at: now(),
  tags: [],
  content: "hi",
}

inner_event.id = generated_id(inner_event)
inner_event_json = json_encode(inner_event)

pns_key = hkdf_extract(ikm=device_key, salt="nip-pns")
pns_keypair = derive_secp256k1_keypair(pns_key)
pns_nip44_key = hkdf_extract(ikm=pns_key, salt="nip44-v2")

ctext = nip44_encrypt(pns_nip44_key, nonce, inner_event_json)

pns_evt = {
  kind: 1080,
  pubkey: pns_keypair.pubkey,
  created_at: now(),
  tags: [],
  content: ctext,
}
pns_evt.id = generate_id(pns_evt)
pns.sig = sign_event(pns_key, pns_evt.id)

relay.publish(pns_evt)
```

### 7. Reading Workflow

1. Recompute `pns_key = hkdf_extract(ikm=device_key, salt="nip-pns")`.
2. Derive `pns_keypair = derive_secp256k1_keypair(pns_key)`. 
2. Subscribe to kind 1080 events with `pubkey == pns_keypair.pubkey`.
3. For each candidate event:
   - Derive `pns_nip44_key = hkdf_extract(ikm=pns_key, salt="nip44-v2")`.
   - Attempt NIP-44 decryption using `pns_nip44_key`.
   - If successful, parse the decrypted inner event.
   - If decryption fails, discard.


## Reference Implementation (TypeScript excerpt)

```typescript
import * as secp from '@noble/secp256k1'
import { nip44_encrypt, nip44_decrypt, getPublicKey, signEvent } from "nostr-tools";

export function derivePnsKeypair(device_nsec: string) {
  const key = decodeNsec(device_nsec); // secp256k1 secret bytes
  const pns_key = hkdf_extract(ikm=key, salt="nip-pns"); // pns_key
  const pubKey = secp.getPublicKey(pns_key);
  return { privKey, pubKey };
}
```

## Security Considerations

- **nsec exposure** compromises all PNS data. Keep `pns_key` private.
- You **SHOULD** use per-device keys and device key lists so that if a user's nsec is compromised then private data isn't necessarily compromised at the same time. TODO: make this spec.
- Encryption via **NIP-44 v2** ensures authenticated confidentiality.
- Only ciphertext is stored on relays, minimizing metadata exposure (though timestamps remain visible).

## References

- [NIP-44][nip44]: Encrypted Direct Messages v2, for details on authenticated encryption used.
- [NIP-78][nip78]: Application-specific data storage, which handles public, structured, arbitrary app data using kind 30078. PNS is complementary, offering encrypted, private note storage instead.
- [NIP-59][nip59]: A similar protocol for encapsulating any nostr event. This is more flexible and is the basis for other protocols such as [NIP-17][nip17].

[nip44]: ./44.md
[nip78]: ./78.md
[nip59]: ./59.md
[nip17]: ./17.md
