# NIP-101 Extension — Cookie Vault (Kind 31903)

`draft` `optional`

**Extends:** [NIP-101](101.md) (UPlanet: Decentralized Identity & Geographic Coordination)  
**Related:** [NIP-101 Cookie Workflow Extension](101-cookie-workflow-extension.md) (kinds 31900-31902)

## Abstract

Kind 31903 is a parameterized replaceable event (NIP-33) used to store the IPFS CID of a Netscape-format cookie file encrypted per-MULTIPASS. It is the persistent storage layer for the cookie capture workflows defined by kinds 31900-31902.

## Motivation

Cookie files uploaded via the UPlanet cookie system (see `Astroport.ONE/IA/COOKIE_SYSTEM.md`) must be:
1. Encrypted at rest (NaCl box via `natools.py seal`) and pinned on IPFS
2. Addressable by domain — one canonical event per user per domain (replaceable)
3. Discoverable via NOSTR for cross-device sync within the MULTIPASS

Kind 30078 (NIP-78) was previously used but is already occupied by other UPlanet subsystems (uDRIVE, Qdrant backup). Kind 31903 belongs to the existing cookie workflow family (31900-31902) and makes the relationship explicit.

## Event Format

```jsonc
{
  "kind": 31903,
  "pubkey": "<user NOSTR pubkey>",
  "content": "{\"cid\": \"Qm...\", \"domain\": \"youtube.com\", \"uploaded_at\": \"2025-05-25T12:00:00+00:00\", \"type\": \"cookie\"}",
  "tags": [
    ["d", "cookie:youtube.com"],   // replaceability key — one event per domain
    ["t", "cookie"],
    ["t", "netscape_cookies"],
    ["domain", "youtube.com"],     // public metadata (Tier 1 only)
    ["uploaded_at", "2025-05-25T12:00:00+00:00"]  // public metadata (Tier 1 only)
  ]
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `kind` | integer | `31903` |
| `content` | JSON string | Cookie vault payload (see Privacy Tiers) |
| `d` tag | string | `cookie:<domain>` — NIP-33 replaceability identifier |
| `t` tag | string | `cookie` and/or `netscape_cookies` |
| `domain` tag | string | Cookie domain (Tier 1 public only) |
| `uploaded_at` tag | ISO 8601 string | Upload timestamp (Tier 1 public only) |

## Privacy Tiers

### Tier 1 — Public (default)

Domain and upload date are visible in tags. Content carries the full payload.

```jsonc
// content
{"cid": "Qm...", "domain": "youtube.com", "uploaded_at": "2025-...", "type": "cookie"}

// tags
[
  ["d", "cookie:youtube.com"],
  ["t", "cookie"],
  ["t", "netscape_cookies"],
  ["domain", "youtube.com"],
  ["uploaded_at", "2025-05-25T12:00:00+00:00"]
]
```

Rationale: public metadata encourages MULTIPASS adoption and allows relay-side filtering for the cookie workflow engine.

### Tier 2 — Private

Tags are minimal (d-tag only for replaceability). Content is NIP-44 self-encrypted (user encrypts to their own pubkey).

```jsonc
// content (NIP-44 self-encrypted ciphertext, or interim stub)
{"cid": "Qm...", "private": true}

// tags
[
  ["d", "cookie:<domain>"],
  ["t", "cookie"],
  ["encrypted", "true"]
]
```

> **Implementation note:** Full NIP-44 self-encryption (TODO) requires the user's NOSTR secret key at publish time. The current implementation stores the interim stub form above until NIP-44 support is added to `nostr_send_note.py`.

## Encryption

The cookie file content itself is **always** encrypted with `natools.py seal` (NaCl box, G1/Duniter keypair from `.secret.dunikey`). The IPFS CID of the encrypted blob is what is stored in the NOSTR event content. The NOSTR privacy tier controls only whether the *domain metadata* is visible on the relay.

```
Netscape cookie file
       │
       ▼ natools.py seal (NaCl box, G1 pubkey)
Encrypted blob
       │
       ▼ ipfs add
CID (e.g. QmXxx...)
       │
       ▼ stored in kind 31903 content
```

Decryption requires the user's `.secret.dunikey` (private G1 key) and the IPFS CID.

## Relationship to Kinds 31900–31902

| Kind | Name | Role |
|------|------|------|
| 31900 | Workflow Definition | Defines scraping workflow referencing cookie domains |
| 31901 | Workflow Execution Request | Triggers workflow execution |
| 31902 | Workflow Execution Result | Stores execution output |
| **31903** | **Cookie Vault** | **Stores the encrypted cookie CID (this spec)** |

Workflow nodes of type `cookie_scraper` resolve the required cookie by looking up the kind 31903 event with `d = cookie:<domain>` authored by the requesting pubkey.

## Relay Behavior

- Kind 31903 is a **parameterized replaceable event** (NIP-33): relays MUST replace any previous event with the same `pubkey` + `d` tag combination.
- The `NIP-101/relay.writePolicy.plugin/` filter for kind 31903 MAY enforce that the publishing pubkey matches a known MULTIPASS pubkey.

## Reference Implementation

- **Publish:** `UPassport/services/cookie_store.py` — `publish_to_nostr()`
- **Upload pipeline:** `UPassport/services/cookie_store.py` — `store_cookie_encrypted()`
- **API router:** `UPassport/routers/cookie.py`
- **Encryption tool:** `Astroport.ONE/tools/natools.py`

## Security Considerations

- The IPFS CID in the event content is public; it reveals that an encrypted blob exists but not its contents.
- In Tier 1 mode, the domain name is visible to anyone reading the relay. Use Tier 2 for sensitive domains.
- Cookie files grant authenticated access to third-party services; they MUST NOT be stored unencrypted on IPFS.
- The NIP-33 replaceability ensures stale CIDs are superseded when cookies are refreshed.

---

**Version:** 1.0.0  
**Status:** Draft  
**Author:** UPlanet/Astroport.ONE Team  
**License:** AGPL-3.0
