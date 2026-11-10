NIP-FA
======

AI Agent Keys
-------------

`draft` `optional`

A user keeps the API key of their preferred AI provider in a replaceable event,
encrypted to themselves. Every client they sign into can read it and run AI tasks
for them — summarize a thread, translate a note, draft a reply — billed to the
user's own account at the provider. The client holds no key of its own and runs no
server for it.

## Event

Kind `12000`, replaceable. The `content` is a [NIP-44](44.md) ciphertext, encrypted
by the author to their own public key, of a JSON array of tags:

```json
[
  ["key", "sk-or-v1-…", "https://openrouter.ai/api/v1"]
]
```

A `key` tag holds two values:

| index | value                                                                       |
|-------|-----------------------------------------------------------------------------|
| 1     | the key. An empty string for an endpoint that takes none, such as a model running on the user's own computer |
| 2     | the root of an API that speaks the OpenAI Chat Completions format            |

The URL is required because a key alone does not say where it works: many providers
issue keys that look alike, and a local or self-hosted endpoint can't be guessed.
With it, one wire format reaches every provider, since the major ones and the local
runners all serve Chat Completions (some through a compatibility endpoint).

Clients use the first `key` tag. A user MAY keep more than one, in order of
preference. A tag without a URL is ignored.

The event's own tags carry nothing secret:

```json
{
  "kind": 12000,
  "content": "<nip44 ciphertext of the tag array>",
  "tags": [
    ["alt", "AI agent keys (encrypted)"]
  ]
}
```

Clients MAY add a [NIP-70](70.md) `["-"]` tag so relays refuse copies published by
anyone else.

## Using the key

The key is sent as a bearer token to the URL it was stored with, and nowhere else:

```
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer sk-or-v1-…
Content-Type: application/json

{"model": "…", "messages": [{"role": "user", "content": "Summarize this thread: …"}]}
```

`GET <url>/models` lists the models the endpoint offers and costs nothing, so clients
SHOULD use it to check a key when the user enters it. Some providers answer it without
looking at the key; a client that knows a better call for a provider may use that one.

Which model to call, and for which task, is the client's choice. It SHOULD tell the
user which provider and model it will use before it first spends on their behalf, and
SHOULD report a `401` or `403` as a rejected key instead of retrying.

## Editing

To add, reorder or remove a key, a client fetches the newest event from the user's
[NIP-65](65.md) write relays, decrypts it, changes the `key` tags, keeps every other
tag as it found it, encrypts and publishes. The content is always an encrypted JSON
array, `[]` when the user removed their last key: NIP-44 cannot encrypt an empty
string.

## Security

- Anyone holding the user's private key, or a signer session allowed to decrypt with
  NIP-44, can read the API key. Clients SHOULD suggest a key with a spending limit,
  which most providers support per key.
- Every client the user signs into can spend from the key. That is the point of this
  NIP, so clients SHOULD keep the decrypted key in memory or in the platform's secure
  storage, and never write it to logs or URLs.
- Relays see that the event exists, its size and when it changes; nothing about the
  provider. Publishing only to the user's own write relays limits even that.
