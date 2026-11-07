NIP-AB
======

Device Pairing
--------------

`draft` `optional`

This NIP defines a way to transfer a secret (typically an `nsec`) from one device to another over Nostr relays, using a QR code and short code verification.

## Motivation

Users need their Nostr identity on multiple devices. The common options today are insecure (pasting a raw `nsec`), require the source device to stay online ([NIP-46](46.md) remote signing), or are error-prone (typing a [NIP-06](06.md) mnemonic). This NIP provides a one-time secure transfer. [NIP-46](46.md) handles remote signing; this NIP handles key transfer.

## Terminology

- **source**: The device that holds the secret and initiates pairing.
- **target**: The device that wants to receive the secret.
- **session secret**: A 32-byte random value shared via QR code.
- **SAS**: A 6-digit code displayed on both devices for the user to visually confirm.

## Overview

```
  Source                              Relay                     Target
  ──────                              ─────                     ──────
  Generate ephemeral keypair
  Generate session_secret
  Display QR code
  Subscribe kind:24134 ────────────►
                                                                Scan QR code
                                                                Generate ephemeral keypair
                                      ◄──────────────────────── Publish offer
                                                                Subscribe kind:24134
  ◄───────────────────────────────────
  Validate offer, lock to peer
  Compute SAS ◄──────────────────────────────────────────────►  Compute SAS
  Display: "047291"                                             Display: "047291"

  [User confirms on source]

  Publish sas-confirm ──────────────►─────────────────────────► Verify transcript_hash
  Publish payload ──────────────────►─────────────────────────► Buffer payload

                                                                [User confirms on target]
                                                                Decrypt & import
                                      ◄──────────────────────── Publish complete
  ◄───────────────────────────────────

  Discard ephemeral keys                                        Discard ephemeral keys
```

1. _source_ generates an ephemeral keypair and a session secret, encodes them in a QR code.
2. _target_ scans the QR code, generates its own ephemeral keypair, sends an `offer`.
3. Both devices derive a shared secret via ECDH and display a SAS code for the user to confirm.
4. After confirmation, _source_ sends the encrypted payload.
5. _target_ decrypts, imports, and sends `complete`.

All events use ephemeral keypairs discarded after the session.

## QR Code Format

_source_ generates:

- An ephemeral secp256k1 keypair (`source_ephemeral_privkey`, `source_ephemeral_pubkey`)
- A 32-byte cryptographically random `session_secret`

The QR code encodes:

```
nostrpair://ab12cd34...ff?secret=01ab02cd...ef&relay=wss%3A%2F%2Frelay.example.com&v=1
```

The general form is `nostrpair://{pubkey_hex}?secret={secret_hex}&relay={percent_encoded_url}&v={version}`.

- `source_ephemeral_pubkey_hex`: 64-character lowercase hex, 32-byte x-only pubkey per [BIP-340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki). MUST be a valid, non-zero secp256k1 curve point.
- `session_secret_hex`: 64-character lowercase hex, 32 random bytes.
- `relay`: percent-encoded WebSocket URL. MUST begin with `wss://` or `ws://`. Implementations SHOULD use `wss://` in production. MUST appear at least once. MAY appear multiple times for redundancy (recommended: 1–3).
- `v`: protocol version integer. Defaults to `1` if absent. _target_ MUST reject URIs with an unrecognized `v` value.

The total URI length MUST NOT exceed 2048 characters. Unknown query parameters MUST be ignored.

Implementations MUST reject URIs where the pubkey or secret are not exactly 64 lowercase hex characters, or where the relay URL does not begin with `wss://` or `ws://`.

## Event Kind

```
kind: 24134
```

Ephemeral event range. Standard [NIP-01](01.md) event routing. No special relay handling required.

## Event Structure

```jsonc
{
  "pubkey": "<sender's ephemeral pubkey>",
  "kind": 24134,
  "content": "<NIP-44 encrypted JSON>",
  "tags": [["p", "<recipient's ephemeral pubkey>"]],
  // id, created_at, sig per NIP-01
}
```

Events MUST contain exactly one `p` tag. `content` is encrypted using [NIP-44](44.md) version 2. Implementations MUST reject events whose NIP-44 version byte is not `0x02` and MUST NOT silently fall back to an older version. The `content` field MUST be a valid NIP-44 v2 payload (base64, 132–87472 characters); events outside this range MUST be silently discarded.

The decrypted plaintext is a JSON object with a `type` field. Unknown fields in any message MUST be ignored.

| Message | Required fields | Types |
|---------|----------------|-------|
| `offer` | `type`, `version`, `session_id` | string, int, hex(32B) |
| `sas-confirm` | `type`, `transcript_hash` | string, hex(32B) |
| `payload` | `type`, `payload` | string, string |
| `complete` | `type`; optional `success` | string; boolean (default `true`) |
| `abort` | `type`, `reason` | string, string |

Implementations MAY define additional `reason` strings; unknown reasons SHOULD be treated as `"protocol_error"`.

## Pairing Protocol

### Step 1: Source Subscribes

_source_ subscribes on all relays from the QR code:

```json
["REQ", "<sub_id>", {"kinds": [24134], "#p": ["<source_ephemeral_pubkey>"]}]
```

### Step 2: Target Sends Offer

_target_ scans the QR code, generates an ephemeral secp256k1 keypair, and publishes an `offer` event to any relay from the QR code:

```jsonc
// Encrypted plaintext:
{ "type": "offer", "version": 1, "session_id": "<hex, 32 bytes>" }
```

_source_ MUST reject offers with a `version` it does not support.

`session_id` proves possession of the QR code's `session_secret`:

```
session_id = HKDF-SHA256(IKM=session_secret, salt="" (zero-length byte array), info="nostr-pair-session-id", L=32)
```

_target_ MUST subscribe on **all** relays from the QR code for events tagged to its own ephemeral pubkey, before or immediately after publishing the offer:

```json
["REQ", "<sub_id>", {"kinds": [24134], "#p": ["<target_ephemeral_pubkey>"]}]
```

**Peer lock**: _source_ MUST verify `session_id` matches its own derivation. Upon accepting the first valid offer, _source_ records the event's `pubkey` as `peer_pubkey`. All subsequent events in the session MUST come from `peer_pubkey`; events from any other pubkey MUST be silently discarded. _source_ MUST accept at most one offer per session.

### Step 3: SAS Verification

Both devices compute:

```
ecdh_shared = ECDH(own_ephemeral_privkey, other_ephemeral_pubkey)
```

`ecdh_shared` is the 32-byte x-coordinate of the shared point (unhashed), per [BIP-340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki). ⚠️ Many secp256k1 libraries hash the ECDH output with SHA-256 by default. This NIP requires the **unhashed** x-coordinate. Verify your library's behavior.

```
sas_input = HKDF-SHA256(IKM=ecdh_shared, salt=session_secret, info="nostr-pair-sas-v1", L=32)
sas_code  = be_u32(sas_input[0:4]) mod 1000000
```

`x[i:j]` returns bytes `i` (inclusive) through `j` (exclusive). `be_u32` interprets 4 bytes as a big-endian unsigned 32-bit integer. `sas_code` is displayed as a zero-padded 6-digit decimal (e.g., `"047291"`).

The user MUST visually confirm the codes match on both screens. The confirmation prompt MUST clearly state what is being authorized (e.g., "Transfer your Nostr identity to another device?") and display the SAS code prominently with Confirm and Deny options. SAS denial is the primary MITM defense. If the user denies, the device MUST send `abort` with reason `"user_denied"`.

After the user confirms on _source_, _source_ publishes `sas-confirm`:

```jsonc
// Encrypted plaintext:
{ "type": "sas-confirm", "transcript_hash": "<hex, 32 bytes>" }
```

`transcript_hash` lets _target_ detect if any session parameter was tampered with between QR scan and SAS display:

```
transcript      = session_id || source_ephemeral_pubkey || target_ephemeral_pubkey || sas_input
transcript_hash = HKDF-SHA256(IKM=transcript, salt=session_secret, info="nostr-pair-transcript-v1", L=32)
```

All values are raw 32-byte arrays. `||` is byte concatenation. `transcript` is 128 bytes.

_target_ MUST compute the same `transcript_hash` and compare using constant-time equality. On mismatch, _target_ MUST send `abort` with reason `"sas_mismatch"` and discard all session state.

6-digit decimal SAS provides ~20 bits of entropy (1-in-1,000,000 per attempt). Combined with single-offer acceptance and 120-second timeout, brute force is infeasible. The `transcript_hash` is a consistency check, not the primary MITM defense — that role belongs to the user's visual SAS comparison.

### Step 4: Payload Transfer

_source_ publishes the payload immediately after `sas-confirm`:

```jsonc
// Encrypted plaintext:
{ "type": "payload", "payload": "<ncryptsec1... or nsec1...>" }
```

The `payload` field contains the private key, preferably in [NIP-49](49.md) `ncryptsec` format. Future versions or extensions MAY define additional payload types (see full specification).

The payload event may arrive at _target_ before the user has confirmed the SAS on the target device. _target_ MAY decrypt the event to learn its `type` for state-machine routing, but MUST NOT extract, log, persist, or act on the `payload` field until **both** the transcript hash is verified **and** the user has confirmed the SAS on the target device. If the session is aborted before both conditions are met, any decrypted content MUST be zeroized.

### Step 5: Completion

_target_ imports the secret into platform-secure storage and SHOULD publish:

```jsonc
// Encrypted plaintext:
{ "type": "complete", "success": true }
```

`complete` is advisory, not required for security. The transfer is complete when _target_ stores the payload. If _target_ crashes after importing but before sending `complete`, the import has succeeded — _target_ MUST NOT re-request the payload.

If _target_ received and decrypted the payload but failed to import it (e.g., keychain write failed), _target_ SHOULD send `{ "type": "complete", "success": false }`. The session is over in either case — _source_ MUST NOT retry.

_source_ SHOULD wait up to 30 seconds for `complete`. If not received, display an ambiguous confirmation ("Transfer sent — verify on your other device") rather than an error.

Both devices MUST zero ephemeral private keys, session secret, and any decrypted payload plaintext from memory after the session ends (on `complete`, `abort`, or timeout). On _target_, the decrypted payload MUST be zeroed from working memory once committed to platform-secure storage.

### Abort

Either device MAY send `abort` at any point:

```jsonc
{ "type": "abort", "reason": "<string>" }
```

Reasons: `"sas_mismatch"`, `"user_denied"`, `"timeout"`, `"protocol_error"`.

Upon receiving `abort`, the other device MUST terminate the session, discard ephemeral keys, and inform the user.

## Event Validation

Before processing any `kind:24134` event, implementations MUST:

1. Validate event `id` and `sig` per [NIP-01](01.md).
2. Validate that `pubkey` is a valid, non-zero secp256k1 curve point.
3. Validate that the event contains exactly one `p` tag whose value matches the local device's ephemeral pubkey.
4. After peer lock, validate that `pubkey` matches `peer_pubkey`. Before peer lock (_source_ only), accept events from any pubkey.
5. Decrypt `content` per [NIP-44](44.md) and parse the `type` field.
6. Validate `type` against the expected message for the current state (see table below). Silently discard out-of-order messages. MUST NOT send `abort` in response (prevents relay state probing).
7. Track processed event IDs per session and silently discard duplicates.

Events that fail any check MUST be silently discarded. Implementations MUST NOT reveal failure details.

### State Machine

**Source states:**

| State | After | Expects | On receive |
|-------|-------|---------|------------|
| `Waiting` | displaying QR | `offer` | validate session_id → peer lock → `Confirming` |
| `Confirming` | accepting offer | *(user input)* | user confirms SAS → send `sas-confirm` + `payload` → `Done` |
| `Done` | sending payload | `complete` | display result to user → cleanup |

**Target states:**

| State | After | Expects | On receive |
|-------|-------|---------|------------|
| `OfferSent` | publishing offer | `sas-confirm` | verify transcript_hash → `AwaitingUserConfirm` |
| `AwaitingUserConfirm` | transcript verified | *(user input + `payload`)* | buffer payload if received; user confirms SAS → decrypt + import → send `complete` → cleanup |

`abort` is valid in any non-terminal state from the locked peer.

If a device does not receive the expected message within 30 seconds, it SHOULD send `abort` with reason `"timeout"`. The entire session MUST NOT exceed 120 seconds from QR display.

## Multi-Relay Behavior

When the QR code contains multiple relays:

- _source_ MUST subscribe on **all** listed relays.
- _target_ MUST subscribe on **all** listed relays (so it receives `sas-confirm` and `payload` regardless of which relay delivers them first).
- _target_ SHOULD publish `offer` to **one** relay (the first that connects successfully). If that relay fails mid-session, _target_ MAY re-publish the **same signed offer event** (identical bytes) to another listed relay.
- _source_ publishes `sas-confirm` and `payload` to **all** listed relays.
- _target_ publishes `complete` to **all** listed relays.
- Duplicate events (same `id`) received across relays MUST be discarded per §Event Validation.
- If all listed relays fail, the session MUST be aborted. The QR code is the authoritative relay list — there is no relay discovery mechanism.

## Security Considerations

**Man-in-the-middle**: An attacker who captures the QR code could race the legitimate target. The SAS step prevents this — the attacker's ECDH shared secret produces a different SAS code. The user sees mismatched codes and denies.

**Relay compromise**: A compromised relay cannot read the payload (NIP-44 encrypted with ephemeral ECDH keys), forge events (signed by ephemeral keys), or correlate sessions with real identities (ephemeral keys are unlinked). It can only deny service.

**Replay protection**: Ephemeral keypairs are per-session. The `p` tag binds events to the recipient's ephemeral key. NIP-44 key binding provides a second independent layer.

**Metadata privacy**: All events use ephemeral pubkeys unlinked to the user's real identity. Implementations SHOULD jitter `created_at` by 0–30 seconds for metadata privacy, but MUST NOT set it to a future time and MUST NOT set it more than 60 seconds in the past (some relays enforce `created_at` limits).

**After transfer**: The private key exists on both devices. Clients MUST store imported keys in platform-secure storage (iOS Keychain, Android Keystore, OS credential manager).

## Limitations

- No forward secrecy, no post-quantum security (inherits from [NIP-44](44.md) and secp256k1).
- Physical presence required — SAS verification needs visual comparison on two screens.
- QR code is visible for up to 120 seconds. Screen capture can expose the session secret, though this alone does not break payload secrecy (the payload encryption key is derived from ECDH, not the session secret).
- Single-use — each transfer requires a new QR scan.

## Test Vectors

```
session_secret:     a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
source_eph_privkey: 7f4c11a9c9d1e3b5a7f2e4d6c8b0a2f4e6d8c0b2a4f6e8d0c2b4a6f8e0d2c4b5
source_eph_pubkey:  199e64ca60662cb2d6e91d16cb065be51ad74a6ee5f8c5b0fdc53d246611ed9a
target_eph_privkey: 3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b
target_eph_pubkey:  89a9fa762105d0aee2b19678246fe7b823aabbc4f4bf691a1ce8a70fcd36d6e4

session_id:         fb357d0f8e8d5a5ba3b2a91cb18c119e1567b07ffa38cdebb73e68df78f5a380
ecdh_shared:        9b4b6d6990713d89d6d9982e506ee1bbcde6f05c54d9d2978696e8a7274d4408
sas_input:          e8b03a329f3a0ac37fe7fbe929171e14b72812be67e33c5d6e193543c41798d3
sas_code:           863346
transcript_hash:    d662818ff8911fc60a2d025f8b8b4756107104e85888dd202d28db5ca2cf28d3
```

A full specification with pseudocode, additional test vectors, and a Tamarin formal verification model is available at https://github.com/block/sprout/blob/main/crates/sprout-core/src/pairing/NIP-AB.md
