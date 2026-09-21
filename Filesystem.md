NIP-FS
======

Private Encrypted File System
-----------------------------

`draft` `optional`

Defines a protocol for a private encrypted file drive using [Blossom](https://github.com/hzrd149/blossom) blob servers for file storage and Nostr relays for an encrypted file index.

The file metadata event uses the Metadata event per NIP-Metadata with subtype as `files`

---

## Kind 34578 — File Metadata Subtype

One event per file, encrypted with the encryption key stored in the user metadata event.

**Tags:**

| tag | value |
|-----|-------|
| `d` | SHA-256 hash of the encrypted file blob |
| `t` | `"files"` — marks this as a file metadata record |
| `encrypted` | `nip44` |
| `client` | client identifier (e.g. `formstr-drive`) |

**Content:** `nip44.v2.encrypt(json, driveConversationKey)` where plaintext is:

```json
{
  "name": "<filename>",
  "hash": "<optional sha256 hex of the original file>",
  "size": <bytes>,
  "type": "<MIME type>",
  "folder": "<virtual path, e.g. /docs/work>",
  "uploadedAt": <unix timestamp ms>,
  "server": "<blossom server base URL>",
  "encryptionKey": "<hex-encoded per-file private key>",
  "deleted": <boolean, optional>,
  "previewHash": "<sha256 hex, optional>",
  "chunks": List<{"hash": "<hash of the encrypted chunk>", "server": "<optional blossom server base URL, if the chunk was sent to another server>"}>
}
```

---

## File Encryption

Each **chunk** of a file is encrypted with a per-file ephemeral keypair using AES-GCM with NIP-44 v2 HKDF key derivation:

1. Generate a random keypair `(sk, pk)` for the file
2. `conversationKey = getConversationKey(sk, pk)`
3. Generate random `nonce` (32 bytes)
4. `HKDF-SHA256(conversationKey, salt=nonce, info="nip44-v2")` → 44 bytes.
5. AES-GCM encrypt `base64(fileBytes)`: `key = derived[0:32]`, `iv = derived[32:44]`
6. Blob format (base64): `0x02 || nonce (32 bytes) || ciphertext`
7. Store `hex(sk)` as `encryptionKey` in the file metadata content

---

## Directives

- File Metadata events MUST be encrypted with `nip44.v2.encrypt` using the encryption key directly (not via the identity signer).
- The `d` tag of a File Metadata event MUST equal the SHA-256 hash of the **encrypted** chunks as returned by the Blossom server.
- File Metadata events MUST carry `["t", "files"]` to distinguish them from other metadata events.
- To rename or move a file to another folder: publish a new File Metadata event with the same `d` tag.
- Delete: Delete all the chunks from the blossom server, the preview(if applicable) and the file metadata event
- Clients MUST skip events whose content they cannot decrypt.
- Virtual folders are derived from the `folder` field; clients MUST NOT publish separate folder events.
- When multiple events share the same `d` tag, clients MUST use the one with the highest `created_at`.

---

## Examples

File Metadata event:

```jsonc
{
  "kind": 34578,
  "pubkey": "abc123...",
  "created_at": 1700000001,
  "tags": [
    ["d", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["t", "files"],
    ["encrypted", "nip44"],
    ["client", "formstr-drive"]
  ],
  "content": "<nip44-ciphertext using drive conversation key>",
  "sig": "..."
}
```

Decrypted File Metadata content:

```json
{
  "name": "report.pdf",
  "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "size": 204800,
  "type": "application/pdf",
  "folder": "/work/docs",
  "uploadedAt": 1700000001000,
  "server": "https://blossom.primal.net",
  "encryptionKey": "cafebabe5678...",
  "chunks":[{"hash":"289y3899f23"}, {"hash": "2983ur92u9"}]
}
```
