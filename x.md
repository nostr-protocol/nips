NIP-X
=====

A method for transferring HTTP communication over Nostr Direct-Messages
-----------------------------------------------------------------------

`draft` `optional`

Reasoning: The standard HTTP & DNS protocols are centralized because the server, in order to advertise itself to clients, needs to have a domain or a static ip address. TOR (onion) addresses solve the same issue, but the network is really slow and unreliable, especially when all you need is to transfer a small burst of information (i.e. a request to a json api). Nostr direct-messages, based on a list of relays, can solve this.

This NIP defines a standard method to transfer basic HTTP-like communication over directed-messages using [NIP-04](04.md).
We are aware that [NIP-04](04.md) is unrecommended in favor of [NIP-17](17.md), but since [NIP-17](17.md) is more complicated to implement and is not yet supported in many libraries and relays, we will focus on [NIP-04](04.md).

This NIP does not define any new event. We simply define the format of the messages' content (before encryption).

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

Once the http client detects the ".nostr" TLD, it parses the `nprofile` entity to find the server's public-key and a list of relays that can be used to reach it. The client can then send the `Request` direct-message, whose content is a JSON string of an object with the following fields:

* `id`: A non-empty cryptographically-secure random string of up to 64 characters. The randomness should prevent different users from detecting the communication of others.
* `url`: The route part + query-string of the URL, including the leading "/" char.
* `method`: The HTTP method, i.e. `GET`, `POST`, `PUT` etc.
* `headers`: A JSON object whose keys are the http header names, and the values are the header values (always as strings).
  * Just like standard http requests, if the URL included a user-info part (i.e. `myuser:mypassword`), it will be converted to an `Authorization` header that looks like `Basic <user-info-base64>`.
  * A `Host` header is not required.
* `bodyBase64`: The body of the request encoded in base64. Encoding the body in base64 will simplify debugging this communication protocol (A JSON object that contains strange characters might be hard to read). This NIP is not intended for large data transfers, where the data-increase in using base64 is significant (Such communications should not use Nostr anyways).

An example `Request` message:

```json
{
  "id": "0da8a3dd-80e2-4fca-ba93-5c4261edcc9e",
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

The server **MUST** reply to this direct-message with a `Response` direction-message, whose content is a JSON string of an object with the following fields:

* `id`: The same `id` as in the request.
* `status`: The response status-code (integer), i.e. 200, 404, etc.
* `headers`: A JSON object whose keys are the http header names, and the values are the header values (always as strings).
* `bodyBase64`: The body of the response encoded in base64.

An example `Response` message:

```json
{
  "id": "0da8a3dd-80e2-4fca-ba93-5c4261edcc9e",
  "status": 200,
  "headers": {
    "date": "Fri, 31 May 2024 00:00:00 GMT",
    "content-type": "application/json; charset=utf-8"
  },
  "bodyBase64": "eyJoZWxsbyI6IndvcmxkIn0="
}
```

All the fields **MUST** exist even if they are empty.

Implementations
---------------

https://github.com/oren-z0/http2nostr - An HTTP Proxy that receives HTTP requests, sends them as Nostr direct messages, waits for responding direct messages and sends them as HTTP responses.

https://github.com/oren-z0/nostr2http - An HTTP Reverse Proxy that receives Nostr direct messages, sends them as HTTP requests, and sends the HTTP responses back as nostr direct messages.

https://vimeo.com/950881613 - A demonstration of a static LNURL-pay identifier that encodes a ".nostr" address (instead of a ".onion" address), and a custom client that pays a custom server using this identifier.

Related work
------------

https://dnstr.org - Domain Name Mapping for Nostr Public Keys
