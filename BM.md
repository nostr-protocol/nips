NIP-BM
======

Paid Music (₿Muse)
------------------

`draft` `optional`

This NIP lets an artist sell a music track (or a whole release) directly to listeners. Track metadata and a free preview are public. The full-quality audio is published **encrypted**, and the decryption key is sent privately to each listener after the artist's payment service sees their payment.

The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are used as in RFC 2119.

It reuses existing pieces instead of new ones wherever possible:

- Track metadata: the addressable music track event `kind:36787` already used by existing Nostr music clients.
- Payment: [NIP-57](57.md) zaps (and, optionally, [NIP-61](61.md) nutzaps).
- Key delivery: [NIP-44](44.md) encryption inside a [NIP-59](59.md) gift wrap.
- File storage: [Blossom](B7.md), with optional IPFS / Arweave mirrors.

## What this does and does not protect

This NIP is a **payment gate**, not DRM. It guarantees that:

- the full audio cannot be played by someone who has neither paid nor been given the key by a buyer;
- a buyer gets the key automatically, without the artist being online;
- the key delivery is private and can be shown to come from the artist.

It cannot stop a buyer from re-sharing the decrypted file or the key. No open protocol can. Clients and services MUST NOT describe this as copy protection.

## Track event

A paid track is a `kind:36787` event with the extra tags below. Clients that do not know this NIP still see a normal track and play the free preview in `url`.

```json
{
  "kind": 36787,
  "pubkey": "<artist-pubkey>",
  "created_at": 1739318400,
  "content": "My new single is out. Preview free, 50k sats for the full track.",
  "tags": [
    ["d", "summer-nights"],
    ["title", "Summer Nights"],
    ["artist", "The Waves"],
    ["url", "https://blossom.example.com/1f2e...preview.mp3"],
    ["image", "https://blossom.example.com/9a8b...cover.jpg"],
    ["duration", "214"],
    ["released", "2025-02-12"],
    ["t", "music"],
    ["license", "All Rights Reserved"],
    ["i", "isrc:USWAV2500001"],
    ["price", "50000", "SAT"],
    ["imeta",
      "url https://blossom.example.com/c0ffee...full.enc",
      "m audio/flac",
      "x c0ffee0000000000000000000000000000000000000000000000000000000000",
      "encryption aes-256-gcm",
      "fallback ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    ],
    ["seller", "<seller-service-pubkey>", "wss://relay.example.com"],
    ["zap", "<artist-pubkey>", "wss://relay.example.com", "9"],
    ["zap", "<producer-pubkey>", "wss://relay.example.com", "1"],
    ["alt", "Music track: Summer Nights by The Waves (paid, preview available)"]
  ],
  "id": "<computed>",
  "sig": "<signature>"
}
```

Tags added by this NIP:

| Tag | Required for paid tracks | Meaning |
| --- | --- | --- |
| `price` | yes | `["price", "<amount>", "<currency>"]`, same format as [NIP-99](99.md). Currency `SAT` means a whole number of satoshis. This version only defines payment verification for `SAT`. |
| `imeta` with `encryption` | yes | The encrypted full-quality file, per [NIP-92](92.md). `m` is the MIME type of the **decrypted** file (for example `audio/flac`). `x` is the SHA-256 of the **encrypted** bytes, which is the hash Blossom serves; those bytes are ciphertext and are served as `application/octet-stream`. Each `fallback` entry lists a mirror (IPFS, Arweave, or another Blossom server). |
| `seller` | no | `["seller", "<pubkey>", "<relay-url>"]`. Pubkey of the service that delivers keys. The relay hint MUST be present and MUST NOT be empty whenever this tag is present: it is a relay where that service reads zap receipts. If the tag is absent, the artist pubkey delivers keys. Artists who want unattended delivery SHOULD include this tag. |
| `zap` | no | [NIP-57](57.md) Appendix G zap split. The relay hint MAY be empty. If this tag is absent, the sole recipient is the artist, paid at their profile `lud16`. |

Rules:

- The `url` tag of a paid track MUST point to a free preview and MUST NOT point to the full-quality audio.
- The full audio MUST be encrypted with AES-256-GCM using a random 32-byte key that is unique to this track (or to this version of the audio). The file layout MUST be `12-byte nonce || ciphertext || 16-byte tag`.
- The `m` value on that encrypted file's `imeta` describes the decrypted audio. Clients MUST NOT treat `m` as the content type of the blob on Blossom.
- The encrypted file's `imeta` describes a URL that typically does not appear in `content` or in the preview `url` tag. Clients implementing this NIP MUST still honor that `imeta` and MUST NOT treat NIP-92's "ignore imeta whose URL is not in content" guidance as a reason to drop it.
- To change the price, artwork, or links, the artist publishes a new `kind:36787` event with the same `d` tag. Relays keep only the latest version of an addressable event. The price that applies is the `price` on the latest track event the seller has for that coordinate when the seller processes the receipt. An edit that raises `price` can leave an earlier payment short of the new price. An edit that lowers `price` can make an earlier payment sufficient.
- If the audio is replaced, the new file SHOULD use a new key so holders of the old key cannot decrypt the new master. The seller SHOULD keep every previous key, indexed by the `x` of the ciphertext it decrypts, so a buyer who already received a grant can be sent that same key again. A grant's `x` names the ciphertext that `key` opens. Keeping an old key does not entitle that buyer to a newer master.
- A release, EP, or album MAY be sold as a single purchase if an addressable event includes a `price` tag and one or more `a` tags pointing at tracks. A valid payment for that event's coordinate MUST cause the seller to issue an Access Grant for every listed track (one grant per track is RECOMMENDED; each grant MUST tag the same consumed receipt ids). Buying clients MUST put that release coordinate, not only a track coordinate, in the zap request `a` tag.

## Buying

1. The client MUST send a [NIP-57](57.md) zap of at least `price` to the target. The zap request (`kind:9734`) MUST be signed by the buyer. It MUST contain exactly one `a` tag, exactly one `p` tag, and an `amount` tag. The `a` tag is the target coordinate (`36787:<artist-pubkey>:<d>`, or the release coordinate when buying a release). The `p` tag is the recipient this request pays. `amount` is that recipient's share in millisatoshis. The request SHOULD include `k` set to the target kind (`36787` for a track). Its `relays` tag MUST include the relay hint from the track's `seller` tag. When the track has no `seller` tag, `relays` MUST include a relay the artist reads, so the receipt reaches whoever delivers the key. The buyer's signature ties the payment to the buyer's pubkey and to this item.
2. Each recipient's LNURL server publishes a zap receipt (`kind:9735`) as normal.

When the track has `zap` tags, the client MUST split the amount according to [NIP-57](57.md) Appendix G (weights missing on every tag are equal; if only some tags have a weight, the others have weight 0 and MUST NOT be paid). A weight of 0 is not a declared recipient. Shares MUST be whole satoshis that sum to at least `price`. Clients SHOULD compute each share by flooring `price * weight / sum(weights)` and then handing leftover sats out one at a time in tag order, so the shares sum to exactly `price`.

[NIP-57](57.md) Appendix D requires a zap request to have exactly one `p` tag, and requires that an `amount` tag, when present, equal the invoice amount. This NIP requires the `amount` tag on every purchase zap request. Therefore a split purchase is **one `kind:9734` per declared recipient**, each with that recipient's `p`, that recipient's share as `amount` (in millisatoshis), and the same target `a` tag — not a single request reused across LNURL servers. Each LNURL server issues its own invoice and, once paid, its own `kind:9735` receipt whose `description` embeds that recipient's zap request.

A seller MAY also accept a [NIP-61](61.md) nutzap (`kind:9321`) that tags the same `a` coordinate. If it does, the nutzap amount MUST be at least `price`. Zap-split verification for nutzaps is out of scope; a nutzap is treated as a single payment.

On-chain payments are out of scope for this version.

## Verifying payment, including zap splits

The seller service watches for zap receipts that refer to the tracks (or releases) it sells. Receipts copy the `a` tag from the embedded zap request, so a filter on `#a` finds candidates. The seller SHOULD also subscribe to `#p` of every declared split recipient, and SHOULD read that history again after a restart. Reading it again is safe: a receipt, zap request, or payment that was already credited cannot be credited twice.

### Valid receipt

Before a receipt is credited, the seller MUST check all of the following. A receipt that fails any check MUST be ignored for payment and MUST NOT be granted against later.

1. The receipt is a `kind:9735` event with a valid signature.
2. Its `description` tag is a `kind:9734` zap request with a valid signature.
3. That zap request has exactly one `p` tag. The receipt MUST have a `p` tag, and that tag MUST equal the zap request's `p`. The `p` value MUST be a declared recipient of the target: one of the target's `zap` tags with weight greater than 0, or the artist if the target has no `zap` tags.
4. The zap request includes exactly one `a` tag, equal to the target coordinate, and MUST include an `amount` tag.
5. If the receipt has a `P` tag, it MUST equal the zap request author (the buyer).
6. The receipt `pubkey` MUST be the `nostrPubkey` advertised by **that recipient's** LNURL-pay endpoint (`allowsNostr` true), not merely the artist's. The seller MUST resolve this from the recipient's `lud16` (or a pinned equivalent).
7. The receipt has a `bolt11` tag. The invoice MUST decode, MUST have an amount, and the invoice's `description_hash` MUST equal the SHA-256 of the receipt's `description` (the embedded zap request), so the invoice is bound to this zap request. The credited amount MUST be taken from the invoice, in millisatoshis. The zap request's `amount` tag MUST equal that invoice amount.
8. This receipt id MUST NOT have been processed already, whether the earlier result was accepted or rejected.
9. The embedded zap request id, and the invoice payment hash (`payment_hash` in `bolt11`), MUST NOT already have been credited under a different receipt id. An LNURL server MAY republish a receipt for the same payment under a new event id. Only one credit is allowed per payment and per zap request.

Checks 8 and 9 are the replay rule. It is keyed on the receipt id, the zap request id, and the `payment_hash`. The seller MUST NOT process a receipt id it has already accepted or rejected, and MUST NOT credit a zap request id or a payment hash that it has already credited.

### The sum rule

NIP-57 wallets produce one zap request — and therefore one receipt — per recipient, so receipts in a split purchase generally do **not** share a zap request id. The seller instead groups **unspent credited receipts from the same buyer for the same target coordinate**.

The `price` used in this comparison is the `price` on the latest track event the seller has for that coordinate when it processes the receipt. The seller MUST issue an Access Grant when the **sum of those invoice amounts is at least `price`** (compare in millisatoshis; `price` in `SAT` is `price * 1000` msat). The seller MUST NOT wait for further receipts once the sum has been met, and MUST NOT treat a single split receipt as sufficient merely because it covers the seller's or the artist's own weighted share. Receipts that do not yet bring the sum to `price` remain credit. They MUST NOT be discarded, and they MUST NOT be spent on a different target.

Once the sum is met, the seller MUST consume every receipt in that purchase set (so they cannot be reused) and MUST copy each consumed receipt id onto the grant as its own `e` tag, one `e` tag per receipt.

Worked example: a track priced at `50000` SAT with `zap` weights `9` and `1` has shares `45000` and `5000` SAT. A `45000` SAT receipt alone MUST NOT unlock the track. A `45000` SAT receipt plus a `5000` SAT receipt MUST. A single `50000` SAT receipt to one declared recipient MUST also unlock, because the summed invoices meet `price`.

If the seller has already issued a grant to this buyer for an `x` of this target, it SHOULD resend the grant for that `x` rather than requiring a new payment. When the artist has since replaced the audio, that `x` is the ciphertext the buyer already paid for, which MAY no longer be the latest file. The key for the latest file follows a new payment that meets the latest `price`.

### Why sum, and what was rejected

Two alternatives were considered.

- **Sum of receipts from the same buyer and target** (this NIP's rule). The buyer has to pay the full advertised price, as proven by receipts signed by the declared recipients' LNURL servers. It still works when the key-delivery `seller` is not itself a zap recipient, and it works with ordinary NIP-57 wallets that emit one `9734` per recipient. The cost is liveness: if the buyer paid correct split invoices but a collaborator's LNURL server never publishes a `9735`, and no other receipt makes the sum up to `price`, the buyer can be stuck. Artists SHOULD only put `zap` tags on pubkeys whose LNURL endpoints set `allowsNostr` and publish receipts. Buying clients SHOULD warn before paying a recipient that cannot be resolved. Sellers SHOULD subscribe to the relays listed in each zap request's `relays` tag, which include the seller's relay hint, so receipts are not missed.
- **Require only the seller's (or artist's) weighted share.** This is faster — the key can be released after a single receipt — but it is not robust. A buyer can pay only that share and skip everyone else, and the rule is undefined when the `seller` service is not in the `zap` split. Sellers MUST NOT use this as sufficient proof of payment.

A seller MAY apply a stricter **per-share** policy on top of the sum rule: in addition to the total being at least `price`, each declared recipient's own weighted share MUST be covered by credited receipts whose zap request `p` is that recipient. That honors collaborator splits more strictly, but it increases the chance a buyer is stuck if one LNURL server is silent, and it refuses a buyer who paid the full price to a single recipient. The sum rule remains the interoperability default.

## Key delivery

The grant is a `kind:3090` Access Grant, wrapped with [NIP-59](59.md) and addressed to the buyer's pubkey from the zap request. The inner event (the "rumor") is unsigned. One `e` tag names each receipt the purchase consumed:

```json
{
  "kind": 3090,
  "pubkey": "<seller-service-pubkey>",
  "created_at": 1739320000,
  "content": "",
  "tags": [
    ["a", "36787:<artist-pubkey>:summer-nights"],
    ["p", "<buyer-pubkey>"],
    ["e", "<zap-receipt-id-artist-share>"],
    ["e", "<zap-receipt-id-producer-share>"],
    ["key", "aes-256-gcm", "<64-hex-char-key>"],
    ["x", "c0ffee0000000000000000000000000000000000000000000000000000000000"]
  ]
}
```

- `key` holds the track's 32-byte decryption key as 64 lowercase hex characters.
- `x` repeats the hash of the encrypted file the key belongs to.

A buying client MUST NOT trust the grant unless all of the following hold:

1. The gift wrap decrypts to a [NIP-59](59.md) seal (`kind:13`) with a valid signature.
2. The seal's `pubkey` is the track's `seller` pubkey, or the artist pubkey when the track has no `seller` tag.
3. The inner event's `pubkey` equals the seal's `pubkey`. The rumor is unsigned; the seal signature is what authenticates its author.
4. The rumor's `p` tag equals the buyer's own pubkey.
5. The rumor's `a` tag equals the coordinate the buyer paid for.
6. The rumor's `x` tag equals the `x` on the encrypted `imeta` of the file the client is about to decrypt.

- The grant SHOULD be published to the buyer's [NIP-17](17.md) inbox relays (`kind:10050`). If none are advertised, the seller SHOULD fall back to the `relays` tag on the buyer's zap request(s), then to the seller's own relays, and MAY try the buyer's [NIP-65](65.md) read relays.
- [NIP-59](59.md) sets the gift wrap's `created_at` up to two days in the past. A buying client MUST search `kind:1059` starting at least two days before the payment. A filter whose `since` is the payment time, or "now", misses the grant.
- Clients SHOULD store received keys locally so the track keeps playing offline.

Access Grants MUST NOT be published unwrapped, because anyone reading the relay would get the key.

## Artist to seller key handoff

The seller MUST hold the decryption key for an `x` before it can put that key in a grant. When the track's `seller` tag names a different pubkey than the artist, this NIP defines the handoff. When the track has no `seller` tag, the artist holds the key and no handoff is required. Any other way of giving the seller the key is out of scope.

The handoff is a [NIP-59](59.md) gift wrap addressed to the seller pubkey. The artist signs the seal. The rumor is a `kind:3090` with no receipt `e` tag:

```json
{
  "kind": 3090,
  "pubkey": "<artist-pubkey>",
  "created_at": 1739319000,
  "content": "",
  "tags": [
    ["a", "36787:<artist-pubkey>:summer-nights"],
    ["p", "<seller-service-pubkey>"],
    ["key", "aes-256-gcm", "<64-hex-char-key>"],
    ["x", "c0ffee0000000000000000000000000000000000000000000000000000000000"]
  ]
}
```

- The rumor's `pubkey` MUST equal the artist's pubkey and MUST equal the seal's `pubkey`.
- `p` MUST be the seller pubkey. `a` MUST be the track coordinate. `key` and `x` MUST describe one encrypted file.
- The seller MUST reject a handoff whose seal signature is invalid or whose rumor `pubkey` differs from the seal `pubkey`.
- A handoff is not a purchase. It MUST NOT be treated as proof of payment.

## Privacy

- Zap receipts are public, so other people can see who bought what. Buyers who want privacy can use private zaps or nutzaps.
- Gift wrapping hides the buyer and the track from relays when the key is delivered.

## Client behaviour

- If a paid track has no stored key, clients MUST play only the preview from `url` and SHOULD show a "Buy for N sats" action.
- After the buyer pays, the client MUST wait for a gift-wrapped `kind:3090` grant, MUST search back at least two days as described in "Key delivery", MUST authenticate the grant as in "Key delivery" (including the inner author, `p`, `a`, and `x` checks), MUST fetch the encrypted file (from `url` in the encrypted `imeta`, otherwise a `fallback`), MUST check its SHA-256 against `x`, and only then MAY decrypt and play the full audio.
- Clients that know nothing about this NIP still show the track and play the preview.

## Relation to other paywall proposals

[NIP-63](https://github.com/nostr-protocol/nips/pull/2156) (draft) describes relay-side access control lists. It is payment-agnostic and gates event visibility. This NIP instead encrypts a file, takes payment with NIP-57 zaps, and delivers a decryption key privately. The two can coexist: a relay MAY also hide events with NIP-63, but ₿Muse does not require a gated relay, and a client that never talks to one can still buy and play a track.

## Event kinds

| kind | description |
| --- | --- |
| `36787` | Music Track (existing kind; this NIP adds tags) |
| `3090` | Access Grant (only sent inside a NIP-59 gift wrap) |

## Implementations

- Reference implementation: [TerryLeeSTL/BMuse](https://github.com/TerryLeeSTL/BMuse)
