NIP-47
======

Nostr Wallet Connect
--------------------

`draft` `optional` `author:kiwiidb` `author:bumi` `author:semisol` `author:vitorpamplona`

## Rationale

This NIP describes a way for clients to access a remote Lightning wallet through a standardized protocol. Custodians may implement this, or the user may run a bridge that bridges their wallet/node and the Nostr Wallet Connect protocol.

## Terms

* **client**: Nostr app on any platform that wants to pay Lightning invoices.
* **user**: The person using the **client**, and want's to connect their wallet app to their **client**.
* **wallet service**: Nostr app that typically runs on an always-on computer (eg. in the cloud or on a Raspberry Pi).  This app has access to the APIs of the wallets it serves.

## Theory of Operation
 1. **Users** who which to use this NIP to send lightning payments to other nostr users must first acquire a special "connection" URI from their NIP-47 compliant wallet application.  The wallet application may provide this URI using a QR screen, or a pasteable string, or some other means. 
 
 2. The **user** should then copy this URI into their **client(s)** by pasting, or scanning the QR, etc.  The **client(s)** should save this URI and use it later whenever the **user** makes a payment.  The **client** should then request an `info` (13194) event from the relay(s) specified in the URI.  The **wallet service** will have sent that event to those relays earlier, and the relays will hold it as a replaceable event.  
 
 3. When the **user** initiates a payment their nostr **client** create a `pay_invoice` request, encrypts it using a token from the URI, and sends it (kind 23194) to the relay(s) specified in the connection URI.  The **wallet service** will be listening on those relays and will decrypt the request and then contact the **user's** wallet application to send the payment.  The **wallet service** will know how to talk to the wallet application because the connection URI specified relay(s) that have access to the wallet app API.  
 
 4. Once the payment is complete the **wallet service** will send an encrypted `response` (kind 23195) to the **user** over the relay(s) in the URI.  

## Events

There are three event kinds:
- `NIP-47 info event`: 13194
- `NIP-47 request`: 23194
- `NIP-47 response`: 23195

The info event should be a replaceable event that is published by the **wallet service** on the relay to indicate which commands it supports. The content should be
a plaintext string with the supported commands, space-separated, eg. `pay_invoice get_balance`. Only the `pay_invoice` command is described in this NIP, but other commands might be defined in different NIPs.

Both the request and response events SHOULD contain one `p` tag, containing the public key of the **wallet service** if this is a request, and the public key of the **user** if this is a response. The response event SHOULD contain an `e` tag with the id of the request event it is responding to.

The content of requests and responses is encrypted with [NIP04](https://github.com/nostr-protocol/nips/blob/master/04.md), and is a JSON-RPCish object with a semi-fixed structure:

Request:
```jsonc
{
    "method": "pay_invoice", // method, string
    "params": { // params, object
        "invoice": "lnbc50n1..." // command-related data
    }
}
```

Response:
```jsonc
{
    "result_type": "pay_invoice", //indicates the structure of the result field
    "error": { //object, non-null in case of error
        "code": "UNAUTHORIZED", //string error code, see below
        "message": "human readable error message"
    },
    "result": { // result, object. null in case of error.
        "preimage": "0123456789abcdef..." // command-related data
    }
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
- `OTHER`: Other error.

## Nostr Wallet Connect URI
**client** discovers **wallet service** by scanning a QR code, handling a deeplink or pasting in a URI.

The **wallet service** generates this connection URI with protocol `nostr+walletconnect:` and base path it's hex-encoded `pubkey` with the following query string parameters: 

- `relay` Required. URL of the relay where the **wallet service** is connected and will be listening for events. May be more than one.
- `secret` Required. 32-byte randomly generated hex encoded string. The **client** MUST use this to sign events and encrypt payloads when communicating with the **wallet service**.
    - Authorization does not require passing keys back and forth.
    - The user can have different keys for different applications. Keys can be revoked and created at will and have arbitrary constraints (eg. budgets).
    - The key is harder to leak since it is not shown to the user and backed up.
    - It improves privacy because the user's main key would not be linked to their payments.
- `lud16` Recommended. A lightning address that clients can use to automatically setup the `lud16` field on the user's profile if they have none configured.

The **client** should then store this connection and use it when the user wants to perform actions like paying an invoice. Due to this NIP using ephemeral events, it is recommended to pick relays that do not close connections on inactivity to not drop events.

### Example connection string
```sh
nostr+walletconnect:b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4?relay=wss%3A%2F%2Frelay.damus.io&secret=71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c
```

## Commands

### `pay_invoice`

Description: Requests payment of an invoice.

Request:
```jsonc
{
    "method": "pay_invoice",
    "params": {
        "invoice": "lnbc50n1..." // bolt11 invoice
    }
}
```

Response:
```jsonc
{
    "result_type": "pay_invoice",
    "result": { 
        "preimage": "0123456789abcdef..." // preimage of the payment
    }
}
```

Errors:
- `PAYMENT_FAILED`: The payment failed. This may be due to a timeout, exhausting all routes, insufficient capacity or similar.

## Example pay invoice flow

0. The user scans the QR code generated by the **wallet service** with their **client** application, they follow a `nostr+walletconnect:` deeplink or configure the connection details manually.
1. **client** sends an event to the **wallet service** service with kind `23194`. The content is a `pay_invoice` request. The private key is the secret from the connection string above.
2. **wallet service** verifies that the author's key is authorized to perform the payment, decrypts the payload and sends the payment.
3. **wallet service** responds to the event by sending an event with kind `23195` and content being a response either containing an error message or a preimage.

## Using a dedicated relay
This NIP does not specify any requirements on the type of relays used. However, if the user is using a custodial service it might make sense to use a relay that is hosted by the custodial service. The relay may then enforce authentication to prevent metadata leaks. Not depending on a 3rd party relay would also improve reliability in this case.
