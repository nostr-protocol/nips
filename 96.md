> __Warning__  `unrecommended`: deprecated in favor of [NIP-B7](B7.md)

NIP-96
======

HTTP File Storage Integration
-----------------------------

`draft` `optional`

## Introduction

This NIP defines a REST API for HTTP file storage servers intended to be used in conjunction with the nostr network.
The API will enable nostr users to upload files and later reference them by url on nostr notes.

The spec DOES NOT use regular nostr events through websockets for
storing, requesting nor retrieving data because, for simplicity, the server
will not have to learn anything about nostr relays.

## Server Adaptation

File storage servers wishing to be accessible by nostr users should opt-in by making available an https route at `/.well-known/nostr/nip96.json` with `api_url`:

```jsonc
{
  // Required
  // File upload and deletion are served from this url
  // Also downloads if "download_url" field is absent or empty string
  "api_url": "https://your-file-server.example/custom-api-path",
  // Optional
  // If absent, downloads are served from the api_url
  "download_url": "https://a-cdn.example/a-path",
  // Optional
  // Note: This field is not meant to be set by HTTP Servers.
  // Use this if you are a nostr relay using your /.well-known/nostr/nip96.json
  // just to redirect to someone else's http file storage server's /.well-known/nostr/nip96.json
  // In this case, "api_url" field must be an empty string
  "delegated_to_url": "https://your-file-server.example",
  // Optional
  "supported_nips": [60],
  // Optional
  "tos_url": "https://your-file-server.example/terms-of-service",
  // Optional
  "content_types": ["image/jpeg", "video/webm", "audio/*"],
  // Optional
  "plans": {
    // "free" is the only standardized plan key and
    // clients may use its presence to learn if server offers free storage
    "free": {
      "name": "Free Tier",
      // Default is true
      // All plans MUST support NIP-98 uploads
      // but some plans may also allow uploads without it
      "is_nip98_required": true,
      "url": "https://...", // plan's landing page if there is one
      "max_byte_size": 10485760,
      // Range in days / 0 for no expiration
      // [7, 0] means it may vary from 7 days to unlimited persistence,
      // [0, 0] means it has no expiration
      // early expiration may be due to low traffic or any other factor
      "file_expiration": [14, 90],
      "media_transformations": {
        "image": [
          "resizing"
        ]
      }
    }
  }
}
```

### Relay Hints

Note: This section is not meant to be used by HTTP Servers.

A nostr relay MAY redirect to someone else's HTTP file storage server by
adding a `/.well-known/nostr/nip96.json` with "delegated_to_url" field
pointing to the url where the server hosts its own
`/.well-known/nostr/nip96.json`. In this case, the "api_url" field must
be an empty string and all other fields must be absent.

If the nostr relay is also an HTTP file storage server,
it must use the "api_url" field instead.

### List of Supporting File Storage Servers

See https://github.com/aljazceru/awesome-nostr#nip-96-file-storage-servers.

## Auth

When indicated, `clients` must add an [NIP-98](98.md) `Authorization` header (**optionally** with the encoded `payload` tag set to the base64-encoded 256-bit SHA-256 hash of the file - not the hash of the whole request body).

## Upload

`POST $api_url` as `multipart/form-data`.

**AUTH required**

List of form fields:

- `file`: **REQUIRED** the file to upload
- `caption`: **RECOMMENDED** loose description;
- `expiration`: UNIX timestamp in seconds. Empty string if file should be stored forever. The server isn't required to honor this.
- `size`: File byte size. This is just a value the server can use to reject early if the file size exceeds the server limits.
- `alt`: **RECOMMENDED** strict description text for visibility-impaired users.
- `media_type`: "avatar" or "banner". Informs the server if the file will be used as an avatar or banner. If absent, the server will interpret it as a normal upload, without special treatment.
- `content_type`: mime type such as "image/jpeg". This is just a value the server can use to reject early if the mime type isn't supported.
- `no_transform`: "true" asks server not to transform the file and serve the uploaded file as is, may be rejected.

Others custom form data fields may be used depending on specific `server` support.
The `server` isn't required to store any metadata sent by `clients`.

The `filename` embedded in the file may not be honored by the `server`, which could internally store just the SHA-256 hash value as the file name, ignoring extra metadata.
The hash is enough to uniquely identify a file, that's why it will be used on the `download` and `delete` routes.

The `server` MUST link the user's `pubkey` string as the owner of the file so to later allow them to delete the file.

`no_transform` can be used to replicate a file to multiple servers for redundancy, clients can use the [server list](#selecting-a-server) to find alternative servers which might contain the same file. When uploading a file and requesting `no_transform` clients should check that the hash matches in the response in order to detect if the file was modified.

### Response codes

- `200 OK`: File upload exists, but is successful (Existing hash)
- `201 Created`: File upload successful (New hash)
- `202 Accepted`: File upload is awaiting processing, see [Delayed Processing](#delayed-processing) section
- `413 Payload Too Large`: File size exceeds limit
- `400 Bad Request`: Form data is invalid or not supported.
- `403 Forbidden`: User is not allowed to upload or the uploaded file hash didnt match the hash included in the `Authorization` header `payload` tag.
- `402 Payment Required`: Payment is required by the server, **this flow is undefined**.

The upload response is a json object as follows:

```jsonc
{
  // "success" if successful or "error" if not
  "status": "success",
  // Free text success, failure or info message
  "message": "Upload successful.",
  // Optional. See "Delayed Processing" section
  "processing_url": "...",
  // This uses the NIP-94 event format but DO NOT need
  // to fill some fields like "id", "pubkey", "created_at" and "sig"
  //
  // This holds the download url ("url"),
  // the ORIGINAL file hash before server transformations ("ox")
  // and, optionally, all file metadata the server wants to make available
  //
  // nip94_event field is absent if unsuccessful upload
  "nip94_event": {
    // Required tags: "url" and "ox"
    "tags": [
      // Can be same from /.well-known/nostr/nip96.json's "download_url" field
      // (or "api_url" field if "download_url" is absent or empty) with appended
      // original file hash.
      //
      // Note we appended .png file extension to the `ox` value
      // (it is optional but extremely recommended to add the extension as it will help nostr clients
      // with detecting the file type by using regular expression)
      //
      // Could also be any url to download the file
      // (using or not using the /.well-known/nostr/nip96.json's "download_url" prefix),
      // for load balancing purposes for example.
      ["url", "https://your-file-server.example/custom-api-path/719171db19525d9d08dd69cb716a18158a249b7b3b3ec4bbdec5698dca104b7b.png"],
      // SHA-256 hash of the ORIGINAL file, before transformations.
      // The server MUST store it even though it represents the ORIGINAL file because
      // users may try to download/delete the transformed file using this value
      ["ox", "719171db19525d9d08dd69cb716a18158a249b7b3b3ec4bbdec5698dca104b7b"],
      // Optional. SHA-256 hash of the saved file after any server transformations.
      // The server can but does not need to store this value.
      ["x", "543244319525d9d08dd69cb716a18158a249b7b3b3ec4bbde5435543acb34443"],
      // Optional. Recommended for helping clients to easily know file type before downloading it.
      ["m", "image/png"],
      // Optional. Recommended for helping clients to reserve an adequate UI space to show the file before downloading it.
      ["dim", "800x600"]
      // ... other optional NIP-94 tags
    ],
    "content": ""
  },
  // ... other custom fields (please consider adding them to this NIP or to NIP-94 tags)
}
```

Note that if the server didn't apply any transformation to the received file, both `nip94_event.tags.*.ox` and `nip94_event.tags.*.x` fields will have the same value. The server MUST link the saved file to the SHA-256 hash of the **original** file before any server transformations (the `nip94_event.tags.*.ox` tag value). The **original** file's SHA-256 hash will be used to identify the saved file when downloading or deleting it.

`clients` may upload the same file to one or many `servers`.
After successful upload, the `client` may optionally generate and send to any set of nostr `relays` a [NIP-94](94.md) event by including the missing fields.

Alternatively, instead of using NIP-94, the `client` can share or embed on a nostr note just the above url.

`clients` may also use the tags from the `nip94_event` to construct an `imeta` tag

### Delayed Processing

Sometimes the server may want to place the uploaded file in a processing queue for deferred file processing.

In that case, the server MUST serve the original file while the processing isn't done, then swap the original file for the processed one when the processing is over. The upload response is the same as usual but some optional metadata like `nip94_event.tags.*.x` and `nip94_event.tags.*.size` won't be available.

The expected resulting metadata that is known in advance should be returned on the response.
For example, if the file processing would change a file from "jpg" to "webp",
use ".webp" extension on the `nip94_event.tags.*.url` field value and set "image/webp" to the `nip94_event.tags.*.m` field.
If some metadata are unknown before processing ends, omit them from the response.

The upload response MAY include a `processing_url` field informing a temporary url that may be used by clients to check if
the file processing is done.

If the processing isn't done, the server should reply at the `processing_url` url with **200 OK** and the following JSON:

```jsonc
{
  // It should be "processing". If "error" it would mean the processing failed.
  "status": "processing",
  "message": "Processing. Please check again later for updated status.",
  "percentage": 15 // Processing percentage. An integer between 0 and 100.
}
```

When the processing is over, the server replies at the `processing_url` url with **201 Created** status and a regular successful JSON response already mentioned before (now **without** a `processing_url` field), possibly including optional metadata at `nip94_event.tags.*` fields
that weren't available before processing.

### File compression

File compression and other transformations like metadata stripping can be applied by the server.
However, for all file actions, such as download and deletion, the **original** file SHA-256 hash is what identifies the file in the url string.

## Download

`GET $api_url/<sha256-hash>(.ext)`

The primary file download url informed at the upload's response field `nip94_event.tags.*.url`
can be that or not (it can be any non-standard url the server wants).
If not, the server still MUST also respond to downloads at the standard url
mentioned on the previous paragraph, to make it possible for a client
to try downloading a file on any NIP-96 compatible server by knowing just the SHA-256 file hash.

Note that the "\<sha256-hash\>" part is from the **original** file, **not** from the **transformed** file if the uploaded file went through any server transformation.

Supporting ".ext", meaning "file extension", is required for `servers`. It is optional, although recommended, for `clients` to append it to the path.
When present it may be used by `servers` to know which `Content-Type` header to send (e.g.: "Content-Type": "image/png" for ".png" extension).
The file extension may be absent because the hash is the only needed string to uniquely identify a file.

Example: `$api_url/719171db19525d9d08dd69cb716a18158a249b7b3b3ec4bbdec5698dca104b7b.png`

### Media Transformations

`servers` may respond to some media transformation query parameters and ignore those they don't support by serving
the original media file without transformations.

#### Image Transformations

##### Resizing

Upon upload, `servers` may create resized image variants, such as thumbnails, respecting the original aspect ratio.
`clients` may use the `w` query parameter to request an image version with the desired pixel width.
`servers` can then serve the variant with the closest width to the parameter value
or an image variant generated on the fly.

Example: `$api_url/<sha256-hash>.png?w=32`

## Deletion

`DELETE $api_url/<sha256-hash>(.ext)`

**AUTH required**

Note that the `/<sha256-hash>` part is from the **original** file, **not** from the **transformed** file if the uploaded file went through any server transformation.

The extension is optional as the file hash is the only needed file identification.

The `server` should reject deletes from users other than the original uploader with the appropriate http response code (403 Forbidden).

It should be noted that more than one user may have uploaded the same file (with the same hash). In this case, a delete must not really delete the file but just remove the user's `pubkey` from the file owners list (considering the server keeps just one copy of the same file, because multiple uploads of the same file results
in the same file hash).

The successful response is a 200 OK one with just basic JSON fields:

```json
{
  "status": "success",
  "message": "File deleted."
}
```

## Listing files

`GET $api_url?page=x&count=y`

**AUTH required**

Returns a list of files linked to the authenticated users pubkey.

Example Response:

```jsonc
{
  "count": 1, // server page size, eg. max(1, min(server_max_page_size, arg_count))
  "total": 1, // total number of files
  "page": 0, // the current page number
  "files": [
    {
      "tags": [
        ["ox", "719171db19525d9d08dd69cb716a18158a249b7b3b3ec4bbdec5698dca104b7b"],
        ["x", "5d2899290e0e69bcd809949ee516a4a1597205390878f780c098707a7f18e3df"],
        ["size", "123456"],
        ["alt", "a meme that makes you laugh"],
        ["expiration",  "1715691139"],
        // ...other metadata
      ],
      "content": "haha funny meme", // caption
      "created_at": 1715691130 // upload timestamp
    }
  ]
}
```

`files` contains an array of NIP-94 events

### Query args

- `page` page number (`offset=page*count`)
- `count` number of items per page

## Selecting a Server

Note: HTTP File Storage Server developers may skip this section. This is meant for client developers.

A File Server Preference event is a kind 10096 replaceable event meant to select one or more servers the user wants
to upload files to. Servers are listed as `server` tags:

```jsonc
{
  "kind": 10096,
  "content": "",
  "tags": [
    ["server", "https://file.server.one"],
    ["server", "https://file.server.two"]
  ],
  // other fields...
}
```
