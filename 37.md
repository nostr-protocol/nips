NIP-37
======

Draft Wraps
-----------

`draft` `optional`

This NIP defines kind `31234` as an encrypted storage for unsigned draft events of any other kind. 

The draft is JSON-stringified, [NIP44-encrypted](44.md) to the signer's public key and placed inside the `.content`.

`k` tags identify the kind of the draft. 

```js
{
  "kind": 31234,
  "tags": [
    ["d", "<identifier>"],
    ["k", "<kind of the draft event>"], // required
    ["expiration", "now + 90 days"] // recommended
  ],
  "content": nip44Encrypt(JSON.stringify(draft_event)),
  // other fields
}
```

A blanked `.content` field signals that the draft has been deleted. 

[NIP-40](40.md) `expiration` tags are recommended. 

Clients SHOULD publish kind `31234` events to relays listed on kind `10013` below.

## Relay List for Private Content

Kind `10013` indicates the user's preferred relays to store private events like Draft Wraps. 

The event MUST include a list of `relay` URLs in private tags. Private tags are JSON Stringified, [NIP44-encrypted](44.md) to the signer's keys and placed inside the .content of the event.

```js
{
  "kind": 10013,
  "tags": [],
  "content": nip44Encrypt(
    JSON.stringify(
      [
        ["relay", "wss://myrelay.mydomain.com"]
      ]
    )
  )
  //...other fields
}
```

It's recommended that Private Storage relays SHOULD be [NIP-42](42.md)-authed and only allow downloads of events signed by the authed user.

Clients MUST publish kind `10013` events to the author's [NIP-65](65.md) `write` relays. 
