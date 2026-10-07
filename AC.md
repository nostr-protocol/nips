NIP-AC
======

WebRTC Calls
------------

`draft` `optional`

This NIP defines a protocol for establishing private peer-to-peer voice and video calls between Nostr users using WebRTC, with Nostr relays serving as the signaling transport and public STUN servers for NAT traversal — no custom server infrastructure is required.

The protocol relies on WebRTC's SDP (Session Description Protocol), a standardized, text-based metadata format used to negotiate communication capabilities between peers that most WebRTC libraries implement. It acts as a contract defining media types (audio/video), codecs, network addresses, and security settings, allowing browsers to understand how to connect. The SDP protocol also includes ICE (Interactive Connectivity Establishment): an ICE candidate is a potential network path (IP address and port) used to establish a direct connection between peers, overcoming firewalls and NATs. It contains information about the protocol (UDP/TCP), IP address, port, and type needed for media transmission.

## Overview

The protocol works as follows:

1. **Caller** creates a signed call offer event containing an SDP offer
2. The event is wrapped in an **ephemeral gift wrap** (kind `21059`) and published to relays
3. **Callee** unwraps the event, verifies the signature, and decides whether to accept
4. If accepted, callee sends back a gift-wrapped call answer event containing an SDP answer
5. Both parties exchange **ICE candidates** as gift-wrapped events for NAT traversal
6. A **direct WebRTC peer connection** is established for audio/video

All signaling events MUST be delivered using **ephemeral gift wraps** (kind `21059`), an ephemeral variant of [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) gift wraps. Events are signed by the sender's key and wrapped directly (without the seal layer) — the gift wrap's random ephemeral key already hides the sender from relay operators. Relays SHOULD treat kind `21059` events as ephemeral and not persist them to long-term storage.

## Event Kinds

| Kind  | Name                | Description                                  |
|-------|---------------------|----------------------------------------------|
| 25050 | Call Offer          | SDP offer initiating a call                  |
| 25051 | Call Answer         | SDP answer accepting a call                  |
| 25052 | ICE Candidate       | ICE candidate for NAT traversal              |
| 25053 | Call Hangup         | Terminates an active or pending call         |
| 25054 | Call Reject         | Rejects an incoming call                     |
| 25055 | Call Renegotiate    | New SDP offer for mid-call changes           |

## Tags

All signaling events MUST include:

| Tag           | Description                                           | Required |
|---------------|-------------------------------------------------------|----------|
| `p`           | Hex pubkey of the recipient (group calls: one per member) | YES  |
| `call-id`     | UUID identifying the call session                     | YES      |
| `alt`         | Human-readable description ([NIP-31](https://github.com/nostr-protocol/nips/blob/master/31.md)) | YES |

Additional tags for **Call Offer** (kind 25050):

| Tag           | Description                                           | Required |
|---------------|-------------------------------------------------------|----------|
| `call-type`   | `"voice"` or `"video"`                                | YES      |

## Event Structures

### Call Offer (kind 25050)

The `content` field contains the SDP offer string.

```json
{
  "kind": 25050,
  "pubkey": "<caller-hex-pubkey>",
  "created_at": 1234567890,
  "content": "v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\n...",
  "tags": [
    ["p", "<callee-hex-pubkey>"],
    ["call-id", "550e8400-e29b-41d4-a716-446655440000"],
    ["call-type", "video"],
    ["alt", "WebRTC call offer"]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Call Answer (kind 25051)

The `content` field contains the SDP answer string.

```json
{
  "kind": 25051,
  "pubkey": "<callee-hex-pubkey>",
  "created_at": 1234567895,
  "content": "v=0\r\no=- 4611731400430051337 2 IN IP4 127.0.0.1\r\n...",
  "tags": [
    ["p", "<caller-hex-pubkey>"],
    ["call-id", "550e8400-e29b-41d4-a716-446655440000"],
    ["alt", "WebRTC call answer"]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### ICE Candidate (kind 25052)

The `content` field contains the ICE candidate as a JSON string with the fields `candidate`, `sdpMid`, and `sdpMLineIndex`. Special characters in the SDP string MUST be properly JSON-escaped.

```json
{
  "kind": 25052,
  "pubkey": "<sender-hex-pubkey>",
  "created_at": 1234567896,
  "content": "{\"candidate\":\"candidate:842163049 1 udp 1677729535 203.0.113.1 44323 typ srflx raddr 0.0.0.0 rport 0 generation 0\",\"sdpMid\":\"0\",\"sdpMLineIndex\":0}",
  "tags": [
    ["p", "<peer-hex-pubkey>"],
    ["call-id", "550e8400-e29b-41d4-a716-446655440000"],
    ["alt", "WebRTC ICE candidate"]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Call Hangup (kind 25053)

The `content` field MAY contain a human-readable reason or be empty.

```json
{
  "kind": 25053,
  "pubkey": "<sender-hex-pubkey>",
  "created_at": 1234568000,
  "content": "",
  "tags": [
    ["p", "<peer-hex-pubkey>"],
    ["call-id", "550e8400-e29b-41d4-a716-446655440000"],
    ["alt", "WebRTC call hangup"]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Call Reject (kind 25054)

The `content` field MAY contain a reason or be empty.

```json
{
  "kind": 25054,
  "pubkey": "<callee-hex-pubkey>",
  "created_at": 1234567893,
  "content": "",
  "tags": [
    ["p", "<caller-hex-pubkey>"],
    ["call-id", "550e8400-e29b-41d4-a716-446655440000"],
    ["alt", "WebRTC call rejection"]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

### Call Renegotiate (kind 25055)

Used for mid-call changes such as toggling video on/off. The `content` field contains a new SDP offer. The recipient MUST respond with a `Call Answer` (kind 25051) containing the SDP answer for the renegotiation.

```json
{
  "kind": 25055,
  "pubkey": "<sender-hex-pubkey>",
  "created_at": 1234568100,
  "content": "v=0\r\no=- 4611731400430051338 3 IN IP4 127.0.0.1\r\n...",
  "tags": [
    ["p", "<peer-hex-pubkey>"],
    ["call-id", "550e8400-e29b-41d4-a716-446655440000"],
    ["alt", "WebRTC call renegotiation"]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

## Encryption and Delivery

All signaling events MUST be delivered using **ephemeral gift wraps** (kind `21059`):

1. **Sign** the signaling event with the sender's key
2. **Wrap** the signed event in a kind `21059` event with NIP-44 encryption and a random ephemeral key
3. **Publish** the gift wrap to the recipient's relay list

The seal layer (kind `13`) is NOT used. The ephemeral gift wrap already provides:

- **NIP-44 encryption** — content is unreadable to relay operators
- **Random ephemeral pubkey** — the relay cannot identify the sender
- **`p` tag** — reveals only the recipient (necessary for delivery)
- **Ephemeral kind (`21059`)** — signals to relays that this event is transient and SHOULD NOT be persisted to long-term storage

No `expiration` tag is needed on the inner signaling events or the outer wrap. The ephemeral kind itself communicates the transient nature of the data. Clients MUST still perform staleness checks (see Spam Prevention) to discard old events.

Recipients decrypt the gift wrap using NIP-44 with their private key and the wrap's ephemeral pubkey, verify the inner event's signature against the sender's pubkey, and then process the signaling message.

## Protocol Flow

### Initiating a Call

```
Caller                          Relay                           Callee
  |                               |                               |
  |-- GiftWrap(CallOffer) ------->|                               |
  |                               |-- GiftWrap(CallOffer) ------->|
  |                               |                               |
  |                               |         [Decrypts wrap, verifies sig]
  |                               |         [Checks: is caller trusted?]
  |                               |         [YES → ring / NO → ignore]
  |                               |                               |
  |<-- GiftWrap(CallAnswer) ------|<-- GiftWrap(CallAnswer) ------|
  |                               |                               |
  |<-> GiftWrap(IceCandidate) <-->|<-> GiftWrap(IceCandidate) <-->|
  |                               |                               |
  |============= WebRTC P2P Connection Established ===============|
  |                 (relay no longer involved)                    |
```

### ICE Candidate Buffering

Clients MUST implement **two layers** of ICE candidate buffering:

1. **Global buffer** (keyed by sender pubkey): ICE candidates that arrive before any `PeerConnection` exists for that sender (e.g., the callee is still ringing and no session has been created yet). When a `PeerConnection` is later created for that peer, drain the global buffer into the per-session buffer.

2. **Per-session buffer**: ICE candidates that arrive after a `PeerConnection` exists but before `setRemoteDescription()` has been called. Once `setRemoteDescription()` succeeds, flush all per-session buffered candidates via `addIceCandidate()`.

Candidates buffered while ringing MUST NOT be cleared when accepting the call — they must be drained into the new session.

### Mid-Call Renegotiation

Either party may send a `CallRenegotiate` (kind 25055) during an active call to change media parameters (e.g., toggling video on/off). The recipient responds with a `CallAnswer` (kind 25051):

```
Party A                         Relay                           Party B
  |                               |                               |
  |-- GiftWrap(Renegotiate) ----->|                               |
  |                               |-- GiftWrap(Renegotiate) ----->|
  |                               |                               |
  |                               |  [Party B creates SDP answer] |
  |                               |                               |
  |<-- GiftWrap(CallAnswer) ------|<-- GiftWrap(CallAnswer) ------|
  |                               |                               |
  |========= Updated WebRTC P2P Connection =======================|
```

**Renegotiation glare handling:** If both parties send a `CallRenegotiate` simultaneously, the `PeerConnection` will be in `HAVE_LOCAL_OFFER` state when the remote offer arrives. Clients MUST resolve this using a **pubkey comparison tiebreaker**: the peer with the **higher** pubkey wins (their offer takes priority). The losing peer MUST roll back their local offer via `setLocalDescription(rollback)` and then accept the winner's offer normally.

In group calls, renegotiation (e.g., toggling video) MUST be performed **per-peer** — a separate renegotiation exchange with each connected peer.

### Ending a Call

Either party may send a `CallHangup` (kind 25053) at any time. The recipient SHOULD close the WebRTC peer connection and release media resources upon receiving it.

### Rejecting a Call

The callee may send a `CallReject` (kind 25054) instead of a `CallAnswer`. The caller SHOULD stop ringing and display a "call rejected" state.

### Busy Rejection

If a client receives a Call Offer while already in an active call (any state other than Idle), it SHOULD automatically send a `CallReject` (kind 25054) with content `"busy"` and remain in the current call.

## Call State Machine

Clients MUST implement the following state machine. Each call session exists in exactly one state at a time:

```
┌─────────────────────────────────────────────┐
│                   Idle                      │
└──────────┬──────────────────────┬───────────┘
 initiate  │                      │  receive offer
           ▼                      ▼
     ┌──────────┐            ┌──────────────┐
     │ Offering │            │ IncomingCall │
     └────┬─────┘            └──────┬───────┘
answer    │                         │  accept
received  │                         │
          ▼                         ▼
      ┌────────────────────────────────────┐
      │           Connecting               │
      └──────────────┬─────────────────────┘
        ICE          │
        connected    │
                     ▼
      ┌────────────────────────────────────┐
      │           Connected                │
      └──────────────┬─────────────────────┘
         hangup /    │
         all peers   │
         left        │
                     ▼
      ┌────────────────────────────────────┐
      │            Ended                   │──▶ Idle (after ~2s)
      └────────────────────────────────────┘
```

**State descriptions:**

| State | Description |
|-------|-------------|
| **Idle** | No active call. Ready to initiate or receive. |
| **Offering** | Caller has sent offer(s), waiting for answer. Timeout after 60s. |
| **IncomingCall** | Callee is ringing. Stores the SDP offer. Timeout after 60s. |
| **Connecting** | SDP exchange complete, ICE connectivity being established. |
| **Connected** | At least one peer's ICE connection succeeded. Call is active. |
| **Ended** | Call finished. Displays reason briefly, then auto-resets to Idle. |

**Transitions to Ended** can happen from any active state via: hangup, reject, timeout, error, or all peers leaving.

**Group call tracking:** In `Connecting` and `Connected` states, clients MUST track two sets of peers: those with established connections (`peerPubKeys`) and those still pending (`pendingPeerPubKeys`). When a peer leaves (hangup/reject), remove them from both sets. End the call only when both sets are empty.

### Self-Event Filtering

Signaling events published by the local user will be echoed back by relays. Clients MUST filter these:

- **ICE candidates and hangups from self**: Always ignore — ICE candidates are for the remote peer, and hangups are already handled locally.
- **Answers and rejects from self**: Process ONLY when in `IncomingCall` state (for multi-device "answered/rejected elsewhere" — see Multi-Device Support). Ignore in all other states.

## Group Calls

Group calls (calls with more than two participants) use a **full-mesh** topology: each participant maintains a separate `PeerConnection` to every other participant. The same event kinds are used, but `p` tags and gift wraps are structured differently.

### P-Tag Convention

In a group call, all signaling events (except ICE candidates, kind 25052) MUST include a `p` tag for **every** group member. This allows each recipient to know the full group composition from any signaling event.

ICE candidates (kind 25052) remain addressed to a single peer because WebRTC connections are peer-to-peer — each ICE candidate is relevant only to the specific connection it belongs to.

### Sign Once, Wrap Per Recipient

For events whose content is identical for all recipients (hangup, reject), the event is **signed once** and then gift-wrapped individually for each recipient:

1. **Build** the signaling event with `p` tags for all group members
2. **Sign** the event once with the sender's key
3. **Gift-wrap** the same signed event separately for each member (each wrap encrypted to that member's pubkey)
4. **Publish** each gift wrap to the corresponding member's relay list

This is more efficient than signing a separate event per recipient and ensures cryptographic consistency — every member receives the exact same signed inner event.

### Per-Peer SDP with Group P-Tags

Events carrying SDP payloads (offer, answer, renegotiate) contain session descriptions that are specific to a single `PeerConnection`. In a full-mesh group call, each participant maintains a separate `PeerConnection` per peer, so SDP content differs per connection.

For these events, the inner event still includes `p` tags for **all** group members (so any recipient can see the full group), but:

1. **Build** the event with `p` tags for all group members and the per-peer SDP content
2. **Sign** the event (signed per peer, since the SDP content differs)
3. **Gift-wrap** and send **only to the specific peer** the SDP is intended for

This means offer, answer, and renegotiate events in group calls are signed per-peer but still carry the full group membership in their `p` tags.

### Group Call Initiation

The caller creates a **separate `PeerConnection`** and SDP offer for each callee. Each offer carries `p` tags for all callees but is gift-wrapped only to its target:

```json
{
  "kind": 25050,
  "pubkey": "<caller-hex-pubkey>",
  "tags": [
    ["p", "<callee-1-hex-pubkey>"],
    ["p", "<callee-2-hex-pubkey>"],
    ["p", "<callee-3-hex-pubkey>"],
    ["call-id", "550e8400-e29b-41d4-a716-446655440000"],
    ["call-type", "video"],
    ["alt", "WebRTC call offer"]
  ]
}
```

Recipients detect a group call by the presence of multiple `p` tags. The full group is the union of all `p`-tagged pubkeys plus the event's `pubkey` (the caller).

### Group Answer Broadcast

When a callee accepts a group call, it sends the `CallAnswer` (kind 25051) gift-wrapped to **every** group member (including self for multi-device support), not just the caller. The SDP answer is specific to the caller's `PeerConnection`, but broadcasting to all members serves as a "I joined" signal that triggers callee-to-callee mesh setup (see below).

### Callee-to-Callee Mesh Setup

After the initial caller-callee connections are established, callees MUST establish direct `PeerConnection`s with each other to complete the full mesh. Callees discover each other by observing `CallAnswer` events from the group broadcast:

1. **During ringing** (`IncomingCall` state): When a callee receives another callee's answer for the same `call-id`, it buffers that peer's pubkey as a "discovered peer."

2. **After accepting**: The callee processes all discovered peers and initiates mesh connections with them.

3. **Glare prevention** (who initiates): To avoid both callees sending offers simultaneously, use a **pubkey comparison tiebreaker**: the peer with the lexicographically **lower** pubkey initiates the offer. The higher pubkey waits to receive an offer.

4. **Mesh offer flow**: The initiating callee creates a new `PeerConnection`, generates an SDP offer, and sends a `CallOffer` (kind 25050) with all group member `p` tags, gift-wrapped only to the target callee. The receiving callee creates a `PeerConnection`, sets the remote description, creates an answer, and sends it back as a `CallAnswer` (kind 25051).

```
Callee A (lower pubkey)                    Callee B (higher pubkey)
    |                                           |
    |  [Both see each other's answers to caller]|
    |                                           |
    |  [A has lower pubkey → A initiates]       |
    |                                           |
    |-- CallOffer (callee-to-callee) ---------->|
    |                                           |  [B creates PeerConnection]
    |                                           |  [B sets remote desc, creates answer]
    |<-- CallAnswer ----------------------------|
    |                                           |
    |=========== P2P Connection =================|
```

ICE candidates for callee-to-callee connections follow the same buffering rules as caller-callee connections.

### Inviting New Peers

To invite a new peer into an active group call, send a Call Offer (kind 25050) with `p` tags listing **all** existing group members plus the new invitee. This allows the invitee to immediately see the full group composition. The SDP in the offer is specific to the new PeerConnection being established, so the wrap is addressed only to the invitee.

### Partial Disconnects

When a peer's ICE connection fails or they send a hangup in a group call, clients MUST close only that peer's `PeerConnection` and continue the call with remaining peers. The call ends only when all peers have disconnected.

## Spam Prevention

Clients SHOULD implement call filtering:

- **Follow-gated ringing**: Only display incoming call notifications for users in the recipient's follow list. Calls from non-followed users SHOULD be silently ignored.
- **Staleness check**: Clients MUST discard signaling events older than 20 seconds (based on `created_at`). This prevents old cached events from triggering phantom calls on app restart or relay reconnect.
- **Deduplication**: Clients MUST track processed event IDs to prevent the same signaling event (delivered by multiple relays) from being processed twice.
- **Rate limiting**: Clients SHOULD ignore duplicate call offers from the same pubkey within a short window.

## NAT Traversal

This NIP does not mandate specific STUN or TURN servers. Clients SHOULD:

- Ship with a default set of public STUN servers (e.g., `stun:stun.l.google.com:19302`)
- Ship with default TURN servers for relay fallback when direct P2P fails (~20% of cases, including devices on the same WiFi network where hairpin NAT is not supported)
- Allow users to configure custom TURN servers for restrictive network environments
- Use trickle ICE (sending candidates as they are discovered) rather than waiting for all candidates before sending the offer/answer
- Use `GATHER_CONTINUALLY` policy for ongoing ICE candidate discovery

## Implementation Notes

### Event Lifecycle

- The `call-id` tag MUST be a UUID that is unique per call session. All signaling events for the same call share the same `call-id`.
- Signaling data is ephemeral and has no long-term value. Using kind `21059` (ephemeral gift wrap) signals to relays that these events are transient and SHOULD NOT be persisted.
- Clients SHOULD implement a ringing timeout (e.g., 60 seconds). If no answer is received, the call transitions to a "timed out" state.
- After a call ends, the call state SHOULD auto-reset to idle after a brief display period (e.g., 2 seconds) to ensure the client is ready for subsequent calls.

### WebRTC Configuration

- The WebRTC `PeerConnection` SHOULD use Unified Plan SDP semantics.
- Clients MAY support call renegotiation (kind 25055) for toggling video on/off mid-call without tearing down the connection. When a `Call Renegotiate` event is received, the recipient creates a new SDP answer for the renegotiated session and sends it back as a `Call Answer` (kind 25051) with the same `call-id`. The initiator applies this answer via `setRemoteDescription()` to complete the renegotiation.
- ICE candidate JSON content MUST be properly escaped — SDP strings can contain quotes and backslashes that break naive string interpolation.

### Multi-Device Support

When a user is logged in on multiple devices, all devices will receive and ring for incoming calls. To prevent all devices from continuing to ring after one device handles the call:

- When **accepting** a call, the callee SHOULD gift-wrap and publish an additional `Call Answer` (kind 25051) addressed to their **own pubkey** (the `p` tag set to self). Other devices of the same user that receive this self-addressed answer SHOULD stop ringing and transition to an "answered elsewhere" state.
- When **rejecting** a call, the callee SHOULD gift-wrap and publish an additional `Call Reject` (kind 25054) addressed to their **own pubkey**. Other devices SHOULD stop ringing.

These self-notification events use the same `call-id` as the original call and follow the same gift-wrapping rules. Clients receiving a self-addressed answer or reject MUST verify the `call-id` matches the currently ringing call before acting on it.

**Group calls**: In group calls, the sender's own pubkey SHOULD be included in the set of recipients when gift-wrapping answer and reject events. This means the self-notification is implicit — no separate self-addressed event is needed. The same signed inner event (with all group member `p` tags) is simply wrapped to the sender's own pubkey along with all other members.

### Audio and Media

- Clients SHOULD switch `AudioManager` to `MODE_IN_COMMUNICATION` when a call connects and restore to `MODE_NORMAL` when the call ends.
- Clients SHOULD support audio routing between earpiece, speaker, and Bluetooth SCO headsets. If a Bluetooth headset disconnects mid-call, the client SHOULD fall back to earpiece automatically.
- Clients SHOULD play a ringback tone (e.g., `TONE_SUP_RINGTONE`) for the caller while waiting for the callee to answer.
- Clients SHOULD play the device's default ringtone and vibrate when an incoming call arrives from a followed user.

### Platform Integration

- Clients SHOULD use a foreground service (type `microphone`) to keep calls alive when the app is backgrounded.
- Clients SHOULD acquire a proximity wake lock during active calls to turn off the screen when held to the ear.
- Clients SHOULD keep the screen on during active calls.
- Clients MAY enter Picture-in-Picture mode when the user navigates away from the call screen during an active call.
- Clients SHOULD request `RECORD_AUDIO` permission (and `CAMERA` for video calls) at runtime before initiating or accepting a call.

### Error Handling

- If WebRTC session creation fails, the client SHOULD display an error to the user and transition to an ended state.
- If SDP offer/answer creation fails, the client SHOULD surface the error instead of hanging silently.
- Clients SHOULD handle `ICE_CONNECTION_FAILED` state by ending the call and notifying the user of a connection failure.

## Test Vectors

Implementations SHOULD validate their state machine and event handling against these test scenarios.

### Event Structure Tests

| # | Test | Verification |
|---|------|-------------|
| E1 | Build Call Offer (kind 25050) | Contains `p`, `call-id`, `call-type`, `alt` tags; content = SDP offer |
| E2 | Build Call Answer (kind 25051) | Contains `p`, `call-id`, `alt` tags; content = SDP answer; NO `call-type` tag |
| E3 | Build ICE Candidate (kind 25052) | Contains `p`, `call-id`, `alt` tags; content = JSON with `candidate`, `sdpMid`, `sdpMLineIndex` |
| E4 | Build Call Hangup (kind 25053) | Contains `p`, `call-id`, `alt` tags; content MAY be empty or contain reason |
| E5 | Build Call Reject (kind 25054) | Contains `p`, `call-id`, `alt` tags; content MAY be `"busy"` for auto-reject |
| E6 | Build Call Renegotiate (kind 25055) | Contains `p`, `call-id`, `alt` tags; content = new SDP offer |
| E7 | Group offer with N callees | N `p` tags present, one per callee |
| E8 | ICE candidate in group call | Still addressed to single peer (1 `p` tag) |
| E9 | All events for same call share `call-id` | Offer, answer, ICE, hangup, reject, renegotiate — same UUID |
| E10 | Single callee offer is not a group call | Exactly 1 `p` tag |
| E11 | P2P call flow event sequence | Offer → Answer → ICE → Hangup produce correct kinds in order |
| E12 | Group answer includes all member `p` tags | All members visible in answer `p` tags |
| E13 | Group hangup includes all member `p` tags | All members visible in hangup `p` tags |
| E14 | Group reject includes all member `p` tags | All members visible in reject `p` tags |
| E15 | Group renegotiate includes all member `p` tags | All members visible in renegotiate `p` tags |
| E16 | Group members = `p` tags + event author | `groupMembers()` union includes the caller's pubkey |
| E17 | ICE candidate JSON serialization round-trips | `serializeCandidate()` → parse → original values |
| E18 | ICE candidate JSON escapes special characters | Quotes and backslashes in SDP survive serialization |

### State Machine Tests

| # | Scenario | Initial State | Event/Action | Expected State |
|---|----------|---------------|-------------|----------------|
| S1 | Receive offer from followed user | Idle | CallOffer | IncomingCall |
| S2 | Receive offer from non-followed user | Idle | CallOffer | Idle (ignored) |
| S3 | Accept incoming call | IncomingCall | acceptCall() | Connecting |
| S4 | ICE peer connected | Connecting | onPeerConnected() | Connected |
| S5 | Peer hangs up (P2P) | Connected | CallHangup | Ended(PEER_HANGUP) |
| S6 | Ended auto-resets | Ended | ~2s timeout | Idle |
| S7 | Initiate outbound call | Idle | initiateCall() | Offering |
| S8 | Receive answer to offer | Offering | CallAnswer | Connecting |
| S9 | Reject incoming call | IncomingCall | rejectCall() | Ended(REJECTED) |
| S10 | Peer rejects our offer (P2P) | Offering | CallReject | Ended(PEER_REJECTED) |
| S11 | Busy auto-reject | Connected | CallOffer (different call-id) | Connected + publish CallReject("busy") |
| S12 | Stale event (>20s old) | Any | Any signaling event | No state change |
| S13 | Duplicate event (same ID) | Any | Re-delivered event | No state change |
| S14 | Self ICE candidate echo | Any active | CallIceCandidate from self | Ignored |
| S15 | Self hangup echo | Connected | CallHangup from self | Ignored (stay Connected) |
| S16 | Self answer in IncomingCall | IncomingCall | CallAnswer from self | Ended(ANSWERED_ELSEWHERE) |
| S17 | Self answer in Offering | Offering | CallAnswer from self | Ignored (stay Offering) |
| S18 | Hangup from Offering | Offering | hangup() | Ended(HANGUP) |
| S19 | Hangup from Connecting | Connecting | hangup() | Ended(HANGUP) |
| S20 | Hangup from Connected | Connected | hangup() | Ended(HANGUP) |
| S21 | Hangup from Idle | Idle | hangup() | Idle (no-op) |
| S22 | Fresh event (<20s old) | Idle | CallOffer | IncomingCall (processed normally) |
| S23 | Answer with wrong call-id | Offering | CallAnswer (wrong id) | Offering (ignored) |
| S24 | Hangup with wrong call-id | Connected | CallHangup (wrong id) | Connected (ignored) |
| S25 | ICE candidates forwarded via callback | Connecting | CallIceCandidate | Forwarded to onIceCandidateReceived |
| S26 | Peer left callback fires on hangup | Connected (group) | CallHangup from one peer | onPeerLeft callback invoked |
| S27 | Reset returns to Idle | Any | reset() | Idle |
| S28 | Video call type preserved through states | IncomingCall(VIDEO) | accept → connect | All states carry VIDEO type |
| S29 | Caller cancels while ringing | IncomingCall | CallHangup from caller | Ended(PEER_HANGUP) |

### Renegotiation Tests

| # | Scenario | Verification |
|---|----------|-------------|
| R1 | Renegotiate in Connected state | Forwarded to callback |
| R2 | Renegotiate in Connecting state | Forwarded to callback |
| R3 | Renegotiate in Idle state | Ignored |
| R4 | Renegotiate with wrong call-id | Ignored |
| R5 | Renegotiation response | MUST be CallAnswer (kind 25051), NOT CallRenegotiate |
| R6 | Glare tiebreaker | Higher pubkey wins; lower pubkey rolls back |
| R7 | Renegotiation preserves call-id | Same `call-id` tag in renegotiate event |

### Group Call Tests

| # | Scenario | Verification |
|---|----------|-------------|
| G1 | Group offer detected | Multiple `p` tags → group call |
| G2 | Peer rejects in group | Removed from group; call continues with remaining |
| G3 | All peers reject | Call ends |
| G4 | Partial disconnect | Close only that peer's connection; continue with remaining |
| G5 | Last peer leaves | Call ends |
| G6 | Discover peer while ringing | Buffer peer; trigger mesh setup after accepting |
| G7 | Mid-call offer (callee-to-callee) | Forwarded via callback with peer pubkey and SDP |
| G8 | Invite new peer | Offer with all existing members + new invitee in `p` tags |
| G9 | Callee-to-callee glare | Lower pubkey initiates; higher waits |

### ICE Candidate Buffering Tests

| # | Scenario | Verification |
|---|----------|-------------|
| B1 | Candidate arrives before session exists | Buffered in global buffer (keyed by sender) |
| B2 | Multiple candidates buffered globally | All preserved per peer |
| B3 | Global buffer drains on session creation | Moved to per-session buffer, global cleared |
| B4 | Global buffer drains and flushes after remote desc | Candidates reach PeerConnection via `addIceCandidate()` |
| B5 | Candidate arrives after session, before remote desc | Buffered per-session |
| B6 | Candidate arrives after session and remote desc | Added directly via `addIceCandidate()` |
| B7 | Per-session buffer not cleared on creation | Only cleared on flush after `setRemoteDescription()` |
| B8 | Candidates buffered while ringing are preserved | Not lost when accepting — drained into new session |
| B9 | Global buffers are separate per peer | Alice's buffer independent of Carol's |
| B10 | Registering one session doesn't drain other peer | Only the target peer's global buffer is drained |
| B11 | Full P2P flow: ICE through all phases | Ringing → accept → pre-desc → flush → post-desc |
| B12 | Group call mesh with ICE buffering | Global buffer per peer, drain on mesh session creation |

### Gift Wrap Round-Trip Tests

| # | Scenario | Verification |
|---|----------|-------------|
| W1 | Call Offer round-trips through gift wrap | Sign → wrap → unwrap → correct typed event, valid signature |
| W2 | Third party cannot decrypt | Gift wrap addressed to Bob, Carol cannot unwrap |
| W3 | Call Answer round-trips | SDP answer content preserved |
| W4 | ICE Candidate round-trips | JSON with candidate/sdpMid/sdpMLineIndex preserved |
| W5 | Hangup round-trips | Reason string preserved (including empty) |
| W6 | Reject round-trips | Including `"busy"` reason |
| W7 | Renegotiate round-trips | New SDP offer preserved |
| W8 | Group offer: per-peer wraps | Each callee can decrypt only their own wrap |
| W9 | Group answer: broadcast wraps | All members can decrypt; inner event identical |
| W10 | Group hangup: sign once, wrap per recipient | All wraps contain same inner event ID |
| W11 | Group reject: sign once, wrap per recipient | All wraps contain same inner event ID |
| W12 | Full P2P flow through gift wraps | All 7 signaling steps round-trip successfully |
| W13 | Wrap uses ephemeral key (not sender's) | Gift wrap pubkey differs from inner event pubkey |
| W14 | Each wrap uses unique ephemeral key | Two wraps for same content have different pubkeys |
| W15 | Inner event signature verifiable after unwrap | Recipient can verify sender's signature |
| W16 | SDP with special characters survives | CRLF, slashes, equals signs in SDP preserved |
| W17 | ICE candidate with special characters survives | JSON escaping + NIP-44 encryption preserves content |
| W18 | Group offer with context: per-peer SDP | Per-peer SDP content but all `p` tags visible |

### Interface-Level Tests (Full Pipeline)

| # | Scenario | Verification |
|---|----------|-------------|
| I1 | Initiate call | Publishes 1 gift wrap (kind 21059) |
| I2 | Accept call | Publishes gift wrap answer(s) |
| I3 | Reject call | Publishes gift wrap reject(s) |
| I4 | Hangup | Publishes gift wrap hangup(s) |
| I5 | Send renegotiation | Publishes 1 gift wrap renegotiate |
| I6 | Send renegotiation answer | Publishes 1 gift wrap answer |
| I7 | Busy auto-reject | Publishes gift wrap reject while staying in current call |
| I8 | Group per-peer offers | Publishes 1 gift wrap per peer |
| I9 | Invite peer | Publishes 1 gift wrap; invitee added to pending set |
| I10 | Full P2P flow | Offer → Answer → Renegotiate → Hangup, all via gift wraps |

## References

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md) — Event structure
- [NIP-31: Alt Tag](https://github.com/nostr-protocol/nips/blob/master/31.md) — Human-readable event descriptions
- [NIP-44: Encryption](https://github.com/nostr-protocol/nips/blob/master/44.md) — XChaCha20-Poly1305 encryption
- [NIP-59: Gift Wraps](https://github.com/nostr-protocol/nips/blob/master/59.md) — Encrypted event delivery
- [WebRTC Specification](https://www.w3.org/TR/webrtc/) — Peer-to-peer real-time communication
- [RFC 8445: ICE](https://datatracker.ietf.org/doc/html/rfc8445) — Interactive Connectivity Establishment
- [nostr-protocol/nips#771](https://github.com/nostr-protocol/nips/issues/771) — WebRTC signaling discussion
