NIP-EGM
======

Encrypted Group Messages via Symmetric Key Distribution
-------------

`draft` `optional`

## Abstract

This NIP defines a method for sending encrypted messages to multiple recipients using symmetric AES encryption. The shared AES key is encrypted individually for each recipient using NIP-44, allowing the message to be decrypted by any of the intended recipients using a single Nostr event.

## Motivation

NIP-44 (v2) provides a secure encryption method for private 1-to-1 messages but does not address group messaging without duplicating events.

This NIP introduces a way to distribute a single event that contains a message encrypted with a symmetric AES key. The AES key is then individually encrypted for each recipient using the standard NIP-44 flow. This enables efficient and private group communication within the Nostr protocol.

## Tags

- `["rec", <recipient_pubkey>]`: Declares each intended recipient's public key.
- `["key", <recipient_pubkey>, <encrypted_aes_key>]`: Contains the AES key encrypted specifically for each recipient using `nip44.encrypt`.

## Specification

### Event Structure

- `kind`: Any valid event kind. Default is `1` (text note).
- `content`: A JSON object containing:
  - `ciphertext`: AES-GCM encrypted message, encoded in base64.
  - `iv`: AES-GCM initialization vector, encoded in base64.
- `tags`: One or more of the following per recipient:
  - `["rec", <pubkey>]`: Declares a recipient.
  - `["key", <pubkey>, <encrypted_key>]`: Contains the encrypted AES key using NIP-44.

### Message Creation

1. Generate a 256-bit AES key: `Uint8Array(32)`.
2. Encrypt the plaintext message using AES-GCM with a randomly generated IV.
3. For each recipient:
   - Derive a `conversationKey` using `nip44.getConversationKey(senderPrivkey, recipientPubkey)`.
   - Encrypt the AES key with `nip44.encrypt(aesKeyHex, conversationKey)`.
4. Construct a single Nostr event with `rec` and `key` tags.
5. Sign the event with `finalizeEvent(event, senderPrivkey)`.

### Message Decryption

1. From the recipient's private key, derive the public key.
2. Locate the `["key", pubkey, encrypted_key]` tag that matches.
3. Derive the `conversationKey` using `nip44.getConversationKey(recipientPrivkey, senderPubkey)`.
4. Decrypt the AES key using `nip44.decrypt`.
5. Decrypt the message content using AES-GCM.

## Example

```json
{
  "kind": 1,
  "created_at": 1680000000,
  "pubkey": "<sender_pubkey>",
  "tags": [
    ["rec", "<recipient1>"],
    ["rec", "<recipient2>"],
    ["key", "<recipient1>", "<encrypted_key1>"],
    ["key", "<recipient2>", "<encrypted_key2>"]
  ],
  "content": "{\"ciphertext\":\"...\",\"iv\":\"...\"}"
}
```

## Compatibility

- Compatible with clients and libraries that already implement NIP-44 (v2).
- Events using this format can be safely ignored by clients that do not recognize this standard.

---

## Rationale

This approach enables the publication of a **single event** for multiple recipients, reducing redundancy, bandwidth usage, and synchronization issues.
Each recipient is only able to decrypt the message if they are explicitly included in the `key` tag list.

---

## Future Considerations

- Integration with `kind:1059` (from NIP-59) to support "sealable" or temporary messages.
- Support for partial anonymity: use `["anon-key", <encrypted_key>]` for messages where only those who can decrypt the key will know they are recipients.
- Consider implementing deduplication by hashing the decrypted message content.
