NIP-47
======

Nostr Wallet Connect (NWC)
--------------------

`draft` `optional`

## Rationale

This NIP describes a way for clients to access a remote lightning wallet through a standardized protocol. Custodians may implement this, or the user may run a bridge that bridges their wallet/node and the Nostr Wallet Connect protocol.

This NIP defines the core Nostr Wallet Connect protocol. More granular authorization models and extensions for advanced wallet functionality may be defined in separate specifications in the NWC repository at `https://github.com/nostr-wallet-connect/nwc`.

## Terms

* **client**: Nostr app on any platform that wants to interact with a lightning wallet.
* **user**: The person using the **client**, and wants to connect their wallet to their **client**.
* **wallet service**: Nostr app that typically runs on an always-on computer (eg. in the cloud or on a Raspberry Pi).  This app has access to the APIs of the wallets it serves.

## Theory of Operation

Fundamentally NWC is communication between a **client** and **wallet service** by the means of E2E-encrypted direct messages over a nostr relay. The relay knows the kinds and tags of notes, but not the content of the encrypted payloads. The **user**'s identity key is not used to avoid linking payment activity to the user. Ideally unique keys are used for each individual connection.

 1. **Users** who wish to use this NIP to allow **client(s)** to interact with their wallet must first acquire a special "connection" URI from their NIP-47 compliant wallet application.  The wallet application may provide this URI using a QR screen, or a pasteable string, or some other means. 
 
 2. The **user** should then copy this URI into their **client(s)** by pasting, or scanning the QR, etc.  The **client(s)** should save this URI and use it later whenever the **user** (or the **client** on the user's behalf) wants to interact with the wallet.  The **client** should then request an `info` (13194) event from the relay(s) specified in the URI.  The **wallet service** will have sent that event to those relays earlier, and the relays will hold it as a replaceable event.  
 
 3. When the **user** initiates a payment their nostr **client** create a `pay_invoice` request, encrypts it using a token from the URI, and sends it (kind 23194) to the relay(s) specified in the connection URI.  The **wallet service** will be listening on those relays and will decrypt the request and then contact the **user's** wallet application to send the payment.  The **wallet service** will know how to talk to the wallet application because the connection URI specified relay(s) that have access to the wallet app API.  
 
 4. Once the payment is complete the **wallet service** will send an encrypted `response` (kind 23195) to the **user** over the relay(s) in the URI.
 
 5. Optional extension specifications may define additional wallet-to-client events.

## Events

There are three core event kinds:

- `NIP-47 info event`: 13194
- `NIP-47 request`: 23194
- `NIP-47 response`: 23195

### Info Event

The info event should be a replaceable event that is published by the **wallet service** on the relay to indicate which capabilities it supports.

The content should be a plaintext string with the supported capabilities space-separated, eg. `pay_invoice get_balance`.

Any additional methods supported through optional NWC extensions advertised in the `extensions` tag SHOULD also be included in the content of the info event.

If the **wallet service** supports optional NWC extensions, the info event SHOULD contain an `extensions` tag with the supported extension identifiers space-separated, eg. `02 03 04`.

It should also contain supported encryption modes as described in the [Encryption](#encryption) section. For example:

```yaml
{
    "kind": 13194,
    "tags": [
        ["encryption", "nip44_v2 nip04"], // List of supported encryption schemes as described in the Encryption section.
        ["extensions", "02 03 04"]
        // ...
    ],
    "content": "pay_invoice get_balance make_invoice lookup_invoice get_info",
    // ...
}
```

### Request and Response Events

Both the request and response events SHOULD contain one `p` tag, containing the public key of the **wallet service** if this is a request, and the public key of the **client** if this is a response. The response event SHOULD contain an `e` tag with the id of the request event it is responding to.
Optionally, a request can have an `expiration` tag that has a unix timestamp in seconds. If the request is received after this timestamp, it should be ignored.

The content of requests and responses is encrypted with [NIP44](44.md), and is a JSON-RPCish object with a semi-fixed structure.

**Important note for backwards-compatibility:** The initial version of the protocol used [NIP04](04.md). If a **wallet service** or client app does not include the `encryption` tag in the
`info` or request events, it should be assumed that the connection is using NIP04 for encryption. See the [Encryption](#encryption) section for more information.

Example request:

```js
{
    "kind" 23194,
    "tags": [
        ["encryption", "nip44_v2"],
        ["p", "03..." ] // public key of the wallet service.
        // ...
    ],
    "content": nip44_encrypt({ // Encryption type corresponds to the `encryption` tag.
        "method": "pay_invoice", // method, string
        "params": { // params, object
            "invoice": "lnbc50n1..." // command-related data
        }
    }),
}
```

Example response:

```js
{
    "kind" 23195,
    "tags": [
        ["p", "03..." ] // public key of the requesting client app
        ["e", "1234"] // id of the request event this is responding to
        // ...
    ],
    "content": nip44_encrypt({ // Encrypted using the scheme requested by the client.
        "result_type": "pay_invoice", //indicates the structure of the result field
        "error": { //object, non-null in case of error
            "code": "UNAUTHORIZED", //string error code, see below
            "message": "human readable error message"
        },
        "result": { // result, object. null in case of error.
            "preimage": "0123456789abcdef..." // command-related data
        }
    })
    // ...
}
```

The `result_type` field MUST contain the name of the method that this event is responding to.
The `error` field MUST contain a `message` field with a human readable error message and a `code` field with the error code if the command was not successful.
If the command was successful, the `error` field must be null.

### Error codes
- `RATE_LIMITED`: The client is sending commands too fast. It should retry in a few seconds.
- `NOT_IMPLEMENTED`: The command is not known or is intentionally not implemented.
- `INSUFFICIENT_BALANCE`: The wallet does not have enough funds to cover a fee reserve or the payment amount.
- `QUOTA_EXCEEDED`: The wallet has exceeded its spending quota.
- `RESTRICTED`: This public key is not allowed to do this operation.
- `UNAUTHORIZED`: This public key has no wallet connected.
- `INTERNAL`: An internal error.
- `UNSUPPORTED_ENCRYPTION`: The encryption type of the request is not supported by the wallet service.
- `OTHER`: Other error.

## Nostr Wallet Connect URI

Communication between the **client** and **wallet service** requires two keys in order to encrypt and decrypt messages. The connection URI includes the secret key of the **client** and only the public key of the **wallet service**.

The **client** discovers **wallet service** by scanning a QR code, handling a deeplink or pasting in a URI.

The **wallet service** generates this connection URI with protocol `nostr+walletconnect://` and base path its 32-byte hex-encoded `pubkey`, which SHOULD be unique per client connection.

The connection URI contains the following query string parameters:

- `relay` Required. URL of the relay where the **wallet service** is connected and will be listening for events. May be more than one.
- `secret` Required. 32-byte randomly generated hex encoded string. The **client** MUST use this to sign events and encrypt payloads when communicating with the **wallet service**. The **wallet service** MUST use the corresponding public key of this secret to communicate with the **client**.
    - Authorization does not require passing keys back and forth.
    - The user can have different keys for different applications. Keys can be revoked and created at will and have arbitrary constraints (eg. budgets).
    - The key is harder to leak since it is not shown to the user and backed up.
    - It improves privacy because the user's main key would not be linked to their payments.
- `lud16` Recommended. A lightning address that clients can use to automatically setup the `lud16` field on the user's profile if they have none configured.

The **client** should then store this connection and use it when the user wants to perform actions like paying an invoice. Due to this NIP using ephemeral events, it is recommended to pick relays that do not close connections on inactivity to not drop events, and ideally retain the events until they are either consumed or become stale.

- When the **client** sends or receives a message it will use the `secret` from the connection URI and **wallet service**'s `pubkey` to encrypt or decrypt.
- When the **wallet service** sends or receives a message it will use its own secret and the corresponding pubkey of the **client's** `secret` to encrypt or decrypt. The **wallet service** SHOULD NOT store the secret it generates for the client and MUST NOT rely on the knowing the **client** secret for general operation.

### Example connection string
```sh
nostr+walletconnect://b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4?relay=wss%3A%2F%2Frelay.damus.io&secret=71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c
```

## Commands

### `pay_invoice`

Description: Requests payment of an invoice.

Request:
```yaml
{
    "method": "pay_invoice",
    "params": {
        "invoice": "lnbc50n1...", // bolt11 invoice
        "amount": 123, // invoice amount in msats, optional
        "metadata": {} // generic metadata that can be used to add things like zap/boostagram details for a payer name/comment/etc, optional
    }
}
```

Response:
```yaml
{
    "result_type": "pay_invoice",
    "result": {
        "preimage": "0123456789abcdef...", // preimage of the payment
        "fees_paid": 123, // value in msats, optional
    }
}
```

Errors:
- `PAYMENT_FAILED`: The payment failed. This may be due to a timeout, exhausting all routes, insufficient capacity or similar.

### `make_invoice`

Request:
```yaml
{
    "method": "make_invoice",
    "params": {
        "amount": 123, // value in msats
        "description": "string", // invoice's description, optional
        "description_hash": "string", // invoice's description hash, optional
        "expiry": 213, // expiry in seconds from time invoice is created, optional
        "metadata": {} // generic metadata that can be used to add things like zap/boostagram details for a payer name/comment/etc, optional
    }
}
```

Response:
```yaml
{
    "result_type": "make_invoice",
    "result": {
        "type": "incoming", // "incoming" for invoices, "outgoing" for payments
        "state": "pending", // optional
        "invoice": "string", // encoded invoice, optional
        "description": "string", // invoice's description, optional
        "description_hash": "string", // invoice's description hash, optional
        "preimage": "string", // payment's preimage, optional if unpaid
        "payment_hash": "string", // Payment hash for the payment
        "amount": 123, // value in msats
        "fees_paid": 123, // value in msats
        "created_at": unixtimestamp, // invoice/payment creation time
        "expires_at": unixtimestamp, // invoice expiration time, optional if not applicable
        "metadata": {} // generic metadata that can be used to add things like zap/boostagram details for a payer name/comment/etc.
    }
}
```

### `lookup_invoice`

Request:
```yaml
{
    "method": "lookup_invoice",
    "params": {
        "payment_hash": "31afdf1..", // payment hash of the invoice, one of payment_hash or invoice is required
        "invoice": "lnbc50n1..." // invoice to lookup
    }
}
```

Response:
```yaml
{
    "result_type": "lookup_invoice",
    "result": {
        "type": "incoming", // "incoming" for invoices, "outgoing" for payments
        "state": "pending", // can be "pending", "settled", "accepted" (for hold invoices), "expired" (for invoices) or "failed" (for payments), optional
        "invoice": "string", // encoded invoice, optional
        "description": "string", // invoice's description, optional
        "description_hash": "string", // invoice's description hash, optional
        "preimage": "string", // payment's preimage, optional if unpaid
        "payment_hash": "string", // Payment hash for the payment
        "amount": 123, // value in msats
        "fees_paid": 123, // value in msats
        "created_at": unixtimestamp, // invoice/payment creation time
        "expires_at": unixtimestamp, // invoice expiration time, optional if not applicable
        "settled_at": unixtimestamp, // invoice/payment settlement time, optional if unpaid
        "metadata": {} // generic metadata that can be used to add things like zap/boostagram details for a payer name/comment/etc.
    }
}
```

Errors:
- `NOT_FOUND`: The invoice could not be found by the given parameters.

### `get_balance`

Request:
```yaml
{
    "method": "get_balance",
    "params": {}
}
```

Response:
```yaml
{
    "result_type": "get_balance",
    "result": {
        "balance": 10000, // user's balance in msats
    }
}
```

### `get_info`

Request:
```yaml
{
    "method": "get_info",
    "params": {}
}
```

Response:
```yaml
{
    "result_type": "get_info",
    "result": {
            "alias": "string",
            "color": "hex string",
            "pubkey": "hex string",
            "network": "string", // mainnet, testnet, signet, or regtest
            "block_height": 1,
            "block_hash": "hex string",
            "methods": ["pay_invoice", "get_balance", "make_invoice", "lookup_invoice", "get_info"], // list of supported methods for this connection
            "extensions": ["02", "03", "04", "06", "07", "08"], // list of supported optional NWC extension specs for this connection, optional
    }
}
```

## Extensions

This NIP defines the core protocol and a small common command set. Additional methods, metadata conventions, pairing flows, and more granular authorization behavior MAY be defined by optional NWC extension specifications.

Additional optional NWC specifications are maintained in the dedicated NWC repository:

- `https://github.com/nostr-wallet-connect/nwc`

That repository reserves `01.md` for the NWC core specification corresponding to this simplified NIP-47, and defines optional features in separate specs starting with `02.md`.

## Example pay invoice flow

0. The user scans the QR code generated by the **wallet service** with their **client** application, they follow a `nostr+walletconnect://` deeplink or configure the connection details manually.
1. **client** sends an event to the **wallet service** with kind `23194`. The content is a `pay_invoice` request. The private key is the secret from the connection string above.
2. **wallet service** verifies that the author's key is authorized to perform the payment, decrypts the payload and sends the payment.
3. **wallet service** responds to the event by sending an event with kind `23195` and content being a response either containing an error message or a preimage.

## Encryption

The initial version of NWC used [NIP-04](04.md) for encryption which has been deprecated and replaced by [NIP-44](44.md). NIP-44 should always be preferred for encryption, but there may be legacy cases
where the **wallet service** or **client** has not yet migrated to NIP-44. The **wallet service** and **client** should negotiate the encryption method to use based on the `encryption` tag in the `info` event.

The encryption tag can contain either `nip44_v2` or `nip04`. The absence of this tag implies that the wallet only supports `nip04`.

| Encryption code | Use                  | Notes                                                   |
|-----------------|----------------------|---------------------------------------------------------|
| `nip44_v2`      | NIP-44               | Required                                                |
| `nip04`         | NIP-04               | Deprecated and only here for backward compatibility     |
| `<not present>` | NIP-04               | Deprecated and only here for backward compatibility     |

The negotiation works as follows.

1. The **wallet service** includes an `encryption` tag in the `info` event. This tag contains a space-separated list of encryption schemes that the **wallet service** supports (eg. `nip44_v2 nip04`)
2. The **client application** includes an `encryption` tag in each request event. This tag contains the encryption scheme which should be used for the request. The **client application** should always prefer nip44 if supported by the **wallet service**.

When a **client application** establishes a connection, it should read the info event and look for the `encryption` tag.

**Absence of this tag implies that the wallet only supports nip04.**

If the `encryption` tag is present, the **client application** will choose optimal encryption supported by both itself, and the **wallet service**, which should always be nip44 if possible.

### Request events

When a **client application** sends a request event, it should include a `encryption` tag with the encryption scheme it is using. The scheme MUST be supported by the **wallet service** as indicated by the info event.
For example, if the client application supports nip44, the request event might look like:

```yaml
{
    "kind": 23194,
    "tags": [
        ["encryption", "nip44_v2"],
        // ...
    ],
    // ...
}
```

If the **wallet service** does not support the specified encryption scheme, it will return an `UNSUPPORTED_ENCRYPTION` error. Absence of the `encryption` tag indicates use of nip04 for encryption.

## Using a dedicated relay
This NIP does not specify any requirements on the type of relays used. However, if the user is using a custodial service it might make sense to use a relay that is hosted by the custodial service. The relay may then enforce authentication to prevent metadata leaks. Not depending on a 3rd party relay would also improve reliability in this case.

## Appendix

### Example NIP-47 info event

```yaml
{
  "id": "df467db0a9f9ec77ffe6f561811714ccaa2e26051c20f58f33c3d66d6c2b4d1c",
  "pubkey": "c04ccd5c82fc1ea3499b9c6a5c0a7ab627fbe00a0116110d4c750faeaecba1e2",
  "created_at": 1713883677,
  "kind": 13194,
  "tags": [
    [ "encryption", "nip44_v2 nip04" ],
    [ "extensions", "02 03 04 06 07 08" ]
  ],
  "content": "pay_invoice get_balance get_info make_invoice lookup_invoice",
  "sig": "31f57b369459b5306a5353aa9e03be7fbde169bc881c3233625605dd12f53548179def16b9fe1137e6465d7e4d5bb27ce81fd6e75908c46b06269f4233c845d8"
}
```
