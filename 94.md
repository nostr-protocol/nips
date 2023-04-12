NIP-94 - File Header
======
`draft` `optional` `author:frbitten` 

The purpose of this NIP is to allow an organization and classification of shared files. So that relays can filter and organize in any way that is of interest.
Also the goal is to create a base on the protocol for this bountsr "Filesharing App" (https://bountsr.org/p2p-filesharing/) to be implemented.

Nostr event
------------------
This NIP specifies the use of the `1063` event type, having in `content` a description of the file content, and a list of tags described below:
* `url` the url to download the file
* `m` a string indicating the data type of the file. The MIME types format must be used (https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types)
* `"aes-256-gcm"` (optional)  key and nonce for AES-GCM encryption with tagSize always 128bits
* `x` containing the SHA-256 hexencoded string of the file.
* `size` (optional) size of file in bytes
* `magnet` (optional) URI to magnet file
* `i` (optional) torrent infohash
* `blurhash`(optional) for cosmetic purposes 

```json
{
  "id": <32-bytes lowercase hex-encoded sha256 of the the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <unix timestamp in seconds>,
  "kind": 1063,
  "tags": [
    ["url",<string with URI of file>],
    ["aes-256-gcm",<key>, <iv>],
    ["m", <MIME type>],
    ["x",<Hash SHA-256>],
    ["size", <size of file in bytes>],
    ["magnet",<magnet URI> ],
    ["i",<torrent infohash>],
    ["blurhash", <value>]
  ],
  "content": <description>,
  "sig": <64-bytes hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}
```

Client Behavior
---------------
The client can use this event as they see fit. Either showing events in the same feed as kind 1 events or creating a specific feed for file listings.

It allows the app to create image galleries (memes, animations) that can be reused countless times in different notes. As it exists in whatsapp, telegram, etc. 

Example: <https://ibb.co/Fnj5TMg> 

To do this, just select the image from the gallery (events NIP-94) and include the URL of the selected image


Suggested Use Cases
-------------------
* A relay for indexing shared files. For example to promote torrents
* A Pinterest-like relay and app where people can share their portfolio and inspire others.
* A simple way to distribute configurations and software updates.
* Specialized relays can provide collections of emojis, memes and animated gifs to be used in notes.
