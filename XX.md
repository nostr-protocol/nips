NIP-XX
======

Versatile event
-------------------------

`draft` `optional`

This NIP defines a simple event that do not require interoperability.

When creating Nostr-based applications, suggesting a new kinds each time can be burdensome for developers. For purposes like testing or for applications that do not require interoperability, it is acceptable to use the defined event here.

## Nostr event

This NIP specifies the use of event kind `78` (versatile event) with a `d` tag containing some reference to the app name and context -- or any other arbitrary string. `content` and other `tags` can be anything or in any format.
