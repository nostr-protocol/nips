NIP-69 (Advert)
======

Peer-to-peer Advert events
-------------------------

`draft` `optional`

## Abstract

This NIP defines advert events for peer-to-peer marketplaces. While [NIP-69](69.md) defines order events for specific trade requests, adverts broadcast a maker's standing offer to trade with their available liquidity, trading pairs, payment methods, and conditions. This enables discovery of active traders before orders are created, and allows orders to reference their originating advert through the `from` tag in NIP-69.

Adverts create a unified liquidity discovery layer across all P2P platforms participating in the Nostr ecosystem, making it easier for takers to find suitable makers and initiate trades.


## The event

Events are [addressable events](01.md#kinds) and use `TBD` as event kind, a p2p advert event look like this:

```json
{
  "id": "84fad0d29cb3529d789faeff2033e88fe157a48e071c6a5d1619928289420e31",
  "pubkey": "dbe0b1be7aafd3cfba92d7463edbd4e33b2969f61bd554d37ac56f032e13355a",
  "created_at": 1702548701,
  "kind": TBD,
  "tags": [
    ["d", "ede61c96-4c13-4519-bf3a-dcf7f1e9d842"],
    ["k", "sell"],
    ["f", "USD"],
    ["a", "BTC"],
    ["s", "pending"],
    ["volume", "1000"],
    ["exchange_rate", "94000"],
    ["pair", "BTC/USD"],
    ["tm", "1000", "10000"],
    ["pm", "face to face", "bank transfer","paypal"],
    ["p", "NIP-39 for public profile"],
    ["reviews", "https://t.me/p2plightning/xxxxxxx", "https://twitter.com/p2plightning/xxxxxxx"],
    ["orders", "event-id-1", "event-id-2"],
    ["network", "mainnet"],
    ["layer", "lightning"],
    ["g", "<geohash>"],
    ["updated_at", "1719391096"],
    ["expiration", "1719995896"],
    ["y", "p2p-advert-bot"],
    ["z", "advert"]
  ],
  "content": "",
  "sig": "7e8fe1eb644f33ff51d8805c02a0e1a6d034e6234eac50ef7a7e0dac68a0414f7910366204fa8217086f90eddaa37ded71e61f736d1838e37c0b73f6a16c4af2"
}
```

## Tags

- `d` < Advert ID >: A unique identifier for the advert.
- `k` < Advert type >: `sell` or `buy`.
- `f` < Currency >: The fiat currency to be traded, using the [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) standard.
- `a` < Asset >: The asset to be traded, using the [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) standard.
- `s` < Status >: `active`, `inactive`, `expired`.
- `volume` [Volume]: The volume of the asset available to be traded.
- `exchange_rate` < Exchange rate >: The exchange rate of the asset to be traded.
- `pair` < Pair >: The pair of the asset to be traded, using the [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) standard.
- `tm` < Trade limits >: The minimum and maximum trade amounts, two values expected representing the range of fiat amounts the maker is willing to trade.
- `pm` < Payment methods >: The payment methods used for the trade, if the advert has multiple payment methods, they should be separated by a comma.
- `p` < Profile >: The NIP-39 for public profile for the advert maker.
- `reviews` [Reviews]: List of review URLs that can be public links or references that can be traced back to [NIP-69](69.md) order events where the maker participated.
- `orders` [Orders]: List of NIP-69 order event IDs that originated from this advert, creating a bidirectional relationship between adverts and orders.
- `network` < Network >: The network used for the trade, it can be `mainnet`, `testnet`, `signet`, etc.
- `layer` < Layer >: The layer used for the trade, it can be `onchain`, `lightning`, `liquid`, etc.
- `g` < Geohash >: The geohash of the advert, it can be useful in a face to face trade.
- `updated_at` < Updated at >: The timestamp of the last update of the advert.
- `expiration` < Expiration >: The expiration date of the advert, after this time the advert should be deleted.
- `y` < Pubkey >: The pubkey of the platform that created the advert.
- `z` < document >: `advert`.

Mandatory tags are enclosed with `<tag>`, optional tags are enclosed with `[tag]`.
