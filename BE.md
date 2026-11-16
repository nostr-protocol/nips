NIP-BE
======

Nostr BLE Communications Protocol
---------------------------------

`draft` `optional`

This NIP specifies how two nearby devices find each other over Bluetooth Low Energy and sync using a modified version of the nostr client/relay protocol.

## Advertisement

A device advertises the service UUID `80E0688B-A648-4D1D-BB0D-BC58993CF926`. To partially prevent fingerprinting and tracking, and for iOS compatibility, a device MUST NOT advertise anything else.

A backgrounded iOS device advertises the UUID only in Apple's "overflow" manufacturer data, which Android has no documented way to filter on. Android devices SHOULD connect to overflow advertisements and discover services to learn whether the service is present, and SHOULD set aside a device that lacks it until its address changes.

## GATT

Every device runs both GATT roles at once: a peripheral hosting the service, and a central scanning for it.

The service has one characteristic, `5C020905-A8FC-4D19-AB51-1FFDB97FB90A`, with the `write` and `notify` properties. The dialer sends with acknowledged writes and the receiver with notifications. Each write or notification carries exactly one [fragment](#framing), and a device has at most one in flight on the characteristic at a time.

The dialer SHOULD negotiate the largest ATT MTU the platform allows. A fragment is at most the ATT MTU minus 3 bytes.

Two devices that dial each other end up with two links which can't be matched until after authentication. Once authenticated, both devices keep the link dialed by whichever of them has the lower pubkey, and close the other. A peer that authenticated as several pubkeys is compared by the lowest.

## Framing

Every write is one fragment:

| Byte | Is |
| --- | --- |
| 0 | Channel: `0` control, `1` sync, `2` blob |
| 1 | Flags. Bit 0 set means more fragments of this frame follow. The other bits MUST be zero |
| 2.. | Payload |

A frame is the concatenation of its fragments' payloads. Fragments of frames on different channels MAY interleave, and reassembly is per channel. Fragments of two frames on the same channel MUST NOT interleave. A frame MUST NOT be empty, and MUST NOT exceed 1 MiB. A device that receives a reserved flag or a frame over the limit MUST close the link, and a sender MUST NOT set a flag defined later until a control frame has shown that the peer understands it. A device MUST decrypt a fragment on a channel it does not recognize, which keeps the nonce sequence in step, and then discard it.

Senders SHOULD schedule by channel, control first and blob last, so that blob transfers do not delay heartbeats.

Once the handshake completes, a device [seals](#encryption) each fragment, which adds a 16-byte tag. A fragment's payload is then at most the write size minus the 2-byte header and the tag.

## Handshake

The pattern is `Noise_XX_25519_ChaChaPoly_SHA256`, with an empty prologue and empty handshake payloads. The dialer is the initiator. The handshake hash is `h` below.

A device MUST generate a fresh static key for every handshake to prevent passive tracking. The static key only names the channel, and NIP-42 [binds a pubkey to it](#authentication).

Handshake messages are frames on channel 0. They are not sealed and carry no discriminant.

### Encryption

After the handshake, each direction seals every fragment, header included, under its Noise transport key, with an explicit nonce in place of Noise's implicit counter. The `n`th fragment a device sends over GATT, counting from zero, uses nonce `2n`. The `n`th it sends over an [L2CAP channel](#l2cap-upgrade) uses nonce `2n+1`. The two pipes deliver independently, and each sequence opens strictly in order. There is no associated data.

A device seals each fragment as it writes it rather than as it queues it, because the scheduler may let a control fragment overtake queued blob fragments.

## Control channel

After the handshake, every frame on channel 0 begins with a discriminant byte:

| Byte | Frame | Payload |
| --- | --- | --- |
| `0x01` | [Recognition](#recognition) | 32 tags of 32 bytes |
| `0x02` | [Authentication](#authentication) | A NIP-42 `AUTH` message, or the `OK` that answers one, as JSON |
| `0x03` | [Heartbeat](#heartbeat) | Empty |
| `0x04` | [L2CAP upgrade](#l2cap-upgrade) | A step byte, then its payload |
| `0x05` | [Pair request](#pairing) | Empty |

A device MUST ignore a control frame whose discriminant it does not recognize. `0x80` to `0xFF` are reserved for applications.

### Recognition

Two devices that have met before can recognize each other before either authenticates, so that each can decide whether to disclose who it is. Nothing either sends identifies it to a device that has not met it.

Once both sides of a session have authenticated, each derives a pair secret, which it SHOULD store against the pubkeys the other authenticated as:

```
pair_secret = SHA256("nip-be/pair-secret" || h)
```

A device keeps the secret it already holds for a peer it recognized in this session, and replaces any other. A pairing only one side finished is then repaired the next time the two meet.

In every later session, each device sends a list of tags, one per pair secret it holds:

```
tag = HMAC-SHA256(pair_secret, h)
```

The list is exactly 32 tags of 32 bytes, concatenated. A device holding fewer secrets pads the list with random bytes, and one holding more sends a random sample, drawn again every session. The list is shuffled. A device that keeps no pair secrets sends 1024 random bytes. A list of any other length MUST be refused and the link closed.

A device that receives a list computes the tag for each secret it holds and looks for it in the list. A match identifies the peer. Tags cannot be linked across sessions, because `h` is fresh every time, and the fixed count hides how many peers the sender has met.

### Heartbeat

A device sends a heartbeat every 15 to 30 seconds, jittered, unless it has other frames queued. Any frame proves liveness. A device that has heard nothing for 60 seconds SHOULD close the link once any transfer in flight has had a chance to finish.

### Pairing

Implementations MAY require explicit device pairing depending on use case or policy. This is done by asking the users to compare a code derived from the session and displayed on their device. Matching codes show that the two devices share this session, rather than each sharing one with a third device:

```
code = uint32_be(SHA256("nip-be/pairing-code" || h)[0..4]) mod 1000000
```

The code MUST be displayed as six decimal digits, with leading zeros. Pairing is complete only once both devices have confirmed that the codes match.

## Authentication

Authentication uses a modified NIP-42 flow, each acting as a relay to the other:

- `AUTH` messages travel as control frame `0x02` in both directions, followed by the message as UTF-8 JSON.
- The `relay` tag is `noise://<challenger's static key from this handshake, lowercase hex>`.
- A device answers an `AUTH` event it verifies with `["OK", <event id>, true, ""]` on the same byte, and closes the link instead if the event fails. A device that receives an `OK` with `false` closes the link.
- The exchange runs in this order, which lets the receiver see who the dialer is before disclosing anything:
  1. Dialer: recognition tags, then `["AUTH", <challenge>]`.
  2. Receiver: recognition tags, then `["AUTH", <challenge>]`, without answering the dialer's challenge.
  3. Dialer: `["AUTH", <event>]`.
  4. Receiver: `["AUTH", <event>]`.

A device MUST NOT send on channels 1 and 2 until it has verified the peer's `AUTH` event and sent its own, and MUST close the link if the peer sends on them sooner.

Either device MAY close the link at any point before it sends its own `AUTH` event, for instance on the result of recognition or, for the receiver, on the dialer's pubkey. A receiver MAY hold the link for up to five minutes while it asks its user. The dialer SHOULD keep the link open for that long while heartbeats arrive.

## Sync Protocol

Channel 1 carries [NIP-01](01.md) and [NIP-77](77.md) messages as UTF-8 JSON, one message per frame. Both halves of the relay protocol travel in both directions over it. Overloaded verbs are disambiguated based on the message's shape and subscription id. Subscription ids SHOULD be random enough that the two halves' ids don't collide.

## Blobs

Blobs travel on channel 2, so that their traffic yields to everything else and can move to L2CAP. Each frame on the channel carries one binary message. The `x` field of an `imeta` tag ([NIP-92](92.md)) identifies a blob, and the optional `blake3` field ([NIP-94](94.md)) gives its BLAKE3 root.

### Messages

There are two requests, and each has one kind of response. Every message starts with a 1-byte kind and a 2-byte id. A response's kind is its request's kind with the high bit set, and it repeats the request's id. Integers are big-endian.

| Kind | Message | After the id |
| --- | --- | --- |
| `0x01` | Query | SHA-256, 32 bytes |
| `0x81` | Holding | Status, 1 byte; total, 8 bytes; held, 8 bytes; flags, 1 byte |
| `0x02` | Fetch | SHA-256, 32 bytes; offset, 8 bytes; length, 4 bytes; flags, 1 byte |
| `0x82` | Bytes | Status, 1 byte; then the bytes |

- A **query** asks how much of a blob the peer holds.
- A **holding** answers it with the blob's total length, or zero if the peer does not know it, and the length of the prefix the peer holds. Its flags byte is `1` if the peer can send proofs, and `0` if it cannot.
- A **fetch** asks for `length` bytes starting at `offset`. Its flags byte is `1` to ask for the range with a proof, and `0` to ask for the plain bytes.
- A **bytes** message answers it with up to `length` bytes. It carries fewer if the range runs past what the peer holds, the requester's budget runs out, or the message would exceed the [frame limit](#framing). A fetcher that wants the rest asks again from where the answer ended.

Later versions may define the other bits of a flags byte. Senders set them to zero, and receivers ignore them.

| Status | Means |
| --- | --- |
| `0` | Answered |
| `1` | Not served, whether or not the peer holds the blob |
| `2` | The requester has spent its budget, and SHOULD NOT ask again this session |
| `3` | A proof was asked for and the peer cannot give one |
| `4` | The range is empty or starts past what the peer holds |

So that later versions can extend the protocol, a device MUST ignore a message of a kind it does not recognize, MUST treat a status it does not recognize as `1`, and MUST ignore bytes after the fields it knows.

### Fetching

A fetcher can always fetch a whole blob from a peer that holds all of it, in as many fetches as the answers take, then check it against `x`.

A blob with a `blake3` root can also be fetched in ranges, from several peers if need be, with each range checked as it arrives. The fetcher asks for each range with a proof, and the bytes that come back are the [Bao slice](https://github.com/oconnor663/bao/blob/master/docs/spec.md#slice-format) of the range, in Bao's slice format unchanged: the 8-byte little-endian length, then the parent nodes and chunks that cover the range, in the order of Bao's combined encoding. The fetcher decodes the slice against the `blake3` root and keeps only the bytes the decoder has verified.

A slice omits everything after its range, so the slice of a shorter range is a prefix of the slice of a longer one from the same offset. A proved answer that carries fewer bytes than were asked for is therefore the slice of the shorter range. The fetcher decodes it as the slice of the range it asked for, and keeps the chunks that verify before it ends.

BLAKE3 hashes and creates a proof for a blob in 1 KiB chunks. Ranges fetched with a proof SHOULD therefore start and end on 1 KiB boundaries (except for the last one).

## L2CAP upgrade

GATT carries around 5 to 15 KB/s. An L2CAP connection-oriented channel over the same BLE connection carries several times that, and devices MAY open one for blob traffic. The channel is part of the same session, using the same Noise keys and framing, and it carries only channel 2.

The platform APIs let the GATT peripheral publish a channel and the central connect to it, so the receiver publishes and the dialer connects, whichever side wants the bandwidth. The two arrange this with control frame `0x04`, whose payload starts with one of these steps:

| Step | Sent by | Then | Means |
| --- | --- | --- | --- |
| `0x01` request | Dialer | Nothing | The dialer wants a channel and asks the receiver to publish one |
| `0x02` published | Receiver | PSM, 2 bytes, big-endian | The receiver has published a channel at this PSM |
| `0x03` unavailable | Either | Nothing | This device cannot publish or open a channel, and blob traffic stays on GATT |

The receiver MAY publish without being asked. Devices open the channel without link-layer encryption, which would require bonding, a durable pairing record on both devices. Noise already encrypts the traffic.

On the channel:

- A 2-byte big-endian length precedes each fragment, because L2CAP is a byte stream.
- Only channel 2 fragments travel on it, and a device MUST close the link if it receives any other.
- Fragments are sealed with the odd nonces described under [Encryption](#encryption).
- A frame finishes on the transport it started on, so blob traffic moves to L2CAP only between frames.

A failed upgrade never closes the link. A device that cannot publish, cannot open, or loses an open channel sends `unavailable`, and both devices move blob traffic back to GATT. A fetcher SHOULD then reissue any blob request in flight, because its answer may have been lost with the channel.

## Privacy

- No advertisement, handshake message or recognition list carries anything that outlives the session. Tracking a device takes continuous observation rather than one sighting.
- An active attacker can always complete a handshake. Before anybody authenticates, it receives at most one list of tags it cannot read.
