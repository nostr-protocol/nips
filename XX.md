NIP-XX
======

Entirely Trusted Relays
-------------------------

`draft` `optional`

An entirely trusted relay list is a `kind:10051` event that includes a list of `r` tags with relay URLs. When a relay is included in a user's entirely trusted relay list, that relay is allowed to host rumors (events without a `sig` field) from that user.

Entirely trusted relay lists MUST NOT be a rumor.

Entirely trusted relay lists MUST contain an `alt` tag with the value `"entirely trusted relays"`, as it is very dangerous to publish this list by mistake.

```jsonc
{
  "kind": 10051,
  "tags": [
    ["r", "<relay-url>"],
    ["r", "<relay-url>"],
    ["r", "<relay-url>"],
    ["alt", "entirely trusted relays"] // this alt tag cannot be omitted
  ],
  "content": "",
  // other fields including `sig`...
}
```

## Relay Behavior

Supporting this NIP means that the relay accepts and hosts rumors just like regular events. However, relays MUST reject a rumor when the connection is not authenticated by [NIP-42](42.md) AUTH flow using the same pubkey as the author of the rumor.

Relays MAY reject a rumor if the relay does not have an entirely trusted relay list from the rumor's author that includes the relay's URL.

## Client Behavior

Clients MUST only trust rumors from the relays included in the entirely trusted relay list of the rumor's author.

Clients MUST perform the [NIP-42](42.md) AUTH flow with the relay before publishing rumors to that relay.

Clients MUST NOT consider the entirely trusted relay list valid in any of the following cases:

- It does not have the correct `alt` tag.
- It has an [`expiration` tag](40.md) and has already expired.
- It is a rumor.

Clients SHOULD NOT publish an entirely trusted relay list if one of the relays in the list accepts rumors from non-authenticated sessions or authenticated sessions with incorrect pubkeys.

## Why

There are cases where the [`"-"` tag](70.md) is not enough to prevent events from being broadcast to random relays.
