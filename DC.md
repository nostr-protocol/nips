NIP-DC
======

Nostr Webxdc
------------

`draft` `optional`

This NIP defines how to share and run [webxdc](https://webxdc.org/) apps over Nostr. Webxdc apps are `.xdc` (ZIP) files containing sandboxed HTML5 applications. They are attached to regular Nostr events using `imeta` tags (NIP-92), and state is coordinated through a unique identifier.

This spec covers public webxdc communication only. Private communication may be addressed in a future update.

## Attachment

A webxdc app is attached to any event by including the `.xdc` file URL in the content and an `imeta` tag with MIME type `application/x-webxdc`.

The `imeta` tag SHOULD include a `webxdc` property with a randomly generated unique string. This serves as the coordination identifier for state updates and realtime channels. If omitted, the app can still run but state won't work.

```json
{
  "kind": 1,
  "content": "Let's play chess! https://blossom.example.com/abc123.xdc",
  "tags": [
    ["imeta",
      "url https://blossom.example.com/abc123.xdc",
      "m application/x-webxdc",
      "x a1b2c3d4e5f6...",
      "webxdc 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
    ]
  ]
}
```

A webxdc MAY also be published as a kind `1063` (NIP-94) file metadata event:

```json
{
  "kind": 1063,
  "content": "A collaborative chess game. Play with friends over Nostr!",
  "tags": [
    ["url", "https://blossom.example.com/abc123.xdc"],
    ["m", "application/x-webxdc"],
    ["x", "a1b2c3d4e5f6..."],
    ["alt", "Webxdc app: Chess"],
    ["webxdc", "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"]
  ]
}
```

## Kind `4932`: State Update

A regular event carrying a state update, mapping to the webxdc [`sendUpdate()`](https://webxdc.org/docs/spec/sendUpdate.html) API. Updates are ordered by `created_at` and assigned serial numbers by the client.

### Tags

- `i`: The `webxdc` identifier from the originating event (required)
- `alt`: NIP-31 human-readable description (required)
- `info`: Short info message, max ~50 chars (optional)
- `document`: Document name being edited (optional)
- `summary`: Short summary text, e.g. "8 votes" (optional)

The optional tags correspond to fields in the webxdc `sendUpdate()` API.

### Content

JSON-serialized payload from `sendUpdate()`.

```json
{
  "kind": 4932,
  "content": "{\"move\":\"e2e4\",\"player\":\"white\"}",
  "tags": [
    ["i", "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"],
    ["alt", "Webxdc update"],
    ["info", "White played e2-e4"]
  ]
}
```

## Kind `20932`: Realtime Data (Ephemeral)

An ephemeral event carrying realtime data, mapping to the webxdc [`joinRealtimeChannel`](https://webxdc.org/docs/spec/joinRealtimeChannel.html) API. Relays forward these to active subscribers but do not store them.

### Tags

- `i`: The `webxdc` identifier from the originating event (required)

### Content

Base64-encoded `Uint8Array` payload (max 128,000 bytes raw).

```json
{
  "kind": 20932,
  "content": "SGVsbG8gZnJvbSBucHViMWFiYy4uLg==",
  "tags": [
    ["i", "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"]
  ]
}
```

## Flow

1. A user uploads a `.xdc` file (e.g. to Blossom) and publishes an event with the URL in content and an `imeta` tag. The `imeta` SHOULD include a `webxdc` property.
2. A client detects the `imeta` tag, downloads the `.xdc`, extracts it, and runs `index.html` in a sandboxed iframe or webview.
3. `sendUpdate()` publishes a kind `4932` event with the `webxdc` identifier in an `i` tag.
4. The client subscribes to kind `4932` events with `#i` matching the identifier and delivers them via `setUpdateListener()`.
5. `joinRealtimeChannel()` subscribes to kind `20932` events with `#i` matching the identifier. `send()` publishes ephemeral kind `20932` events. `leave()` closes the subscription.
6. `selfAddr` and `selfName` MAY map to the user's npub and display name, or any other values.

## Security Considerations

- Webxdc apps MUST be sandboxed with no network access, per the [webxdc spec](https://webxdc.org/docs/spec/messenger.html).
- Clients SHOULD verify the `.xdc` file hash (`x` tag) before running it.
- All communication in this spec is public. Webxdc apps designed for private chats or small groups may not work as expected.
- Webxdc apps have no access to Nostr signatures or identity verification. Any participant can claim to be anyone within the app. Apps should not rely on `selfAddr` or `selfName` for trust decisions.
