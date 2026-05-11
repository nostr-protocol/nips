NIP-XX
======

Accommodation Listing Extension for NIP-99
------------------------------------------

`draft` `optional`

This NIP defines an accommodation-specific profile for [NIP-99](99.md)
classified listings. It does not define a new listing event kind.

Accommodation listings use the NIP-99 event kinds:

| Kind    | Description                         |
| ------- | ----------------------------------- |
| `30402` | Active accommodation listing        |
| `30403` | Draft or inactive accommodation listing |

All rules for NIP-99 listing identity, authoring, content, base metadata,
images, prices, and status remain defined by NIP-99. This NIP only defines
additional tags and behavior for listings categorized as accommodation.

## Terms

- **Buyer** - Nostr user searching for accommodation.
- **Seller** - Nostr user providing accommodation.
- **Listing** - A single accommodation unit or property advertised by a seller.

## Category Tags

Accommodation listings MUST include:

```json
["t", "accommodation"]
```

Clients SHOULD treat `["t", "accommodation"]` as the canonical signal that a
NIP-99 listing follows this accommodation profile.

## Accommodation Tags

Accommodation listings SHOULD include a `type` tag:

```json
["type", "<listing-type>"]
```

Recognized listing types are:

`room`, `house`, `apartment`, `villa`, `hotel`, `hostel`, `resort`

Accommodation listings MAY include the following additional tags:

| Tag                          | Format                                                      | Description |
| ---------------------------- | ----------------------------------------------------------- | ----------- |
| `active`                     | `["active", "true"\|"false"]`                               | Whether the listing is currently available. Default `true`. |
| `negotiable`                 | `["negotiable", "true"\|"false"]`                           | Whether the seller accepts negotiated prices below the listed price. Default `false`. |
| `minStay`                    | `["minStay", "<integer>"]`                                  | Minimum stay in days. Default `1`. |
| `checkIn`                    | `["checkIn", "<hour>:<minute>"]`                            | Check-in time in 24h format. Default `"15:0"`. |
| `checkOut`                   | `["checkOut", "<hour>:<minute>"]`                           | Check-out time in 24h format. Default `"11:0"`. |
| `quantity`                   | `["quantity", "<integer>"]`                                 | Number of independently bookable units. Default `1`. |
| `instantBook`                | `["instantBook", "true"\|"false"]`                          | Whether reservations are confirmed instantly without seller approval. Default `true`. |
| `allowSelfSignedReservation` | `["allowSelfSignedReservation", "true"\|"false"]`           | Whether buyers may self-sign reservations, for example via zap proof. Default `false`. |
| `securityDeposit`            | `["securityDeposit", "<amount>", "<denom>", "<decimals>"]`  | Optional security deposit the buyer must lock alongside the payment. |
| `minPaymentAmount`           | `["minPaymentAmount", "<amount>", "<denom>", "<decimals>"]` | Minimum payment amount the seller will accept for a reservation. |
| `maxDisputePeriod`           | `["maxDisputePeriod", "<seconds>"]`                         | Maximum time after checkout that escrow may remain disputed before unilateral claim. Default `1209600`. |

Tags already defined by NIP-99, such as `title`, `summary`, `published_at`,
`location`, `image`, `price`, and `status`, SHOULD be used as defined there.

## Location Indexing

Accommodation listings SHOULD include `g` tags containing H3 cell indexes for
location-based search.

Publishers MUST include multiple `g` tags: one for the listing's most precise
public H3 cell, plus every parent cell in that H3 hierarchy. This allows a
listing to appear in search results regardless of the buyer's selected search
granularity.

If a seller does not want to disclose the exact property location, the publisher
SHOULD choose the most precise H3 cell the seller is willing to reveal, then add
that cell and all parent cells.

For example, a listing whose most precise public H3 cell is resolution 12 would
include:

```json
["g", "<h3-res-12-cell>"]
["g", "<h3-res-11-parent>"]
["g", "<h3-res-10-parent>"]
["g", "<h3-res-9-parent>"]
["g", "<h3-res-8-parent>"]
["g", "..."]
["g", "<h3-res-0-parent>"]
```

Clients searching by area SHOULD query the `g` value matching their desired H3
granularity. Clients MAY also query neighboring cells when the search radius
crosses cell boundaries.

Publishers SHOULD use H3 indexes for accommodation listings. They SHOULD NOT use
geohash strings in `g` tags for this profile.

## Cancellation Policy Tags

Listings MAY include one or more `cancellationPolicy` tags defining refund terms
based on how far in advance the buyer cancels.

```json
["cancellationPolicy", "<seconds-before-start>", "<refund-fraction>"]
```

- `<seconds-before-start>` is the number of seconds before check-in that this
  policy applies.
- `<refund-fraction>` is a decimal fraction from `0.0` to `1.0` of the total
  cost refunded, for example `"0.5"` for 50%.

Clients SHOULD sort cancellation policies by advance notice period before
displaying them.

## Specification Tags

Listings MAY include `spec` tags advertising accommodation features and details.

Boolean specifications are represented by presence:

```json
["spec", "<spec-name>"]
```

Valued specifications include a value:

```json
["spec", "<spec-name>", "<value>"]
```

Valued specs MUST include a value. Boolean specs MUST NOT include a value.

### Recognized Accommodation Specifications

The recognized names below are specific to accommodation listings. Clients
SHOULD treat unrecognized spec names gracefully and MAY display them as-is.

Valued integer specs:

`bathtub`, `bathrooms`, `beds`, `bedrooms`, `max_guests`, `tv`

Boolean specs:

`airconditioning`, `allows_pets`, `crib`, `tumble_dryer`, `washer`, `elevator`,
`free_parking`, `gym`, `hair_dryer`, `heating`, `high_chair`,
`wireless_internet`, `iron`, `jacuzzi`, `kitchen`, `outlet_covers`, `pool`,
`private_entrance`, `smoking_allowed`, `breakfast`, `fireplace`,
`smoke_detector`, `essentials`, `shampoo`, `infants_allowed`,
`children_allowed`, `hangers`, `flat_smooth_pathway_to_front_door`,
`grab_rails_in_shower_and_toilet`, `oven`, `bbq`, `balcony`, `patio`,
`dishwasher`, `refrigerator`, `garden_or_backyard`, `microwave`,
`coffee_maker`, `dishes_and_silverware`, `stove`, `fire_extinguisher`,
`carbon_monoxide_detector`, `luggage_dropoff_allowed`, `beach_essentials`,
`beachfront`, `baby_monitor`, `babysitter_recommendations`,
`childrens_books_and_toys`, `game_console`, `street_parking`, `paid_parking`,
`hot_water`, `lake_access`, `single_level_home`, `waterfront`,
`first_aid_kit`, `handheld_shower_head`, `home_step_free_access`,
`lock_on_bedroom_door`, `mobile_hoist`, `path_to_entrance_lit_at_night`,
`pool_hoist`, `ev_charger`, `rollin_shower`, `shower_chair`,
`tub_with_shower_bench`, `wide_clearance_to_bed`,
`wide_clearance_to_shower_and_toilet`, `wide_hallway_clearance`, `baby_bath`,
`changing_table`, `room_darkening_shades`, `stair_gates`,
`table_corner_guards`, `extra_pillows_and_blankets`, `ski_in_ski_out`,
`window_guards`, `disabled_parking_spot`, `grab_rails_in_toilet`,
`events_allowed`, `common_spaces_shared`, `bathroom_shared`,
`security_cameras`

## Relay Index Tags

Publishers MAY duplicate selected accommodation tags into single-letter index
tags so relays can filter more efficiently. Readers MUST treat the canonical
multi-letter tags as authoritative and use index tags only as hints.

These single-letter index meanings are scoped to NIP-99 listings with
`["t", "accommodation"]`; readers MUST NOT interpret them outside this profile.

Known index tags include:

| Tag | Source field |
| --- | ------------ |
| `T` | `type` |
| `A` | `active` |
| `I` | `instantBook` |
| `N` | `negotiable` |
| `s` | Boolean `spec` values |
| `c` | `spec=max_guests` |
| `b` | `spec=beds` |
| `B` | `spec=bedrooms` |
| `R` | `spec=bathrooms` |
| `S` | Sorted boolean-spec combinations for feature-AND search |

## Listing Anchor

Accommodation listing anchors use the NIP-99 addressable event form:

```text
30402:<pubkey>:<d-tag>
```

Draft or inactive listing anchors use:

```text
30403:<pubkey>:<d-tag>
```

Other event kinds, such as reservations and reviews, SHOULD reference the active
listing address with an `a` tag.

## Example Event

```jsonc
{
  "kind": 30402,
  "pubkey": "a1b2c3d4e5f6...",
  "created_at": 1712678400,
  "content": "A beautiful beachfront villa with stunning ocean views. Two bedrooms, private pool, and direct beach access. Perfect for a quiet getaway.",
  "tags": [
    ["d", "m1abc2"],
    ["title", "Ocean View Villa"],
    ["summary", "Two bedroom beachfront villa with pool"],
    ["image", "https://example.com/villa-front.jpg"],
    ["image", "https://example.com/villa-pool.jpg"],
    ["image", "https://example.com/villa-bedroom.jpg"],
    ["published_at", "1712678400"],
    ["status", "active"],
    ["t", "accommodation"],
    ["active", "true"],
    ["type", "villa"],
    ["A", "true"],
    ["negotiable", "false"],
    ["minStay", "2"],
    ["checkIn", "15:0"],
    ["checkOut", "11:0"],
    ["location", "Bali, Indonesia"],
    ["quantity", "1"],
    ["instantBook", "true"],
    ["allowSelfSignedReservation", "false"],
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
    ["g", "8c2ab34567fffff"],
    ["g", "8b2ab34567fffff"],
    ["g", "8a2ab34567fffff"],
    ["g", "892ab34567fffff"],
    ["g", "882ab34567fffff"]
  ],
  "id": "...",
  "sig": "..."
}
```

## Client Behavior

Clients displaying accommodation listings SHOULD:

1. Apply the base NIP-99 listing behavior.
2. Use `["t", "accommodation"]` to detect this profile.
3. Display accommodation specifications grouped by category when possible.
4. Show cancellation policies sorted by advance notice period.
5. Support geospatial search using all published H3 `g` tags.

## Related NIPs

- [NIP-99](99.md) - Classified Listings.
- [NIP-19](19.md) - `naddr` encoding for listing anchors.
- [NIP-21](21.md) - `nostr:` URI scheme for linking to listings.
