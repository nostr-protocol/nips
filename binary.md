# NIP-XX

## Binary Messages

`draft` `optional`

Nostr uses websockets but only utilizes websocket text messages, using JSON formatting for structured data. This impedes optimal performance due to the overhead of JSON parsing (usually requiring many small memory allocations), data transformation, as well as not being space efficient.

This NIP proposes an optional additional websocket binary messaging to improve this situation, and also introduces a number of other protocol level improvements, given that the protocol is new and therefore additional changes wont break existing software.

# Backwards Compatibility

The use of binary messaging is added on top of the existing nostr text messaging. Impelementers of this NIP are expected to continue to support all the current nostr text messages, including the ones that have binary alternatives defined in this NIP.

This NIP does not change the event structure, the meanings of events or event kinds.

## Signalling Support

Binary messages are optional. Both sides must signal support before either side should use binary messaging.

Clients connecting to relays signal their support with the `Sec-WebSocket-Protocol` handshake header field which must be set to `nostr-binary`.  Relays signal support also with the `Sec-WebSocket-Protocol` handshake reply header which also must be set to `nostr-binary`.

The protocol then proceeds over WebSocket binary and text messages, with the Relay sending the first message being a `RelayHello` binary message. Clients should wait for the relay's initial message before sending messages (unless the relay did not opt in).

## Binary Messages

NOTE: All multi-byte integers are transferred in LITTLE-endian format. This is opposite of traditional network byte order because the majority of modern processors use little endian.

### Header

Every binary message starts with the same header consisting of:

|offset|size|data                  |
|------|----|----------------------|
|   0  | 1  | opcode               |
|   1  | 1  | RESERVED Padding     |
|   2  | 2  | Sequence Number      |
|   4  | ?  | Opcode specific data |

Sequence numbers should start from 1 and increase by 1 for each message sent. Each side has its own independent sequence number counter used for the sequence numbers in messages it sends, which is not affected by the peer's sequence numbers.

## Opcodes

Opcodes that are not defined or that are inappropriate should be responded to with the error opcode
and include the sequence number of the message that caused the error.

This NIP provides replacements for AUTH (both directions), EVENT (both directions) and adds RelayHello, RelayError and ClientError messages.

Existing nostr messages of REQ, CLOSE, OK, EOSE, CLOSED and NOTICE should continue to be used with websocket text messages as defined in NIP-01 and are not replaced by this NIP.

The following opcodes are currently defined:

### From Relay to Client

| Opcode       | Integer |
| ------------ | ------- |
| RelayHello   | 128     |
| RelayEvent   | 129     |
| RelayError   | 130     |


### From Client to Relay

| Opcode        | Integer |
| ------------- | ------- |
| ClientAuth    | 1       |
| ClientEvent   | 2       |
| ClientError   | 3       |


## Messages

### RelayHello

The following is the opcode specific data for RelayHello (offsets do not count the header)

|offset|size|data                      |
|------|----|--------------------------|
|   0  | 3  | Feature flags            |
|   3  | 1  | Length of AUTH challenge |
|   4  | ?  | AUTH challenge (utf-8)   |

Relays that do not authenticate users at all can set Auth Len to 0.  If a relay may authenticate a user at any point in the connection, the relay MUST send the challenge in their RelayHello message. This allows clients to choose if and when to authenticate.

### RelayEvent

The following is the opcode specific data for RelayEvent (offsets do not count the header)

|offset|size|data                      |
|------|----|--------------------------|
|   0  | ?  | Binary event             |

### RelayError

The following is the opcode specific data for RelayError (offsets do not count the header)

This applies only to errors caused by previous binary messages which have sequence numbers. Otherwise, existing TEXT messages of OK or CLOSED should be used containing errors as defined in NIP-01.

|offset|size|data                      |
|------|----|--------------------------|
|   0  | 2  | Peer sequence number     |
|   2  | 4  | Length of error          |
|   4  | ?  | Error (utf-8)            |

This should reference the sequence number of the message that caused the error, or 0 if none.

### ClientAuth

The following is the opcode specific data for ClientAuth (offsets do not count the header)

|offset|size|data                      |
|------|----|--------------------------|
|   0  | ?  | Binary AUTH event        |

### ClientEvent

The following is the opcode specific data for ClientEvent (offsets do not count the header)

|offset|size|data                      |
|------|----|--------------------------|
|   0  | ?  | Binary event             |

### ClientError

The following is the opcode specific data for ClientError (offsets do not count the header)

This applies only to errors caused by previous binary messages which have sequence numbers. Otherwise, existing TEXT messages of OK or CLOSED should be used containing errors as defined in NIP-01.

|offset|size|data                      |
|------|----|--------------------------|
|   0  | 2  | Peer sequence number     |
|   2  | 4  | Length of error          |
|   4  | ?  | Error (utf-8)            |

This should reference the sequence number of the message that caused the error, or 0 if none.

## Feature Flags

Feature flags are present in `RelayHello` and `ClientHello` messages.

The following feature flags are defined:  None.


## Binary Event Structure

|offset |size|data                                                 |
|-------|----|-----------------------------------------------------|
|   0   | 64 | `sig` of the event (binary, NOT hex)                |
|   64  | 32 | `id` of the event (binary, NOT hex)                 |
|   96  | 32 | `pubkey` of the event (binary, NOT hex, NOT npub)   |
|  128  |  8 | `created_at` (binary, not text digits)              |
|  136  |  2 | `kind` (binary, not text digits)                    |
|  138  |  2 | length of tags section, T                           |
|  140  |  4 | length of the content section, C                    |
|  144  |  T | Tags Section (defined below)                        |
| 144+T |  C | Content (utf-8)                                     |


This structure was designed with the following in mind

- being compact
- data alignment
- signed data being contiguous, opening the opportunity for future alternate signature schemes that dont require data copying
- efficient skipping past an event
- efficient skipping past a tag if the first string does not match what you are looking for
- reasonable limits: up to 64KiB tags section, up to 4GiB content.


### Tags section

NOTE: The length was already specified in the event structure at offset 138.

|offset       |size|data                                                 |
|-------------|----|-----------------------------------------------------|
|   0         | 2  | count of tags (each tag being an array of strings)  |
|   2 + 2*i   | 2  | offset of the i-th tag                              |

Tags then start at offset 2 + 2*numtags. The format of a tag is defined below. Tags should be packed tightly with no space between them.


### Tag data

Tag data is stored as follows:

|offset       |size|data                                                 |
|-------------|----|-----------------------------------------------------|
|  0          | 2  | count of the number of strings in the tag           |
|  ?          | ?  | Repeat for each string                              |
|             |    |   1. 2-byte length of the string                    |
|             |    |   2. The string itself                              |
