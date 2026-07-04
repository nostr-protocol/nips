# NIP-101 ATOM4LOVE Extension

## Vibratory Identity Profile & Match Events

`draft` `extension` `optional`

This document defines two event kinds for the **ATOM4LOVE** sub-system of UPlanet: a personal vibratory profile (Kind 30078, leveraging NIP-78) and a bilateral vibratory match (Kind 30508, UPlanet-specific).

---

## Motivation

UPlanet integrates the **Dreamspell / Tzolkin** calendar and a φ-phase orbital model to compute _vibratory resonance_ between individuals. Resonance scores are computed locally (client-side) and, when two MULTIPASS holders are detected in proximity by a **cabine-33** device (BLE + WiFi scan) with a resonance coefficient k ≥ 0.85, the match is published as a NOSTR event.

---

## Kind 30078 — ATOM4LOVE Vibratory Profile

Uses the NIP-78 addressable kind with `d=atom4love`.

**Addressable key:** `(30078, pubkey, "atom4love")`

### Structure

```json
{
  "kind": 30078,
  "pubkey": "<hex64-user>",
  "tags": [
    ["d",         "atom4love"],
    ["t",         "atom4love"],
    ["a4l_proof", "<proof-salt>"],
    ["g1pub",     "<base58-G1-pubkey>"],
    ["email",     "<email>"]
  ],
  "content": "<JSON — vibratory data>"
}
```

### Content fields

```json
{
  "kin":          144,
  "glyph":        "Yellow Magnetic Seed",
  "tone":         1,
  "color":        "Yellow",
  "color_fr":     "Jaune",
  "phi":          1.2345,
  "birth_date":   "1988-03-15",
  "birth_time":   "12:00",
  "longitude":    1.44,
  "profile_cid":  "<IPFS CID — photo MULTIPASS>"
}
```

### Tags

| Tag | Value | Required |
|-----|-------|----------|
| `d` | `"atom4love"` | Yes |
| `t` | `"atom4love"` | Yes |
| `a4l_proof` | Proof salt (from Kind 30800 `AUTHORIZED_APPS`) | Yes |
| `g1pub` | Ğ1 wallet base58 pubkey | Yes |
| `email` | MULTIPASS email | No |

### Authorization policy (NIP-101)

Published by any MULTIPASS holder (level `uplanet`). The relay verifies the `a4l_proof` against the cooperative config (Kind 30800 `d=cooperative-config`).

---

## Kind 30508 — Vibratory Match (ATOM4LOVE)

A new **regular** event published when cabine-33 (BLE + WiFi proximity device) detects two MULTIPASS holders with vibratory resonance coefficient k ≥ 0.85.

**Addressable key:** `(30508, pubkey_A, "<hex64-pubkey_B>")`  
The `d` tag contains the partner's pubkey, making the event replaceable per pair.

### Structure

```json
{
  "kind": 30508,
  "pubkey": "<hex64-pubkey-A>",
  "tags": [
    ["d",           "<hex64-pubkey-B>"],
    ["p",           "<hex64-pubkey-B>"],
    ["t",           "atom4love"],
    ["t",           "match"],
    ["latitude",    "<float>"],
    ["longitude",   "<float>"],
    ["application", "UPlanet"]
  ],
  "content": "<JSON — match data>"
}
```

### Content fields

```json
{
  "k":         0.92,
  "phi_a":     1.2345,
  "phi_b":     1.4567,
  "kin_a":     144,
  "kin_b":     200,
  "location":  "cabine-33 Toulouse",
  "timestamp": 1730289600
}
```

### Tags

| Tag | Value | Required |
|-----|-------|----------|
| `d` | partner pubkey (hex64) | Yes |
| `p` | partner pubkey (hex64) | Yes |
| `t` | `"atom4love"` | Yes |
| `t` | `"match"` | Yes |
| `latitude` / `longitude` | cabine-33 location | No |
| `application` | `"UPlanet"` | Yes |

### Validation rules (NIP-101 filter)

| Condition | Action |
|-----------|--------|
| Publisher pubkey not in MULTIPASS (local / swarm / amisOfAmis) | `reject` |
| `content.k` missing | `reject` |
| `content.k` outside [0.85, 1.0] | `reject` |
| `d` tag not a valid 64-char hex | `reject` |
| All valid | `accept` + log to `~/.zen/tmp/nostr_kind30508.log` |

### Source device

Events are published by **cabine-33**, a proximity device (RPi/ESP32) running BLE + WiFi scanning. It:
1. Detects two MULTIPASS QR codes within range
2. Fetches both Kind 30078 profiles from the relay
3. Computes resonance k via `Phi2X.computeResonanceK(phiA, phiB)`
4. If k ≥ 0.85, signs and publishes Kind 30508 using its own MULTIPASS key

### Subscriptions

```json
{ "kinds": [30508], "#p": ["<hex64-my-pubkey>"], "limit": 100 }
```
→ Fetch all matches where I am the partner.

```json
{ "kinds": [30508], "authors": ["<hex64-my-pubkey>"] }
```
→ Fetch all matches I have published (as cabine-33 operator).

### Sync

Kind 30508 is included in the constellation N² sync. Matches propagate across all relay nodes so users can see their ATOM4LOVE encounters regardless of the station they connect to.

---

## Integration with SDK

From `lib_3_content.js` / `lib_5_payments.js`:

```js
// Fetch my ATOM4LOVE profile
const profile = await fetchKind(30078, myPubkey, { d: 'atom4love' });

// Fetch matches involving me
const matches = await fetchEvents({ kinds: [30508], '#p': [myPubkey] });
const myScore = matches.map(e => JSON.parse(e.content).k);
```

---

## References

- [NIP-78](78.md) — Application-specific addressable data (Kind 30078)
- [NIP-101](101.md) — UPlanet constellation protocol
- [42-oracle-permits-extension.md](42-oracle-permits-extension.md) — WoTx2 system (Kind 30500–30504)
- Phi2X SDK: `Phi2X.calcKinFromDate()`, `Phi2X.computePhaseFromForm()`, `Phi2X.computeResonanceK()`
