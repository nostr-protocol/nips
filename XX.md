NIP-XX
======

Peer-to-peer Order and Trade events for non-Bitcoin assets
----------------------------------------------------------

`draft` `optional`

## Abstract

In many regions with capital controls a large part of the peer-to-peer (P2P) volume happens in stablecoins and other crypto assets traded against local fiat currencies. This liquidity is split across many platforms, and these markets lack signed reports of executed prices.

This NIP defines a common format for P2P orders of crypto assets and platform balances other than bitcoin traded against fiat, and a trade document that records each execution, so that anyone can aggregate orders and build market statistics from data signed by the platforms that produced it.

This NIP MUST NOT be used for orders or trades of native BTC, L-BTC or RBTC, including bitcoin balances held on a platform's own ledger. Bitcoin orders are covered by [NIP-69](69.md). Bitcoin-pegged tokens issued on other chains (e.g. WBTC on Ethereum) MAY use this NIP. Tag names are taken from NIP-69 where the meaning is the same, but `amt` is expressed in the asset's main unit instead of satoshis, so a different kind is used.

## The event

Events are [addressable events](01.md#kinds) of kind `35353`. The `z` tag defines the document type:

- `order`: an order, whose status changes over time.
- `trade`: a single execution of an order.

Orders and trades are signed by the platform that publishes them. The event `pubkey` identifies the platform; the `y` tag is only descriptive, since anyone can publish any `y` value. Platforms SHOULD make their pubkey discoverable, e.g. with [NIP-05](05.md).

The `content` field MUST be an empty string. Clients MUST ignore it, and a non-empty `content` does not make an event invalid.

Each tag defined by this NIP MUST appear at most once, and its values MUST NOT be empty. Clients MUST ignore unknown tags. Clients SHOULD ignore events that do not follow this NIP, e.g. events missing a mandatory tag, with a repeated tag, with an unknown `z` value, or with both `price` and `premium`.

`expires_at`, `executed_at` and `expiration` are Unix timestamps in seconds, as strings matching `^[0-9]+$`.

Amounts, prices and bonds are unsigned decimal strings matching `^[0-9]+(\.[0-9]+)?$` (e.g. `"0.0015"`). `premium` uses the same format with an optional leading `-`: `^-?[0-9]+(\.[0-9]+)?$`. Clients SHOULD use decimal arithmetic instead of floating point.

### Asset identity

An asset is identified by:

- tokens: `layer`, `network` and `contract`;
- native assets: `layer`, `network` and `c`;
- `internal` assets: the platform's `pubkey`, `network` and `c`, since balances held on different platforms are not fungible.

For tokens, `c` is descriptive: two platforms MAY use different tickers for the same contract. Orders and trades of `internal` assets MUST be signed by the platform that holds the ledger. Publishers MUST use distinct `c` values for `internal` balances that are not fungible with each other.

Clients aggregating prices or volumes MUST group orders and trades by asset identity and by fiat currency (`f`). Clients MAY display orders of different assets together, e.g. USDT on several layers.

## Order

Each change of an order is published as a new event with the same `d` tag, and each new version MUST have a later `created_at` than the previous one. Publishers MAY increment the previous `created_at` by one when necessary, but SHOULD coalesce updates and avoid timestamps significantly ahead of the current time.

The `k`, `c`, `layer`, `network`, `contract`, `f` and `maker` tags, including the absence of `contract` or `maker`, MUST NOT change between versions of an order. Changing any of them requires a new order with a new `d`. Other tags MAY change, including `price` and `premium`. A new `price` or `premium` applies only to later takes and does not change executions already in progress.

```json
{
  "id": "fab7b4086117456c900999ed482a75164f3710fca9012b42c133cc1faed5c2a3",
  "pubkey": "4f22d86cda88947c50763b731c307eaa1f12977cf83f3f7d485aff7e0854311a",
  "created_at": 1760202000,
  "kind": 35353,
  "tags": [
    ["d", "b3c1f0a2-7e44-4d1e-9a0b-2f6c8e1d5a77"],
    ["k", "sell"],
    ["c", "usdt"],
    ["layer", "trx"],
    ["network", "mainnet"],
    ["contract", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"],
    ["f", "USD"],
    ["s", "pending"],
    ["amt", "250"],
    ["fa", "255"],
    ["price", "1.02"],
    ["pm", "bank transfer", "face to face"],
    ["source", "https://example.com/orders/b3c1f0a2"],
    ["name", "Satoshi"],
    ["expires_at", "1760288400"],
    ["expiration", "1760893200"],
    ["y", "example-platform"],
    ["z", "order"]
  ],
  "content": "",
  "sig": "91b4459631c5e786114d64c9bc70165c63848e04ead933c8a9e7f5731f15ba7d74091554f7e22769e6cef966628a05582eac808d665d06283ee8af1863acc1ca"
}
```

### Tags

- `d` < Order ID >: A unique identifier for the order.
- `k` < Order type >: `sell` or `buy`, from the maker's point of view, referring to the asset.
- `c` < Asset >: The lowercase ticker of the crypto asset or platform balance being traded (e.g. `usdt`, `usdc`, `sol`, `eth`). A balance that only exists on a platform uses a ticker defined by that platform.
- `layer` < Layer >: Where the asset is settled. See [Layers](#layers).
- `network` < Network >: `mainnet`, or the name of a test network in lowercase. On `internal`, it identifies the platform environment rather than a blockchain network: `mainnet` for production balances and `testnet` for testing balances.
- `contract` [Contract]: The contract address, mint or asset ID of the token on the given `layer`. It MUST be present for tokens, and MUST be omitted for native assets (e.g. `sol` on `sol`, `eth` on `eth`) and on `internal`. On EVM layers (`eth`, `bsc`, `pol`, `arb`, `op`, `base`, `rsk` and any other EVM chain) the address MUST be lowercase. On `ton` it MUST use the raw form `<workchain>:<hex>` with lowercase hex (e.g. `0:b113a994b5024a16719f69139328eb759596c38a25f59028b146fecdc3621dfe` for USDT). On `liquid` the asset ID MUST be lowercase hex. On any other layer it MUST be kept exactly as the chain represents it.
- `f` < Currency >: The fiat currency, using the [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) code. For currencies with no ISO 4217 code, the uppercase code commonly used in that market MAY be used.
- `s` < Status >: `pending`, `paused`, `canceled`, `in-progress`, `success`, `expired`. A `paused` order cannot be taken for now, carries the same values as in `pending`, and clients MUST NOT display it as available. `pending`, `paused` and `in-progress` orders MAY change to any other status; `success`, `canceled` and `expired` are final.
- `amt` < Amount >: The amount of the asset, in its main unit. It MUST be `"0"` while the order is `pending` if it is a range order or if its amount is computed when taken, and in every status if it can be taken several times (see [Single and multiple takes](#single-and-multiple-takes)).
- `fa` < Fiat amount >: The fiat amount, with one value, or two for range orders and orders that can be taken several times: the minimum and the maximum. The minimum MUST be less than or equal to the maximum.
- `price` [Price]: The fixed price in fiat per unit of the asset, for the next take. It MUST be greater than zero. When an order also carries a non-zero `amt` and a single `fa`, `fa` is approximately `amt × price`, depending on the rounding used by the platform.
- `premium` [Premium]: The percentage over (positive) or under (negative) a market price that the maker is willing to pay or receive. It MUST be greater than `-100`. The source of the market price is defined by the platform, so premiums of different platforms are not directly comparable.
- `pm` < Payment method >: The payment methods accepted, one per tag value. Values are defined by each platform and are not necessarily comparable across platforms.
- `source` [Source]: A URL that redirects to the order.
- `rating` [Rating]: The rating of the maker, as a JSON string. How it is calculated is defined by the platform.
- `name` [Name]: The name of the maker.
- `maker` [Maker]: `platform` if the order was made by the platform itself, including accounts that trade on its behalf (e.g. its treasury), and `user` otherwise. Custodial accounts of users are not `platform`. Instead of `user`, a platform MAY use `bot` for an automated agent acting on behalf of a user, or `market-maker` for a user whose main activity is providing liquidity. Values other than `platform` are informational and not necessarily comparable across platforms. Absence means not declared, and clients MUST treat unknown values as not declared.
- `g` [Geohash]: The geohash of the operation, useful for face to face trades.
- `bond` [Bond]: The bond amount, a security deposit. An optional second value is the lowercase ticker of the asset the bond is held in (e.g. `["bond", "5", "usdc"]`); if omitted, it is the asset of the order. The amount is in the main unit of that asset. The ticker is informational and does not identify a specific chain or contract; the exact bond asset and terms are defined by the platform. Clients MUST NOT use it for asset aggregation.
- `expires_at` [Expires At]: The time after which a `pending` or `paused` order SHOULD be changed to `expired`. If omitted, the order does not expire on its own.
- `expiration` [Expiration]: The time after which relays SHOULD delete the event ([NIP-40](40.md)).
- `y` < Platform >: The platform that created the order.
- `z` < Document >: `order`.

An order MUST include exactly one of `price` or `premium`, and SHOULD prefer `price`.

Clients MUST treat an order as available only when `s` is `pending` and neither `expires_at` nor `expiration`, if present, has elapsed. `paused`, `in-progress` and final orders MUST NOT be offered as available.

Mandatory tags are enclosed with `<tag>`, optional tags are enclosed with `[tag]`.

### Single and multiple takes

An order that can only be taken once is handled as in NIP-69. When it moves to `in-progress` or `success`, it MUST carry the values agreed between the parties: a non-zero `amt` and a single-value `fa`.

An order that can be taken several times (e.g. an ad taken by many counterparties) has `amt` set to `"0"` and two `fa` values in every status:

- `pending`: the minimum and maximum that can currently be taken.
- `paused`: the values it would have in `pending`.
- `in-progress`: nothing can be taken because the remaining amount is reserved by executions in progress. `fa` is the remaining minimum and maximum, including reserved amounts. It returns to `pending` if a reservation is released.
- `success`, `canceled`, `expired`: both values are `"0"`.

It MUST NOT move to a final status while any execution is in progress, and no execution can happen after it. The final status depends on how the order is closed: `success` when nothing remains to be taken after at least one execution, `canceled` when the maker or the platform closes it, and `expired` when it reaches `expires_at`, in both cases with or without previous executions. Executed amounts are only recorded in [trades](#trade).

### Layers

`layer` values are lowercase. The values in this table take precedence over external registries:

| `layer`    | Settlement                   |
|------------|------------------------------|
| `trx`      | Tron (TRC20)                 |
| `eth`      | Ethereum (ERC20)             |
| `bsc`      | BNB Smart Chain (BEP20)      |
| `sol`      | Solana (SPL)                 |
| `ton`      | TON                          |
| `pol`      | Polygon PoS                  |
| `arb`      | Arbitrum One                 |
| `op`       | Optimism                     |
| `base`     | Base                         |
| `rsk`      | Rootstock (RSK) tokens       |
| `liquid`   | Liquid Network issued assets |
| `internal` | The platform's own ledger    |

For EVM chains not in this table, the lowercase `shortName` from [ethereum-lists/chains](https://github.com/ethereum-lists/chains) SHOULD be used. Other lowercase values MAY be used for non-EVM chains not in this table.

`internal` is used when settlement occurs on the platform's own ledger, either for a balance that represents an on-chain asset or for a balance that only exists on the platform. Clients SHOULD indicate that `internal` assets are balances held by the platform. For example, the asset tags for USDT held on a platform's own ledger are:

```json
[
  ["c", "usdt"],
  ["layer", "internal"],
  ["network", "mainnet"]
]
```

The `contract` tag is omitted. The `internal` layer distinguishes this balance from on-chain USDT, and the platform's `pubkey`, not the descriptive `y` tag, distinguishes it from internal balances held on other platforms. Balances in a platform's test environment use `testnet` instead of `mainnet`.

## Trade

A trade records a single execution of an order. It is published by the same platform once the execution reaches `success`, with its own `d` tag. Every execution of a published order MUST be published as a trade. A platform MAY publish trades without publishing its orders.

A trade MUST NOT carry an `expiration` tag, and MUST NOT be replaced except to correct an error. A correction uses a later `created_at` and keeps `d`, `k`, `c`, `layer`, `network`, `contract`, `f` and `maker`, including the absence of `contract` or `maker`. It MAY change `amt`, `fa`, `executed_at` and `pm`, and MAY remove `a`, but MUST NOT add or change it. Removing `a` does not remove copies of earlier versions that others may have archived. Clients keep the latest version of each trade.

A trade that must be withdrawn, e.g. an execution reversed after `success`, a duplicate, or a trade with an error in a tag that a correction cannot change, is withdrawn by publishing a [NIP-09](09.md) deletion request from the same pubkey, with an `a` tag referencing the trade and a `k` tag set to `35353`. Clients building market statistics SHOULD fetch deletion requests from the platforms they aggregate, and MUST exclude from prices and volumes the trades referenced by the valid deletion requests they have received.

```json
{
  "id": "d54fbb9cd6ee9a9de13c0514c88dc762351e485c246ccc4e7f6b0ed37cfec9d8",
  "pubkey": "4f22d86cda88947c50763b731c307eaa1f12977cf83f3f7d485aff7e0854311a",
  "created_at": 1760209200,
  "kind": 35353,
  "tags": [
    ["d", "5f9e2c41-0b8d-4a6e-b1c7-93d4e8a2f610"],
    ["a", "35353:4f22d86cda88947c50763b731c307eaa1f12977cf83f3f7d485aff7e0854311a:b3c1f0a2-7e44-4d1e-9a0b-2f6c8e1d5a77"],
    ["k", "sell"],
    ["c", "usdt"],
    ["layer", "trx"],
    ["network", "mainnet"],
    ["contract", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"],
    ["f", "USD"],
    ["amt", "250"],
    ["fa", "255"],
    ["executed_at", "1760205600"],
    ["pm", "bank transfer"],
    ["y", "example-platform"],
    ["z", "trade"]
  ],
  "content": "",
  "sig": "acb85305b4b101160e566a0755e3d37f7d676061036df8a86ca0359d191d1b433ac93c6eacfacab8f0942f939b2284a5101e60f981cafd0bc1c842ff26355fde"
}
```

### Tags

- `d` < Trade ID >: A unique identifier for the trade, different from any order ID.
- `a` [Order]: An optional reference to the order this trade fills, as `35353:<pubkey>:<order d>`. It MAY be omitted, including for privacy reasons, even if the order was published. When present, the pubkey MUST be the pubkey of the trade, and the trade's `k`, `c`, `layer`, `network`, `contract`, `f` and `maker` MUST match the referenced order.
- `k` < Order type >: The order type, from the point of view of the order's maker.
- `c`, `layer`, `network`, `contract`, `f`, `maker`, `y`: As in the order.
- `amt` < Amount >: The executed amount of the asset. It MUST be greater than zero.
- `fa` < Fiat amount >: The executed fiat amount. It MUST be greater than zero. The executed price is `fa / amt`. Clients MUST NOT use the `price` or `premium` of an order to derive the executed price of its trades.
- `executed_at` < Executed At >: The time of the execution. It MUST NOT be later than the trade's `created_at`. It MAY be rounded, and then it SHOULD be rounded down.
- `pm` [Payment method]: The payment method used.
- `z` < Document >: `trade`.

## Security considerations

A signature proves that the platform states that an order or trade happened, not that it actually happened. `maker`, the executed amounts and the completeness of the history are statements of the platform; this NIP does not protect against wash trading. Clients building market statistics SHOULD keep track of which platform produced each data point, SHOULD let users include or exclude platforms and events with `maker` set to `platform`, and MUST derive executed prices and volumes from trades, not from order values. Prices of the same asset and fiat can differ by payment method; clients MAY segment trades by `pm` within a platform.

The protocol cannot verify that a platform published every execution, nor that a replaced trade was a correction. Relays are only required to keep the latest version of an addressable event, so clients cannot rely on earlier versions of a corrected trade being available.

The amount, time and payment method of a trade may be enough to link it to a bank transfer. Trades MUST NOT directly include information that identifies the counterparties. The `a` tag links a trade to its order, which may carry `name`, `rating` or `source`, so it can indirectly reveal the public identity of the maker. Platforms MAY omit `a`, MAY delay the publication of trades and MAY round `executed_at`.

The price of the asset in other currencies at execution time is outside the scope of this NIP. Clients that need it SHOULD obtain it from a source of their choice using the trade's `executed_at`.

## Example queries

Pending USDT orders against USD:

```json
{ "kinds": [35353], "#z": ["order"], "#c": ["usdt"], "#f": ["USD"], "#s": ["pending"] }
```

USDT/USD trades published since a given time:

```json
{ "kinds": [35353], "#z": ["trade"], "#c": ["usdt"], "#f": ["USD"], "since": 1760000000 }
```

[NIP-01](01.md) only expects relays to index single-letter tags, so `layer`, `network` and `contract` are not filtered by these queries. Their results MUST be grouped by [asset identity](#asset-identity) before aggregating. Since `c` is descriptive for tokens, a query by `#c` can miss a token published under another ticker.

`since` and `until` filter by `created_at`, not by `executed_at`. Trades can be published late or corrected, so clients SHOULD fetch them by publication time and then filter them by `executed_at`.

## Implementations

- [QvaPay](https://www.qvapay.com/docs/p2p/nostr): orders and trades.

## References

- [NIP-01: Basic protocol flow description](01.md)
- [NIP-05: Mapping Nostr keys to DNS-based internet identifiers](05.md)
- [NIP-09: Event Deletion Request](09.md)
- [NIP-40: Expiration Timestamp](40.md)
- [NIP-69: Peer-to-peer Order events](69.md)
