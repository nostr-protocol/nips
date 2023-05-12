NIP-39
======

External Identities in Profiles
-------------------------------

`draft` `optional` `author:pseudozach` `author:Semisol`

## Abstract

Nostr protocol users may have other online identities such as usernames, profile pages, keypairs etc. they control and they may want to include this data in their profile metadata so clients can parse, validate and display this information.

## `i` tag on a metadata event

A new optional `i` tag is introduced for `kind 0` metadata event contents in addition to name, about, picture fields as included in [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md):
```json
{
    "id": <id>,
    "pubkey": <pubkey>,
    ...
    "tags": [
        ["i", "github:semisol", "9721ce4ee4fceb91c9711ca2a6c9a5ab"],
        ["i", "twitter:semisol_public", "1619358434134196225"],
        ["i", "mastodon:bitcoinhackers.org/@semisol", "109775066355589974"]
        ["i", "telegram:1087295469", "nostrdirectory/770"]
    ]
}
```

An `i` tag will have two parameters, which are defined as the following:
1. `platform:identity`: This is the platform name (for example `github`) and the identity on that platform (for example `semisol`) joined together with `:`.
2. `proof`: String or object that points to the proof of owning this identity.

Clients SHOULD process any `i` tags with more than 2 values for future extensibility.  
Identity provider names SHOULD only include `a-z`, `0-9` and the characters `._-/` and MUST NOT include `:`.  
Identity names SHOULD be normalized if possible by replacing uppercase letters with lowercase letters, and if there are multiple aliases for an entity the primary one should be used.  

## Claim types

### `github`

Identity: A GitHub username.

Proof: A GitHub Gist ID. This Gist should be created by `<identity>` with a single file that has the text `Verifying that I control the following Nostr public key: <npub encoded public key>`.  
This can be located at `https://gist.github.com/<identity>/<proof>`.

### `twitter`

Identity: A Twitter username.

Proof: A Tweet ID. The tweet should be posted by `<identity>` and have the text `Verifying my account on nostr My Public Key: "<npub encoded public key>"`.  
This can be located at `https://twitter.com/<identity>/status/<proof>`.

### `mastodon`

Identity: A Mastodon instance and username in the format `<instance>/@<username>`.

Proof: A Mastodon post ID. This post should be published by `<username>@<instance>` and have the text `Verifying that I control the following Nostr public key: "<npub encoded public key>"`.
This can be located at `https://<identity>/<proof>`.

### `telegram`

Identity: A Telegram user ID.

Proof: A string in the format `<ref>/<id>` which points to a message published in the public channel or group with name `<ref>` and message ID `<id>`. This message should be sent by user ID `<identity>` and have the text `Verifying that I control the following Nostr public key: "<npub encoded public key>"`.  
This can be located at `https://t.me/<proof>`.
