NIP-UM
======

User-Metadata
-----------------------------

`draft` `optional`

Defines a protocol for user metadata events per NIP-Metadata. User Metadata events hold metadata information about the user such as a decoupled encryption key

---

## Kind 34578 — User Metadata Event

Stores the secret metadata information about the user inside the content field. It is identified by the `d` tag

**Tags:**

| tag | value |
|-----|-------|
| `d` | `"0:<author-pubkey>"` |

**Content:** NIP-44 encrypted to the author's own pubkey (via identity signer). Plaintext is a JSON string. Currently, the proposal is that the data contains a `encryptionKey` attribute which will have the key used for decrypting/encrypting messages, files and other entities owned by the user.

```json
{
  "encryptionKey": "<hex-encoded drive private key>"
}
```

The **conversation key** used for all file metadata is:

```
conversationKey = getConversationKey(driveSecretKey, getPublicKey(driveSecretKey))
```

## Directives

- The user metadata event must have a d tag `"0:<author-pubkey>"`.
- Clients MUST encrypt and decrypt the user metadata event using the identity signer (`nip44Decrypt(authorPubkey, content)/nip44Encrypt(authorPubkey, content)`).
- Clients MAY generate and publish a new metadata event warning the user that previous events may be lost.
- When multiple events share the same `d` tag, clients MUST use the one with the highest `created_at`. Clients MAY inform the user that they found multiple metadata events

---

## Examples

User metadata event:

```jsonc
{
  "kind": 34578,
  "pubkey": "abc123...",
  "created_at": 1700000000,
  "tags": [
    ["d", "0:abc123..."],
  ],
  "content": "<nip44-ciphertext of {\"encryptionKey\",\"deadbeef...\"}>",
  "sig": "..."
}
```

