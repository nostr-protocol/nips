NIP-46
======

Alerts
------

An alert provider is a nostr application whose job is to monitor the nostr network and notify users of updates via email, push, SMS, DM, etc.

# Alert Request

An alert request is an event which specifies how a user would like to be notified, and by whom. It MUST have the following tags, and no others:

- A `d` tag set to an arbitrary string
- A `p` tag indicating the provider the alert is addressed to

All other tags MUST be encrypted to the pubkey indicated by the `p` tag using NIP 44. The following tags are defined:

- `feed` (one or more) indicates [NIP-FE](https://github.com/nostr-protocol/nips/pull/1554) feeds that the user wants to be notified about.
- `description` (optional) is a human-readable description of the alert request
- `timezone` (optional) is the user's ISO 8601 timezone (e.g. `+03:00`)
- `locale` (optional) is the user's ISO 3166/639 locale (e.g. `en-US`)
- `claim` (optional) is a relay url and an invite code that may be used to request access (https://github.com/nostr-protocol/nips/pull/1079). This should only be used to provide access to the alert provider, not for selecting relays when fetching feeds (the outbox model or relay feeds should be used instead).

Below is an example tag array for a `kind 32830` email alert (the entire event is not shown because the tags are encrypted and placed in `content`):

```jsonc
[
  ["locale","en-US"],
  ["timezone","-07:00"],
  ["cron", "0 15 * * 1"],
  ["email", "email@example.com"],
  ["claim", "wss://relay.example.com/", "MYACCESSCODE"],
  ["feed", "[\"intersection\",[\"relay\",\"wss://relay.example.com/\"],[\"scope\",\"network\"]]"],
  ["description", "My notification"]
]
```

## Email Alerts

Email alert requests are `kind 32830` events which specify a requested email digest.

The following additional tags are defined:

- `email` indicates the user's email address
- `cron` indicates using cron syntax how often the user would like to be notified
- `handler` (zero or more) is the address of a [NIP 89](./89.md) handler event, for example `["handler", "31990:<pubkey>:<identifier>", "wss://relay.com", "web"]`

## Web Push Alerts

Web push alert requests are `kind 32832` events which can be used to request web push notifications.

The following additional tags are defined:

- `endpoint` indicates a push notification endpoint
- `p256dh` indicates the p256dh key
- `auth` indicates the auth key

The push notification payload SHOULD be a JSON object with the following fields:

- `title` - notification title text
- `body` - notification body text
- `event` - a [truncated nostr event](#event-truncation)
- `relays` - a list of nostr relays
-
## Android Push Alerts

Android push alert requests are `kind 32833` events which can be used to request Android push notifications.

The following additional tags are defined:

- `device_token` indicates a Firebase Cloud Messaging token

The push notification SHOULD include the following JSON-encoded data:

- `event` - a [truncated nostr event](#event-truncation)
- `relays` - a list of nostr relays

## iOS Push Alerts

iOS push alert requests are `kind 32834` events which can be used to request iOS push notifications.

The following additional tags are defined:

- `device_token` indicates an APNs token
- `bundle_identifier` indicates a iOS app bundle identifier

The push notification SHOULD include the following JSON-encoded data:

- `event` - a [truncated nostr event](#event-truncation)
- `relays` - a list of nostr relays

## Event Truncation

Most push notification standards limit payloads to 4KB, beyond which notifications are not delivered. Since nostr events may be greater than this limit, notifiers SHOULD truncate events when sending push notifications in the following way:

- `content` MAY be omitted
- `tags` MAY be omitted
- `sig` SHOULD be removed if either `content` or `tags` are not sent

# Alert Status

A provider SHOULD publish a `kind 32831` event which details the status of the user's alert. A non-existent alert status event indicates that no action has been taken. It MUST have the following tags, and no others:

- A `d` tag set to the address of the `kind 32830` it refers to
- A `p` tag indicating the author of the `kind 32830` alert event

All other tags MUST be encrypted to the pubkey indicated by the `p` tag using NIP 44. The following tags are defined:

- `status` SHOULD be one of `ok`, `pending`, `payment-required`, `error`
- `message` SHOULD include human-readable information explaining the status of the alert
- `secret` (optional) is a one-off private key that can be used to send heartbeats privately

# Heartbeats

Clients MAY send `kind 23830` heartbeat events to the notifier when the user is online so that notifiers can avoid sending unnecessary notifications. Heartbeats should be one minute apart.

In order to protect user privacy, heartbeats MUST be signed using the `secret` provided by the `kind 32831` alert status event. The `content` should contain a [NIP-44](./44.md) encrypted JSON-encoded tag array with one or more `a` tags which indicate an alert request address.

```jsonc
{
  "kind": 23830,
  "content": nip44_encrypt(json_encode([
    ["a", "32830:1238876738ce5bc6ddea7732e35e77f1216c000657b3cff5c7ff26a11fd145d2:1294742"],
  ]))
}
```

# Unsubscribing

When a user no longer wants to be notified, they may delete the alert by address, using a [NIP 09](./09.md) `kind 5` event with the `a` tag of the alert request. This event MUST also include a `p` tag with the alert provider's pubkey (in order to reduce the number of relay subscriptions a provider has to manage).

# Discovery

A provider MAY advertise its services using a `kind 13830` listing:

- `name` is the name of the provider
- `icon` is an icon representing the provider
- `about` is a description of the provider
- One or more `k` tags indicate what alert request kinds are supported

Example:

```jsonc
{
  "kind": 13830,
  "pubkey": "f011bf6c6b79ec30df422c26dcc8e29cb87598dc61fd19cf5a4e145a7aa3f7cf",
  "tags": [
    ["name", "My notifier"],
    ["k", "32832"],
  ],
}
```
