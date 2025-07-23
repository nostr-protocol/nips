NIP-XX
======

Voice Messages
-----------

**Status:** Draft

This NIP defines new events `kind: 1222` for root messages and `kind: 1244` for reply messages to be used for short voice messages, typically up to 60 seconds in length.

## Specification

### Event Kind `1222` and Kind `1244`

The `kind: 1222` event is defined as follows:

-   `content`: MUST be a URL pointing directly to an audio file.
    -   The audio file SHOULD be in `audio/webm` format. Clients MAY support other common audio formats like `audio/ogg`, `audio/mp4` (m4a), or `audio/mpeg` (mp3), but `audio/webm` is recommended for broad compatibility and efficiency.
    -   The audio duration SHOULD be no longer than 60 seconds. Clients publishing `kind: 1222` events SHOULD enforce this limit or provide a clear warning to the user if exceeded.
-   `tags`:
    -   Tags MAY be included as per other NIPs (e.g., `t` for hashtags, `g` for geohash, etc.).

  The `kind: 1244` event is defined as follows:
  
-    To be used for replies, `kind: 1244` events MUST follow the structure of `NIP-22`.
-   `content`: MUST be a URL pointing directly to an audio file.
    -   The audio file SHOULD be in `audio/webm` format. Clients MAY support other common audio formats like `audio/ogg`, `audio/mp4` (m4a), or `audio/mpeg` (mp3), but `audio/webm` is recommended for broad compatibility and efficiency.
    -   The audio duration SHOULD be no longer than 60 seconds. Clients publishing `kind: 1222` events SHOULD enforce this limit or provide a clear warning to the user if exceeded.
-   `tags`:
    -   Tags MAY be included as per other NIPs (e.g., `t` for hashtags, `g` for geohash, etc.).



## Examples

### Root Voice Message Example

```json
{
  "id": "3d89633c73db03ec49431e98a01f57d268f51d684d4f213a1f970fa3bb1b3714",
  "pubkey": "3f770d65d3a764a9c5cb503ae123e62ec7598ad035d836e2a810f3877a745b24",
  "created_at": 1747141170,
  "kind": 1222,
  "tags": [],
  "content": "https://blossom.primal.net/9514f4685f6a1ed3d20b0ff86814422a6be980c8978ed4d3071a2d97346a3862.webm",
  "sig": "6785c8b32fcb9e03f02b25ccdbce211c43e74742b8f70f91b4629f323b56b16b8f1ab6a10421e97e5e37834fcc55e799370e62d78daffa56bf70ca1ab1b16fa1"
}
