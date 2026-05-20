NIP-XX
======

NIP-99 Marketplace Listing Extension
------------------------------------

## Terms

- **Marketplace profile** - A listing category identified by a `t` tag whose
  specification defines additional tags and promoted index fields.
- **Canonical tag** - A full, descriptive tag name whose value is authoritative.
- **Promoted tag** - A tag duplicated or normalized for relay filtering. Its
  meaning may be defined by the active marketplace profile.

## Marketplace Profile Tags

A marketplace listing SHOULD include at least one `t` tag that identifies the
marketplace profile it follows:

```json
["t", "<profile-name>"]
```

For example:

```json
["t", "accommodation"]
```

The value of a profile `t` tag determines how profile-scoped promoted tags are
interpreted. A promoted tag such as `T`, `c`, or `s` MAY have different meanings
for different marketplace profiles.

## Generic Marketplace Tags

The following tags have the same meaning for all marketplace listings using this
extension:

| Tag                | Format                                                      | Description |
| ------------------ | ----------------------------------------------------------- | ----------- |
| `instantBook`      | `["instantBook", "true"\|"false"]`                          | Whether the buyer can commit to the listed price without seller approval. Default `false`. |
| `negotiable`       | `["negotiable", "true"\|"false"]`                           | Whether the seller accepts negotiated terms or prices. Default `false`. |
| `rentOrBuy`       | `["rentOrBuy", "rent"\|"buy"]`                             | Whether the listing is offered for recurring rental/reservation or one-time purchase. SHOULD be derived from the `price` tag: if any price includes a frequency, use `rent`; otherwise use `buy`. |
| `quantity`         | `["quantity", "<integer>"]`                                 | Number of independently purchasable, reservable, or bookable units. Default `1`. |
| `securityDeposit`  | `["securityDeposit", "<amount>", "<denom>", "<decimals>"]`  | Optional deposit the buyer must lock alongside payment. |
| `minPaymentAmount` | `["minPaymentAmount", "<amount>", "<denom>", "<decimals>"]` | Minimum payment amount the seller will accept. |
| `maxDisputePeriod` | `["maxDisputePeriod", "<seconds>"]`                         | Maximum time an escrow dispute may remain open before unilateral claim. |
| `cancellationPolicy` | `["cancellationPolicy", "<seconds-before-start>", "<refund-fraction>"]` | Refund terms based on how far in advance the buyer cancels. Repeatable. |

Boolean values MUST be either `"true"` or `"false"`.

`rentOrBuy` is a search and display classification derived from `price`.
Clients SHOULD treat `price` frequency as authoritative when deriving or
validating it.

`<refund-fraction>` is a decimal fraction from `0.0` to `1.0` of the total cost
refunded, for example `"0.5"` for 50%. Clients SHOULD sort cancellation policies
by advance notice period before displaying them.

## Promoted Tags

Marketplace profiles MAY define promoted tags to make common filters efficient
for relays and clients. Promoted tags SHOULD be derived from canonical tags or
from structured data in `.content`.

Promoted tags are search hints. When a canonical tag and a promoted tag conflict,
clients SHOULD treat the canonical tag as authoritative.

A profile specification that defines promoted tags SHOULD state:

1. The required `t` profile value.
2. Each promoted tag name.
3. The canonical field it indexes.
4. Whether the tag is required, optional, repeatable, or mutually exclusive.
5. The value format, including allowed enum values when applicable.
6. Whether values are strings, booleans, integers, decimals, timestamps, or
   profile-specific identifiers.

Profiles SHOULD prefer descriptive canonical tags for authoring and compact
promoted tags only when relay filtering benefits from them.

## Common Promoted Tag Conventions

The following compact promoted tags are reserved by this extension:

| Tag | Source field      | Description |
| --- | ----------------- | ----------- |
| `I` | `instantBook`     | Same value as `instantBook`. |
| `M` | `rentOrBuy`      | Same value as `rentOrBuy`; `rent` or `buy`. |
| `N` | `negotiable`      | Same value as `negotiable`. |

Marketplace profiles MAY define additional compact promoted tags. Those tags
are scoped by the profile `t` value.

For example, an accommodation profile could define `T` as accommodation type and
`c` as maximum guest capacity:

```json
["t", "accommodation"]
["instantBook", "true"]
["I", "true"]
["rentOrBuy", "rent"]
["M", "rent"]
["negotiable", "false"]
["N", "false"]
["T", "villa"]
["c", "6"]
```

Another profile MAY use `T` or `c` differently, but clients MUST only interpret
those tags under a profile they understand.

## Location Tags

NIP-99 defines `g` as a useful tag for more precise location. Marketplace
profiles MAY define the exact location encoding used in `g` tags.

For example, a marketplace profile may specify that `g` values are geohashes,
H3 cell indexes, administrative region identifiers, or another profile-specific
location index.

## Example Event

```jsonc
{
  "kind": 30402,
  "pubkey": "a1b2c3d4e5f6...",
  "created_at": 1712678400,
  "content": "A marketplace listing description in Markdown.",
  "tags": [
    ["d", "m1abc2"],
    ["title", "Example Listing"],
    ["summary", "Short listing summary"],
    ["image", "https://example.com/listing.jpg"],
    ["published_at", "1712678400"],
    ["status", "active"],
    ["t", "accommodation"],
    ["price", "0.00050000", "BTC", "day"],
    ["quantity", "1"],
    ["instantBook", "true"],
    ["I", "true"],
    ["rentOrBuy", "rent"],
    ["M", "rent"],
    ["negotiable", "false"],
    ["N", "false"],
    ["cancellationPolicy", "172800", "1.0"],
    ["cancellationPolicy", "86400", "0.5"],
    ["T", "villa"],
    ["c", "6"]
  ],
  "id": "...",
  "sig": "..."
}
```

## Client Behavior

Clients displaying marketplace listings SHOULD:

1. Apply the base NIP-99 listing behavior.
2. Read `t` tags to determine which marketplace profiles the listing advertises.
3. Interpret generic marketplace tags defined by this NIP.
4. Interpret profile-scoped promoted tags only for profiles they understand.
5. Ignore unrecognized promoted tags without rejecting the listing.

## Related NIPs

- [NIP-99](99.md) - Classified Listings.
- [NIP-19](19.md) - `naddr` encoding for listing anchors.
- [NIP-21](21.md) - `nostr:` URI scheme for linking to listings.
