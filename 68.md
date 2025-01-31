NIP-68
======

Picture-first feeds
-------------------

`draft` `optional`

This NIP defines event kind `20` for picture-first clients. Images must be self-contained. They are hosted externally and referenced using `imeta` tags.

The idea is for this type of event to cater to Nostr clients resembling platforms like Instagram, Flickr, Snapchat, or 9GAG, where the picture itself takes center stage in the user experience.

## Picture Events

Picture events contain a `title` tag and description in the `.content`.

They may contain multiple images to be displayed as a single post.

```jsonc
{
  "id": <32-bytes lowercase hex-encoded SHA-256 of the the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <Unix timestamp in seconds>,
  "kind": 20,
  "content": "<description of post>",
  "tags": [
    ["title", "<short title of post>"],

    // Picture Data
    [
      "imeta",
      "url https://nostr.build/i/my-image.jpg",
      "m image/jpeg",
      "blurhash eVF$^OI:${M{o#*0-nNFxakD-?xVM}WEWB%iNKxvR-oetmo#R-aen$",
      "dim 3024x4032",
      "alt A scenic photo overlooking the coast of Costa Rica",
      "x <sha256 hash as specified in NIP 94>",
      "fallback https://nostrcheck.me/alt1.jpg",
      "fallback https://void.cat/alt1.jpg"
    ],
    [
      "imeta",
      "url https://nostr.build/i/my-image2.jpg",
      "m image/jpeg",
      "blurhash eVF$^OI:${M{o#*0-nNFxakD-?xVM}WEWB%iNKxvR-oetmo#R-aen$",
      "dim 3024x4032",
      "alt Another scenic photo overlooking the coast of Costa Rica",
      "x <sha256 hash as specified in NIP 94>",
      "fallback https://nostrcheck.me/alt2.jpg",
      "fallback https://void.cat/alt2.jpg",

      "annotate-user <32-bytes hex of a pubkey>:<posX>:<posY>" // Tag users in specific locations in the picture
    ],

    ["content-warning", "<reason>"], // if NSFW

    // Tagged users
    ["p", "<32-bytes hex of a pubkey>", "<optional recommended relay URL>"],
    ["p", "<32-bytes hex of a pubkey>", "<optional recommended relay URL>"],

    // Specify the media type for filters to allow clients to filter by supported kinds
    ["m", "image/jpeg"],

    // Hashes of each image to make them queryable
    ["x", "<sha256>"]

    // Hashtags
    ["t", "<tag>"],
    ["t", "<tag>"],

    // location
    ["location", "<location>"], // city name, state, country
    ["g", "<geohash>"],

    // When text is written in the image, add the tag to represent the language
    ["L", "ISO-639-1"],
    ["l", "en", "ISO-639-1"]
  ]
}
```

The `imeta` tag `annotate-user` places a user link in the specific position in the image.

Only the following media types are accepted:
- `image/apng`: Animated Portable Network Graphics (APNG)
- `image/avif`: AV1 Image File Format (AVIF)
- `image/gif`: Graphics Interchange Format (GIF)
- `image/jpeg`: Joint Photographic Expert Group image (JPEG)
- `image/png`: Portable Network Graphics (PNG)
- `image/webp`: Web Picture format (WEBP)

Picture events might be used with [NIP-71](71.md)'s kind `22` to display short vertical videos in the same feed.
