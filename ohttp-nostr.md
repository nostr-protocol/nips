# NIP-X -- Nostr Relays as OHTTP Targets

`draft` `optional`

This NIP defines how a Nostr relay can expose an **Oblivious HTTP (OHTTP) target** interface so that clients can send Nostr requests through an **OHTTP relay** without revealing their network identity to the target relay. Each request is encrypted with an ephemeral HPKE key pair and routed via an OHTTP relay as per RFC 9458. The target relay decrypts the payload, processes the encapsulated request, and returns a response; the OHTTP relay cannot read contents, and the target Nostr relay cannot see client metadata.

Critical note: this design relies on two distinct roles (OHTTP relay and OHTTP target). If a single operator controls both and colludes, client unlinkability collapses (a known limitation of OHTTP). See RFC 9458 for the trust split and limitations. ([IETF](https://www.ietf.org/rfc/rfc9458.html), [RFC Editor](https://www.rfc-editor.org/info/rfc9458))

## Motivation

Nostr today relies on persistent WebSocket connections that inherently expose a client’s IP address to the relay. This creates a metadata-leakage channel: even if messages are encrypted, relays can trivially correlate client activity over time and build behavioral profiles. While users can route connections through Tor or VPNs, these options add operational complexity and do not guarantee reliable performance.

Oblivious HTTP (OHTTP) provides a standardized way to separate transport metadata from application payloads. By routing requests through an OHTTP relay, clients conceal their network identity from the target relay while preserving end-to-end confidentiality and integrity of their Nostr events. This introduces per-request unlinkability without requiring heavy overlay networks.

The design keeps protocol churn minimal. Clients and relays continue to use NIP-01 semantics, but transport shifts from a connection-oriented WebSocket to stateless OHTTP messages. Deployment is incremental: relays can expose OHTTP endpoints alongside WebSocket interfaces, advertising support in NIP-11. Clients that do not adopt OHTTP remain fully interoperable.

## Specification / Protocol Flow

Note: This NIP uses "relay" where RFC 9540 uses "gateway." Relays MAY deploy the OHTTP gateway separately from the OHTTP resource if it suites their setup; however, this NIP and the reference code below assumes the OHTTP gateway is deployed on the same interface as the HTTP interface.

### NIP-11 advertisement and OHTTP key configuration

Relays MUST support fetching [RFC 9540 Key Configuration Fetching](https://www.rfc-editor.org/rfc/rfc9540.html#name-key-configuration-fetching) via GET request. RFC 9540 defines the gateway location as `/.well-known/ohttp-gateway`. RFC9540 also defines the key configuration encoding.

Relays that implement this NIP MUST advertise the following new fields in their NIP-11 document:

```json
{  
  "ohttp": {  
    "max_request_bytes": 65536,  
    "max_response_bytes": 1048576,
    // Key configuration is optional, but if provided, it MUST be a hexified encoding of the key configuration.
    "keyconfig": "01001604d51a22bc641d1ff95729b815cd036f93d4eff9c76fa3c867000e4e05e1982e849b679050c981b9cea485adb2a2f1cfc905393345cf1364d8456e3aa3abc338da000400010003",
  }
}
```

Relays and clients MUST at minimum support the following configurations:

* Key Encapsulation Mechanism (KEM): Secp256k1-HKDF-SHA256
* Key Derivation Function (KDF): HKDF-SHA256
* Authenticated Encryption with Associated Data (AEAD): ChaCha20Poly1305

The following configurations were chosen because most of the clients and relays are already using the same cryptographic primitives.

Relays MAY advertise their key configuration in the NIP-11 document to reduce round trips for the clients. If relays choose to do so, the relay MUST provide a hexified encoding of the key configuration.

### Retrieve key configuration

Clients MUST retrieve the OHTTP [key configuration](https://www.ietf.org/rfc/rfc9458.html#section-3.1) from the relay using RFC 9540 at the `/.well-known/ohttp-gateway` endpoint via a GET request. Clients MUST ensure the key fetching request is secure and authenticated. If the relay advertises the configuration in its NIP-11 document, clients MAY use that as an alternative bootstrap source but doing so may reveal the clients network identity.

The key configuration defines the HPKE parameters required to establish secure and authenticated communication with the target relay. When fetching the configuration, clients SHOULD route the request through an OHTTP relay to avoid exposing their network identity.

Once the configuration is retrieved, the client encapsulates a NIP-1 message inside a Binary HTTP (BHTTP) request and then applies HPKE to form the OHTTP request per RFC 9458.

* EVENT messages:  OHTTP encapsulated `POST` request. The body MUST contain the event as a JSON string.
* REQ messages: OHTTP encapsulated `GET` request. The query string MUST carry the NIP-1 filter, encoded either as a hexified JSON string or URL-encoded JSON (final encoding is TBD). // TODO decide on the encoding // TODO: decide on the query param. REQ messages MUST NOT include a subscription ID, as this leaks linkable metadata.

In order to preserve per-request unlinkability, clients MUST use a fresh ephemeral HPKE key pair per request. Furthermore, clients MUST NOT re-send the same encapsulated request to the same relay.

### Endpoints

#### Target endpoints

Clients that receive a `404 Not Found` response SHOULD interpret it as an indication that the relay does not support OHTTP. In this case, clients SHOULD fall back to a standard WebSocket connection if they wish to interact with the relay.

* `POST /.well-known/ohttp-gateway` - Submit an OHTTP-encapsulated event.

The HTTP body MUST be a binary payload as defined in RFC 9458. The request MUST include a `Content-Type` header with the value `message/ohttp-req`. Relays MUST decapsulate the payload using their advertised key configuration to obtain the inner BHTTP request.

HTTP Responses MUST only include the encapsulated BHTTP response and they MUST return `200 OK` regardless of the inner BHTTP response.

#### BHTTP inner requests

After decapsulation, relays parse the inner BHTTP request. Two methods are supported. BHTTP responses MAY include status codes other than `200 OK`.
Relays MUST enforce the request and response size limits advertised in NIP-11. All responses MUST be re-encapsulated and returned to the client using the client's reply key.

##### `POST`

The request body MUST contain a single NIP-1 `EVENT` message.

* If valid, the relay MUST return an empty `202 Accepted` response.
* If malformed or invalid for any other reason, the relay MUST return `400 Bad Request`.
* For server-side errors, the relay MUST return `500 Internal Server Error`.

##### `GET`

The request query parameter MUST contain a single NIP-1 `REQ` subscription filter message.

* A filter MUST be included in the query string with the key `filter`. // TODO: decide on the encoding
* The encoding format for this filter (hexified JSON vs. URL-encoded JSON) remains an open question.

Relays MUST return a `200 OK` response with the inner BHTTP response if the request is valid. The response MUST be formatted as new line delimited JSON. All available events within the event scope (defined below) MUST be returned in the response.

### Key configuration lifetime

Relays SHOULD rotate their OHTTP key configurations periodically to limit replay attacks and reduce the impact of key compromise. Key rotation is signaled via the HTTP caching headers (Cache-Control, Expires, ETag) on the response to the key configuration fetch defined in RFC 9540.

### Backwards Compatibility

Relays continue to support NIP-01 over WebSockets. Clients that do not implement OHTTP interoperate unchanged. The OHTTP interface introduces new endpoints; no changes to NIP-01 message schemas.

### Event Scope

This NIP defines a client-server interaction model and is scoped to the following event types only:

* [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) - Encrypted DMs
* [NIP-57](https://github.com/nostr-protocol/nips/blob/master/57.md) - Zaps
* [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) - Gift Wraps

Support for additional NIPs may be defined in future revisions but is out of scope for this specification.

Relays that receive an event outside this scope MUST return a `400 Bad Request` status in the encapsulated BHTTP response.

## Open Questions

* Streaming: Whether to standardize a chunked/streaming profile once IETF work stabilizes. ([ietf-wg-ohai.github.io](https://ietf-wg-ohai.github.io/draft-ohai-chunked-ohttp/draft-ietf-ohai-chunked-ohttp.html)). Subscriptions: Avoid long-lived state through OHTTP. Use poll+cursor now; consider chunked OHTTP later when code and standards stabilize.

* Denial of service protection: Standardize a NIP for token issuance/redemption to control abuse while preserving unlinkability.

## Reference Implementation

A client reference can be found [here](https://github.com/arminsabouri/nostr/blob/ohttp-example/crates/nostr-sdk/examples/ohttp.rs).
A nostr relay reference can be found [here](https://github.com/arminsabouri/nostr-rs-relay/tree/ohttp-target).
