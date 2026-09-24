NIP-A0 Encryption Extension
============================

Voice Message Encryption
------------------------

**Status:** Draft  
**Depends on:** [NIP-A0](A0.md), [NIP-44](44.md)

This extension adds end-to-end encryption support to NIP-A0 voice messages, allowing users to send private voice messages that only the intended recipient(s) can decrypt.

## Motivation

While NIP-A0 defines voice messages (kinds 1222 and 1244), it does not specify encryption. This extension adds optional encryption using NIP-44 (recommended) or NIP-04 (legacy), allowing voice messages to be:

- **Public**: Accessible to anyone (default behavior, compatible with base NIP-A0)
- **Encrypted**: Only decryptable by specific recipient(s) using their private keys

## Specification

### Encryption Modes

Voice messages can be published in two modes:

1. **Public Mode** (default):
   - `content` field contains a direct URL to the audio file (as per NIP-A0)
   - Audio file is stored publicly on IPFS or other storage
   - Anyone can access and play the audio
   - Compatible with base NIP-A0 specification

2. **Encrypted Mode**:
   - `content` field contains an encrypted payload (NIP-44 format)
   - The encrypted payload contains:
     - Audio file URL (encrypted)
     - Optional metadata (duration, waveform, etc.)
   - Audio file itself MAY be encrypted and stored separately, OR
   - Audio file MAY be stored publicly but URL is encrypted (metadata hiding)
   - Only recipients with the correct private key can decrypt

### Event Structure

#### Public Voice Message (NIP-A0 compatible)

```json
{
  "kind": 1222,
  "content": "https://ipfs.io/ipfs/QmXXX.../voice.m4a",
  "tags": [
    ["imeta", "url https://ipfs.io/ipfs/QmXXX.../voice.m4a", "duration 45", "waveform ..."]
  ]
}
```

#### Encrypted Voice Message

```json
{
  "kind": 1222,
  "content": "nip44encryptedpayload...",
  "tags": [
    ["p", "<recipient_pubkey_1>"],
    ["p", "<recipient_pubkey_2>"],
    ["encrypted", "true"],
    ["encryption", "nip44"],
    ["imeta", "duration 45"],  // Public metadata (optional)
    ["expiration", "1752600000"]  // NIP-40: Optional expiration timestamp
  ]
}
```

### Encryption Process

1. **Prepare audio metadata**:
   - Audio file URL (IPFS CID or other storage)
   - Duration (seconds)
   - Waveform data (optional)
   - Geographic location (optional, if geolocalized)

2. **Create plaintext JSON**:
   ```json
   {
     "url": "https://ipfs.io/ipfs/QmXXX.../voice.m4a",
     "duration": 45,
     "waveform": "0 7 35 8 100...",
     "latitude": 48.8566,
     "longitude": 2.3522
   }
   ```

3. **Encrypt using NIP-44** (recommended):
   - For single recipient: Use `window.nostr.nip44.encrypt(recipient_pubkey, plaintext_json)`
   - For multiple recipients: Encrypt separately for each recipient OR use a shared secret approach
   - Store encrypted payload in `content` field

4. **Add tags**:
   - `["p", "<recipient_pubkey>"]` for each recipient
   - `["encrypted", "true"]` to indicate encryption
   - `["encryption", "nip44"]` or `["encryption", "nip04"]` to specify method
   - Public metadata tags (duration, etc.) MAY be included for preview
   - `["expiration", "<unix_timestamp>"]` MAY be included for NIP-40 expiration support

### Decryption Process

1. **Check if encrypted**:
   - Look for `["encrypted", "true"]` tag
   - If not present, treat as public (NIP-A0 compatible)

2. **Identify encryption method**:
   - Check `["encryption", "nip44"]` or `["encryption", "nip04"]` tag
   - Default to NIP-44 if not specified

3. **Decrypt content**:
   - Use `window.nostr.nip44.decrypt(sender_pubkey, encrypted_content)`
   - Parse decrypted JSON to extract audio URL and metadata

4. **Load and play audio**:
   - Fetch audio from decrypted URL
   - Display metadata (duration, waveform, location)

### Multiple Recipients

For multiple recipients, two approaches are supported:

**Approach 1: Separate encryption per recipient** (recommended for small groups):
- Create separate events for each recipient
- Each event has `content` encrypted with that recipient's public key
- All events reference the same audio file URL (may be public or encrypted separately)

**Approach 2: Shared secret** (for larger groups):
- Encrypt audio URL with a randomly generated symmetric key
- Encrypt the symmetric key separately for each recipient using NIP-44
- Store encrypted symmetric keys in tags: `["key", "<encrypted_key_for_recipient_1>"]`
- Store encrypted audio URL in `content`

### Geographic Localization

Encrypted voice messages MAY include geographic coordinates:

- If public: Use `g` tag with geohash (NIP-A0 compatible)
- If encrypted: Include coordinates in encrypted payload JSON
- Clients SHOULD display location on map only after decryption

### Audio File Storage

The audio file itself can be stored in two ways:

1. **Public storage** (metadata hiding):
   - Audio file stored publicly on IPFS
   - Only the URL is encrypted
   - Provides privacy for metadata but not for audio content
   - Useful for: hiding who can access the message

2. **Encrypted storage** (full E2EE):
   - Audio file encrypted before upload
   - Encrypted file stored on IPFS
   - Both URL and file are encrypted
   - Provides full end-to-end encryption
   - Recommended for sensitive voice messages

### Compatibility

- **Backward compatible**: Public voice messages (without encryption) remain fully compatible with base NIP-A0
- **Client support**: Clients that don't support encryption will see encrypted content but cannot decrypt
- **Fallback**: Clients SHOULD display a message indicating encryption is not supported

## Examples

### Encrypted Voice Message (Single Recipient)

```json
{
  "kind": 1222,
  "content": "nip44encryptedpayloadbase64...",
  "created_at": 1752501052,
  "pubkey": "sender_pubkey",
  "tags": [
    ["p", "recipient_pubkey"],
    ["encrypted", "true"],
    ["encryption", "nip44"],
    ["imeta", "duration 45"],
    ["expiration", "1752600000"]  // NIP-40: Optional expiration timestamp
  ],
  "id": "...",
  "sig": "..."
}
```

### Encrypted Voice Message (Multiple Recipients)

```json
{
  "kind": 1222,
  "content": "nip44encryptedpayloadbase64...",
  "created_at": 1752501052,
  "pubkey": "sender_pubkey",
  "tags": [
    ["p", "recipient1_pubkey"],
    ["p", "recipient2_pubkey"],
    ["encrypted", "true"],
    ["encryption", "nip44"],
    ["imeta", "duration 45"],
    ["expiration", "1752600000"]  // NIP-40: Optional expiration timestamp
  ],
  "id": "...",
  "sig": "..."
}
```

### Decrypted Content (example)

```json
{
  "url": "https://ipfs.io/ipfs/QmXXX.../voice_encrypted.m4a",
  "duration": 45,
  "waveform": "0 7 35 8 100 100 49 8...",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "file_encrypted": true
}
```

## Security Considerations

1. **NIP-44 is recommended** over NIP-04 for better security
2. **Audio file encryption**: For maximum privacy, encrypt the audio file before upload
3. **Metadata leakage**: Public tags (duration, etc.) may leak information
4. **Relay trust**: Relays can see event metadata but not decrypted content
5. **Forward secrecy**: Not provided by this extension (see NIP-44 limitations)

## Implementation Notes

- Clients SHOULD use NIP-44 (`window.nostr.nip44.encrypt/decrypt`) when available
- Clients MAY fall back to NIP-04 for backward compatibility
- Audio files SHOULD be limited to 60 seconds as per NIP-A0
- Maximum file size: 10MB (recommended for encrypted voice messages)

