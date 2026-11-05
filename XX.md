NIP-XX
======

Passkey-Held Keys
-----------------

`draft` `optional`

This NIP builds on Nosskey’s two approaches: **direct**, where a passkey derives the Nostr key, and **wrapped**, where a passkey unlocks an existing key. It adds optional tagged user handles and a shared recovery record for clients that opt into this format. Existing Nosskey accounts can keep their current format; using this proposal does not require migrating them.

Access requires authorization for the credential’s relying party (RP) ID through WebAuthn, native app associations or supported [Related Origin Requests](https://www.w3.org/TR/webauthn-3/#sctn-related-origins). This NIP does not grant access across origins or expose an inventory of passkeys.

## Relationship to existing work

[Nosskey / Passkey-Wrapped Keys (#1919)](https://github.com/nostr-protocol/nips/pull/1919) previously proposed direct PRF-derived keys and encrypted existing keys. Its [SDK](https://github.com/ocknamo/nosskey-sdk) implements both, records the mode in local account metadata and distinguishes an unknown credential from a restored account. This draft does not introduce those concepts; it proposes credential-level mode discovery and a shared recovery record for independently implemented clients, with an optional vault companion.

Existing Nosskey credentials and wrapped records are not compatible with this draft's derivation or encrypted envelope. Compatibility requires an explicit legacy reader or user-approved migration, not relabeling an existing credential. Nosskey's [iframe signer](https://github.com/ocknamo/nosskey-sdk/tree/main/packages/nosskey-iframe) is a separate integration route: a client can request signatures from the original provider without importing the key or implementing this recovery format.

### Nosskey compatibility

A client supporting existing Nosskey accounts MUST preserve the original credential ID, RP ID, PRF input and account metadata. Direct mode uses UTF-8 `nostr-pwk` as the PRF input and the 32-byte output directly as the private key, without hashing the input or applying HKDF. Wrapped mode uses UTF-8 `nostr-pwk-wrap`; its `NostrKeyInfo.wrapped` contains `{v: 1, alg: "nip44-v2", payload}`. The payload is a NIP-44 v2 self-encrypted lowercase private-key hex string, using the PRF output as the encryption-side private key and its corresponding x-only public key as the peer. Readers MUST validate the recovered private key and match its public key against the account metadata before using it.

This compatibility path uses Nosskey's existing metadata and algorithms, not the new record below. A missing metadata record MUST NOT be treated as permission to create a direct-mode identity. The client offers recovery of the original metadata, signing through the original provider, or an explicit new-account action. Wrapped accounts need their encrypted payload in addition to the passkey. Keeping the existing account through its original provider does not require migration.

For new tagged records, this draft calls direct-style derivation **derived** and encrypted storage **stored**. Those wire names do not redefine Nosskey's existing formats. The parameter sets below do not encode Nosskey direct mode; clients MUST NOT apply them to an existing Nosskey credential. A shared tagged parameter for Nosskey direct mode is left for agreement with its implementers, rather than assigning one unilaterally.

## Terms

- **PRF output**: the 32 bytes that the [PRF extension](https://w3c.github.io/webauthn/#prf-extension), or a native API shaped like it, returns in `prf.results.first` or `.second` for the input in `prf.eval.first` or `.second`. Over CTAP2 `hmac-secret` the salt is SHA-256(UTF-8("WebAuthn PRF") `||` `00` `||` input), with user verification.
- **Handle**: the credential's `user.id` (`userHandle` in an assertion).
- **Keys**: a private key is a 32-byte big-endian integer from 1 to n - 1, n being the secp256k1 order. Public keys are 32-byte x-only keys (BIP-340).
- **Author**: the public key a stored record belongs to, which signs its relay event.
- **base64url**: RFC 4648 section 5. Unpadded means without `=`.

Bytes are hex, `||` is concatenation and offsets are zero-based.

## Handle

A client creating a passkey in this draft’s tagged format MUST set the handle to:

| Mode | Handle | Length |
|---|---|---|
| derived | `4e504b` ("NPK") `\|\|` `01` (version) `\|\|` `01` (mode) `\|\|` parameter set (1 byte) `\|\|` 16 random bytes | 22 bytes |
| stored | `4e504b` `\|\|` `01` `\|\|` `02` `\|\|` author (32 bytes) | 37 bytes |

A client MUST classify a handle by the first rule that matches:

1. 22 bytes starting with `4e504b0101`: **derived**, parameter set at offset 5.
2. 37 bytes starting with `4e504b0102`: **stored**, author at offsets 5 to 36.
3. Exactly 32 bytes: **probably legacy stored**, author = the handle.
4. 33 bytes starting with `03`: **legacy key-in-handle**. Clients MAY read it to migrate and MUST NOT create it.
5. Any other handle starting with `4e504b`: **unsupported**.
6. Anything else, or no handle: **unknown**, see [Unknown handles](#unknown-handles).

Rule 3 comes before rule 5 so that a 32-byte public key starting with `4e504b` is still read as a public key. Tagged handles are never 32 bytes long. A client MAY refuse a rule 3 passkey without a lookup if it reads no legacy stored format or the handle is not a valid public key.

A client MUST refuse an unsupported handle, or a derived handle with a parameter set it does not implement, saying that another or a newer app made the passkey, and MUST NOT derive a key from it or run discovery on it.

## Derived keys

```
prf_input = SHA-256(UTF-8(salt_label))
secret    = HKDF-SHA256(ikm = PRF output for prf_input, salt = prf_input, info = UTF-8(info_label), length = 32)
```

HKDF is RFC 5869. If `secret` is not a valid private key, the client MUST fail and not retry with another input.

| Parameter set | `salt_label` | `info_label` |
|---|---|---|
| `01` | `nostr-passkey:derive:v1` | `nostr-passkey:nsec:v1` |
| `02` | `lawallet-nsec-prf-v1` | `lawallet-nsec-v1` |

Other values are reserved. `02` is LaWallet's existing derivation, listed so that its apps can tag new passkeys without a second derivation; other clients SHOULD use `01`. If a derived key has no separate backup, losing its passkey loses access to that key. A new credential has a different PRF secret and cannot reproduce it through the same derivation alone; while the original is accessible, the recovered key can be protected by a second credential in stored mode. Applications should explain the recovery tradeoff when offering either approach. Stored mode allows additional credentials to protect the same identity; direct mode avoids a separate encrypted-key record but depends on the original credential or a separately exported key. This draft does not require an existing direct-mode account to migrate.

A client MUST NOT derive a key from a passkey classified as stored, probably legacy stored or legacy key-in-handle, before or after any record lookup, even when no record is found: random 32-byte handles exist and relays can be unreachable.

## Stored records

| Type | Name | Plaintext | Author |
|---|---|---|---|
| `01` | `key` | the 32-byte private key | its public key |
| `02` | | reserved, MUST NOT be written | |
| `03` | `vault` | defined by [NIP-YY](YY.md) | defined by NIP-YY |

New records contain only type `01` keys or type `03` vaults. Seed-only identities use the companion vault format; a legacy seed payload MAY be read for migration under its legacy format, but MUST NOT be emitted as type `02` or on the new kind.

Records are written only for tagged stored handles, under the handle's author. A record *opens* when it decrypts, its plaintext is valid and the author is the public key of the `key` (the author check); the companion defines the author check for `vault`. A client MUST NOT use a record that does not open. A `key` plaintext must be a valid private key. Plaintexts MUST NOT exceed 65,536 bytes; longer ones do not open.

```
prf_input = SHA-256(UTF-8("nostr-passkey:store:v1"))
key       = HKDF-SHA256(ikm = PRF output for prf_input, salt = hkdf_salt, info = UTF-8("nostr-passkey:store:v1"), length = 32)
aad       = "NPK" || 01 || type || len(rp_id) (1 byte) || rp_id || author (32 bytes) || len(credential_id) (2 bytes, big-endian) || credential_id
record    = "NPK" || 01 || type || iv (12 bytes) || hkdf_salt (32 bytes) || AES-256-GCM(key, iv, plaintext, aad)
```

`rp_id` is the WebAuthn call's relying party ID converted to lowercase ASCII with A-labels and no port (at most 255 bytes), never the `rp` tag or the origin. `credential_id` is the raw credential ID. `hkdf_salt` and `iv` are fresh and random for each encryption; the ciphertext ends with the 16-byte GCM tag. Readers take `type` from offset 4, never from the length. A record does not open if it is under 65 bytes, lacks the `4e504b01` prefix, has a type the reader does not implement or fails GCM.

This is not NIP-49: the PRF output is already a uniform secret that needs no password stretching, and an `ncryptsec` cannot bind the record to its relying party, author and credential as the AAD does.

### Where records are kept

- **The passkey's `largeBlob`**: the record bytes. Without the user's confirmation, a client MUST NOT overwrite a non-empty `largeBlob` it cannot open as this passkey's record.
- **Relays**, with the user's consent: the event below.
- **A file** of the record bytes, opened only when the user picks it.

A client SHOULD report failed writes and offer another storage location. Neither `largeBlob` synchronization nor provider and relay size limits are portable; a successful local write does not establish availability on another device.

A relay copy is an addressable event of kind `31778`, signed by the author, one per passkey and type:

```json
{
  "kind": 31778,
  "pubkey": "<author>",
  "tags": [
    ["d", "<credential ID, base64url unpadded>:<type name>"],
    ["rp", "<relying party ID>"]
  ],
  "content": "<record, base64 with padding (RFC 4648 section 4)>"
}
```

Writers MUST include `rp` with the record's `rp_id`. Readers MAY skip events whose `rp` is not their relying party ID, and otherwise ignore it. Other tags MAY be present and are ignored. A `content` that does not decode and re-encode to the same string (whitespace, missing padding, non-zero pad bits) does not open. Writers MUST NOT include a `v` tag. The kind identifies this event format; the record prefix identifies its binary version. Kind `31778` is provisional and is not reserved by this draft. Kind `31777` is read only for legacy formats and MUST NOT be used for new records.

Relays index only single-letter tags (NIP-01), so readers query by `d`:

```
{"kinds": [31778], "authors": ["<author>"], "#d": ["<cred>:key", "<cred>:vault"]}
```

A `d` names a credential only if it is exactly the unpadded base64url of its ID followed by `:key` or `:vault`. Clients that read legacy formats query kind `31777` separately with their legacy `d` values. Writers SHOULD publish to the author's NIP-65 write relays and to relays the user chose. Readers SHOULD query the author's NIP-65 write relays and their own, and SHOULD let the user add a relay before concluding that no record exists.

### Choosing a record

The candidates are records from files explicitly selected by the user, the passkey's `largeBlob` if it starts with `4e504b01`, and the eligible events: kind `31778`, a valid signature, `pubkey` = the author and a `d` naming this credential. Readers MUST skip events with a `v` tag. An event's record opens only if its type byte (offset 4) is the type named in its `d`.

- **`key`**: any candidate that opens will do, since `key` records never change. One that fails is reported and skipped.
- **`vault`**: selection and precedence are defined by [NIP-YY](YY.md#choosing-a-record). Core-only clients skip this type.

If nothing opens, the client reports that the key was not found or could not be opened.

## Creating a passkey

```
user.id:                 the tagged handle
authenticatorSelection:  { residentKey: "required", userVerification: "required" }
extensions:              { prf: { eval: { first: <prf_input> } }, largeBlob: { support: "preferred" } }
excludeCredentials:      the author's stored passkeys, below
```

`largeBlob` and `excludeCredentials` are for stored mode only. Creation fails if `prf.enabled` is `false`, or if there are no `prf.results` and one assertion on the new credential with the same input returns none either (some providers evaluate the PRF only on assertion). The client then tells the user to delete the unusable passkey. A stored-mode client encrypts the secret and saves the record to at least one supported location chosen by the user. When using `largeBlob`, it writes with `largeBlob: { write: <record> }` in an assertion; clients without that extension use a relay or file.

All of an author's stored passkeys under one relying party have the same handle, and a provider may replace a passkey when another with that handle is created. The replaced passkey's `largeBlob` and PRF secret are lost, and its records can no longer be opened. Before creating a stored passkey, a client MUST therefore query the author's kind `31778` events and put in `excludeCredentials` every credential ID named in the `d` of a validly signed event, and those it already knows. If there are any, it SHOULD offer to sign in with one first, so that the stored identity carries over. This query cannot discover file-only or blob-only credentials, or records on unavailable relays. It MUST NOT be treated as proof that creation cannot replace a credential. Before creating another stored passkey for an existing identity, the client MUST require a recovery copy verified independently of the credential that may be replaced, covering all keys, seed material and other vault data the user intends to preserve, and explain that replacing a credential can destroy any unbacked contents. A copy of the author key alone does not preserve other vault accounts. A client SHOULD ask the user to keep an identity's further passkeys in different providers or authenticators.

## Signing in

The client runs a discoverable assertion (`allowCredentials: []`), classifies the handle and uses only the PRF inputs the class needs, getting any it lacks from a targeted assertion (`allowCredentials` = this credential):

- **derived**: the parameter set's `prf_input`.
- **stored**: the stored `prf_input` and `largeBlob: { read: true }`, then relays, then [Choosing a record](#choosing-a-record).
- **probably legacy stored**: the legacy input and lookup. If no record opens, the client says so, notes that relays may be unreachable or another app may have made the passkey, and offers a retry; a validly signed event by the author naming this credential with a `v` the client does not read shows that another app made it.
- **legacy key-in-handle**: no PRF; the record is found by `d`.
- **unsupported**: refuse. **unknown**: see [Unknown handles](#unknown-handles).

A client MAY ask for the likely PRF inputs and the `largeBlob` in the first assertion, discarding what the class does not need, to save a prompt. Clients MUST NOT log PRF outputs or keys or send them to a server, and SHOULD zero them after use where the platform allows.

### Choosing a relying party (informative)

Each assertion targets one RP ID. A host may remember an explicitly chosen source and offer a generic “Use another passkey” chooser of configured compatible sources. This NIP does not authorize cross-origin access, define a universal source directory or merge credentials from different RP IDs into one request. Related-origin authorization and native associations remain platform requirements. A failed or cancelled ceremony does not establish that the source has no credential.

## Unknown handles

An unknown handle does not identify a derivation or storage format. A client MUST NOT try its default derivation and present the result as a recovered account, or infer direct mode from missing metadata, an empty `largeBlob` or a failed relay lookup. A non-empty unrecognized `largeBlob` is unknown application data, not proof of a particular key format.

A legacy reader MAY recover an unknown handle only with an explicitly identified legacy format and the original account metadata or an independently known expected public key. It MUST use that format's original PRF inputs and algorithms, check the RP and selected credential, and verify the recovered public key before use. Otherwise it offers recovery of the original metadata or signing through the original provider; creating a new identity is a separate, explicit action. Clients implementing only one mode follow this rule too.

A relay event merely naming an unknown credential does not establish its format or expected identity and MUST NOT authorize derivation or lock the user out.

## Existing deployments (informative)

| Deployment | What it creates |
|---|---|
| [Nosskey SDK](https://github.com/ocknamo/nosskey-sdk/tree/9a0a6c5fa54a58aba188f1ec7353176963363863) | Random 16-byte handle, so unknown. Direct mode uses PRF input UTF-8 `nostr-pwk` and the output directly as the key, without this draft's HKDF. Wrapped mode uses UTF-8 `nostr-pwk-wrap` and a NIP-44 v2 self-encrypted private-key hex string. Local `NostrKeyInfo` stores the credential ID, public key, salt and optional `wrapped` payload. Its login API returns unknown when that metadata is missing; a synced credential alone does not restore a wrapped key. |
| [LaWallet](https://github.com/lawalletio/lawallet-nwc) | Derived, parameter set `02`. Handle: a UTF-8 random UUID (36 bytes, so unknown). Relying party ID: the instance's host name, also used by its iOS and Android apps, which derive the same key. No records. |
| [keytr](https://github.com/SovereignTechnology/keytr) NIP-K1 `v=1` | Probably legacy stored. Handle: the 32-byte public key. PRF input: UTF-8 `keytr-v1`, not hashed. Kind `31777` with `d` = padded base64url credential ID, `v` = `1` and an `rp` tag. `content` is base64 of `01` `\|\|` iv (12) `\|\|` salt (32) `\|\|` ciphertext and tag (48), with key = HKDF-SHA256(ikm = PRF output, salt = salt, info = UTF-8 `keytr nsec encryption v1`, length = 32) and AAD = `keytr` `\|\|` `01` `\|\|` credential ID. |
| keytr key-in-handle `v=3` | Read-only. Handle `03` `\|\|` 32 bytes used in place of the PRF output (no PRF). The same blob, HKDF and tags as `v=1`, with `v` = `3` and AAD = `keytr` `\|\|` `03` `\|\|` credential ID. Found by `d` alone; the author is the decrypted key's public key. |
| Nostr WoT | Probably legacy stored. keytr `v=1` records, plus `v=4` events on kind `31777` that this NIP does not define and readers skip. Its `largeBlob` holds app-private JSON. Some passkeys have random 32-byte handles and no record. |

A random Nosskey handle does not reveal whether the credential uses direct or wrapped mode. Do not infer direct mode from a missing local record or empty `largeBlob`. A legacy integration needs the original account metadata and PRF inputs, with a public-key check; wrapped recovery also needs its encrypted payload. Neither parameter set `01` nor `02` reproduces Nosskey direct-mode keys.

The earlier draft placed `npk1` records on kind `31777`; those records can break legacy readers that expect bare base64url `d` values. This draft writes only kind `31778`. A reader MAY support earlier `npk1` records on kind `31777` for migration, but MUST NOT write them there.

To move a derived identity to stored mode, a client signs in with the derived passkey, creates a stored passkey for the same public key and saves the key as a `key` record or account; the old passkey works until deleted. A legacy stored secret can be rewritten in this format under a new tagged passkey, keeping the legacy record until the new passkey works on the user's other devices, except that a key-in-handle record is deleted (NIP-09) once migrated because its handle exposes the key. An app can also keep using a passkey made under another app's relying party ID while that relying party lists it, or, once the user confirms the public key, copy the secret into a stored record under its own relying party ID. Offering both, with the difference explained, lets the user choose.

## Security considerations

- **The client sees the key.** In both modes the PRF output, with the record in stored mode, gives the private key, and neither mode protects against a compromised client.
- **Gateways.** A gateway is a domain used only as a relying party ID by several apps. Every member can get the PRF output of its passkeys and so reproduce a derived key, leaving without another recovery route can lose access, and removing a member does not take back what it obtained. WebAuthn clients supporting Related Origin Requests must support at least five registrable origin labels and may impose an upper limit. Labels are not a count of apps, and this mechanism is not an unlimited federation directory. Listing an origin is a trust decision.
- **Handles are not secret.** Page scripts can read them, so they carry no secrets.
- **Blocking restore.** Anyone holding the author's private key can publish a record that does not open, or republish an older one as newer, to block or roll back relay restore through that passkey; a `largeBlob` copy that opens is not affected.
- **Metadata.** Relay records reveal the author, credential ID, relying party, type, size and timing.
- **Revocation.** A synced passkey cannot be revoked remotely, and old records may stay on relays.
- **Loss.** A passkey works only under its relying party ID. If it is deleted, the domain is lost or an app is dropped from the relying party's lists, the key cannot be recovered through that passkey. Clients SHOULD offer to export the private key or seed when they create an identity.

## References

- [Shared handle, derivation and encrypted-record vectors](https://github.com/nostr-wot/nostr-wot-sdk/blob/main/packages/identity/test/vault/fixtures/passkey-key-mode-vectors.json).
- [Stored-record and vault conformance tests](https://github.com/nostr-wot/nostr-wot-sdk/blob/main/packages/identity/test/vault/passkey-store.test.ts).
- Prior proposals: [Nosskey](https://github.com/nostr-protocol/nips/pull/1919), [keytr NIP-K1](https://github.com/SovereignTechnology/keytr/blob/main/NIP-K1.md) and [NIP-K2](https://github.com/SovereignTechnology/keytr/blob/main/nip/nip-k2.md).
