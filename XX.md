NIP-XX
======

Nostr Key File
--------------

`draft` `optional`

This NIP defines a standard file format for storing and transporting a [NIP-49](49.md) encrypted private key (`ncryptsec`). The file provides a portable, offline-capable method for users to back up, transfer, and use their Nostr identity across clients without exposing the private key in plaintext.

## Motivation

[NIP-49](49.md) defines how to encrypt a private key with a password, producing an `ncryptsec` string. However, it does not define how that string should be stored or exchanged between clients. In practice, users resort to copying raw `nsec` or `ncryptsec` strings via clipboard — an error-prone and insecure workflow.

The biggest barrier to Nostr adoption is key management. Asking non-technical users to understand what a "private key" is, why `nsec1...` must never be shared, and where to store it safely is a losing proposition. A file-plus-password model requires zero cryptographic literacy. Every computer user already understands: "here is a file, you need a password to open it." This is how SSH keys, PGP keyrings, cryptocurrency wallets, password manager exports, and certificate keystores already work. A `.nostrkey` file turns Nostr onboarding into something a user's parents can do: sign up, save the file, remember the password.

A standard file format enables:

- **Download-on-signup**: clients generate a keypair, encrypt it, and offer a file download — the user never sees or handles a raw `nsec`.
- **Upload-to-login**: clients accept a file upload and a password, decrypt locally, and start a session — no key material is pasted or stored in the browser.
- **Portability**: a key file produced by one client can be used to log in to any other client that implements this NIP.
- **Offline backup**: the file can be stored on a USB drive, in a password manager, or printed as a QR code.

## File Format

A Nostr Key File is a UTF-8 encoded JSON file with the extension `.nostrkey`.

```json
{
  "nostrkey": 1,
  "ncryptsec": "<ncryptsec1...>",
  "npub": "<npub1...>"
}
```

### Fields

| Field      | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `nostrkey` | integer | MUST | Format version. Currently `1`. Used to identify the file as a Nostr Key File and to allow future format changes. |
| `ncryptsec` | string | MUST | A [NIP-49](49.md) encrypted private key, bech32-encoded with the `ncryptsec` prefix. |
| `npub` | string | SHOULD | The public key corresponding to the enclosed private key, bech32-encoded with the `npub` prefix as defined in [NIP-19](19.md). |

Clients MAY include additional fields. Clients MUST ignore fields they do not understand.

### File Extension

The file extension MUST be `.nostrkey`. When triggering a download, clients SHOULD use the MIME type `application/octet-stream` to force a save dialog.

### Filename Convention

Clients SHOULD name the file using the first 8 characters of the `npub` (after the `npub1` prefix):

```
nostr-<8-char-npub-fragment>.nostrkey
```

Example: `nostr-abc12345.nostrkey`

This aids identification when a user has multiple key files, while revealing only a small fragment of the public key.

## Client Behavior

### Creating a Key File (Signup / Export)

1. Generate or obtain the private key as a 32-byte value.
2. Prompt the user for a password. The password MUST be at least 1 character. Clients SHOULD enforce a minimum length (e.g. 8 characters) and SHOULD display a strength indicator.
3. Encrypt the private key using [NIP-49](49.md), producing an `ncryptsec` string.
4. Derive the public key and encode it as an `npub`.
5. Construct the JSON object per the format above.
6. Trigger a file download with the `.nostrkey` extension.
7. Display a warning that the password is not recoverable and that the user is responsible for safekeeping the file.

The private key MUST NOT be written to any persistent client-side storage (localStorage, sessionStorage, IndexedDB, cookies, Service Workers) at any point during this process.

### Reading a Key File (Login)

1. Accept the file via file picker, drag-and-drop, or both.
2. Read the file contents as UTF-8 text.
3. Parse as JSON. If JSON parsing fails, check whether the entire contents (trimmed) begin with `ncryptsec1`. If so, treat the string as a bare `ncryptsec` with no metadata — proceed to step 5.
4. Validate: `nostrkey` field MUST be present and equal to `1`. `ncryptsec` field MUST be present and MUST begin with `ncryptsec1`.
5. If `npub` is present, display it to the user to confirm they are opening the correct identity.
6. Prompt for the password.
7. Decrypt the `ncryptsec` using [NIP-49](49.md).
8. If `npub` is present, derive the public key from the decrypted private key and verify it matches the `npub`. If it does not match, the client MUST reject the file and display an error.
9. Hold the decrypted private key in memory for the session. Do NOT persist it.

### Error Handling

- **Wrong password**: NIP-49 decryption will fail because XChaCha20-Poly1305 authentication will not verify. Clients SHOULD display "Wrong password or corrupted file."
- **Unknown version**: If `nostrkey` is greater than `1`, clients SHOULD display "This key file requires a newer version of this app."
- **Invalid file**: If the file is not valid JSON and does not begin with `ncryptsec1`, clients SHOULD display "Not a valid Nostr key file."

## Security Considerations

- The decrypted private key MUST be held only in volatile memory (a runtime variable). It MUST NOT be written to any persistent storage mechanism.
- The password MUST NOT be stored or transmitted. Clients SHOULD overwrite the password variable after use.
- The `ncryptsec` string SHOULD NOT be published to Nostr relays, as noted in [NIP-49](49.md).
- Clients MUST serve this flow over HTTPS. The entire security model is void over plaintext HTTP.
- The `npub` field is not sensitive — it is the user's public key — but it does allow an attacker who obtains the file to identify which Nostr identity it belongs to. Users who require anonymity should be aware of this.
- Clients SHOULD warn users clearly during signup that there is no password recovery mechanism. If both the file and the password are lost, the identity is unrecoverable.
- Clients SHOULD recommend that users store the file in a secure location: a password manager, an encrypted disk, or offline storage.

## Backwards Compatibility

This NIP introduces a new file format and does not affect any existing Nostr event kinds, relay behavior, or client functionality. Clients that do not implement this NIP are unaffected.

Clients that already support [NIP-49](49.md) `ncryptsec` import via text paste can add `.nostrkey` file support incrementally — the `ncryptsec` string inside the file is identical to what they already handle.

The fallback parsing rule (accepting a bare `ncryptsec1...` string when JSON parsing fails) ensures that a user who saved only the `ncryptsec` string to a file — without the JSON wrapper — can still use the login flow.

## Relation to Other NIPs

- **[NIP-49](49.md)**: This NIP builds directly on NIP-49. NIP-49 defines the `ncryptsec` encryption format; this NIP defines the file container and client behavior around it.
- **[NIP-07](07.md)**: Browser extension signers (e.g. nos2x, Alby) solve the same UX problem differently — they keep the key in the extension rather than in a file. Clients SHOULD support both NIP-07 and `.nostrkey` file login.
- **[NIP-46](46.md)**: Remote signers / bunkers keep keys on a separate device or server. This is a more advanced architecture. `.nostrkey` files serve users who want direct control of their key without running additional infrastructure.
- **NIP-79 (Passkey-Wrapped Keys / Nosskey)**: Passkeys tie a key to a hardware authenticator via WebAuthn. This NIP provides a portable, device-independent alternative. The two approaches are complementary — passkeys for daily use on a trusted device, `.nostrkey` files as offline backup or for cross-device transfer.

## Test Vectors

### Minimal valid file

```json
{
  "nostrkey": 1,
  "ncryptsec": "ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsl8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p"
}
```

- Password: `nostr`
- Decrypted hex private key: `3501454135014541350145413501453fefb02227e449e57cf4d3a3ce05378683`
- This is the same test vector defined in [NIP-49](49.md).

### File with npub

```json
{
  "nostrkey": 1,
  "ncryptsec": "ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsl8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p",
  "npub": "npub1vu4rr079n5lsg4ywexma4m469asczn5ve3qyfqz9qpl4g70kjw3sgny3w6"
}
```

- After decrypting with password `nostr`, the client derives the public key from the private key and verifies it matches the `npub`.

### Bare ncryptsec fallback

A file whose entire contents are:

```
ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsl8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p
```

- JSON parsing fails, but the string begins with `ncryptsec1`, so the client proceeds directly to the password prompt.

## FAQ

**Why not just use NIP-49 directly?**

NIP-49 defines the *encryption format*. This NIP defines the *file container* and the *client behavior* around it. A user should be able to sign up on Client A, download a `.nostrkey` file, and log in on Client B without any instructions beyond "upload your key file and enter your password."

**Why JSON and not just the raw ncryptsec string?**

The JSON wrapper provides a version field for future evolution and an `npub` for identity preview before decryption. The fallback rule ensures bare `ncryptsec` files still work.

**Why not store additional metadata (relay list, profile name, etc.)?**

Scope. This NIP solves one problem: portable encrypted key storage. Profile metadata and relay lists are already handled by existing NIPs ([NIP-01](01.md) kind:0, [NIP-65](65.md) kind:10002) and should be fetched from relays after login, not bundled into the key file.

**Should clients offer both file-based login and ncryptsec paste?**

Yes. The file-based flow is the recommended default for new users, but clients SHOULD also accept a raw `ncryptsec` string paste for interoperability with existing workflows.
