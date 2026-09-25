NIP-AC
=======

NostrRPC for WebRTC Signaling
------------------------------

`draft` `optional`

This NIP defines a set of event kinds and conventions for using Nocd str relays as the
signaling channel for direct peer-to-peer WebRTC connections, and for peers to
announce and discover content or services by an opaque identifier. It builds
entirely on the event, filter, and relay-message primitives defined in
[NIP-01](01.md); no new transport or message envelope is introduced.

## Rationale

Establishing a WebRTC connection requires two peers to exchange an SDP offer, an
SDP answer, and a series of ICE candidates before they can talk directly. This
exchange needs some existing channel to bootstrap it. Relays that peers already
publish to and read from can serve as that bootstrap channel: a peer's identity is
its keypair, signaling messages are ordinary signed events addressed to a
counterparty's pubkey, and correlation between messages in the same session is done
with `e` tags, exactly as replies are threaded elsewhere in Nostr.

Because every event carries a valid signature over its own hash, this NIP requires
no separate identity-proof step: an event's `pubkey` is already backed by proof of
key ownership. There is likewise no need for a bespoke method to discover which
peers hold a given piece of content — that is answered by an ordinary `REQ` filter
over the announcement events defined below.

## Terms

- **Requester**: the peer initiating a connection attempt.
- **Responder**: the peer being connected to.
- **Session**: one attempted or established WebRTC connection between two peers,
identified by the `id` of the event that started it (see "Session correlation").

## Event Kinds

| kind | name | type |
|---|---|---|
| `21600` | `ping` | ephemeral |
| `21601` | `pong` | ephemeral |
| `21602` | `connect-request` | ephemeral |
| `21603` | `offer` | ephemeral |
| `21604` | `answer` | ephemeral |
| `21605` | `candidate` | ephemeral |
| `30600` | `announcement` | addressable |

Kinds `21600`–`21605` fall in the ephemeral range (`20000`–`29999`) defined by
NIP-01: relays SHOULD broadcast them to matching subscribers and MUST NOT store
them. Kind `30600` falls in the addressable range (`30000`–`39999`): for each
`(kind, pubkey, d-tag)` combination, relays MUST retain only the most recent event.

> Kind numbers above are provisional pending reservation in the NIPs registry.

### `ping` / `pong` (kinds `21600` / `21601`)

Used to check the reachability and latency of a peer through a relay, without
establishing a direct connection.

```json
{
"kind": 21600,
"pubkey": "<requester pubkey>",
"tags": [["p", "<responder pubkey>"]],
"content": "",
"created_at": 1735689600
}
```

A responder subscribed to `{"kinds":[21600],"#p":["<responder pubkey>"]}` who
receives a `ping` SHOULD publish a `pong` referencing it:

```json
{
"kind": 21601,
"pubkey": "<responder pubkey>",
"tags": [
    ["p", "<requester pubkey>"],
    ["e", "<ping event id>"]
],
"content": "",
"created_at": 1735689601
}
```

The requester MAY compute round-trip time from the difference between the two
`created_at` values, or from local receipt timestamps.

### `announcement` (kind `30600`)

Used by a peer to advertise that it holds, serves, or is reachable under some
application-defined identifier (a content hash, a topic, a service name, or the
peer's own pubkey for plain discoverability).

```json
{
"kind": 30600,
"pubkey": "<announcing peer>",
"tags": [["d", "<identifier>"]],
"content": "",
"created_at": 1735689600
}
```

Because this is an addressable event, publishing a new `announcement` with the same
`d` value automatically supersedes the peer's previous announcement for that
identifier, per NIP-01. To retract an announcement, clients MAY publish a
[NIP-09](09.md) deletion request for it, or simply let it be superseded.

Self-announcement — a peer announcing itself as reachable, typically with
`identifier` set to its own pubkey — requires no additional verification step: the
event's signature already proves the announcer controls that pubkey.

To discover peers that have announced a given identifier, clients query relays
directly rather than sending an RPC:

```json
["REQ", "<sub id>", {"kinds": [30600], "#d": ["<identifier>"]}]
```

Each matching event's `pubkey` is a peer known to hold or serve `<identifier>`.

### `connect-request` (kind `21602`)

Used to ask a specific peer to begin a WebRTC handshake. A requester publishes this
to a relay the responder is known to read from (see "Relay selection").

```json
{
"kind": 21602,
"pubkey": "<requester pubkey>",
"tags": [["p", "<responder pubkey>"]],
"content": "",
"created_at": 1735689600
}
```

`content` MAY instead carry a JSON-encoded SDP offer object, in which case the
responder MAY skip straight to publishing an `answer` and treat this event as
serving double duty as the `offer`.

### `offer` / `answer` / `candidate` (kinds `21603` / `21604` / `21605`)

Used to exchange the SDP offer, SDP answer, and ICE candidates that make up a
WebRTC handshake. All three share the same shape:

```json
{
"kind": 21603,
"pubkey": "<sender pubkey>",
"tags": [
    ["p", "<recipient pubkey>"],
    ["e", "<session id>"]
],
"content": "<JSON-encoded SDP or ICE candidate object>",
"created_at": 1735689600
}
```

- An `offer` (`21603`) is published by the responder, or by the requester as
described above.
- An `answer` (`21604`) is published by whichever peer did not send the `offer`.
- `candidate` (`21605`) events MAY be published by either peer, any number of
times, as ICE gathers new candidates.

#### Session correlation

The first event exchanged in a handshake (either a `connect-request` or an `offer`
sent without a prior `connect-request`) defines the **session id**: the `id` of
that event. Every subsequent `offer`, `answer`, or `candidate` in the same
handshake MUST include an `["e", "<session id>"]` tag referencing it. This lets
either peer group events into the correct in-progress session and lets relays and
clients discard stale sessions past a reasonable timeout, since these kinds are not
retained by relays regardless.

## Relay selection

To publish an event addressed to a peer (`p` tag) that peer is likely to see,
clients SHOULD consult the target's relay list ([NIP-65](65.md), kind `10002`) and
publish to a relay on that peer's read list. Clients SHOULD maintain subscriptions
of the form:

```json
["REQ", "<sub id>", {"kinds": [21600,21602,21603,21604,21605], "#p": ["<self pubkey>"]}]
```

on every relay they read from, so they see connection attempts and signaling
messages addressed to them regardless of which relay a counterparty chose to
publish to.

## Privacy considerations

- `offer`, `answer`, and `candidate` payloads reveal WebRTC session parameters
(network topology hints, media capabilities) to any relay operator or client that
can match the `#p` filter used. Applications that need confidentiality for these
payloads SHOULD encrypt `content` to the recipient's pubkey using
[NIP-44](44.md) before publishing.
- Relay operators MAY require [NIP-42](42.md) `AUTH` before accepting writes or
subscriptions for these kinds, to restrict use of the signaling channel to
authenticated pubkeys.
- Because signaling events are ephemeral and unstored, a session leaves no
relay-side record once it either completes or is abandoned; only the peers
involved retain any history of it.

## Example: full connection lifecycle

1. Requester publishes `connect-request` (`21602`) tagged `["p", responder]` to a
relay on the responder's read list.
2. Responder, subscribed to `{"kinds":[21602],"#p":[responder]}`, sees it and
publishes `offer` (`21603`) tagged `["p", requester]`, `["e", <connect-request
id>]`.
3. Requester publishes `answer` (`21604`) tagged `["p", responder]`, `["e",
<connect-request id>]`.
4. Both peers publish `candidate` (`21605`) events, each tagged `["e", <connect-request
id>]`, as ICE candidates are gathered, until a direct connection is established.
5. All signaling events above are ephemeral; relays broadcast and discard them, and
no further relay interaction is needed once the direct WebRTC channel is up.