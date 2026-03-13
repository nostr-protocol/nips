# NIP-BM
## Music Upload Event (₿Muse)

*Decentralized, Enforceable Music Distribution on Nostr*

**Status**: Draft
**Authors**: Terry Lee (npub1d8fsx2su2a2avadlaw8zc75cez0d8k9yy5x3n4ttgs7rcwt7myasspg9lg)
**Created**: 2025-05-12

---

## Abstract

**₿Muse** defines a non-replaceable event kind (`3088`) for artists to publish music on Nostr in a fully decentralized, cryptographically enforceable way. It supports:

- Permanent, decentralized media storage (IPFS/Arweave)
- Optional previews
- Enforceable paywalls via cryptographic receipts (not client-side checks)
- Rich metadata and event relationships (albums, singles, tracklists)
- Lightning (LNURL-pay) and on-chain Bitcoin payments

This NIP is specifically designed for music and does **not** overlap with NIP-99 (Classified Listings).

---

## Motivation

Centralized platforms control distribution, take 30–70% cuts, and can censor artists. Existing Nostr music attempts (including the original NIP-102 draft) failed due to:

- Replaceable event kinds (only one song per artist)
- Unenforceable paywalls (public URLs)
- Reliance on centralized hosting

**₿Muse** solves all three.

---

## Specification

### Event Structure (`kind: 3088`)

```json
{
  "kind": 3088,
  "created_at": 1739318400,
  "tags": [
    ["title", "Summer Nights"],
    ["artist", "The Waves"],
    ["duration", "214"], // seconds
    ["released_at", "1739318400"], // official release timestamp
    ["file", "ipfs://bafybei..."], // MUST be ipfs:// or ar://
    ["preview_file", "ipfs://bafybei..."], // optional 30s preview
    ["cover", "ipfs://bafybei..."],
    ["license", "All Rights Reserved"],
    ["isrc", "US-WAV-2025-0001"], // optional
    ["price", "50000"], // satoshis (one-time purchase)
    ["price_model", "purchase"], // or "stream" in future
    ["lightning", "lnurl1dp68gurn8ghj7..."], // LNURL-pay
    ["bitcoin", "bc1q..."], // fallback on-chain
    ["e", "abc123...", "album"], // parent album or mix
    ["client", "BMuse"]
  ],
  "content": "My new single is out! Pay 50k sats to unlock full track.",
  "id": "<computed>",
  "sig": "<signature>"
}
Required Tags

Tag	Description	Format
title	Song title	string
artist	Artist name	string
file	Full track	ipfs://<cid> or ar://<txid>
license	License (advisory)	string
Optional but Strongly Recommended

Tag	Description
preview_file	15–30 second preview (free)
duration	Track length in seconds
released_at	Official release date (separate from created_at)
cover	Album/single art
price + price_model	Enforceable paywall
lightning	LNURL-pay for instant payment
e	Link to album, mix, or parent event
Media Hosting (MANDATORY)

file and preview_file MUST use decentralized permanent storage:
ipfs://bafybei... (preferred)
ar://<transaction_id> (Arweave)
https:// URLs (including nostr.build) are discouraged for full tracks due to centralization risk.
Previews may use nostr.build if desired.
Enforceable Paywalls (Cryptographic Receipts)

The file URL is never exposed publicly for paid tracks.

How It Works:

Artist sets price: 50000 and provides lightning LNURL-pay.
Fan pays → receives Lightning preimage or on-chain TXID.
Fan’s client sends a kind: 3089 (Access Request) event containing:
Proof of payment (preimage or TXID)
Their pubkey
Reference to the 3088 event
Artist (or automated service) responds with a kind: 3090 (Access Grant) event:
Signed by artist
Contains the real ipfs:// URL
Valid for that user only
Fan’s client decrypts/verifies and plays the file.
This is fully enforceable, decentralized, and stateless.

Event Relationships

Use standard e tags:

json
["e", "<album_event_id>", "album"]
["e", "<single_event_id>", "single"]
["e", "<mix_event_id>", "track", "00:03:20"]
Security Model

Paywalls are cryptographically enforced, not client-side.
Media is permanently stored on IPFS/Arweave.
Access grants are signed and verifiable.
No central server required after initial publication.
Backwards Compatibility

Clients ignoring kind: 3088 show content as a note.
Free tracks (preview_file or no price) work immediately.
Paid tracks appear as "locked" until access grant received.
Testing & Validation

Test Vectors Available

Free track with preview
Paid track with LNURL-pay
Album with multiple singles
Access request/grant flow
Full test suite: https://github.com/TerryLeeSTL/bmuse-test-vectors

Donations

Support ₿Muse development:

bc1qd0078kuvf0dtd5p6qzhtnn6rvqrqhrmpw8eqsr
