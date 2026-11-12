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

The `content` field MUST be an empty string, and clients MUST ignore it.

`expires_at` and `executed_at` are Unix timestamps in seconds.

Amounts, prices and bonds are unsigned decimal strings matching `^[0-9]+(\.[0-9]+)?$` (e.g. `"0.0015"`). `premium` uses the same format with an optional leading `-`: `^-?[0-9]+(\.[0-9]+)?$`. Clients SHOULD use decimal arithmetic instead of floating point.

### Asset identity

An asset is identified by its `c`, `layer`, `network` and `contract` tags. For `internal` assets the platform's `pubkey` is also part of the identity, since balances held on different platforms are not fungible. Orders and trades of `internal` assets MUST be signed by the platform that holds the ledger. Publishers MUST use distinct `c` values for `internal` balances that are not fungible with each other.

Clients aggregating prices or volumes MUST group orders and trades by the complete asset identity and by fiat currency (`f`). Clients MAY display orders of different assets together, e.g. USDT on several layers.

## Order

Each status change of an order is published as a new event with the same `d` tag.

```json
{
  "id": "27e31a15cf1c1ff84d84e5985c6b761921f14fdc29155f35eb5dcb1c33445ec6",
  "pubkey": "0808b8bbcdc7ac78da4ddf821d445ed93a37df6ba49517c27d95beb5a48e3ef9",
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
  "sig": "2509d6de9f8b5d6b03e14d9b2f2f4c180fcbcbd3b07f5a0d0e0d3f2b6d30fd15c9e551a28f38ae5ad9cb75e985d6fb1086db0921c02e2a0269ef5a054c2dc9e0"
}
```

### Tags

- `d` < Order ID >: A unique identifier for the order.
- `k` < Order type >: `sell` or `buy`, from the maker's point of view, referring to the asset.
- `c` < Asset >: The lowercase ticker of the crypto asset or platform balance being traded (e.g. `usdt`, `usdc`, `sol`, `eth`). A balance that only exists on a platform uses a ticker defined by that platform.
- `layer` < Layer >: Where the asset is settled. See [Layers](#layers).
- `network` < Network >: `mainnet`, or the name of a test network in lowercase. On `internal`, it identifies the platform environment rather than a blockchain network: `mainnet` for production balances and `testnet` for testing balances.
- `contract` [Contract]: The contract address, mint or asset ID of the token on the given `layer`. It MUST be present for tokens, and MUST be omitted for native assets (e.g. `sol` on `sol`, `eth` on `eth`) and on `internal`. On EVM layers (`eth`, `bsc`, `pol`, `arb`, `op`, `base`, `rsk` and any other EVM chain) the address MUST be lowercase. On `ton` it MUST use the raw form `<workchain>:<hex>` with lowercase hex (e.g. `0:b113a994b5024a16719f69139328eb759596c38a25f59028b146fecdc3621dfe` for USDT). On any other layer it MUST be kept exactly as the chain represents it.
- `f` < Currency >: The fiat currency, using the [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) code. For currencies with no ISO 4217 code, the uppercase code commonly used in that market MAY be used.
- `s` < Status >: `pending`, `canceled`, `in-progress`, `success`, `expired`.
- `amt` < Amount >: The amount of the asset, in its main unit. It MUST be `"0"` while the order is `pending` if it is a range order, if its amount is computed when taken, or if it can be taken several times.
- `fa` < Fiat amount >: The fiat amount. Range orders and orders that can be taken several times carry two values, the minimum and the maximum. The minimum MUST be less than or equal to the maximum.
- `price` [Price]: The fixed price in fiat per unit of the asset.
- `premium` [Premium]: The percentage over (positive) or under (negative) a market price that the maker is willing to pay or receive. The source of the market price is defined by the platform.
- `pm` < Payment method >: The payment methods accepted, one per tag value.
- `source` [Source]: A URL that redirects to the order.
- `rating` [Rating]: The rating of the maker, as a JSON string. How it is calculated is defined by the platform.
- `name` [Name]: The name of the maker.
- `g` [Geohash]: The geohash of the operation, useful for face to face trades.
- `bond` [Bond]: The bond amount, a security deposit. An optional second value is the lowercase ticker of the asset the bond is held in (e.g. `["bond", "5", "usdc"]`); if omitted, it is the asset of the order. The amount is in the main unit of that asset. The ticker is informational and does not identify a specific chain or contract; the exact bond asset and terms are defined by the platform. Clients MUST NOT use it for asset aggregation.
- `expires_at` < Expires At >: The time after which a `pending` order SHOULD be changed to `expired`.
- `expiration` [Expiration]: The time after which relays SHOULD delete the event ([NIP-40](40.md)).
- `y` < Platform >: The platform that created the order.
- `z` < Document >: `order`.

An order MUST include exactly one of `price` or `premium`, and SHOULD prefer `price`.

Mandatory tags are enclosed with `<tag>`, optional tags are enclosed with `[tag]`.

### Final values

When an order that can only be taken once moves to `in-progress` or `success`, it MUST carry the values agreed between the parties: a non-zero `amt` and a single-value `fa`.

An order that can be taken several times (e.g. an ad taken by many counterparties) stays `pending` while it can still be taken, with `amt` set to `"0"` and `fa` set to the remaining minimum and maximum. Each execution is recorded as a [trade](#trade). When the order can no longer be taken it moves to `success`, `canceled` or `expired`, and if any execution happened `amt` and `fa` MUST be single values with the executed totals.

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

A trade MUST NOT carry an `expiration` tag, and MUST NOT be replaced except to correct an error. A correction keeps the same `d` and `executed_at` and uses a later `created_at`.

```json
{
  "id": "87d286391e306ca107cfeb29f631ae3fc7a7d4869d4fa9e4813f5e63d1c9e396",
  "pubkey": "0808b8bbcdc7ac78da4ddf821d445ed93a37df6ba49517c27d95beb5a48e3ef9",
  "created_at": 1760209200,
  "kind": 35353,
  "tags": [
    ["d", "5f9e2c41-0b8d-4a6e-b1c7-93d4e8a2f610"],
    ["a", "35353:0808b8bbcdc7ac78da4ddf821d445ed93a37df6ba49517c27d95beb5a48e3ef9:b3c1f0a2-7e44-4d1e-9a0b-2f6c8e1d5a77"],
    ["k", "sell"],
    ["c", "usdt"],
    ["layer", "trx"],
    ["network", "mainnet"],
    ["contract", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"],
    ["f", "USD"],
    ["amt", "100"],
    ["fa", "102"],
    ["executed_at", "1760205600"],
    ["pm", "bank transfer"],
    ["y", "example-platform"],
    ["z", "trade"]
  ],
  "content": "",
  "sig": "7d1cf7ac0df72440a28cc2eafe7375f733cabf382c282a93dbb0ae5d8351ea9dc0d74383498b6ab8f6010a4159abd100744a4e158f8894470b38d8f349ead4e7"
}
```

### Tags

- `d` < Trade ID >: A unique identifier for the trade, different from any order ID.
- `a` [Order]: An optional reference to the order this trade fills, as `35353:<pubkey>:<order d>`. It MAY be omitted, including for privacy reasons, even if the order was published. When present, the pubkey MUST be the pubkey of the trade.
- `k` < Order type >: The order type, from the point of view of the order's maker.
- `c`, `layer`, `network`, `contract`, `f`, `y`: As in the order.
- `amt` < Amount >: The executed amount of the asset. It MUST be greater than zero.
- `fa` < Fiat amount >: The executed fiat amount. It MUST be greater than zero. The executed price is `fa / amt`.
- `executed_at` < Executed At >: The time of the execution. It MAY be rounded.
- `pm` [Payment method]: The payment method used.
- `z` < Document >: `trade`.

## Security considerations

A signature proves that the platform states that an order or trade happened, not that it actually happened. Clients building market statistics SHOULD keep track of which platform produced each data point, SHOULD let users include or exclude platforms, and SHOULD use trades only, since final order values duplicate them.

The amount, time and payment method of a trade may be enough to link it to a bank transfer. Trades MUST NOT include information about the counterparties. Platforms MAY delay the publication of trades and MAY round `executed_at`. The `a` tag links a trade to its order, which may carry `name`, `rating` or `source`; platforms MAY omit it.

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

[NIP-01](01.md) only expects relays to index single-letter tags, so `layer`, `network` and `contract` are not filtered by these queries. Their results MUST be grouped by [asset identity](#asset-identity) before aggregating.

## References

- [NIP-01: Basic protocol flow description](01.md)
- [NIP-40: Expiration Timestamp](40.md)
- [NIP-69: Peer-to-peer Order events](69.md)
