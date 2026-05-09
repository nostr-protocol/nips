NIP-XX
======

Accommodation Listings
----------------------

`draft` `optional`

This NIP defines `kind:32121` for accommodation listings as parameterized replaceable events. It provides a structured format for hosts to advertise accommodation with pricing, availability rules, amenities, cancellation policies, and location data.

## Terms

- **Guest** — Nostr user searching for accommodation.
- **Host** — Nostr user providing accommodation.
- **Listing** — A single accommodation unit or property advertised by a host.

## Event Kind

| Kind    | Description           |
| ------- | --------------------- |
| `32121` | Accommodation listing |

`kind:32121` is a parameterized replaceable event (NIP-01). The `d` tag provides a stable identifier for the listing across updates.

## Content

The `.content` field contains the listing **description** in Markdown.

## Tags

### Required Tags

| Tag     | Format                       | Description                                                                                                         |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `d`     | `["d", "<unique-id>"]`       | Stable listing identifier. SHOULD be generated once at creation (e.g. base-36 timestamp) and reused across updates. |
| `title` | `["title", "<string>"]`      | Human-readable listing title.                                                                                       |
| `t`     | `["t", "accommodation"]`     | Topic tag. MUST be `"accommodation"`.                                                                               |
| `type`  | `["type", "<listing-type>"]` | One of: `room`, `house`, `apartment`, `villa`, `hotel`, `hostel`, `resort`.                                         |

### Optional Tags

| Tag                          | Format                                                      | Description                                                                                                               |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `image`                      | `["image", "<url>"]`                                        | Image URL. Repeat for multiple images.                                                                                    |
| `active`                     | `["active", "true"\|"false"]`                               | Whether the listing is currently available. Default `true`.                                                               |
| `negotiable`                 | `["negotiable", "true"\|"false"]`                           | Whether the host accepts negotiated prices below the listed price. Default `false`.                                       |
| `minStay`                    | `["minStay", "<integer>"]`                                  | Minimum stay in days. Default `1`.                                                                                        |
| `checkIn`                    | `["checkIn", "<hour>:<minute>"]`                            | Check-in time (24h format). Default `"15:0"`.                                                                             |
| `checkOut`                   | `["checkOut", "<hour>:<minute>"]`                           | Check-out time (24h format). Default `"11:0"`.                                                                            |
| `location`                   | `["location", "<string>"]`                                  | Human-readable location or address.                                                                                       |
| `quantity`                   | `["quantity", "<integer>"]`                                 | Number of bookable units. Default `1`.                                                                                    |
| `instantBook`                | `["instantBook", "true"\|"false"]`                          | Whether reservations are confirmed instantly without host approval. Default `true`. Promoted as `["I", "true"\|"false"]`. |
| `allowSelfSignedReservation` | `["allowSelfSignedReservation", "true"\|"false"]`           | Whether guests may self-sign reservations (e.g. via zap proof). Default `false`.                                          |
| `securityDeposit`            | `["securityDeposit", "<amount>", "<denom>", "<decimals>"]`  | Optional security deposit the guest must lock alongside the payment.                                                      |
| `minPaymentAmount`           | `["minPaymentAmount", "<amount>", "<denom>", "<decimals>"]` | Minimum payment amount the host will accept for a reservation.                                                            |
| `maxDisputePeriod`           | `["maxDisputePeriod", "<seconds>"]`                         | Maximum time after checkout that escrow may remain disputed before unilateral claim. Default is 1209600 seconds.           |
| `published_at`               | `["published_at", "<unix-seconds>"]`                        | Timestamp of first publication. Publishers SHOULD preserve this value across listing edits.                                |
| `imeta`                      | `["imeta", "url <url>", ...]`                               | Inline image metadata as described by NIP-92. Repeat for multiple images.                                                  |
| `g`                          | `["g", "<h3-index>"]`                                       | H3 cell/index for location-based search. Publishers SHOULD use H3 tags, not geohash strings.                               |

### Price Tags

Listings MAY include one or more `price` tags. Clients SHOULD use the cheapest applicable price when computing reservation cost.

**Recurring price:**

```json
["price", "<decimal-amount>", "<denomination>", "<frequency>"]
```

- `<decimal-amount>` — Amount as a decimal string in the denomination's standard unit (e.g. `"0.00100000"` for 100,000 satoshis).
- `<denomination>` — Currency code: `"BTC"`, `"USD"`, `"ETH"`, etc.
- `<frequency>` — One of: `day`, `week`, `month`, `year`.

**One-time/fixed price:**

```json
["price", "<decimal-amount>", "<denomination>"]
```

### Cancellation Policy Tags

Listings MAY include one or more `cancellationPolicy` tags defining refund terms based on how far in advance the guest cancels.

```json
["cancellationPolicy", "<seconds-before-start>", "<refund-fraction>"]
```

- `<seconds-before-start>` — Number of seconds before check-in that this policy applies.
- `<refund-fraction>` — Decimal fraction `0.0`–`1.0` of the total cost refunded (e.g. `"0.5"` = 50% refund).

### Specification Tags

Listings MAY include `spec` tags advertising features and details.

**Boolean specification** (presence = `true`):

```json
["spec", "<spec-name>"]
```

**Valued specification:**

```json
["spec", "<spec-name>", "<value>"]
```

Valued specs MUST include a value. Boolean specs MUST NOT include a value.

#### Recognized Specifications for Accommodation

The recognized names below are specific to `accommodation` listings. Other listing kinds will define their own recognized names.

**Valued** (integer value):

`bathtub`, `bathrooms`, `beds`, `bedrooms`, `max_guests`, `tv`

**Boolean** (presence = true, absence = false):

`airconditioning`, `allows_pets`, `crib`, `tumble_dryer`, `washer`, `elevator`, `free_parking`, `gym`, `hair_dryer`, `heating`, `high_chair`, `wireless_internet`, `iron`, `jacuzzi`, `kitchen`, `outlet_covers`, `pool`, `private_entrance`, `smoking_allowed`, `breakfast`, `fireplace`, `smoke_detector`, `essentials`, `shampoo`, `infants_allowed`, `children_allowed`, `hangers`, `flat_smooth_pathway_to_front_door`, `grab_rails_in_shower_and_toilet`, `oven`, `bbq`, `balcony`, `patio`, `dishwasher`, `refrigerator`, `garden_or_backyard`, `microwave`, `coffee_maker`, `dishes_and_silverware`, `stove`, `fire_extinguisher`, `carbon_monoxide_detector`, `luggage_dropoff_allowed`, `beach_essentials`, `beachfront`, `baby_monitor`, `babysitter_recommendations`, `childrens_books_and_toys`, `game_console`, `street_parking`, `paid_parking`, `hot_water`, `lake_access`, `single_level_home`, `waterfront`, `first_aid_kit`, `handheld_shower_head`, `home_step_free_access`, `lock_on_bedroom_door`, `mobile_hoist`, `path_to_entrance_lit_at_night`, `pool_hoist`, `ev_charger`, `rollin_shower`, `shower_chair`, `tub_with_shower_bench`, `wide_clearance_to_bed`, `wide_clearance_to_shower_and_toilet`, `wide_hallway_clearance`, `baby_bath`, `changing_table`, `room_darkening_shades`, `stair_gates`, `table_corner_guards`, `extra_pillows_and_blankets`, `ski_in_ski_out`, `window_guards`, `disabled_parking_spot`, `grab_rails_in_toilet`, `events_allowed`, `common_spaces_shared`, `bathroom_shared`, `security_cameras`

Clients SHOULD treat unrecognized spec names gracefully and MAY display them as-is.

### Relay Index Tags

Publishers MAY duplicate selected multi-letter tags into single-letter index tags so relays can filter more efficiently. Readers MUST treat the canonical multi-letter tags as authoritative and use index tags only as hints.

These single-letter index meanings are scoped to `kind:32121`; readers MUST NOT interpret them outside accommodation listing events.

Known index tags include:

| Tag | Source field |
| --- | ------------ |
| `T` | `type` |
| `I` | `instantBook` |
| `N` | `negotiable` |
| `s` | Boolean `spec` values |
| `c` | `spec=max_guests` |
| `b` | `spec=beds` |
| `B` | `spec=bedrooms` |
| `R` | `spec=bathrooms` |
| `S` | Sorted boolean-spec combinations for feature-AND search |

## Listing Anchor

A listing's stable identity for cross-event references follows the parameterized replaceable event address format:

```
32121:<pubkey>:<d-tag>
```

This anchor can be encoded as an `naddr` ([NIP-19](19.md)) or a `nostr:` URI ([NIP-21](21.md)). Other event kinds (reservations, reviews) reference listings via an `a` tag containing this anchor.

## Example Event

```jsonc
{
  "kind": 32121,
  "pubkey": "a1b2c3d4e5f6...",
  "created_at": 1712678400,
  "content": "A beautiful beachfront villa with stunning ocean views. Two bedrooms, private pool, and direct beach access. Perfect for a quiet getaway.",
  "tags": [
    ["d", "m1abc2"],
    ["title", "Ocean View Villa"],
    ["image", "https://example.com/villa-front.jpg"],
    ["image", "https://example.com/villa-pool.jpg"],
    ["image", "https://example.com/villa-bedroom.jpg"],
    ["t", "accommodation"],
    ["active", "true"],
    ["type", "villa"],
    ["negotiable", "false"],
    ["minStay", "2"],
    ["checkIn", "15:0"],
    ["checkOut", "11:0"],
    ["location", "Bali, Indonesia"],
    ["quantity", "1"],
    ["instantBook", "true"],
    ["allowSelfSignedReservation", "false"],
    ["published_at", "1712678400"],
    ["price", "0.00050000", "BTC", "day"],
    ["cancellationPolicy", "172800", "1.0"],
    ["cancellationPolicy", "86400", "0.5"],
    ["spec", "wireless_internet"],
    ["spec", "pool"],
    ["spec", "beachfront"],
    ["spec", "kitchen"],
    ["spec", "airconditioning"],
    ["spec", "beds", "4"],
    ["spec", "bedrooms", "2"],
    ["spec", "bathrooms", "2"],
    ["spec", "bathtub", "1"],
    ["spec", "max_guests", "6"],
    ["securityDeposit", "0.00025000", "BTC", "8"],
    ["minPaymentAmount", "0.00010000", "BTC", "8"],
    ["maxDisputePeriod", "1209600"],
    ["g", "8c2ab34567"],
  ],
  "id": "...",
  "sig": "...",
}
```

## Cost Calculation

When a guest selects dates, the client computes the cost from the listing's `price` tags:

- **Recurring prices:** `units = days_in_range / frequency_in_days`, then `cost = units × amount`.
  - `day` = 1 day, `week` = 7 days, `month` = 30 days, `year` = 365 days.
- **One-time/fixed prices:** `cost = amount × quantity`.
- If multiple `price` tags are present, the client SHOULD use the cheapest applicable price for the selected date range.

## Client Behavior

Clients displaying listings SHOULD:

1. Render the `.content` as Markdown for the description.
2. Display images from `image` tags in a gallery or carousel.
3. Show pricing with frequency (e.g. "0.0005 BTC / day").
4. Display specifications grouped by category when possible.
5. Show cancellation policies sorted by advance notice period.
6. Support geospatial search using H3 values from `g` tags.
7. Only show listings where `active` is `true` (or absent) in search results.

## Related NIPs

- [NIP-01](01.md) — Event structure and parameterized replaceable events.
- [NIP-19](19.md) — `naddr` encoding for listing anchors.
- [NIP-21](21.md) — `nostr:` URI scheme for linking to listings.
