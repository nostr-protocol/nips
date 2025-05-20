NIP-E
=====

App Configs
-----------

`draft` `optional`


# Abstract

Any Nostr application may have different specific configurations like user preference for theme and more. Which they may need to sync across different devices of the same app. This NIP introduced `kind 30707` which is specified for this kind of configs.

# Specifications

An event with `kind 30707`, with a `d` tag of app name/or a unique ID is used by app to publish an event that contains user configs with their arbitrary standard/non-standard tags.

The `global` tag is reserved to be a general setting with a higher priority.

```jsonc
{
  "content": "k. global configs",
  "created_at": 1719888496,
  "kind": 30707,
  "tags": [
    ["d", "global"],
    ["c", "theme", "dark"], // dark, light, system
    ["c", "fontsize", "10"], // in pixel
    ["c", "animations", "on"], // on, off
    ["c", "inappbrowser", "off"], // on, off
    ["c", "language", "fa"], // any two letter ISO 639-1 language code
    ["c", "notifications", "app"], // non, app, system, all
  ]
}
```

## Client notes

Clients MAY publish their config as a [NIP-59](./59.md) gift wrapped event for more privacy.

Clients with a same goal like micro blogging clients MAY use a shared config between themselves for smoother experience.
