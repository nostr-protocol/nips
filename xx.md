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
- `event` - a nostr event
- `relays` - a list of nostr relays
-
## Android Push Alerts

Android push alert requests are `kind 32833` events which can be used to request Android push notifications.

The following additional tags are defined:

- `device_token` indicates a Firebase Cloud Messaging token

The push notification SHOULD include the following JSON-encoded data:

- `event` - a nostr event
- `relays` - a list of nostr relays

## iOS Push Alerts

iOS push alert requests are `kind 32834` events which can be used to request iOS push notifications.

The following additional tags are defined:

- `device_token` indicates a push token

The push notification SHOULD include the following JSON-encoded data:

- `event` - a nostr event
- `relays` - a list of nostr relays

## Unsubscribing

When a user no longer wants to be notified, they may delete the alert by address, as specified in [NIP 09](./09.md).

## Example

Below is an example tag array (the entire event is not shown because the tags are encrypted and placed in `content`).

```jsonc
[
  ["channel", "email"],
  ["cron", "0 15 * * 1"],
  ["email", "email@example.com"],
  ["claim", "wss://relay.example.com/", "MYACCESSCODE"],
  ["feed", "[\"intersection\",[\"relay\",\"wss://relay.example.com/\"],[\"scope\",\"network\"]]"],
  ["bunker_url", "bunker://9ee57420bac3db5f1d7f43e1ed5f8bb6b81bf6df6350eb3377961da229eaab22?elay=wss://r.example.com&secret=9393"]
]
```

# Alerts Status

A provider SHOULD publish a `kind 32831` event which details the status of the user's alert. A non-existent alert status event indicates that no action has been taken. It MUST have the following tags, and no others:

- A `d` tag set to the address of the `kind 32830` it refers to
- A `p` tag indicating the author of the `kind 32830` alert event

All other tags MUST be encrypted to the pubkey indicated by the `p` tag using NIP 44. The following tags are defined:

- `status` SHOULD be one of `ok`, `pending`, `payment-required`, `error`
- `message` SHOULD include human-readable information explaining the status of the alert

# Discovery

A provider MAY advertise its services via NIP 89 client listing.
