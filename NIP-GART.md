NIP-GART
========

Group Alert & Response Transmission
-----------------------------------

`draft` `optional`

This NIP defines a privacy-preserving wire format on Nostr for emergency alerts and location broadcasts addressed to a group of trusted recipients. It hides sender identity, group membership, and payload from relay operators while remaining replay-safe and signature-verifiable end to end.

## Motivation

Centralized location-sharing services (Google Maps, Apple Find My, Life360) require users to trust a custodial provider with their real-time movements. Nostr offers a decentralized substrate, but lacks a standardized event kind purpose-built for safety-critical alert and location sharing where both content *and* metadata must be hidden from relay operators.

For physical-safety use cases — duress alerts, kidnap-and-ransom protection, journalist and activist convoy coordination, family check-ins — metadata is the threat model. A relay-side adversary will see that an alert event of this kind was published (the event is, of necessity, addressable on Nostr), but MUST NOT learn *who* triggered the alert, *who their trusted contacts are*, or *where they are*.

This NIP targets:

1. **Sender pseudonymity.** Broadcasts MUST NOT be linkable to a user's main Nostr identity by a passive relay observer.
2. **Recipient-set unlinkability.** A group's membership MUST NOT be inferable from event tags.
3. **Recoverability.** Recipient pseudonyms MAY be rotated when membership changes; the rotation channel itself is out of scope.

## Terminology

This NIP uses two abstract key roles:

- **Sender key** — a dedicated keypair that signs alert events. MUST NOT be the user's main Nostr identity. Compromise of a sender key affects only events signed by that key.
- **Recipient pseudonym key** — a shared keypair representing a recipient group. The public half (`recipientNpub`) appears as the `p` tag on alerts; the private half (`recipientNsec`) is held by every member and is used to NIP-44-decrypt the payload.

Distribution and rotation of the recipient pseudonym key to members is out of scope of this NIP and is application-defined.

The reference implementation (Gart) realizes these roles as **ButtonKey** (sender) and **FinderKey** (recipient pseudonym). Gart additionally uses two further keys for device attestation and group control which are outside this NIP's scope; see the implementation notes below.

## Specification

### Event Kind

This NIP allocates `kind:694` for alert / location broadcasts. The number was chosen because the BIP-39 English wordlist's entry at index 694 is **`find`**, reflecting the recipient role.

### Alert Event (kind:694)

```jsonc
{
  "kind": 694,
  "pubkey": "<sender-key-pubkey-hex>",
  "created_at": 1722173222,
  "content": "<NIP-44 ciphertext>",
  "tags": [
    ["p", "<recipientNpub-hex>"]
  ],
  "sig": "<sender-key signature>",
  "id": "<event-id>"
}
```

- The event MUST be signed by a sender key, never by the user's main Nostr identity. This decouples the broadcast from any persistent user identity on relays.
- The event MUST contain at least one `["p", "<recipientNpub>"]` tag. Each `recipientNpub` represents an entire recipient group, so individual members are not enumerated on relays.
- The `content` field is a NIP-44 ciphertext encrypted to the recipientNpub.

#### Plaintext payload

After decrypting `content` with the recipient pseudonym key, clients parse a JSON object of the form:

```json
{
  "status": "ACTIVE" | "TEST" | "STOP",
  "tester": ["<bech32-system-npub>", "..."],
  "lat": <number>,
  "lng": <number>,
  "ts": <unix-seconds>,
  "msg": "<optional free-form string>"
}
```

Field semantics:

- `status` (REQUIRED) — one of:
  - `"ACTIVE"` — a real alert. `lat`, `lng`, and `ts` MUST be present. `tester` MUST NOT be present.
  - `"TEST"` — a system-verification alert. `lat`, `lng`, and `ts` MUST be present; receivers MUST render this as a test, never as an emergency. `tester` MAY be present (see below).
  - `"STOP"` — terminates an active broadcast. `lat`, `lng`, `ts`, and `msg` MUST be omitted.
- `tester` — OPTIONAL; valid only when `status` is `"TEST"`. An array of bech32-encoded system npubs identifying which group members should surface the test in their UI. When absent or empty, all group members surface the test. Receivers filter on their own system npub.
- `lat`, `lng` — WGS-84 decimal degrees.
- `ts` — Unix timestamp in seconds at which the location was captured.
- `msg` — OPTIONAL free-form human-readable string, displayed by the receiver alongside the location. Application-defined; this NIP prescribes no content.

Example `ACTIVE` payload:

```json
{ "status": "ACTIVE", "lat": 45.0, "lng": 7.0, "ts": 1722173222 }
```

Example `TEST` payload targeted to specific members:

```json
{ "status": "TEST", "tester": ["npub1abc...", "npub1def..."], "lat": 45.0, "lng": 7.0, "ts": 1722173222 }
```

Example `STOP` payload:

```json
{ "status": "STOP" }
```

#### Multi-recipient bundling

To broadcast a single alert to N recipient groups simultaneously without producing N separate events, a kind:694 event MAY include multiple `["p", "<recipientNpub>"]` tags and a per-recipient ciphertext map in `content`.

When more than one `p` tag is present, `content` MUST be a serialized JSON object of the form:

```json
{
  "version": 1,
  "payloads": {
    "<recipientNpub-hex>": "<nip44-ciphertext>",
    "<recipientNpub-hex>": "<nip44-ciphertext>"
  }
}
```

Each entry in `payloads` is the same plaintext payload independently NIP-44-encrypted under the corresponding recipient pseudonym key. The set of keys in `payloads` MUST equal the set of recipientNpubs in the event's `p` tags. Single-recipient events retain the simpler form (one `p` tag, raw ciphertext as `content`); receivers detect the format by `p`-tag count.

#### Targeted test alerts

`TEST` payloads MAY include a `tester` field — an array of bech32-encoded system npubs identifying which group members should surface the test in their UI. When `tester` is absent or empty, all group members surface the test. Filtering is client-side only — any member holding the recipient pseudonym key can decrypt the event.

Because targeting is inside the NIP-44 ciphertext, no member identities are exposed to relay operators. `ACTIVE` payloads MUST NOT include a `tester` field.

### Sender Behavior

For a single-recipient broadcast:

1. Acquire the current GPS coordinates (omit for `STOP`).
2. Build the JSON payload with the appropriate `status` value (`ACTIVE`, `TEST`, or `STOP`). For a targeted `TEST`, include the `tester` array with the bech32 system npubs of the intended recipients.
3. NIP-44-encrypt the payload to the recipientNpub.
4. Construct a kind:694 event with one `["p", "<recipientNpub>"]` tag.
5. Sign with the sender key.
6. Publish to the configured relays.

For a multi-recipient broadcast, repeat step 3 for each target recipientNpub, assemble the `payloads` map, and add one `p` tag per recipient before signing.

### Receiver Behavior

1. Subscribe with the filter `{"kinds":[694], "#p":[recipientNpub_1, recipientNpub_2, ...]}`.
2. Verify the event id and signature per NIP-01; drop on failure.
3. Drop duplicates by event id.
4. Identify which local recipientNpub matches a `p` tag on the event.
5. Locate the ciphertext: if the event has a single `p` tag, treat `content` as the raw ciphertext; otherwise parse `content` as the per-recipient `payloads` map and look up the entry under the matched recipientNpub. If absent, drop the event as malformed.
6. NIP-44-decrypt with the corresponding recipient pseudonym key; parse the payload.
7. Handle by `status`:
   - `"STOP"` — silence any active alarm UI for that sender key.
   - `"TEST"` — if `tester` is non-empty and the receiver's own npub is not in the list, suppress the test UI. Otherwise render as a test/verification event; never as an emergency.
   - `"ACTIVE"` — render the alert and the location.
   - any other value — drop the event.

## Security Considerations

- **Recipient pseudonym key compromise.** The recipientNsec is shared. Any member's device compromise exposes all alerts encrypted to that key until rotation. Implementations MUST provide a means to rotate the recipient pseudonym key, and SHOULD prompt rotation when membership changes.
- **Sender key discipline.** A sender key MUST be distinct from the user's main Nostr identity. Reusing the user's identity here defeats the pseudonymity property this NIP exists to provide.
- **Multi-recipient bundling links groups.** A single event with multiple `p` tags publicly links the targeted recipientNpubs as "groups served by the same sender at the same moment." Senders who need group-linkage privacy MUST publish separate single-recipient events.
- **Replay defense.** Receivers MUST track processed event ids to prevent relay-replay-driven duplicate alarms.
- **Signature verification.** Receivers MUST verify the event id hash and signature per NIP-01 before any further processing.
- **Plaintext key handling.** Implementations MUST NOT log nsec values, even in debug builds.

## Privacy Considerations

The threat model assumes a passive global relay observer who:

- stores all events seen across all relays the target ever uses, and
- can correlate timing, IP addresses (at the relay layer), and pubkeys.

Under this model:

- An attacker observing only kind:694 traffic learns "sender key X broadcast to recipient pseudonym Y at time T" but learns nothing about the user behind X or the members behind Y.
- An attacker that compromises any group member learns the recipientNsec and can decrypt past and present alerts encrypted to that key. Rotation severs future access.
- Linking sender key X to a real-world user requires an out-of-band signal — for instance, the user's chosen channel for distributing recipient pseudonym keys, a kind:0 metadata event from the same pubkey, or correlated traffic at the network layer.

---

## Implementation Notes (informative)

Everything in this section is **informative**: nothing here is required for NIP-Gart conformance. A client that implements only the kind:694 wire format defined above is interoperable with Gart for receiving and sending alerts. This section also documents the Gart reference application's full architecture, including event kinds Gart uses for orthogonal concerns (device attestation, group lifecycle) that are outside this NIP's scope.

### Integrator quickstart

#### Receiving alerts in a third-party Nostr client

1. Obtain the user's recipient pseudonym secret key(s) `recipientNsec` through whatever channel the user prefers — QR exchange, a NIP-17 gift-wrapped message, a file import, or any application-defined transport. The corresponding `recipientNpub` is derived from the nsec.
2. Subscribe with the filter `{"kinds":[694], "#p":[recipientNpub_1, recipientNpub_2, ...]}`.
3. For each event, verify the id and signature per NIP-01. Drop on failure.
4. Drop duplicates by event id; track recently seen ids over a moving window to defeat relay replay (Gart uses a persisted set; any equivalent works).
5. Locate the ciphertext: single `p` tag → `content` is the raw NIP-44 ciphertext; multiple `p` tags → `content` is a JSON `payloads` map keyed by recipient hex.
6. NIP-44-decrypt with the matching recipientNsec; parse the payload.
7. Handle the event by `status` (`ACTIVE` / `TEST` / `STOP`).

#### Sending alerts from a third-party client

1. Generate (or load) a dedicated sender key. Never sign kind:694 with the user's main nsec.
2. Build the payload, NIP-44-encrypt it to each target recipientNpub, sign kind:694 with the sender key, publish.

A client implementing only these two flows is fully interoperable with Gart-compatible receivers and senders.

### Notes on replay and retention

- Event ids serve as the dedup key. The minimum useful retention for the seen-ids set is "long enough that resubscribing after disconnect doesn't refire the alarm." Gart uses a persisted store keyed by event id.

### Optional `expiration` tag (NIP-40)

Senders MAY include a NIP-40 `expiration` tag on kind:694 events. Cooperative relays will discard events past the timestamp. This NIP does not require it; Gart does not currently set it.

### Gart's reference key model

Gart realizes the abstract sender / recipient roles defined in NIP-Gart using a four-tier hierarchy. Other implementations may map the roles differently.

| Key | Scope | Purpose | Persistence |
|-----|-------|---------|-------------|
| **UserKey** | Identity | The user's persistent Nostr identity. Signs `kind:30078` to attest devices. Never signs alerts. | Long-lived (external signer per NIP-55 recommended) |
| **SystemKey** | Device | Per-install device key. Signs day-to-day NIP-17 traffic so external signers are not prompted on every operation. | Local, encrypted, regenerable |
| **ButtonKey** | Sender | The NIP-Gart **sender key**. Signs `kind:694` alerts. Compromise affects only that button. | Local, encrypted |
| **FinderKey** | Recipient pseudonym | The NIP-Gart **recipient pseudonym key**. Shared with all members of a group. | Local, encrypted on each member's device |

```
UserKey  ──signs──►  kind:30078 (device link, NIP-44 encrypted content)
                          └─► attests SystemKey

SystemKey ──signs──►  kind:14   (NIP-17, gift-wrapped per NIP-59)
                          ├─► invitations, acceptance, decline, revoke
                          ├─► shared-group, shared-group-confirmation
                          ├─► member-added, delete, rotate
                          └─► group-message, direct-message, metaupdate

ButtonKey ──signs──►  kind:694  (alert / location)         ← NIP-Gart
                          └─► encrypted to FinderNpub (recipient pseudonym)
```

Only the bottom row is governed by NIP-Gart. The other rows are how the Gart application solves the orthogonal problems of device attestation and group lifecycle on top of existing NIPs.

### Gart's group control plane

Gart manages group lifecycle (invitations, member changes, key rotation, in-group chat) over `kind:14` rumors per NIP-17, gift-wrapped per NIP-59. Operations are identified by a `["gart-action", "<value>"]` tag on the inner rumor.

| `gart-action` value           | Purpose                                                         |
|-------------------------------|-----------------------------------------------------------------|
| `invitation`                  | Owner invites a UserNpub to a group                             |
| `invitation-acceptance`       | Invitee accepts; triggers key distribution                      |
| `invitation-decline`          | Invitee declines; flow ends                                     |
| `invitation-revoke`           | Owner cancels a pending invitation                              |
| `shared-group`                | Owner sends FinderNpub + FinderNsec + ButtonNpub to invitee     |
| `shared-group-confirmation`   | Invitee confirms key receipt                                    |
| `member-added`                | Owner notifies remaining members of a new joiner                |
| `delete`                      | Removed member is told they were removed                        |
| `rotate`                      | Owner pushes a new FinderNsec to remaining members              |
| `group-message`               | Group chat                                                      |
| `direct-message`              | One-to-one message                                              |
| `metaupdate`                  | Group avatar / description change                               |

A third-party app does **not** need to implement any of this to receive Gart alerts; it only needs to obtain a `(FinderNpub, FinderNsec)` pair through any out-of-band channel and follow the NIP-Gart receiver flow. Implementing the control plane lets a third-party app participate in Gart's group lifecycle (be invited, send chat, etc.).

### Gart's device link (kind:30078)

Published after signup or login to associate the user's identity with the device's SystemKey:

```jsonc
{
  "kind": 30078,
  "pubkey": "<UserNpub-hex>",
  "content": "<NIP-44 encrypted JSON>",
  "tags": [
    ["d", "https://gart.io/"],
    ["m", "<SystemNpub-bech32>"],
    ["alt", "Arbitrary app data"]
  ],
  "sig": "<signature by UserNsec>"
}
```

Decrypted content:

```json
{
  "systemNsec": "nsec1...",
  "backupUrl": "https://cdn.blossom.example/abc123.gart"
}
```

`backupUrl` is OPTIONAL. The SystemNsec is encrypted to the user's own pubkey (self-encryption) so a new install authenticated as the same UserNpub can recover the device key. This is a Gart-specific multi-device pattern; it is not part of NIP-Gart.

### Key rotation

Gart rotates the FinderKey (NIP-Gart recipient pseudonym key) when a member is removed or a key is suspected compromised:

1. The group owner generates a new FinderKey pair `(finderNpub', finderNsec')`.
2. The owner sends a `gart-action: rotate` message (kind:14, gift-wrapped) to each remaining member, containing `finderNpub'` and `finderNsec'`.
3. Members replace the old FinderKey locally; subsequent kind:694 events are encrypted to `finderNpub'`.
4. The old FinderKey is discarded. A removed member retains the old FinderKey but cannot decrypt new alerts.

NIP-Gart itself prescribes only that rotation is possible; the channel is application-defined.

### Operational safety

These are Gart UX behaviors, not protocol requirements:

- Real-alert UI requires a successful test broadcast before being armed (test-before-real gate).
- GPS remains off until the alert is engaged, then returns to off after a stop event, to minimize battery drain.
- Stop is user-initiated.

### Client behavior recommendations

- Inbound alerts may be persisted locally for the user's group history but should be deleted when the user clears the conversation or removes the group.
- Decrypted recipientNsec values should be stored using platform secure storage (Android Keystore, iOS Keychain) and never as plaintext.
- Private keys should never be logged.

## Reference Implementation

The Gart Kotlin Multiplatform application (Android and iOS) implements this NIP.