# NIP-101 Ğ1-Nostr (N²) Ledger Extension

## Local Monetary Ledger & LOVE Identity Economy

`draft` `extension` `optional`

This document defines the **Ğ1-Nostr (N²)** ledger: a monetary system built entirely on NOSTR events (Kind 30852), running in parallel to the Ğ1/Duniter blockchain, validated solely by each relay's own writePolicy filter (no multi-node consensus). It also documents the **LOVE identity** convention this ledger operates on, and the Kind 7 extension used to transfer value inside chat interfaces.

---

## Motivation

Every MULTIPASS already carries a real Ğ1/Duniter wallet (`G1PUBNOSTR` + `.secret.nostr`), connected to the cooperative's real-money circuit (OpenCollective contributions, PAF invoicing). Ğ1-N² is a **deliberately separate, lower-stakes economy**: a Universal Dividend keyed to social density (reciprocal NOSTR follows) rather than blockchain issuance, so that any human who registers a verified birth/conception profile (**ATOM4LOVE**) can start participating without ever holding real Ğ1.

To keep this economy cleanly separated from the cooperative's real accounting, Ğ1-N² balances, transactions and Universal Dividend emissions live entirely on a **distinct keypair** — the **LOVE identity** (`.secret.love` / `HEX_LOVE`, deterministic from birth + conception data, cf. `atom4love_publish.py`) — never on the MULTIPASS's own `G1PUBNOSTR`/main NOSTR key.

---

## Kind 30852 — Ğ1-N² Ledger Transfer

**Addressable key:** `(30852, pubkey, d)` — `d = n2-<created_at>-<nonce_hex8>`, unique per author, never reused.

### Structure

```json
{
  "kind": 30852,
  "pubkey": "<hex64 — sender, normally a HEX_LOVE>",
  "tags": [
    ["d",      "n2-<created_at>-<nonce_hex8>"],
    ["p",      "<hex64 — recipient, normally a HEX_LOVE>"],
    ["amount", "<positive float, 2 decimals max>"],
    ["prev",   "<hex64 of sender's last outgoing tx id, or literal 'genesis'>"],
    ["t",      "g1-n2"],
    ["t",      "mint"]
  ],
  "content": ""
}
```

`t=mint` is only present on emission transactions (Ğ1→N² bridge, or the ATOM4LOVE genesis grant below) and is restricted to pubkeys listed in `~/.zen/strfry/n2_mint_authorities.txt` (the station's `uplanet.G1.nostr` key).

### Validation (`filter/30852.sh`)

Structural checks (unique tags, positive amount, recipient ≠ sender, valid `prev`, clock drift) → mint-authority check → anti-replay (`d` uniqueness, per author) → `prev` chain check (fork/replay detection) → balance check (`Σreceived − Σsent`, skipped for mint) → atomic cache write **before** LMDB commit.

Balance is computed by a single combined `strfry scan` over `{"authors":[pubkey]}` OR `{"#p":[pubkey]}` — never a scan per historical transaction. Shared implementation: `NIP-101/relay.writePolicy.plugin/filter/n2_ledger_lib.sh`, sourced by both the relay filter and the client-side tools (`Astroport.ONE/tools/g1n2_check.sh` / `g1n2_pay.sh`) — one implementation, never two that could diverge.

### Sync policy — replicated, never deleted

Kind 30852 **is** included in constellation sync (`backfill_constellation.sh`). Replication is safe by construction: every event is signed, and a copy on another station recomputes the exact same balance. Because `strfry import` never invokes writePolicy, `backfill_constellation.sh::reject_invalid_ledger_events()` **replays the same validation** (mint authority, `prev` chain, balance) against every incoming batch, pubkey by pubkey, in global chronological order, before allowing import — a forged event fails this revalidation on every honest station that receives it, regardless of how many compromised stations accepted it locally. This mutual re-validation across stations is what constitutes "consensus" for this ledger — there is no other multi-node agreement protocol.

Deletion (Kind 5) targeting a Kind 30852 event is rejected unconditionally, even from the legitimate author, both on direct write (`filter/5.sh`, `PROTECTED_KINDS`) and via constellation sync (`backfill_constellation.sh::reject_protected_kind_deletions()`).

### Trust model — explicit limitations

A compromised station (root/disk access) can still fabricate an arbitrary local ledger state for itself. The mint key is a single point of failure with no hard cap. Two conflicting *valid* transactions submitted by the same author to two different stations before they synchronize create an undetected fork — there is no Byzantine agreement resolving this, only the revalidation described above, which catches forgeries, not honest-looking forks. BUT HUMAN MEETING HUMAN KEEPS THE CONTROL OF IT.

---

## The LOVE Identity Convention

Ğ1-N² balances, transfers and Universal Dividend emissions are **never** attached to a MULTIPASS's `G1PUBNOSTR`/main HEX. They live on the **LOVE identity**:

- `.secret.love` / `HEX_LOVE` — created by `atom4love_publish.py::write_secret_love()` when a member registers birth + conception data (deterministic PBKDF2-HMAC-SHA256 derivation, 600 000 iterations, domain salt `uplanet-a4l-v1`).
- Eligibility for the Ğ1-N² economy = having a LOVE identity, i.e. having completed ATOM4LOVE registration (Kind 30078 `d=atom4love`, cf. [101-atom4love-extension.md](101-atom4love-extension.md)). Cooperative system wallets (station treasury, mint authority, captain's dedicated PAF wallet) never have a `.secret.love` and therefore can never accrue Ğ1-N² balance or Universal Dividend — an exclusion that follows structurally from the absence of a birth/conception profile, not from an explicit check.
- **Kind 3 (contacts) reciprocity graph for the Universal Dividend formula is computed on LOVE↔LOVE follows**, a distinct social graph from the MULTIPASS's own NOSTR follows — two LOVE identities become "N1" (friends) by publishing a mutual Kind 3 follow signed by their respective `.secret.love` keys (client UI: `atomic_chat.html` / `atomic_match.html` / Zelkova `love_screen.dart`).

### Genesis grant

On successful ATOM4LOVE activation, `Astroport.ONE/tools/N2_Genesis.sh` mints a one-time **100.00 Ẑen (= 11.00 Ğ1-N²)** grant to the new `HEX_LOVE`, signed by the mint authority. Idempotent per MULTIPASS (`.n2_genesis_minted` marker) **and** per LOVE identity (`n2_genesis_love_claimed.txt` registry) — since the LOVE key is deterministic from birth data, re-registering the exact same birth/conception data under a different MULTIPASS can only ever claim the grant once.

### Daily hyper-relativistic Universal Dividend

`Astroport.ONE/tools/N2_Economics.py` computes, once per day, for every local LOVE identity with at least one reciprocal LOVE contact:

```
DU_INCREMENT = c² × M_N1 / (|N1| + √|N2|)

c²   ≈ 0.01
M_N1 = Σ Ğ1-N² balance of reciprocal LOVE contacts (N1)
N1   = LOVE contacts with mutual follow
N2   = second-degree LOVE contacts (N1's follows, minus N1 and self)
```

Published as Kind 30305 (schema **unchanged** — pre-existing, consumed by TrocZen), `d=du-YYYY-MM-DD`, `amount`, `content=""`, **signed by the LOVE identity**, not the MULTIPASS.

### Ẑen display formula

Identical for both Ğ1/Duniter and Ğ1-N²: `Ẑen = max(0, (balance − 1) × 10)`, floored at zero. A fresh identity (balance 0) therefore needs to cross 1 unit before showing any positive Ẑen — same threshold semantics on both ledgers.

---

## Kind 7 Extension — LOVE Reaction Payment

Kind 7 (NIP-25 reactions) already triggers a Ğ1/Duniter micropayment on `content = "+N"` (cf. [KIND_REGISTRY.md](../NIP-101/KIND_REGISTRY.md)). When the reaction's author is a **LOVE identity** (resolved via `HEX_LOVE`, not the MULTIPASS), the same `"+N"` content instead triggers a Ğ1-N² transfer — a fully separate code path in `filter/7.sh`, never touching `PAYforSURE.sh`/Ğ1-Duniter.

```json
{
  "kind": 7,
  "pubkey": "<hex64 — sender's HEX_LOVE>",
  "content": "+10",
  "tags": [
    ["e", "<hex64 — reacted chat message id>"],
    ["p", "<hex64 — recipient's HEX_LOVE>"]
  ]
}
```

Conversion: identical rate to Ğ1 (`Ẑen_amount × 0.1` units transferred). The relay resolves the sender's `.secret.love` keyfile and publishes a Kind 30852 transfer **asynchronously in the background** (`( ... ) & disown`) — a filter script must never synchronously publish-and-wait on the same relay it is currently blocking (`RelayServer::runWriter()` is single-threaded on the plugin pipe; a nested synchronous publish can never receive a response until the writer itself is free again).

### Client integration

- `UPlanet/earth/atomic_chat.html` — pinned LOVE conversation channel (`_loveHex`), send via the existing `sendLike(eventId, authorPubkey, content)` (`lib_6_ecology.js`); balance badge for whichever peer is open (`_refreshLoveBalance`).
- Zelkova `lib/ui/screens/love_screen.dart` — own ♥ balance badge in the AppBar, plus an entry point into `lib/ui/screens/love_contacts_screen.dart`: a QR-code scanner/generator (`love:<HEX_LOVE>`, reusing `QrManager`/`flutter_zxing`) to exchange LOVE contacts, a searchable shortcuts list (encrypted IPFS photo per contact via `EncryptedFileService`/`EncryptedAvatar`), and a quick-send sheet (`publishReaction`, signed with the local `.secret.love`/`love_nsec` already stored client-side — see `SharedPreferencesHelperV2.getLoveNsec`). Adding/removing a shortcut republishes the full list as a **Kind 3 follow list signed by the LOVE key** (`NostrRelayService.publishContacts`) — this is the concrete mechanism by which two LOVE identities become reciprocal N1 contacts for the daily Universal Dividend.
- Balance display (both clients): `GET /api/g1n2/balance?hex=<HEX_LOVE>` (UPassport, public read-only) → `{hex, balance, last_tx_id, zen}`.

---

## References

- [101.md](101.md) — UPlanet constellation protocol
- [101-atom4love-extension.md](101-atom4love-extension.md) — Kind 30078 ATOM4LOVE profile (prerequisite for a LOVE identity)
- [NIP-25](25.md) — Reactions (Kind 7 base spec)
- [NIP-78](78.md) — Application-specific addressable data
- `NIP-101/KIND_REGISTRY.md` — full registry entry for Kind 30852 and Kind 7
- `Astroport.ONE/docs/explanation/ZEN.ECONOMY.v3.md` — hyper-relativistic Universal Dividend formula, original design notes
