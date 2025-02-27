NIP-46
======

Alerts
------

An alert provider is a nostr application whose job is to monitor the nostr network and notify users of updates via email, push, SMS, DM, etc.

# Alert

An alert is a `kind 32830` event which specifies how a user would like to be notified, and by whom. It MUST have the following tags, and no others:

- A `d` tag set to an arbitrary string
- A `p` tag indicating the provider the alert is addressed to

All other tags MUST be encrypted to the pubkey indicated by the `p` tag using NIP 44. The following tags are defined:

- `channel` indicates how the user would like to be notified. May be one of `email`, `push`
- `relay` (one or more) indicates relays where notifications may be discovered
- `filter` (one or more) indicates a filter matching events that the user wants to be notified about
- `cron` (optional) indicates using cron syntax how often the user would like to be notified, if not immediately.
- `bunker_url` (optional) with permission to sign `kind 22242` AUTH requests (for access to auth-gated relays)
- `pause_until` (optional) indicates how long the provider should wait from the event's `created_at` before sending `immediate` mode alerts.
- `handler` (zero or more) is the address of a [NIP 89](./89.md) handler event, for example `["handler", "31990:<pubkey>:<identifier>", "wss://relay.com", "web"]`

If channel is set to `push`, the following tags are also required:

- `token` indicates a push notification token
- `platform` indicates the user's app platform (`ios|android|web`)

If channel is set to `email`, the following tags are also required:

- `email` indicates the user's email address

## Unsubscribing

When a user no longer wants to be notified, they may delete the alert by address, as specified in [NIP 09](./09.md).

## Pausing while online

When a user becomes active, their client SHOULD automatically update all relevant `kind 32930` events with a current `pause_until` timestamp. This allows the provider to know the user is online and avoid sending push notifications. When a client knows it's about to go offline, it MAY update the `pause_until` timestamp to the current time.

## Example

Below is an example tag array (the entire event is not shown because the tags are encrypted and placed in `content`).

```jsonc
[
  ["channel", "email"],
  ["cron", "0 15 * * 1"],
  ["bunker_url", "bunker://9ee57420bac3db5f1d7f43e1ed5f8bb6b81bf6df6350eb3377961da229eaab22?relay=wss://r.example.com&secret=9393"],
  ["pause_until", "1740002930"],
  ["relay", "wss://relay1.example.com/"],
  ["relay", "wss://relay2.example.com/"],
  ["filter", "{\"#p\":[\"c90b4e622a3a5c38aebd5ba3cbb22e4ab5a20056b499f8d2e3d25ff47f589a6b\"]}"],
  ["filter", "{\"#h\":[\"b3ce4a9f\"]}"],
  ["email", "email@example.com"]
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
