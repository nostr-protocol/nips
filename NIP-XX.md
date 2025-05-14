NIP-XX
======

Voice Messages
-----------

**Status:** Draft

This NIP defines a new event `kind: 1222` for short voice messages, typically up to 60 seconds in length. These are analogous to `kind: 1` (Short Text Note) events but for audio content.

## Motivation

Nostr is primarily a text-based protocol. While `kind: 1` allows for links to any media, a dedicated kind for short voice messages offers several advantages:
1.  **Discoverability:** Clients can specifically request or filter for voice messages.
2.  **User Experience:** Clients can provide a tailored UI for recording, sending, and playing voice notes, distinct from general media links.
3.  **Brevity:** By convention and recommendation, these are short, fostering quick, personal communication.
4.  **Standardization:** Provides a clear way to share voice snippets without overloading `kind: 1` or requiring complex parsing of its content.

## Specification

### Event Kind `1222`

The `kind: 1222` event is defined as follows:

-   `content`: MUST be a URL pointing directly to an audio file.
    -   The audio file SHOULD be in `audio/webm` format. Clients MAY support other common audio formats like `audio/ogg`, `audio/mp4` (m4a), or `audio/mpeg` (mp3), but `audio/webm` is recommended for broad compatibility and efficiency.
    -   The audio duration SHOULD be no longer than 60 seconds. Clients publishing `kind: 1222` events SHOULD enforce this limit or provide a clear warning to the user if exceeded.
-   `tags`:
    -   For replies, `kind: 1222` events MUST follow `NIP-10` marker conventions (e.g., `e` tags for root, reply, mention; `p` tags for pubkeys being replied to or mentioned).
    -   Other tags MAY be included as per other NIPs (e.g., `t` for hashtags, `g` for geohash, etc.).

### Audio File Hosting

The audio file referenced in the `content` field MUST be hosted on a server accessible via HTTP(S). Clients are responsible for uploading the audio file to a suitable host before creating the `kind: 1222` event. Common media hosts (e.g., nostr.download, blossom.band, blossom.primal.net) or self-hosted solutions can be used.

## Client Behavior

### Publishing Clients

1.  SHOULD allow users to record and upload audio.
2.  SHOULD attempt to encode or transcode the audio to `audio/webm` format.
3.  SHOULD enforce or strongly recommend a maximum audio duration of 60 seconds.
4.  MUST upload the audio file to a publicly accessible URL.
5.  MUST set the `kind` to `1222`.
6.  MUST set the `content` field to the direct URL of the uploaded audio file.
7.  When replying to another event (including another `kind: 1222`), MUST include `e` and `p` tags as specified in `NIP-10`.

###Receiving Clients

1.  SHOULD recognize `kind: 1222` events as voice notes.
2.  SHOULD fetch the audio file from the URL specified in the `content` field.
3.  SHOULD provide an interface to play the audio (e.g., an embedded audio player).
4.  MAY display the duration of the audio message, if known (e.g., from HTTP headers or by pre-fetching and analyzing the audio file).
5.  MAY choose to warn users or refuse to automatically play/download audio messages significantly exceeding the 60-second recommendation to conserve bandwidth or prevent abuse.
6.  SHOULD display `kind: 1222` events in timelines and threads, respecting `NIP-10` reply/threading conventions.

## Relay Behavior

Relays SHOULD treat `kind: 1222` events like any other regular, non-replaceable event (similar to `kind: 1`). No special validation of the `content` URL or the audio format/duration by relays is required or expected.

## Limitations

-   **External Hosting:** The availability and persistence of voice notes depend on the external hosting provider of the audio file.
-   **File Size:** While `webm` is efficient, longer or higher-quality recordings can still result in larger file sizes, which might be a concern for users with limited data plans. The 60-second recommendation helps mitigate this.
-   **Accessibility:** This NIP does not specify a mechanism for audio transcriptions. Clients or future NIPs may address this.

## Examples

### Root Voice Note Example

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
