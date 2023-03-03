NIP-42
======

Authentication of clients to relays
-----------------------------------

`draft` `optional` `author:Semisol` `author:fiatjaf`

This NIP defines a way for clients to authenticate to relays by signing an ephemeral event.

## Motivation

A relay may want to require clients to authenticate to access restricted resources. For example,

  - A relay may request payment or other forms of whitelisting to publish events -- this can naïvely be achieved by limiting publication
    to events signed by the whitelisted key, but with this NIP they may choose to accept any events as long as they are published from an
    authenticated user;
  - A relay may limit access to `kind: 4` DMs to only the parties involved in the chat exchange, and for that it may require authentication
    before clients can query for that kind.
  - A relay may limit subscriptions of any kind to paying users or users whitelisted through any other means, and require authentication.

## Definitions

This NIP defines a new message, `AUTH`, which relays can send when they support authentication and clients can send to relays when they want
to authenticate. When sent by relays, the message is of the following form:

```
["AUTH", <challenge-string>]
```

And, when sent by clients, of the following form:

```
["AUTH", <signed-event-json>]
```

The signed event is an ephemeral event not meant to be published or queried, it must be of `kind: 22242` and it should have at least two tags,
one for the relay URL and one for the challenge string as received from the relay.
Relays MUST exclude `kind: 22242` events from being broadcasted to any client.
`created_at` should be the current time. Example:

```json
{
  "id": "...",
  "pubkey": "...",
  "created_at": 1669695536,
  "kind": 22242,
  "tags": [
    ["relay", "wss://relay.example.com/"],
    ["challenge", "challengestringhere"]
  ],
  "content": "",
  "sig": "..."
}
```

## Protocol flow

At any moment the relay may send an `AUTH` message to the client containing a challenge. After receiving that the client may decide to
authenticate itself or not. The challenge is expected to be valid for the duration of the connection or until a next challenge is sent by
the relay.

The client may send an auth message right before performing an action for which it knows authentication will be required -- for example, right
before requesting `kind: 4` chat messages --, or it may do right on connection start or at some other moment it deems best. The authentication
is expected to last for the duration of the WebSocket connection.

Upon receiving a message from an unauthenticated user it can't fulfill without authentication, a relay may choose to notify the client. For
that it can use a `NOTICE` or `OK` message with a standard prefix `"restricted: "` that is readable both by humans and machines, for example:

```
["NOTICE", "restricted: we can't serve DMs to unauthenticated users, does your client implement NIP-42?"]
```

or it can return an `OK` message noting the reason an event was not written using the same prefix:

```
["OK", <event-id>, false, "restricted: we do not accept events from unauthenticated users, please sign up at https://example.com/"]
```

## Signed Event Verification

To verify `AUTH` messages, relays must ensure:

  - that the `kind` is `22242`;
  - that the event `created_at` is close (e.g. within ~10 minutes) of the current time;
  - that the `"challenge"` tag matches the challenge sent before;
  - that the `"relay"` tag matches the relay URL:
    - URL normalization techniques can be applied. For most cases just checking if the domain name is correct should be enough.
