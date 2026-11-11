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
| 2     | the root of an API that speaks the OpenAI Chat Completions format, without a trailing `/` |

The URL MUST be `https`, except for a loopback host (`localhost`, `127.0.0.0/8`, `::1`)
or when the key is empty: a key never travels in cleartext. Readers strip one trailing
`/` before use.

A `key` tag MAY carry more values after these two; readers ignore what they don't know.

The URL is required because a key alone does not say where it works: many providers
issue keys that look alike, and a local or self-hosted endpoint can't be guessed.
With it, one wire format reaches every provider, since the major ones and the local
runners all serve Chat Completions (some through a compatibility endpoint).

A user MAY keep more than one key, one `key` tag each, in order of preference.
**The first `key` tag that has a URL is the preferred key: the default every client
uses.** The others are there for the user to switch to, or for a client that lets the
user pick a different key for a given task. A `key` tag without a URL is ignored by
readers, but kept by writers (see Editing).

The event needs no public tags:

```json
{
  "kind": 12000,
  "content": "<nip44 ciphertext of the tag array>",
  "tags": []
}
```

Clients MAY add a [NIP-70](70.md) `["-"]` tag so relays refuse copies published by
anyone else.

## Key budgets

Users SHOULD store keys created for this purpose alone, each with a limited budget:
a cap on the credits, spend or tokens the key can use, set at the provider. Most
providers let a key carry its own limit, separate from the account's main key. A
leaked or misused key then costs at most its budget, and revoking it at the provider
breaks nothing else.

Clients SHOULD say so where the user enters a key, and link to the provider's page
for creating one where they know it.

## Using the key

The key is sent as a bearer token to the URL it was stored with, and nowhere else.
An empty key sends no `Authorization` header at all.

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
tag as it found it, encrypts and publishes. A client reorders and removes the tag
arrays it read, rather than rebuilding them, so extra values on a `key` tag and `key`
tags it couldn't read survive the edit. If the relays could not be read, it does not
write: starting from an empty list would delete the user's other keys. The content is always an encrypted JSON
array, `[]` when the user removed their last key: NIP-44 cannot encrypt an empty
string.

## Security

- Anyone holding the user's private key, or a signer session allowed to decrypt with
  NIP-44, can read the API key. The key's budget (see Key budgets) is the limit on
  what they can spend.
- Every client the user signs into can spend from the key. That is the point of this
  NIP, so clients SHOULD keep the decrypted key in memory or in the platform's secure
  storage, and never write it to logs or URLs.
- Relays see that the event exists, its size and when it changes; nothing about the
  provider. Publishing only to the user's own write relays limits even that.
