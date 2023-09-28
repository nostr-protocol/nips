NIP-24
======

Extra metadata fields and tags
------------------------------

`draft` `optional` `author:fiatjaf`

This NIP defines extra optional fields added to events.

kind 0
======

These are extra fields not specified in NIP-01 that may be present in the stringified JSON of metadata events:

  - `display_name`: a bigger name with richer characters than `name`. Implementations should fallback to `name` when this is not available.
  - `website`: a web URL related in any way to the event author.
  - `banner`: an URL to a wide (~1024x768) picture to be optionally displayed in the background of a profile screen.

### Deprecated fields

These are fields that should be ignored or removed when found in the wild:

  - `displayName`: use `display_name` instead.
  - `username`: use `name` instead.

kind 3
======

These are extra fields not specified in NIP-02 that may be present in the stringified JSON of contacts events:

### Deprecated fields

  - `{<relay-url>: {"read": <true|false>, "write": <true|false>}, ...}`: an object of relays used by a user to read/write. [NIP-65](65.md) should be used instead.

tags
====

These tags may be present in multiple event kinds. Whenever a different meaning is not specified by some more specific NIP, they have the following meanings:

  - `r`: a web URL the event is referring to in some way
