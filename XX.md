NIP-XX
======

Accommodation Listing Profile for NIP-99 Marketplace Listings
-------------------------------------------------------------

`draft` `optional`

This NIP defines an accommodation marketplace profile for the NIP-99
Marketplace Listing Extension and [NIP-99](99.md) classified listings. It does
not define a new listing event kind.

Accommodation listings use the NIP-99 event kinds:

| Kind    | Description                         |
| ------- | ----------------------------------- |
| `30402` | Active accommodation listing        |
| `30403` | Draft or inactive accommodation listing |

Generic marketplace behavior, including `instantBook`, `negotiable`,
`quantity`, security deposits, minimum payment amounts, and maximum dispute
periods, and cancellation policies, is defined by the NIP-99 Marketplace Listing
Extension. This NIP only defines accommodation-specific profile tags and
location indexing.

## Terms

- **Buyer** - Nostr user searching for accommodation.
- **Seller** - Nostr user providing accommodation.
- **Listing** - A single accommodation unit or property advertised by a seller.

## Profile Tag

Accommodation listings MUST include:

```json
["t", "accommodation"]
```

Clients SHOULD treat `["t", "accommodation"]` as the canonical signal that a
NIP-99 marketplace listing follows this accommodation profile.

## Accommodation Tags

Accommodation listings SHOULD include a `type` tag:

```json
["type", "<listing-type>"]
```

Recognized listing types are:

`room`, `house`, `apartment`, `villa`, `hotel`, `hostel`, `resort`

Accommodation listings MAY include the following accommodation-specific tags:

| Tag                  | Format                                            | Description |
| -------------------- | ------------------------------------------------- | ----------- |
| `minStay`            | `["minStay", "<integer>"]`                        | Minimum stay in days. Default `1`. |
| `checkIn`            | `["checkIn", "<hour>:<minute>"]`                  | Check-in time in 24h format. Default `"15:00"`. |
| `checkOut`           | `["checkOut", "<hour>:<minute>"]`                 | Check-out time in 24h format. Default `"11:00"`. |
| `spec`               | `["spec", "<spec-name>"]` or `["spec", "<spec-name>", "<value>"]` | Accommodation feature or detail. |

Tags already defined by NIP-99, such as `title`, `summary`, `published_at`,
`location`, `image`, `price`, and `status`, SHOULD be used as defined there.

## H3 Location Indexing

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

## Accommodation Promoted Tags

The promoted tags below are scoped to NIP-99 marketplace listings with
`["t", "accommodation"]`. Readers MUST NOT interpret these meanings outside this
profile.

| Tag | Source field      | Value format |
| --- | ----------------- | ------------ |
| `T` | `type`            | One recognized listing type. |
| `s` | Boolean `spec`    | One boolean accommodation spec name. Repeatable. |
| `c` | `spec=max_guests` | Integer. |
| `b` | `spec=beds`       | Integer. |
| `B` | `spec=bedrooms`   | Integer. |
| `R` | `spec=bathrooms`  | Integer. |
| `S` | Boolean spec set  | Sorted boolean-spec combinations for feature-AND search. |

Generic promoted tags from the NIP-99 Marketplace Listing Extension, such as
`I` for `instantBook` and `N` for `negotiable`, retain their generic meaning.

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
    ["type", "villa"],
    ["T", "villa"],
    ["minStay", "2"],
    ["checkIn", "15:00"],
    ["checkOut", "11:00"],
    ["location", "Bali, Indonesia"],
    ["quantity", "1"],
    ["instantBook", "true"],
    ["I", "true"],
    ["negotiable", "false"],
    ["N", "false"],
    ["price", "0.00050000", "BTC", "day"],
    ["spec", "wireless_internet"],
    ["s", "wireless_internet"],
    ["spec", "pool"],
    ["s", "pool"],
    ["spec", "beachfront"],
    ["s", "beachfront"],
    ["spec", "kitchen"],
    ["s", "kitchen"],
    ["spec", "beds", "4"],
    ["b", "4"],
    ["spec", "bedrooms", "2"],
    ["B", "2"],
    ["spec", "bathrooms", "2"],
    ["R", "2"],
    ["spec", "max_guests", "6"],
    ["c", "6"],
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
2. Apply the generic marketplace listing behavior from the NIP-99 Marketplace
   Listing Extension.
3. Use `["t", "accommodation"]` to detect this profile.
4. Display accommodation specifications grouped by category when possible.
5. Support geospatial search using all published H3 `g` tags.

## Related NIPs

- NIP-99 Marketplace Listing Extension.
- [NIP-99](99.md) - Classified Listings.
- [NIP-19](19.md) - `naddr` encoding for listing anchors.
- [NIP-21](21.md) - `nostr:` URI scheme for linking to listings.
