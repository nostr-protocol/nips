NIP-XX
======

Nostr Relay Connect (NRC)
-------------------------

`draft` `optional`

## Abstract

This NIP defines a protocol for accessing a Nostr relay through encrypted tunneling via a public rendezvous relay. It enables access to relays behind NAT, firewalls, or on devices without public IP addresses, and allows clients to expose their internal storage as a relay endpoint.

## Motivation

Users increasingly want to:
- Run personal relays for private data synchronization
- Maintain full control over event storage
- Build offline-first applications with sync capability
- **Use their client's local storage as a sync target for other devices**

However, these relays and client storage systems often exist:
- Behind NAT without public IP addresses
- On mobile devices
- On home servers without port forwarding capability
- Inside browser sandboxes (IndexedDB, localStorage)

NRC solves this by tunneling standard Nostr protocol messages through encrypted events on a public relay, similar to how [NIP-47](47.md) tunnels wallet operations.

### The Client Bridge Pattern

A key use case for NRC is enabling **any Nostr client to act as a relay bridge**. A client can expose its internal event storage (IndexedDB, SQLite, etc.) to remote clients by:

1. Running an NRC listener that subscribes to request events on a rendezvous relay
2. Processing incoming NIP-01 queries against its local storage
3. Returning results through encrypted response events

This means a mobile app, desktop client, or browser extension can serve as a personal relay for the user's other devices, with full NIP-01 query semantics, without requiring any server infrastructure.

## Specification

### Event Kinds

| Kind  | Name         | Description                              |
|-------|--------------|------------------------------------------|
| 24891 | NRC Request  | Ephemeral, client-to-relay wrapped message  |
| 24892 | NRC Response | Ephemeral, relay-to-client wrapped message  |

### Connection URI

The connection URI format is:

```
nostr+relayconnect://<relay-pubkey>?relay=<rendezvous-relay>&secret=<client-secret>[&name=<device-name>]
```

Parameters:
- `relay-pubkey`: The public key of the relay/bridge (64-char hex)
- `relay`: The WebSocket URL of the rendezvous relay (URL-encoded)
- `secret`: A 32-byte hex-encoded secret for key derivation
- `name` (optional): Human-readable device identifier

Example:
```
nostr+relayconnect://a1b2c3d4e5f6...?relay=wss%3A%2F%2Frelay.example.com&secret=0123456789abcdef...&name=phone
```

### Message Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────┐     ┌─────────────┐
│ Client  │────▶│ Rendezvous  │────▶│ Bridge  │────▶│   Storage   │
│         │◀────│   Relay     │◀────│         │◀────│  (relay/db) │
└─────────┘     └─────────────┘     └─────────┘     └─────────────┘
     │                                    │
     └────────── NIP-44 encrypted ────────┘
```

1. **Client** wraps Nostr messages in kind 24891 events, encrypts content with NIP-44
2. **Rendezvous relay** forwards events based on `p` tags (cannot decrypt content)
3. **Bridge** decrypts and processes the message against local storage
4. **Bridge** wraps response in kind 24892, encrypts, and publishes
5. **Client** receives kind 24892 events and decrypts the response

The bridge can be:
- A dedicated relay server with NRC support
- A client application exposing its local event database
- Any software implementing NIP-01 query semantics

### Request Event (Kind 24891)

```json
{
  "kind": 24891,
  "content": "<nip44_encrypted_json>",
  "tags": [
    ["p", "<relay_pubkey>"],
    ["encryption", "nip44"],
    ["session", "<session_id>"]
  ],
  "pubkey": "<client_pubkey>",
  "created_at": <unix_timestamp>,
  "sig": "<signature>"
}
```

The encrypted content structure:
```json
{
  "type": "EVENT" | "REQ" | "CLOSE" | "AUTH" | "COUNT",
  "payload": <standard_nostr_message_array>
}
```

Where `payload` contains the standard Nostr message:
- `["EVENT", <event_object>]`
- `["REQ", "<sub_id>", <filter1>, <filter2>, ...]`
- `["CLOSE", "<sub_id>"]`
- `["AUTH", <auth_event>]`
- `["COUNT", "<sub_id>", <filter1>, ...]`

### Response Event (Kind 24892)

```json
{
  "kind": 24892,
  "content": "<nip44_encrypted_json>",
  "tags": [
    ["p", "<client_pubkey>"],
    ["encryption", "nip44"],
    ["session", "<session_id>"],
    ["e", "<request_event_id>"]
  ],
  "pubkey": "<relay_pubkey>",
  "created_at": <unix_timestamp>,
  "sig": "<signature>"
}
```

The encrypted content structure:
```json
{
  "type": "EVENT" | "OK" | "EOSE" | "NOTICE" | "CLOSED" | "COUNT" | "AUTH",
  "payload": <standard_nostr_response_array>
}
```

Response payloads follow standard relay responses:
- `["EVENT", "<sub_id>", <event_object>]`
- `["OK", "<event_id>", <success_bool>, "<message>"]`
- `["EOSE", "<sub_id>"]`
- `["NOTICE", "<message>"]`
- `["CLOSED", "<sub_id>", "<message>"]`
- `["COUNT", "<sub_id>", {"count": <n>}]`
- `["AUTH", "<challenge>"]`

### Session Management

The `session` tag groups related request/response events, enabling:
- Multiple concurrent subscriptions through a single tunnel
- Correlation of responses to requests
- Session state tracking on the bridge

Session IDs SHOULD be randomly generated UUIDs or 32-byte hex strings.

### Encryption

All content is encrypted using [NIP-44](44.md).

The conversation key is derived from ECDH between the client's secret-derived keypair and the relay's public key:
1. Client derives a keypair from the `secret` parameter in the URI
2. Both parties compute the shared secret using their private key and the other's public key
3. This shared secret is used as the NIP-44 conversation key

### Message Segmentation

Some responses exceed typical relay message size limits (commonly 64KB). NRC supports message segmentation for large payloads.

#### When to Chunk

Senders SHOULD chunk messages when the JSON-serialized response exceeds 40KB, accounting for:
- NIP-44 encryption overhead
- Base64 encoding expansion (~33%)
- Event wrapper overhead

#### Chunk Format

Large responses are split into multiple CHUNK messages:

```json
{
  "type": "CHUNK",
  "payload": [{
    "type": "CHUNK",
    "messageId": "<uuid>",
    "index": 0,
    "total": 3,
    "data": "<base64_encoded_chunk>"
  }]
}
```

Fields:
- `messageId`: Unique identifier (UUID) to correlate chunks
- `index`: Zero-based chunk index
- `total`: Total number of chunks
- `data`: Base64-encoded segment of the original message

#### Reassembly

1. Buffer chunks by `messageId`
2. Track received chunks by `index`
3. When all chunks are received (`chunks.size === total`):
   - Concatenate chunk data in index order
   - Base64 decode
   - Parse as JSON to recover the original response
4. Discard incomplete buffers after 60 seconds

### Authentication

1. Client derives a keypair from the `secret` parameter in the URI
2. Client signs all request events with this derived key
3. Bridge verifies the client's pubkey is in its authorized list
4. The conversation key provides implicit authentication

### Access Revocation

Remove the client's derived pubkey from the authorized list. The client will no longer be able to decrypt responses.

## Security Considerations

1. **End-to-end encryption**: The rendezvous relay cannot read tunneled messages
2. **No perfect forward secrecy**: If secret is compromised, past messages can be decrypted
3. **Rate limiting**: Bridges SHOULD enforce rate limits to prevent abuse
4. **Session expiry**: Sessions SHOULD timeout after a period of inactivity (recommended: 30 minutes)
5. **TLS**: The rendezvous relay connection SHOULD use TLS (wss://)
6. **Secret storage**: Clients SHOULD store connection URIs securely

## Client Bridge Implementation

Clients implementing an NRC bridge to expose their local storage should:

1. **Subscribe** to kind 24891 events with `#p` filter for the bridge's pubkey on the rendezvous relay
2. **Verify** client authorization by checking the request event's pubkey
3. **Decrypt** content using NIP-44 with the derived conversation key
4. **Process** the unwrapped message using standard NIP-01 query logic:
   - `REQ`: Query local storage with the provided filters, return matching events
   - `EVENT`: Store the event in local storage, return OK
   - `CLOSE`: Remove the subscription
   - `COUNT`: Return count of matching events (optional)
5. **Wrap** all responses in kind 24892 events
6. **Encrypt** and publish to the rendezvous relay

This allows any Nostr client with local storage to serve as a personal relay endpoint without running separate server infrastructure.

### Example: Browser Client as Bridge

A browser-based Nostr client using IndexedDB can:

```javascript
// Listen for NRC requests
const sub = relay.subscribe([
  { kinds: [24891], "#p": [bridgePubkey] }
])

sub.on('event', async (event) => {
  // Decrypt and parse request
  const request = JSON.parse(
    await nip44.decrypt(conversationKey, event.content)
  )

  // Process against IndexedDB
  if (request.type === 'REQ') {
    const events = await queryIndexedDB(request.payload[1])
    for (const ev of events) {
      await sendResponse(event, { type: 'EVENT', payload: ['EVENT', subId, ev] })
    }
    await sendResponse(event, { type: 'EOSE', payload: ['EOSE', subId] })
  }
})
```

## See Also

- [NIP-01: Basic protocol flow](01.md)
- [NIP-44: Encrypted Payloads](44.md)
- [NIP-47: Nostr Wallet Connect](47.md)
