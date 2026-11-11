NIP-FA
======

AI Agent Keys
-------------

`draft` `optional`

A user stores the API key of their AI provider so every client they sign into can run AI
tasks for them, billed to the user.

## Event

Kind `12000`, replaceable, no required tags. `content` is a [NIP-44](44.md) ciphertext,
encrypted by the author to themselves, of a JSON array of tags:

```json
[["key", "sk-or-v1-…", "https://openrouter.ai/api/v1"]]
```

- `key` index 1: the key, or `""` for an endpoint that takes none.
- `key` index 2: the root of an API serving the OpenAI Chat Completions format. It MUST be
  `https`, unless the key is empty or the host is loopback (`localhost`, `127.0.0.0/8`,
  `::1`). Readers strip a trailing `/`.

Readers ignore `key` tags with no URL or a URL breaking that rule, and `key` tags in the
public `tags`. The first remaining one is the default; the others are alternatives in order
of preference. Clients MAY add a [NIP-70](70.md) `["-"]` tag.

## Use

Send the key as `Authorization: Bearer <key>` to its own URL only (no header for an empty
key): `POST <url>/chat/completions`. `GET <url>/models` checks a key at no cost, though some providers answer it without
looking at the key. Clients
SHOULD name the provider and model before spending for the first time, and treat a `401`
or `403` as a rejected key.

Users SHOULD store keys made for this purpose, each with a spending limit set at the
provider.

## Editing

Fetch the newest event from the user's [NIP-65](65.md) write relays, decrypt, reorder or
remove the tags as read (keeping values and tags you don't understand), encrypt and
publish to the same relays with `created_at` = max(now, previous + 1). Don't write if the
relays couldn't be read or the content doesn't decrypt to a tag array. An empty list is
`[]`, since NIP-44 can't encrypt an empty string.

## Security

Anyone holding the user's private key, or allowed to NIP-44 decrypt for them, can spend up
to the key's limit. Clients never log the key or put it in a URL.
