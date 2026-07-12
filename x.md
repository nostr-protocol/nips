NIP-XX
======

Encrypted Betting Pools
-----------------------

`draft` `optional`

This NIP defines a protocol for running private betting pools over nostr and lightning. An admin publishes an encrypted _pool_ describing a question and a set of outcome options. Participants place bets by zapping the admin ([NIP-57](57.md)) with a zap request carrying the encrypted bet in dedicated tags, and the admin later settles the pool by declaring a winner (or cancelling) and paying winners over lightning.

All pool data on relays is encrypted with a symmetric key that never touches a relay: it travels only inside the pool's share link (via query parameters or hash fragment). Relays and non-participants see opaque ciphertext; anyone holding the share link can read the pool and its bets; only the admin can read bettors' payout addresses.

It defines three new event kinds:

| kind   | description       |
| ------ | ----------------- |
| `8880` | Betting Pool      |
| `8881` | Pool Admin Action |
| `8882` | Pool Comment      |

All three are _regular_ events. Bets reuse kind `9734`/`9735` from [NIP-57](57.md) with additional requirements described below.

## Roles

- **Admin**: creates the pool, receives all bets as zaps to their own lightning wallet, declares the outcome, and pays winners. The admin is fully trusted with custody of the pot.
- **Bettor**: anyone holding the share link. Bettors sign zap requests with their own key, which MAY be an ephemeral throwaway key.
- **LNURL provider**: the admin's lightning wallet provider. Its `nostrPubkey` (per NIP-57 Appendix C) is the only key whose zap receipts count as bets.

## The pool key

Every pool has a single symmetric key:

- 32 bytes, generated from a cryptographically secure random source when the pool is created.
- Never published to relays or sent to any server. It is distributed exclusively through the share link (see below).
- Never rotated; it is valid for the pool's lifetime.

Possession of the pool key grants read access to the pool definition, admin actions, comments, and each bet's chosen option. It does NOT grant access to bettors' payout addresses, which have a second encryption layer (see "Reward addresses").

### Symmetric encryption

All pool-key encryption uses **AES-256-GCM**:

1. Generate a random 12-byte IV.
2. Encrypt the plaintext with AES-256-GCM under the pool key, optionally with associated data (AAD, used only for the bet tags - see below). The 16-byte authentication tag is appended to the ciphertext, as is conventional for GCM.
3. The payload is `IV || ciphertext || tag`.
4. When the payload is carried in an event's `content` or in a tag value, it is encoded with standard base64 (with padding, not base64url).

Decryption is the inverse; implementations MUST reject payloads shorter than 28 bytes (12-byte IV + 16-byte tag) and MUST treat authentication failure as "not part of this pool" rather than as a hard error, since anyone can publish garbage events with matching tags.

## Share links

A pool is joined via a share URL whose **hash fragment** carries both the pool pointer and the pool key. The fragment is never sent to web servers by browsers, so a statically-hosted client never sees the key server-side.

```
<origin><pathname>#/p/<nevent>/<pool-key>
```

- `<nevent>` is a [NIP-19](19.md) `nevent` encoding of the pool event: its `id`, the admin's pubkey as `author`, kind `8880`, and up to 3 relay hints.
- `<pool-key>` is the 32-byte pool key encoded as unpadded base64url.

Clients MUST reject a `<pool-key>` that does not decode to exactly 32 bytes, and SHOULD reject non-canonical base64url encodings (i.e. re-encoding the decoded bytes must reproduce the input), so that each pool has exactly one valid link and corrupted links fail visibly rather than silently decrypting nothing.

There is no discovery mechanism: pools are unlisted and reachable only through their share link.

## Event definitions

Every event authored under this NIP carries a version tag:

```json
["nipx-version", "1"]
```

> The `nipx-` prefix in tag names and AAD strings throughout this document is a placeholder; it becomes `nip<number>-` once this NIP is allocated a number.

The tag versions the encrypted payload schemas, letting future clients distinguish old events before decrypting them. Clients MUST ignore events carrying an unknown version. Events SHOULD also carry an `alt` tag ([NIP-31](31.md)) with a short human-readable summary, since their content is unreadable ciphertext to generic clients.

### Betting Pool (kind 8880)

A regular, immutable event signed by the admin. The pool is identified by this event's `id` and administered by its `pubkey` forever; there is no mechanism to add information to a pool after publication.

```yaml
{
  "kind": 8880,
  "pubkey": "<admin pubkey>",
  "tags": [
    ["alt", "<human-readable redirect, e.g. app URL>"],
    ["nipx-version", "1"]
  ],
  "content": "<base64 AES-256-GCM ciphertext of the JSON below>"
}
```

Decrypted `content` is a JSON object:

```jsonc
{
  "v": 1,                    // payload version, MUST be 1
  "title": "<question>",     // required, non-empty
  "description": "<text>",   // optional
  "imageUrl": "<url>",       // optional
  "backgroundUrl": "<url>",  // optional
  "options": [               // required, at least 2
    { "id": "a", "title": "<outcome>", "description": "<text>" },
    { "id": "b", "title": "<outcome>" }
  ],
  "adminFeePct": 2,          // 0–100; fee retained by the admin
  "maxBets": 20,             // integer >= 1
  "maxBetSats": 100000,      // integer >= 1; per-bet cap
  "deadline": 1735689600     // optional; unix seconds after which bets are refused
}
```

Option `id`s MUST be non-empty and unique within the pool. They SHOULD all have the same UTF-8 byte length (e.g. `"a"`, `"b"`, `"c"`), because the encrypted option id travels in a bet tag whose ciphertext length equals the plaintext length - equal-length ids keep the ciphertext from narrowing down which option was picked. Clients MUST reject pools that fail these validations rather than displaying partial data.

Before publishing a pool, the admin's lightning address MUST be verified to support NIP-57 (`allowsNostr: true` and a `nostrPubkey` in its LNURL-pay params). No `commentAllowed` capacity is required: the encrypted bet travels in zap request tags, not in the comment-limited `content`.

### Pool Admin Action (kind 8881)

A regular event signed by the admin that mutates pool state. Pool state is derived by folding all admin actions rather than by replaceable events, so the full settlement history remains auditable by participants.

```yaml
{
  "kind": 8881,
  "pubkey": "<admin pubkey>",
  "tags": [
    ["e", "<pool event id>"],
    ["alt", "<...>"],
    ["nipx-version", "1"]
  ],
  "content": "<base64 AES-256-GCM ciphertext of one action JSON>"
}
```

Decrypted `content` is one of:

```jsonc
{ "action": "close" }                              // stop accepting bets
{ "action": "winner", "optionId": "<option id>" }  // declare outcome; implies close
{ "action": "cancel" }                             // void the pool; implies close
{ "action": "paid",   "receiptId": "<9735 id>" }   // mark a bet's payout as sent
{ "action": "unpaid", "receiptId": "<9735 id>" }   // undo a paid marker
```

Clients MUST ignore kind `8881` events that are not signed by the pool admin's pubkey, lack an `e` tag matching the pool id, or fail to decrypt under the pool key. A `winner` action's `optionId` MUST reference an option defined in the pool.

#### Folding rules

Valid actions are applied in order of `created_at`, with ties broken by lexicographic event `id`. Starting from `{closed: false, winner: null, cancelled: false, paid: {}}`:

- `close` sets `closed = true`.
- `winner` sets `winner = optionId`, `cancelled = false`, `closed = true`.
- `cancel` sets `cancelled = true`, `winner = null`, `closed = true`.
- `paid` adds `receiptId` to the paid set; `unpaid` removes it.

`winner` and `cancel` are therefore mutually reversing: the latest of the two wins, allowing an admin to correct a mistaken settlement.

### Pool Comment (kind 8882)

A regular event for commentary on a pool (e.g. the admin explaining a ruling). Same envelope as kind `8881`:

```yaml
{
  "kind": 8882,
  "pubkey": "<admin pubkey>",
  "tags": [
    ["e", "<pool event id>"],
    ["alt", "<...>"],
    ["nipx-version", "1"]
  ],
  "content": "<base64 AES-256-GCM ciphertext of the JSON below>"
}
```

Decrypted `content`:

```json
{ "text": "<comment text>" }
```

Clients MUST ignore comments with empty `text` or that fail to decrypt, and MAY restrict displayed comments to those signed by the pool admin.

## Bets

A bet is a [NIP-57](57.md) zap from the bettor to the admin's lightning address, where the zap request carries an encrypted bet in two dedicated tags. This gives bets an inherent proof of payment: a bet only exists once the admin's LNURL provider publishes the zap receipt, so bets cannot be forged without actually paying sats to the admin.

The zap request's `content` MUST be empty. Generic clients therefore render a bet as a plain, commentless zap, and LNURL providers' `commentAllowed` limits - which apply to the `content` field - never constrain the bet.

### Bet zap request (kind 9734)

```yaml
{
  "kind": 9734,
  "pubkey": "<bettor pubkey>",
  "tags": [
    ["relays", "<relay url>", "..."],
    ["amount", "<millisats, as string>"],
    ["p", "<admin pubkey>"],
    ["e", "<pool event id>"],
    ["nipx-option", "<base64 AES-256-GCM ciphertext of the option id>"],
    ["nipx-address", "<base64 AES-256-GCM ciphertext of the NIP-44-encrypted reward address>"],
    ["nipx-version", "1"]
  ],
  "content": ""
}
```

Per NIP-57, this event is not published to relays; it is signed, JSON-encoded, and passed as the `nostr` query parameter to the admin's LNURL-pay callback, and later reappears embedded in the zap receipt's `description` tag.

### Bet tags

- `nipx-option` - the AES-256-GCM encryption (under the pool key, with the AAD below) of the chosen option's id as UTF-8 bytes.
- `nipx-address` - the AES-256-GCM encryption (under the pool key, with the AAD below) of the NIP-44 ciphertext of the reward address (see next section), decoded from its base64 form to raw bytes before encryption.

Both values MUST be present for a zap to count as a bet.

### Reward addresses

The reward address is the lightning address at which the bettor wants to receive winnings. It is the only pool data hidden from other share-link holders, using a second encryption layer readable by the admin alone:

1. The address MUST be shorter than 128 bytes of UTF-8 (measured in bytes, not characters - addresses may contain multi-byte characters) and MUST NOT contain NUL (`0x00`) bytes, since NULs delimit the padding. Pad it with NUL bytes to exactly 128 bytes, so every ciphertext lands in the same [NIP-44](44.md) padding bucket and its length reveals nothing about the address.
2. Encrypt the padded string with NIP-44 v2 from the bettor's key to the admin's pubkey.
3. Decode the resulting base64 string to raw bytes and encrypt them under the pool key into the `nipx-address` tag as described above.

To read an address, the admin decrypts the `nipx-address` tag with the pool key, computes the NIP-44 conversation key from their own key and the bettor's pubkey (the embedded zap request's `pubkey`), decrypts, and strips trailing NULs. Admins SHOULD check that the result is a plausible lightning address before paying it, since nothing forces a bettor's client to encrypt a meaningful one.

With the fixed 128-byte padding, every `nipx-address` tag value is a constant length regardless of the actual address.

### Author and role binding (AAD)

When encrypting a bet tag's value with the pool key, the tag name and the bettor's pubkey - the pubkey that signs the zap request - MUST be supplied as AES-GCM associated data, encoded as the UTF-8 string:

```
nipx-option:<bettor pubkey, lowercase hex>
nipx-address:<bettor pubkey, lowercase hex>
```

Decryption MUST use the embedded zap request's `pubkey` the same way. This binds each ciphertext to both its author and its role: an encrypted value copied out of someone else's bet into a zap request signed by a different key, or moved into the other tag's slot within the same request, fails authentication and is ignored. Opaque bet values therefore cannot be replayed, swapped, or attributed to another bettor.

### Bet zap receipt (kind 9735)

Receipts are published by the admin's LNURL provider per NIP-57 Appendix E; this NIP adds validation requirements. Clients MUST accept a receipt as a bet only if all of the following hold:

1. The receipt's `pubkey` equals the `nostrPubkey` from the admin's LNURL-pay params. Clients MUST NOT skip this check or accept receipts signed by any other key - including the admin's own - since anyone can self-publish a kind `9735` claiming an arbitrary amount.
2. The receipt has a `description` tag containing a JSON-encoded kind `9734` event with a valid signature ([NIP-01](01.md) `verify`).
3. The embedded request has an `e` tag equal to the pool id and a `p` tag equal to the admin pubkey.
4. The bet amount is taken from the receipt's `bolt11` tag invoice, which MUST encode a positive amount; it is floored to whole sats. Receipts whose invoice is missing, undecodable, or amountless MUST be ignored - an amountless invoice can be paid with any number of sats, so it would prove a payment happened but not the bet's size. Bettors' clients SHOULD likewise refuse to pay an invoice that does not encode the exact requested amount.
5. The embedded request carries both `nipx-option` and `nipx-address` tags, each of which decrypts under the pool key with its respective AAD, and the decrypted option id is non-empty.

Receipts failing any check MUST be silently ignored. The resulting bet is the tuple (receipt id, request id, bettor pubkey, option id, amount in sats, reward address, request `created_at`).

Pool-level limits - `deadline`, `maxBets`, `maxBetSats`, and pool `closed` state - are enforced by clients when placing bets. Since receipts are produced by lightning wallets that know nothing of this protocol, a violating bet - or one whose option id does not exist in the pool - can still appear on relays; how to treat such bets (refund, ignore, or honor) is at the admin's discretion.

## Querying

Given a share link, a client can load a pool with:

1. Fetch the pool event by id (using the `nevent` relay hints plus the client's defaults):
   `{"ids": ["<pool id>"]}`
2. Subscribe to bets: `{"kinds": [9735], "#e": ["<pool id>"]}`
3. Subscribe to admin activity: `{"kinds": [8881, 8882], "authors": ["<admin pubkey>"], "#e": ["<pool id>"]}`

## Settlement

Settlement is performed manually by the admin over lightning; nostr only records the manual payment markers that the admin publishes to remember which bets have been paid out.
The reference payout scheme is pari-mutuel (informative, not enforced by protocol):

- Winner payout: `floor(stake / total_winning_stake × pot × (1 − adminFeePct/100))`
- Refund on cancel: `floor(stake × (1 − adminFeePct/100))` per bet

Rounding remainders stay with the admin (rewards are calculated as whole sats, not millisats).
After paying a winner's reward address, the admin publishes a `paid` action referencing the bet's receipt id so all participants can track payout progress.

## Security considerations

- **The admin is custodial.** All stakes flow to the admin's wallet, and paying winners is a manual, trusted act. This protocol provides transparency (every participant sees all bets and settlement actions), not trustlessness.
- **The share link is the read capability.** Anyone with the link can read the pool, all options, all bet amounts, and each bet's chosen option. Links should be shared over private channels.
- **Bettor identity is public.** Zap requests and receipts expose the bettor's pubkey and the bet amount to relays (though not the pool contents or chosen option). Bettors wanting anonymity SHOULD use an ephemeral keypair.
- **No forward secrecy.** The pool key is static; a leaked link decrypts the pool's full history.
- **Amount metadata leaks.** Relays cannot read pool contents, but they can observe that some pubkey received zaps of certain amounts referencing an opaque event id.
- **Receipts are not payment proofs.** As NIP-57 notes, a zap receipt only proves the LNURL provider claims the invoice was paid. Since the provider is the admin's own wallet, a malicious admin colluding with (or running) their provider could fabricate bets - but they gain nothing, as they already control settlement.

## Implementation
https://bitwithfriends.niot.space
