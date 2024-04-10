NIP-XX
======

REMOVE command
--------------

`draft` `optional`

This NIP defines a new nostr command `REMOVE` of the following format:

```json
["REMOVE", <remove-request-id>, <filters1>, <filters2>, ...]
```

to be sent by a client to a relay.

The relay should respond with a `REMOVED` message in the following format:

```json
["REMOVED", <remove-request-id>, <true|false>, <message>]
```

If the client is AUTHenticated and authorized to remove the specified events from the relay, the relay should remove them and respond with true.

If the relay does not remove all the matching events for some reason, it should ideally remove none of them and send `false` in its `REMOVED` response.

Relays not supporting this NIP will not comprehend the `REMOVE` message and will not send back a `REMOVED` response. Therefore clients supporting this NIP must tolerate situations where no response is obtained.

This NIP defines no rules for the format of the `REMOVED` message field.

Relays that support this NIP should signal this in their NIP-11 relay information document.

Motivation
----------

It would be beneficial to the nostr ecosystem to have a generic means of moderating events on relays, because it allows for the creation of moderation tools that work on all supporting nostr relays, rather than just on a particular relay implementation.
