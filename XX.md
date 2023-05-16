NIP-XX
======

Zap Gates
----------

`draft` `optional` `author:egge` `author:starbuilder`

The purpose of this NIP is to allow external resources that are protected by NIP98 HTTP-AUTH to be unlocked through zaps. It enables users to limit access to pubkeys that have paid for it.

## Creating Zap Gated Resources (Creator)

In order to create a Zap Gated Resource a creator uploads the resource (e.g, a text-, audio-, or image-file) to a NIP-XX enabled provider, specifying a price, the pubkey that will be used to publish the event, a payment destination according to NIP-57, as well as a list of relays that should be used for zapping. The provider returns an unsigned event of kind-X, containing relevant metadata and the resource url that the creator can then sign and publish.

## Protecting a Zap Gated Ressource (Provider)

Zap Gated Resources are protected using NIP-98 HTTP Auth.
In order to only return the resource to users that have paid for the resource, the provider keeps track of all the Zap events on the specified relays that are targeting the event-id of a Kind-X event and curates a list of public keys that have zapped at least the amount specified by the creator when initially uploading the resource. If the NIP-98 AUTH header in the request matches one of those keys, the provider should respond with status code 200 and the requested resource, otherwise it should respond with a status code 402.

## Accessing a Zap Gated Resource (User)

When a client discovers a kind-X event, it should render the preview if applicable and let the user know that they need to pay in order to view the full resource (e.g., by showing a "pay to unlock" button). If the user wishes to pay for the resource, the client should facilitate a Zap according to NIP-57 on the kind-X event, specifying the relays from the kind-X event relays tag. After successful payment it should go ahead and construct an AUTH header according to NIP-98 and request the full resource from the `url` in the kind-X event.

## Kind-X Event format

This NIP specifies a `X` event kind for Zap Gated Resources, having in `content` a description of the resource, and a list of tags described below:

* `url` the url of the NIP-98 protected resource
* `m` a string indicating the data type of the file. The MIME types format must be used (https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types)
* `price`  the price in SATS that is to be paid to access the resource.
* `relays` a list of relays that should be used for zapping.
* `preview` (optional) a preview of the protected ressource that should be accessible prior to paying (see preview examples)

```json
{
  "id": <32-bytes lowercase hex-encoded sha256 of the the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the user>,
  "created_at": <unix timestamp in seconds>,
  "kind": X,
  "tags": [
    ["url",<string with URI of file>],
    ["m", <MIME type>],
    ["price", <price in SATS>],
    ["preview",<preview tag> ],
    ["relays", <list of relays>]
  ],
  "content": <description>,
  "sig": <64-bytes hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}
```

## Preview Tag
* for images: `['blurhash': <blurhash>]` or `['imagefile': <preview image url>]`
* for audio: `['audiofile': <preview audio url>]`
* for text: `['excerpt': <text>]` or `['textfile': <preview text url>]`

## Considerations and Extensions

### Privacy

To avoid leaking information about IP addresses (when fetching protected resources) and purchases (when zapping a kind-X event) a user can derive a throw-away keys. Because the key is only used to create the Zap Request and then attached to the resource request, clients can create key-pairs on a per purchase basis and either keep track of them locally or implement a standardized derivation method.

### Payment Splits

Instead of only specifying a single zap target, kind-X events could hold more than one target, providing instructions for clients to "split" the zap. There are several use cases for this, like co-authoring of content, but also revenue splits for providers.