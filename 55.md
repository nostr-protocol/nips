NIP-55
======

Android Signer Application
--------------------------

`draft` `optional`

## Rationale

This NIP describes a method for 2-way communication between an Android signer and any Nostr client running on the same device, so that the client never needs to handle the user's private key. The signer is an Android application; the client may be another Android application or a web page.

## Terminology

- **user**: A person trying to use Nostr.
- **client**: A user-facing application that sends signing requests.
- **signer**: An Android application that holds the user's private key and answers requests from _client_.
- **user-pubkey**: The public key representing _user_, returned by `get_public_key`.
- **package name**: The Android package name of the _signer_ (e.g. `com.example.signer`), used by _client_ to address subsequent requests.

All pubkeys in this NIP are in hex format.

## Communication methods

A _client_ can talk to the _signer_ in three ways:

- **Intents** — used by Android clients. The _signer_ opens, the _user_ approves or rejects the request manually, and the result is returned to _client_.
- **Content Resolver** — used by Android clients. Runs in the background without opening the _signer_, but only works for permissions the _user_ has previously chosen to remember.
- **Web** — used by web clients. The result is returned via a `callbackUrl` or copied to the clipboard.

## Setup

To detect and call the _signer_, an Android _client_ must declare the `nostrsigner` scheme in its `AndroidManifest.xml`:

```xml
<queries>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="nostrsigner" />
  </intent>
</queries>
```

It can then check whether a _signer_ is installed:

```kotlin
fun isExternalSignerInstalled(context: Context): Boolean {
  val intent = Intent(Intent.ACTION_VIEW, Uri.parse("nostrsigner:"))
  return context.packageManager.queryIntentActivities(intent, 0).isNotEmpty()
}
```

## Initiating a connection

1. _client_ sends a `get_public_key` request.
2. _signer_ responds with the `user-pubkey` and its `package name`.
3. _client_ stores both, and SHOULD NOT call `get_public_key` again while the _user_ stays logged in.
4. _client_ addresses all further requests to that `package name`.

A _client_ MAY pass a list of `permissions` with `get_public_key` so the _user_ can pre-authorize methods (used by the Content Resolver to answer in the background). Each permission is an object with a `type` (a method name) and, for `sign_event`, an optional `kind`:

```json
[{ "type": "sign_event", "kind": 22242 }, { "type": "nip44_decrypt" }]
```

## Methods

Every request has a `type` (the method name) and a payload. The payload is passed differently per transport (see below) but its meaning is shared:

| Method              | Payload         | Extra params              | Result                          |
| ------------------- | --------------- | ------------------------- | ------------------------------- |
| `get_public_key`    | _(empty)_       | `permissions`             | `user-pubkey`                   |
| `sign_event`        | event JSON      | `current_user`            | the signature, and signed event |
| `nip04_encrypt`     | plaintext       | `pubkey`, `current_user`  | the ciphertext                  |
| `nip44_encrypt`     | plaintext       | `pubkey`, `current_user`  | the ciphertext                  |
| `nip04_decrypt`     | ciphertext      | `pubkey`, `current_user`  | the plaintext                   |
| `nip44_decrypt`     | ciphertext      | `pubkey`, `current_user`  | the plaintext                   |
| `decrypt_zap_event` | event JSON      | `current_user`            | the decrypted event JSON        |

- `current_user` is the `user-pubkey` currently logged in to _client_, in hex format.
- `pubkey` is the public key of the other party used for encryption/decryption, in hex format.
- `id` is an optional client-chosen string echoed back in the result, used to match responses when several requests are sent without waiting.

## Using Intents

The payload is the `nostrsigner:` URI data; all other params are intent extras. The result is returned via `registerForActivityResult` / `rememberLauncherForActivityResult`.

```kotlin
val intent = Intent(Intent.ACTION_VIEW, Uri.parse("nostrsigner:$payload")).apply {
  `package` = signerPackageName        // omit only for get_public_key
  putExtra("type", "sign_event")
  putExtra("id", event.id)             // optional, echoed back
  putExtra("current_user", userPubkey)
}
launcher.launch(intent)
```

The result is read from the returned intent's extras:

| Extra      | Description                                               |
| ---------- | -------------------------------------------------------- |
| `result`   | the method result (pubkey, signature, ciphertext, etc.)  |
| `id`       | the `id` sent in the request                             |
| `event`    | the signed event JSON (`sign_event` only)                |
| `package`  | the _signer_ package name (`get_public_key` only)        |
| `rejected` | `true` when the _user_ rejected the request              |

A `resultCode` other than `Activity.RESULT_OK` means the _signer_ failed (e.g. it crashed), not that the _user_ rejected the request. When the _user_ rejects, the _signer_ returns `RESULT_OK` with a `rejected` extra set to `true`.

```kotlin
onResult = { result ->
  if (result.resultCode != Activity.RESULT_OK) {
    // signer error (e.g. crash)
  } else if (result.data?.getBooleanExtra("rejected", false) == true) {
    // user rejected the request
  } else {
    val value = result.data?.getStringExtra("result")
  }
}
```

To sign multiple events without reopening the _signer_ for each one, _client_ adds the flags below and the _signer_ returns an array of results. The _signer_ must declare `android:launchMode="singleTop"` for this to work.

```kotlin
intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)

// signer answers with:
intent.putExtra("results", listOf(Result(package = signerPackageName, result = signature, id = intentId)).toJson())
```

## Using Content Resolver

The _client_ queries `content://<package-name>.<TYPE>` (e.g. `SIGN_EVENT`, `NIP44_ENCRYPT`). The query's `selectionArgs` carry the payload and params in the order `[payload, pubkey, current_user]`:

```kotlin
val result = context.contentResolver.query(
  Uri.parse("content://com.example.signer.SIGN_EVENT"),
  listOf(eventJson, "", loggedInUserPubkey),
  null, null, null,
)
```

The cursor returns a `result` column (and, for `sign_event`, an `event` column with the signed event JSON). The query returns `null`, or a `rejected` column is present, when:

- the _user_ did not enable "remember my choice" for this request,
- the `user-pubkey` is not present in the _signer_,
- the request `type` is not recognized, or
- the _user_ chose to always reject this request (a `rejected` column is returned — _client_ SHOULD NOT then fall back to an Intent).

```kotlin
if (result == null) return
if (result.getColumnIndex("rejected") > -1) return
if (result.moveToFirst()) {
  val value = result.getString(result.getColumnIndex("result"))
  // for sign_event also: result.getColumnIndex("event")
}
```

Clients SHOULD store the `user-pubkey` locally and avoid calling `get_public_key` after the user is logged in.

## Using Web Applications

Web clients can't receive a result from an intent, so the _signer_ returns the result via a `callbackUrl` (appended to the URL) or, if none is given, by copying it to the clipboard. The request is a `nostrsigner:` URL whose path is the payload and whose query string carries the params:

```
nostrsigner:<payload>?type=<method>&pubkey=<hex_pubkey>&callbackUrl=https://example.com/?result=
```

Query parameters:

- `type` — the method name.
- `pubkey` — the other party's hex pubkey (encryption/decryption methods).
- `callbackUrl` — where the _signer_ appends the result. If omitted, the result is copied to the clipboard.
- `returnType` — `signature` or `event`.
- `compressionType` — `none` (default) or `gzip`. With `gzip` the returned event is `"Signer1"` + Base64(gzip(event json)); useful because intents and URLs have length limits.

```js
window.href = `nostrsigner:${eventJson}?compressionType=none&returnType=signature&type=sign_event&callbackUrl=https://example.com/?event=`;
```

> Consider using [NIP-46: Nostr Remote Signing](46.md) for web applications. With the approach here the web client can't call the _signer_ in the background, so the _user_ sees a popup for every request.

### Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Test</h1>

    <script>
        window.onload = function() {
            var params = new URL(window.location.href).searchParams;
            var result = params.get("event");
            if (result) alert(result);

            var json = { kind: 1, content: "test" };
            var encodedJson = encodeURIComponent(JSON.stringify(json));
            var anchor = document.createElement("a");
            anchor.href = `nostrsigner:${encodedJson}?compressionType=none&returnType=signature&type=sign_event&callbackUrl=https://example.com/?event=`;
            anchor.textContent = "Open External Signer";
            document.body.appendChild(anchor);
        }
    </script>
</body>
</html>
```