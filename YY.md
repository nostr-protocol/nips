NIP-YY
======

Passkey-Held Vaults
------------------

`draft` `optional`

This companion to [NIP-XX](XX.md) defines type `03` (`vault`) inside its stored-record envelope. It uses the same handle, PRF input, HKDF, AES-GCM, AAD, storage locations and provisional relay kind `31778`, without a `v` tag. NIP-XX alone supports single-key recovery; implementing this companion is optional.

## Vault plaintext

Readers MAY ignore vaults; a client that does not read them still reads `key` records.

```json
{
  "updated_at": 1767225600,
  "seed": { "entropy": "<hex>", "passphrase": "<optional>" },
  "accounts": [
    { "kind": "derived", "path": "m/44'/1237'/0'/0/0", "label": "Personal", "default": true },
    { "kind": "key", "secret": "<32 bytes, hex>", "label": "Imported" }
  ],
  "ext": {}
}
```

The plaintext is UTF-8 JSON (RFC 8259) in any layout; readers MUST NOT depend on whitespace, member order or escapes.

- `updated_at` (optional, missing means 0): unix seconds in plain digits, at most 2^53 - 1, set to the current time on every content change and kept when the vault is only copied.
- `seed` (optional): a NIP-06 identity. `entropy` is 16, 20, 24, 28 or 32 bytes of BIP-39 entropy in lowercase hex, and `passphrase` an optional string kept as the user entered it (missing means empty). Keys come from the English BIP-39 mnemonic of the entropy as in NIP-06, the passphrase normalized to NFKD.
- `accounts`: a non-empty array. A `derived` account has a `path`: `m/44'/1237'/` and one or more levels, at most 255 levels counting `44'` and `1237'`, each a decimal index below 2^31 without leading zeros, optionally followed by `'` for hardened (no other marker). The client derives exactly that path from `seed` (BIP-32). A `key` account has a `secret`: a private key in lowercase hex. Either kind MAY have `label` (string) and `default` (boolean). Any other field, including `path` on a `key` account or `secret` on a `derived` one, is unknown.
- `ext` (optional): an object of app data, which other clients copy unchanged and do not interpret.

The vault is invalid if:

- the plaintext is not valid UTF-8, starts with a byte order mark or is not valid JSON;
- an object repeats a member name (compared after unescaping) or a string escapes an unpaired surrogate (such as `\ud800` alone);
- the top level is not an object, or `accounts` is missing, not an array or empty;
- a present `updated_at`, `seed` (with its `entropy` and `passphrase`) or `ext` does not match the above.

An account is skipped if:

- it is not an object, or its `kind` is missing or not `derived` or `key`;
- a field its kind requires is missing, or a field of its kind does not match the above (`null` never matches);
- it is `derived` and the vault has no `seed`;
- BIP-32 gives an invalid key at any level (the client MUST NOT try the next index).

Skipped accounts and unknown fields at any level are ignored on import and kept unchanged when the vault is written again.

The default account is the first usable one with `default: true`, else the first usable one. With several usable accounts the client lets the user choose, the default preselected. A vault written for a passkey MUST contain a usable account for its author. A client SHOULD NOT remove an author's account from any vault unless the user confirms that every passkey bound to that author is deleted. A seed-only identity is a vault with the seed and one derived account at `m/44'/1237'/0'/0/0`.

Each passkey holds its own copy of the vault. When the user unlocks a passkey whose vault has a lower `updated_at` than the newest one the client holds for that author, the client SHOULD rewrite that passkey's record. Writing over a record, it MUST keep every account of that record, matched by public key, that the user did not remove in this client, and MUST ask the user first where it cannot (for example, two different seeds).

## Choosing a record

A vault opens only after NIP-XX envelope validation, the plaintext checks above, and confirmation that at least one usable account has the handle author’s public key. Readers use the passkey’s vault `largeBlob` and the newest eligible `:vault` relay event (highest `created_at`, ties to the lowest `id` as in NIP-01); they MUST NOT fall back to an older relay event. If both open, the higher `updated_at` wins. If their timestamps are equal but their vault contents differ, the client MUST report a conflict and ask the user which copy to open; it MUST NOT silently overwrite either copy. If one fails, report the failure (for an event, as possible tampering) and use the other. A reader supporting this companion prefers an opening vault over a key record. If neither vault source opens, it may use an opening key record under NIP-XX. A file explicitly selected by the user is also a candidate and must pass the same validation. Apply the highest `updated_at` and equal-timestamp conflict rules across all opening candidates, including files; compare parsed JSON contents, not whitespace or object member order. Before replacing known state with an older file or a conflicting file with an equal timestamp, the client MUST explain the conflict and obtain confirmation; selection alone does not authorize overwriting other copies.

## Security

Opening a vault exposes every usable account. Tell the user what it contains before saving it. Anyone holding the author’s key can block or roll back relay recovery by signing replacement events; the author SHOULD be an account whose key the user does not give to other apps. Each passkey is an independent copy, and provider synchronization is not guaranteed.

## Test vectors

See the [shared vectors](https://github.com/nostr-wot/nostr-wot-sdk/blob/main/packages/identity/test/vault/fixtures/passkey-key-mode-vectors.json) and [conformance tests](https://github.com/nostr-wot/nostr-wot-sdk/blob/main/packages/identity/test/vault/passkey-store.test.ts) for malformed plaintext, skipped accounts, default selection, derivation paths and author checks.
