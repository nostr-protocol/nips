NIP-A0
======

Voice Messages
-----------

**Status:** Draft

This NIP defines new events `kind: 1222` for root messages and `kind: 1244` for reply messages to be used for short voice messages, typically up to 60 seconds in length.

## Specification

### Event Kind `1222` and Kind `1244`

The `kind: 1222` event is defined as follows:

-   `content`: MUST be a URL pointing directly to an audio file.
    -   The audio file SHOULD be in `audio/mp4` (.m4a) format using AAC or Opus encoding. Clients MAY support other common audio formats like `audio/ogg`, `audio/webm`, or `audio/mpeg` (mp3), but `audio/mp4` is recommended for broad compatibility and efficiency.
    -   The audio duration SHOULD be no longer than 60 seconds. Clients publishing `kind: 1222` events SHOULD enforce this limit or provide a clear warning to the user if exceeded.
-   `tags`:
    -   Tags MAY be included as per other NIPs (e.g., `t` for hashtags, `g` for geohash, etc.).

  The `kind: 1244` event is defined as follows:
  
-    To be used for replies, `kind: 1244` events MUST follow the structure of `NIP-22`.
-   `content`: MUST be a URL pointing directly to an audio file.
    -   The audio file SHOULD be in `audio/mp4` (.m4a) format using AAC or Opus encoding. Clients MAY support other common audio formats like `audio/ogg`, `audio/webm`, or `audio/mpeg` (mp3), but `audio/mp4` is recommended for broad compatibility and efficiency.
    -   The audio duration SHOULD be no longer than 60 seconds. Clients publishing `kind: 1222` events SHOULD enforce this limit or provide a clear warning to the user if exceeded.
-   `tags`:
    -   Tags MAY be included as per other NIPs (e.g., `t` for hashtags, `g` for geohash, etc.).


## Visual representation with `imeta` (NIP-92) tag (optional)

The following imeta (NIP-92) tags MAY be included so clients can render a visual preview without having to download the audio file first:

- `waveform`: amplitude values over time, space separated full integers, less than 100 values should be enough to render a nice visual
- `duration`: audio length in seconds

## Examples

### Root Voice Message Example

```json
{
  "content": "https://blossom.primal.net/5fe7df0e46ee6b14b5a8b8b92939e84e3ca5e3950eb630299742325d5ed9891b.mp4",
  "created_at": 1752501052,
  "id": "...",
  "kind": 1222,
  "pubkey": "...",
  "sig": "...",
  "tags": [
    [
      "imeta",
      "url https://blossom.primal.net/5fe7df0e46ee6b14b5a8b8b92939e84e3ca5e3950eb630299742325d5ed9891b.mp4",
      "waveform 0 7 35 8 100 100 49 8 4 16 8 10 7 2 20 10 100 100 100 100 100 100 15 100 100 100 25 60 5 4 3 1 0 100 100 15 100 29 88 0 33 11 39 100 100 19 4 100 42 35 5 0 1 5 0 0 11 38 100 94 17 11 44 58 5 100 100 100 55 14 72 100 100 57 6 1 14 2 16 100 100 40 16 100 100 6 32 14 13 41 36 16 14 6 3 0 1 2 1 6 0",
      "duration 8"
    ]
  ]
}