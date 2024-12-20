NIP-44
======

Encrypted Payloads (Versioned)
------------------------------

`optional`

The NIP introduces a new data format for keypair-based encryption. This NIP is versioned
to allow multiple algorithm choices to exist simultaneously. This format may be used for
many things, but MUST be used in the context of a signed event as described in NIP-01.

*Note*: this format DOES NOT define any `kind`s related to a new direct messaging standard,
only the encryption required to define one. It SHOULD NOT be used as a drop-in replacement
for NIP-04 payloads.

## Versions

Currently defined encryption algorithms:

- `0x00` - Reserved
- `0x01` - Deprecated and undefined
- `0x02` - secp256k1 ECDH, HKDF, padding, ChaCha20, HMAC-SHA256, base64

## Limitations

Every nostr user has their own public key, which solves key distribution problems present
in other solutions. However, nostr's relay-based architecture makes it difficult to implement
more robust private messaging protocols with things like metadata hiding, forward secrecy,
and post compromise secrecy.

The goal of this NIP is to have a _simple_ way to encrypt payloads used in the context of a signed
event. When applying this NIP to any use case, it's important to keep in mind your users' threat
model and this NIP's limitations. For high-risk situations, users should chat in specialized E2EE
messaging software and limit use of nostr to exchanging contacts.

On its own, messages sent using this scheme have a number of important shortcomings:

- No deniability: it is possible to prove an event was signed by a particular key
- No forward secrecy: when a key is compromised, it is possible to decrypt all previous conversations
- No post-compromise security: when a key is compromised, it is possible to decrypt all future conversations
- No post-quantum security: a powerful quantum computer would be able to decrypt the messages
- IP address leak: user IP may be seen by relays and all intermediaries between user and relay
- Date leak: `created_at` is public, since it is a part of NIP-01 event
- Limited message size leak: padding only partially obscures true message length
- No attachments: they are not supported

Lack of forward secrecy may be partially mitigated by only sending messages to trusted relays, and asking
relays to delete stored messages after a certain duration has elapsed.

## Version 2

NIP-44 version 2 has the following design characteristics:

- Payloads are authenticated using a MAC before signing rather than afterwards because events are assumed
  to be signed as specified in NIP-01. The outer signature serves to authenticate the full payload, and MUST
  be validated before decrypting.
- ChaCha is used instead of AES because it's faster and has
  [better security against multi-key attacks](https://datatracker.ietf.org/doc/draft-irtf-cfrg-aead-limits/).
- ChaCha is used instead of XChaCha because XChaCha has not been standardized. Also, xChaCha's improved collision
  resistance of nonces isn't necessary since every message has a new (key, nonce) pair.
- HMAC-SHA256 is used instead of Poly1305 because polynomial MACs are much easier to forge.
- SHA256 is used instead of SHA3 or BLAKE because it is already used in nostr. Also BLAKE's speed advantage
  is smaller in non-parallel environments.
- A custom padding scheme is used instead of padmé because it provides better leakage reduction for small messages.
- Base64 encoding is used instead of another encoding algorithm because it is widely available, and is already used in nostr.

### Encryption

1. Calculate a conversation key
   - Execute ECDH (scalar multiplication) of public key B by private key A
     Output `shared_x` must be unhashed, 32-byte encoded x coordinate of the shared point
   - Use HKDF-extract with sha256, `IKM=shared_x` and `salt=utf8_encode('nip44-v2')`
   - HKDF output will be a `conversation_key` between two users.
   - It is always the same, when key roles are swapped: `conv(a, B) == conv(b, A)`
2. Generate a random 32-byte nonce
   - Always use [CSPRNG](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator)
   - Don't generate a nonce from message content
   - Don't re-use the same nonce between messages: doing so would make them decryptable,
     but won't leak the long-term key
3. Calculate message keys
   - The keys are generated from `conversation_key` and `nonce`. Validate that both are 32 bytes long
   - Use HKDF-expand, with sha256, `PRK=conversation_key`, `info=nonce` and `L=76`
   - Slice 76-byte HKDF output into: `chacha_key` (bytes 0..32), `chacha_nonce` (bytes 32..44), `hmac_key` (bytes 44..76)
4. Add padding
   - Content must be encoded from UTF-8 into byte array
   - Validate plaintext length. Minimum is 1 byte, maximum is 65535 bytes
   - Padding format is: `[plaintext_length: u16][plaintext][zero_bytes]`
   - Padding algorithm is related to powers-of-two, with min padded msg size of 32 bytes
   - Plaintext length is encoded in big-endian as first 2 bytes of the padded blob
5. Encrypt padded content
   - Use ChaCha20, with key and nonce from step 3
6. Calculate MAC (message authentication code)
   - AAD (additional authenticated data) is used - instead of calculating MAC on ciphertext,
     it's calculated over a concatenation of `nonce` and `ciphertext`
   - Validate that AAD (nonce) is 32 bytes
7. Base64-encode (with padding) params using `concat(version, nonce, ciphertext, mac)`

Encrypted payloads MUST be included in an event's payload, hashed, and signed as defined in NIP 01, using schnorr
signature scheme over secp256k1.

### Decryption

Before decryption, the event's pubkey and signature MUST be validated as defined in NIP 01. The public key MUST be
a valid non-zero secp256k1 curve point, and the signature must be valid secp256k1 schnorr signature. For exact
validation rules, refer to BIP-340.

1. Check if first payload's character is `#`
   - `#` is an optional future-proof flag that means non-base64 encoding is used
   - The `#` is not present in base64 alphabet, but, instead of throwing `base64 is invalid`,
     implementations MUST indicate that the encryption version is not yet supported
2. Decode base64
   - Base64 is decoded into `version, nonce, ciphertext, mac`
   - If the version is unknown, implementations must indicate that the encryption version is not supported
   - Validate length of base64 message to prevent DoS on base64 decoder: it can be in range from 132 to 87472 chars
   - Validate length of decoded message to verify output of the decoder: it can be in range from 99 to 65603 bytes
3. Calculate conversation key
   - See step 1 of [encryption](#Encryption)
4. Calculate message keys
   - See step 3 of [encryption](#Encryption)
5. Calculate MAC (message authentication code) with AAD and compare
   - Stop and throw an error if MAC doesn't match the decoded one from step 2
   - Use constant-time comparison algorithm
6. Decrypt ciphertext
   - Use ChaCha20 with key and nonce from step 3
7. Remove padding
   - Read the first two BE bytes of plaintext that correspond to plaintext length
   - Verify that the length of sliced plaintext matches the value of the two BE bytes
   - Verify that calculated padding from step 3 of the [encryption](#Encryption) process matches the actual padding

### Details

- Cryptographic methods
  - `secure_random_bytes(length)` fetches randomness from CSPRNG.
  - `hkdf(IKM, salt, info, L)` represents HKDF [(RFC 5869)](https://datatracker.ietf.org/doc/html/rfc5869)
    with SHA256 hash function comprised of methods `hkdf_extract(IKM, salt)` and `hkdf_expand(OKM, info, L)`.
  - `chacha20(key, nonce, data)` is ChaCha20 [(RFC 8439)](https://datatracker.ietf.org/doc/html/rfc8439) with
    starting counter set to 0.
  - `hmac_sha256(key, message)` is HMAC [(RFC 2104)](https://datatracker.ietf.org/doc/html/rfc2104).
  - `secp256k1_ecdh(priv_a, pub_b)` is multiplication of point B by scalar a (`a ⋅ B`), defined in
    [BIP340](https://github.com/bitcoin/bips/blob/e918b50731397872ad2922a1b08a5a4cd1d6d546/bip-0340.mediawiki).
    The operation produces a shared point, and we encode the shared point's 32-byte x coordinate, using method
    `bytes(P)` from BIP340. Private and public keys must be validated as per BIP340: pubkey must be a valid,
    on-curve point, and private key must be a scalar in range `[1, secp256k1_order - 1]`.
    NIP44 doesn't do hashing of the output: keep this in mind, because some libraries hash it using sha256.
    As an example, in libsecp256k1, unhashed version is available in `secp256k1_ec_pubkey_tweak_mul`
- Operators
  - `x[i:j]`, where `x` is a byte array and `i, j <= 0` returns a `(j - i)`-byte array with a copy of the
    `i`-th byte (inclusive) to the `j`-th byte (exclusive) of `x`.
- Constants `c`:
  - `min_plaintext_size` is 1. 1 byte msg is padded to 32 bytes.
  - `max_plaintext_size` is 65535 (64kB - 1). It is padded to 65536 bytes.
- Functions
  - `base64_encode(string)` and `base64_decode(bytes)` are Base64 ([RFC 4648](https://datatracker.ietf.org/doc/html/rfc4648), with padding)
  - `concat` refers to byte array concatenation
  - `is_equal_ct(a, b)` is constant-time equality check of 2 byte arrays
  - `utf8_encode(string)` and `utf8_decode(bytes)` transform string to byte array and back
  - `write_u8(number)` restricts number to values 0..255 and encodes into Big-Endian uint8 byte array
  - `write_u16_be(number)` restricts number to values 0..65535 and encodes into Big-Endian uint16 byte array
  - `zeros(length)` creates byte array of length `length >= 0`, filled with zeros
  - `floor(number)` and `log2(number)` are well-known mathematical methods

### Implementation pseudocode

The following is a collection of python-like pseudocode functions which implement the above primitives,
intended to guide implementers. A collection of implementations in different languages is available at https://github.com/paulmillr/nip44.

```py
# Calculates length of the padded byte array.
def calc_padded_len(unpadded_len):
  next_power = 1 << (floor(log2(unpadded_len - 1))) + 1
  if next_power <= 256:
    chunk = 32
  else:
    chunk = next_power / 8
  if unpadded_len <= 32:
    return 32
  else:
    return chunk * (floor((len - 1) / chunk) + 1)

# Converts unpadded plaintext to padded bytearray
def pad(plaintext):
  unpadded = utf8_encode(plaintext)
  unpadded_len = len(plaintext)
  if (unpadded_len < c.min_plaintext_size or
      unpadded_len > c.max_plaintext_size): raise Exception('invalid plaintext length')
  prefix = write_u16_be(unpadded_len)
  suffix = zeros(calc_padded_len(unpadded_len) - unpadded_len)
  return concat(prefix, unpadded, suffix)

# Converts padded bytearray to unpadded plaintext
def unpad(padded):
  unpadded_len = read_uint16_be(padded[0:2])
  unpadded = padded[2:2+unpadded_len]
  if (unpadded_len == 0 or
      len(unpadded) != unpadded_len or
      len(padded) != 2 + calc_padded_len(unpadded_len)): raise Exception('invalid padding')
  return utf8_decode(unpadded)

# metadata: always 65b (version: 1b, nonce: 32b, max: 32b)
# plaintext: 1b to 0xffff
# padded plaintext: 32b to 0xffff
# ciphertext: 32b+2 to 0xffff+2
# raw payload: 99 (65+32+2) to 65603 (65+0xffff+2)
# compressed payload (base64): 132b to 87472b
def decode_payload(payload):
  plen = len(payload)
  if plen == 0 or payload[0] == '#': raise Exception('unknown version')
  if plen < 132 or plen > 87472: raise Exception('invalid payload size')
  data = base64_decode(payload)
  dlen = len(d)
  if dlen < 99 or dlen > 65603: raise Exception('invalid data size');
  vers = data[0]
  if vers != 2: raise Exception('unknown version ' + vers)
  nonce = data[1:33]
  ciphertext = data[33:dlen - 32]
  mac = data[dlen - 32:dlen]
  return (nonce, ciphertext, mac)

def hmac_aad(key, message, aad):
  if len(aad) != 32: raise Exception('AAD associated data must be 32 bytes');
  return hmac(sha256, key, concat(aad, message));

# Calculates long-term key between users A and B: `get_key(Apriv, Bpub) == get_key(Bpriv, Apub)`
def get_conversation_key(private_key_a, public_key_b):
  shared_x = secp256k1_ecdh(private_key_a, public_key_b)
  return hkdf_extract(IKM=shared_x, salt=utf8_encode('nip44-v2'))

# Calculates unique per-message key
def get_message_keys(conversation_key, nonce):
  if len(conversation_key) != 32: raise Exception('invalid conversation_key length')
  if len(nonce) != 32: raise Exception('invalid nonce length')
  keys = hkdf_expand(OKM=conversation_key, info=nonce, L=76)
  chacha_key = keys[0:32]
  chacha_nonce = keys[32:44]
  hmac_key = keys[44:76]
  return (chacha_key, chacha_nonce, hmac_key)

def encrypt(plaintext, conversation_key, nonce):
  (chacha_key, chacha_nonce, hmac_key) = get_message_keys(conversation_key, nonce)
  padded = pad(plaintext)
  ciphertext = chacha20(key=chacha_key, nonce=chacha_nonce, data=padded)
  mac = hmac_aad(key=hmac_key, message=ciphertext, aad=nonce)
  return base64_encode(concat(write_u8(2), nonce, ciphertext, mac))

def decrypt(payload, conversation_key):
  (nonce, ciphertext, mac) = decode_payload(payload)
  (chacha_key, chacha_nonce, hmac_key) = get_message_keys(conversation_key, nonce)
  calculated_mac = hmac_aad(key=hmac_key, message=ciphertext, aad=nonce)
  if not is_equal_ct(calculated_mac, mac): raise Exception('invalid MAC')
  padded_plaintext = chacha20(key=chacha_key, nonce=chacha_nonce, data=ciphertext)
  return unpad(padded_plaintext)

# Usage:
#   conversation_key = get_conversation_key(sender_privkey, recipient_pubkey)
#   nonce = secure_random_bytes(32)
#   payload = encrypt('hello world', conversation_key, nonce)
#   'hello world' == decrypt(payload, conversation_key)
```

### Audit

The v2 of the standard was audited by [Cure53](https://cure53.de) in December 2023.
Check out [audit-2023.12.pdf](https://github.com/paulmillr/nip44/blob/ce63c2eaf345e9f7f93b48f829e6bdeb7e7d7964/audit-2023.12.pdf)
and [auditor's website](https://cure53.de/audit-report_nip44-implementations.pdf).

### Tests and code

A collection of implementations in different languages is available at https://github.com/paulmillr/nip44.

We publish extensive test vectors. Instead of having it in the document directly, a sha256 checksum of vectors is provided:

    269ed0f69e4c192512cc779e78c555090cebc7c785b609e338a62afc3ce25040  nip44.vectors.json

Example of a test vector from the file:

```json
{
  "sec1": "0000000000000000000000000000000000000000000000000000000000000001",
  "sec2": "0000000000000000000000000000000000000000000000000000000000000002",
  "conversation_key": "c41c775356fd92eadc63ff5a0dc1da211b268cbea22316767095b2871ea1412d",
  "nonce": "0000000000000000000000000000000000000000000000000000000000000001",
  "plaintext": "a",
  "payload": "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABee0G5VSK0/9YypIObAtDKfYEAjD35uVkHyB0F4DwrcNaCXlCWZKaArsGrY6M9wnuTMxWfp1RTN9Xga8no+kF5Vsb"
}
```

The file also contains intermediate values. A quick guidance with regards to its usage:

- `valid.get_conversation_key`: calculate conversation_key from secret key sec1 and public key pub2
- `valid.get_message_keys`: calculate chacha_key, chacha_nonce, hmac_key from conversation_key and nonce
- `valid.calc_padded_len`: take unpadded length (first value), calculate padded length (second value)
- `valid.encrypt_decrypt`: emulate real conversation. Calculate pub2 from sec2, verify conversation_key from (sec1, pub2), encrypt, verify payload, then calculate pub1 from sec1, verify conversation_key from (sec2, pub1), decrypt, verify plaintext.
- `valid.encrypt_decrypt_long_msg`: same as previous step, but instead of a full plaintext and payload, their checksum is provided.
- `invalid.encrypt_msg_lengths`
- `invalid.get_conversation_key`: calculating conversation_key must throw an error
- `invalid.decrypt`: decrypting message content must throw an error
