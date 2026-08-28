NIP-24
======

Extra metadata fields and tags
------------------------------

`draft` `optional`

This NIP keeps track of extra optional fields that can added to events which are not defined anywhere else but have become _de facto_ standards and other minor implementation possibilities that do not deserve their own NIP and do not have a place in other NIPs.

### kind 0

These are extra fields not specified in NIP-01 that may be present in the stringified JSON of metadata events:

  - `display_name`: an alternative, bigger name with richer characters than `name`. `name` should always be set regardless of the presence of `display_name` in the metadata.
  - `website`: a web URL related in any way to the event author.
  - `banner`: an URL to a wide (~1024x768) picture to be optionally displayed in the background of a profile screen.
  - `bot`: a boolean to clarify that the content is entirely or partially the result of automation, such as with chatbots or newsfeeds.
  - `birthday`: an object representing the author's birth date. The format is { "year": number, "month": number, "day": number }. Each field MAY be omitted.

#### Deprecated fields

These are fields that should be ignored or removed when found in the wild:

  - `displayName`: use `display_name` instead.
  - `username`: use `name` instead.

### kind 3

These are extra fields not specified in NIP-02 that may be present in the stringified JSON of follow events:

#### Deprecated fields

  - `{<relay-url>: {"read": <true|false>, "write": <true|false>}, ...}`: an object of relays used by a user to read/write. [NIP-65](65.md) should be used instead.

### tags

These tags may be present in multiple event kinds. Whenever a different meaning is not specified by some more specific NIP, they have the following meanings:

  - `r`: a web URL the event is referring to in some way.
  - `i`: an external id the event is referring to in some way - see [NIP-73](73.md).
  - `title`: name of [NIP-51](51.md) sets, [NIP-52](52.md) calendar event, [NIP-53](53.md) live event or [NIP-99](99.md) listing.
  - `t`: a hashtag. The value MUST be a lowercase string.
