# NIP-75

## Zap Goals

`draft` `optional` `author:verbiricha`

This NIP defines an event for creating fundraising goals. Users can contribute funds towards the goal by zapping the goal event.

## Nostr Event

A `kind:9041` event is used.

The `.content` contains a human-readable description of the goal.

The following tags are defined as REQUIRED.

- `amount` - target amount in milisats.
- `relays` - a list of relays the zaps to this goal will be sent to and tallied from.

Example event:

```json
{
  "kind": 9041,
  "tags": [
    ["relays", "wss://alicerelay.example.com", "wss://bobrelay.example.com", ...],
    ["amount", "210000"],
  ],
  "content": "Nostrasia travel expenses",
  ...other fields
```

The following tags are OPTIONAL.

- `closed_at` - timestamp for determining which zaps are included in the tally. Zap receipts published after the `closed_at` timestamp SHOULD NOT count towards the goal progress.

```json
{
  "kind": 9041,
  "tags": [
    ["relays", "wss://alicerelay.example.com", "wss://bobrelay.example.com", ...],
    ["amount", "210000"],
    ["closed_at", "<unix timestamp in seconds>"],
  ],
  "content": "Nostrasia travel expenses",
  ...other fields
```

The goal MAY include an `r` or `a` tag linking to a URL or parameterized replaceable event.

The goal MAY include multiple beneficiary pubkeys by specifying [`zap` tags](57.md#appendix-g-zap-tag-on-other-events).

Parameterized replaceable events can link to a goal by using a `goal` tag specifying the event id and an optional relay hint.

```json
{
  "kind": 3XXXX,
  "tags": [
    ...
    ["goal", "<event id>", "<Relay URL (optional)>"],
  ],
  ...other fields
```

## Client behavior

Clients MAY display funding goals on user profiles.

When zapping a goal event, clients MUST include the relays in the `relays` tag of the goal event in the zap request `relays` tag.

When zapping a parameterized replaceable event with a `goal` tag, clients SHOULD tag the goal event id in the `e` tag of the zap request.

## Use cases

- Fundraising clients
- Adding funding goals to events such as long form posts, badges or live streams
