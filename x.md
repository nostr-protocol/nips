NIP-X
=====

# A method for transferring HTTP communication over Nostr


`draft` `optional`

Reasoning: The standard HTTP & DNS protocols are centralized because the server, in order to advertise itself to clients, needs to have a domain or a static ip address. TOR (onion) addresses solve the same issue, but the network is really slow and unreliable, especially when all you need is to transfer a small burst of information (i.e. a request to a json api). A mechanism similar to Nostr direct-messages, using multiple relays relays, can solve this.

This NIP defines a standard method to transfer basic HTTP-like communication over using [NIP-44](44.md) encryption and [NIP-59](59.md) gift wraps, in a way that is almost identical to [NIP-17](17.md).
The main exception is that the content is not plain text, but a JSON string of an object that contains the information of the request/response.

## Nostr URL

A `Nostr URL` is an http-like URL where the "host" is a Nostr profile entity as defined in [NIP-19](19.md):

`http://<nprofile-entity>.nostr/<route>?<query-string>`

For example:

`http://nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p.nostr/root/subroute?param=value&x=y`

This is purposely similar to TOR URLs that have the top-level-domain (TLD) ".onion". A browser can easily parse this format to detect the uncommon TLD, and then, if possible, use a different communication method than the standard DNS & HTTP.

A Nostr URL:

* **MUST** have an `http` scheme. Nostr direct-messages are encrypted by default, so there is no need for SSL/TLS (i.e. `https`). This should also be simple to support in lnurl LUD-01: https://github.com/lnurl/luds/blob/luds/01.md#https-or-onion
* **MUST NOT** have a port.
* Can have user-info followed by "@" before the "host" part. i.e. `http://myuser:mypassword@nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p.nostr/root/subroute?param=value`. 
* Can have a query-param called "httpnostr" to specify future nostr-based NIPs that the server supports. For example, if a future NIP-XYZ will define a new method for transferring http communication (i.e. that uses [NIP-17](17.md) instead of [NIP-04](04.md)), the url query-string could look like `?param=value&httpnostr=nipxyz&x=y`. However, the server **MUST** also support the basic communication method desribed in this NIP.

Once the http client detects the ".nostr" TLD, it parses the `nprofile` entity to find the server's public-key and a list of relays that can be used to reach it. The client can then send `Request` messages (see: [Sending Request and Response Messages](#sending-request-and-response-messages)) containing an object with the following fields:

* `id`: A non-empty cryptographically-secure random string of up to 64 characters (value will be the same for all `Request` messages of the same request). The randomness should prevent different users from detecting the communication of others, and from different requests having the same id.
* `partIndex`, `parts`: Since [NIP-44](44.md) limits the encrypted payload size to 65535 bytes, one `Request` message might not be enough. Every `Request` message should contain both the `part` index and the total number of `parts`.
* `url`: The route part + query-string of the URL, including the leading "/" char. Required only in the first part where `partIndex` is 0.
* `method`: The HTTP method, i.e. `GET`, `POST`, `PUT` etc. Required only in the first part where `partIndex` is 0.
* `headers`: A JSON object whose keys are the http header names, and the values are the header values (always as strings). Required only in the first part where `partIndex` is 0.
  * Just like standard http requests, if the URL included a user-info part (i.e. `myuser:mypassword`), it will be converted to an `Authorization` header that looks like `Basic <user-info-base64>`.
  * A `Host` header is not required.
* `bodyBase64`: The body of the request encoded in base64. Encoding the body in base64 will simplify debugging this communication protocol (A JSON object that contains strange characters might be hard to read). This NIP is not intended for large data transfers, where the data-increase in using base64 is significant (Such communications should not use Nostr anyways) - however if the base64 payload does not fit in a single `Request` message (due to [NIP-44](44.md)'s limit on encrypted payload size) then the payload buffer should be split to parts and sent in multiple `Request` messages (with the same `id`). Each part of the payload buffer should be encoded into base64 on its own.

An example `Request` object:

```json
{
  "id": "0da8a3dd-80e2-4fca-ba93-5c4261edcc9e",
  "partIndex": 0,
  "parts": 1,
  "url": "/api/test",
  "method": "GET",
  "headers": {
    "accept": "*/*",
    "user-agent": "curl/8.6.0"    
  },
  "bodyBase64": ""
}
```

All the fields **MUST** exist even if they are empty (even `GET` messages who usually don't have a body, must have `"bodyBase64": ""` in their JSON object).

This NIP does not define how to handle long-polling and other HTTP communication features that keep the communication alive instead of sending the entire message body at once.

The server **SHOULD** reply to `Request` messages (after all the parts have been received) with `Response` messages containing an object with the following fields:

* `id`: The same `id` as in the request.
* `partIndex`, `parts`: Since [NIP-44](44.md) limits the encrypted payload size to 65535 bytes, one `Response` message might not be enough. Every `Response` message should contain both the `part` index and the total number of `parts`.
* `status`: The response status-code (integer), i.e. 200, 404, etc. Required only in the first part where `partIndex` is 0.
* `headers`: A JSON object whose keys are the http header names, and the values are the header values (always as strings). Required only in the first part where `partIndex` is 0.
* `bodyBase64`: The body of the response encoded in base64. If the base64 payload does not fit in a single `Response` message (due to [NIP-44](44.md)'s limit on encrypted payload size)  then the payload buffer should be split to parts and sent in multiple `Response` messages. Each part of the payload buffer should be encoded into base64 on its own.

An example `Response` object:

```json
{
  "id": "0da8a3dd-80e2-4fca-ba93-5c4261edcc9e",
  "partIndex": 0,
  "parts": 1,
  "status": 200,
  "headers": {
    "date": "Fri, 31 May 2024 00:00:00 GMT",
    "content-type": "application/json; charset=utf-8"
  },
  "bodyBase64": "eyJoZWxsbyI6IndvcmxkIn0="
}
```

All the fields **MUST** exist even if they are empty.

## Sending Request and Response Messages

Kind `80` (similar to the default HTTP port 80) is a request message sent from a `client` to a `server`. `p` tag identify the server. The client SHOULD create a new pair of private-public keys for each request, to enhance the obfuscation of the communication.

```js
{
  "id": "<usual hash>",
  "pubkey": "<client-one-time-pubkey>",
  "created_at": now(),
  "kind": 80,
  "tags": [
    ["p", "<server-pubkey>", "<relay-url>"],
    ["relays", "<additional-relay1-url>", "<additional-relay2-url>", ...],
    ...
  ],
  "content": "<json-string-of-request-object>",
}
```

`.content` MUST be text. Fields `id` and `created_at` are required. The `server` MAY ignore the request if `created_at` is too far in the past or future.

An example request message:
```json
{
  "id": "52027ef73c41df333621e810325b936246e2df30481ffbba5b08ac53d5a94bee",
  "pubkey": "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e",
  "created_at": 1000000000,
  "kind": 80,
  "tags": [
    ["p", "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d", "wss://r.x.com"],
    ["relays", "wss://djbas.sadkb.com"]
  ],
  "content": "{\"id\":\"0da8a3dd-80e2-4fca-ba93-5c4261edcc9e\",\"url\":\"/api/test\",\"method\":\"GET\",\"headers\":{\"accept\":\"*/*\",\"user-agent\":\"curl/8.6.0\"},\"bodyBase64\":\"\"}"
}
```

Similarly, Kind `81` is a request message sent from a `server` to a `client`. `p` tag identify the client's one-time pubkey.

```js
{
  "id": "<usual hash>",
  "pubkey": "<server-pubkey>",
  "created_at": now(),
  "kind": 81,
  "tags": [
    ["p", "<client-one-time-pubkey>", "<relay-url>"],
    ["relays", "<additional-relay1-url>", "<additional-relay2-url>", ...],
    ...
  ],
  "content": "<json-string-of-response-object>",
}
```

`.content` MUST be text. Fields `id` and `created_at` are required.

An example response message:
```json
{
  "id": "48a83f500a5ed1ea90eddba3675bc4e2dbf5d72cffd3837cf161da398d0c7e77",
  "pubkey": "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  "created_at": 1000000001,
  "kind": 81,
  "tags": [
    ["p", "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e", "wss://r.x.com"],
    ["relays", "wss://djbas.sadkb.com"]
  ],
  "content": "{\"id\":\"0da8a3dd-80e2-4fca-ba93-5c4261edcc9e\",\"status\":200,\"headers\":{\"date\":\"Fri, 31 May 2024 00:00:00 GMT\",\"content-type\":\"application/json; charset=utf-8\"},\"bodyBase64\":\"eyJoZWxsbyI6IndvcmxkIn0=\"}"
}
```

Kinds `80`s and `81`s MUST never be signed. If it is signed, the message might leak to relays and become **fully public**. They must be encrypted first.

## Encrypting

Following [NIP-59](59.md), the **unsigned** `kind:80` and `kind:81` messages must be sealed (`kind:13`) and then gift-wrapped **with a new kind** `21059`, to the receiver.

`kind:21059` will be used in the same way of `kind:1059`, but will be ephemeral as described in [NIP-01](01.md).

```js
{
  "id": "<usual hash>",
  "pubkey": randomPublicKey,
  "created_at": randomTimeUpTo2DaysInThePast(),
  "kind": 21059, // ephemeral gift wrap
  "tags": [
    ["p", receiverPublicKey, "<relay-url>"], // receiver
    ["relays", "<additional-relay1-url>", "<additional-relay2-url>", ...],
  ],
  "content": nip44Encrypt(
    {
      "id": "<usual hash>",
      "pubkey": senderPublicKey,
      "created_at": randomTimeUpTo2DaysInThePast(),
      "kind": 13, // seal
      "tags": [], // no tags
      "content": nip44Encrypt(unsignedKind80or81, senderPrivateKey, receiverPublicKey),
      "sig": "<signed by senderPrivateKey>"
    },
    randomPrivateKey, receiverPublicKey
  ),
  "sig": "<signed by randomPrivateKey>"
}
```

The encryption algorithm MUST use the latest version of [NIP-44](44.md).

Receiver MUST verify if pubkey of the `kind:13` is the same pubkey on the `kind:80` or `kind:81`, otherwise any sender can impersonate others by simply changing the pubkey on `kind:80`/`kind:81`.

Sender SHOULD randomize `created_at` in up to two days in the past in both the seal and the gift wrap to make sure grouping by `created_at` doesn't reveal any metadata.

The gift wrap's `p`-tag can be the server's main pubkey (for the request message) or the client's one-time pubkey (for the response message).

## Implementations


https://github.com/oren-z0/http2nostr - An HTTP Proxy that receives HTTP requests, sends them as Nostr direct messages, waits for responding direct messages and sends them as HTTP responses. In the future it will use the sealing and gift-wrapping mentioned above.

https://github.com/oren-z0/nostr2http - An HTTP Reverse Proxy that receives Nostr direct messages, sends them as HTTP requests, and sends the HTTP responses back as nostr direct messages. In the future it will use the sealing and gift-wrapping mentioned above.

https://vimeo.com/950881613 - A demonstration of a static LNURL-pay identifier that encodes a ".nostr" address (instead of a ".onion" address), and a custom client that pays a custom server using this identifier.

## Related work

https://dnstr.org - Domain Name Mapping for Nostr Public Keys
https://github.com/lnurl/luds/pull/203 - A suggestion for LNURL over Nostr
https://github.com/shocknet/Lightning.Pub - a Nostr-native account system designed to make running Lightning infrastructure for your friends/family/customers easier.
