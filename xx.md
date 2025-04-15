NIP-XX
======

User Aliases
------------

`draft` `optional`

This NIP describes a way for users to provide additional profile metadata for use within a given context.

A `kind 11000` "alias" is identical to `kind 0`, defined in [NIP 01](./01.md). It is intended to supplement `kind 0` metadata with additional context-specific information, for example chat-specific usernames and bios. When dealing with aliases, clients SHOULD shallowly merge alias metadata for a given context into a user's `kind 0` profile metadata to form a single merged profile.

## Scopes

- If an alias has a [NIP 70](./70.md) `-` tag, its scope is limited to the relay on which it is found. This is useful for authenticated relays, or relays as groups.
- If an alias has a [NIP 29](./29.md) `h` tag, its scope is limited to the group it is referring to.
- If an alias is sent via encrypted message, its scope is limited to that conversation or encrypted group.
