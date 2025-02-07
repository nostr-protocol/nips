NIP-XXX
=======

`draft` `optional` `author:ariard`

Order
-----

This NIP defines a new event type to communicate trade orders between Nostr relays and clients.

A new parameterized replaceable event `order` is introduced `32500`. This event content field is a Lightning [BOLT12](https://bolt12.org/bolt12.html) string.

## Motivation

This proposal aims to enable peer-to-peer markets over the Nostr network, where clients can select
market places or trade counterparties with high-level of flexibility, efficiency and privacy.

Two types of peer-to-peer markets can be build from an order event:
- over-the-counter markets
- exchanges

Over-the-counter markets can be defined where a dealer is selling products for the account of its
clients to a set of market-makers, where they have commitments to the product. This can be a Nostr
encrypted or public group events, where the members are selected according to the dealer's policy.

Exchanges markets can be defined as a publication space where the makers orders are executed against
takers one by the intermediary of a brokering service. This service can be run on top of a Nostr
relay, where the makers and takers are Nostr clients.

The technical difference between OTC and exchanges lays in the lack of financial interest of
the intermediary in the trade order, and only charges a fee for the publication service. While this
distinction comes with trade-off in term of security model (e.g chain notarization of all the exchange
trades with [NIP03](https://github.com/nostr-protocol/nips/blob/master/03.md)), in practice the differences
are expected to be blurred and function of the goods/products quantity.

## Design 

The separation between the offer field related to the trade and the event fields related to the processing
of the event enable to introduce orders types based on Nostr tags e.g:
- buy/sell limit order where the offer is not more valid based on a market price indicated in a tag
- stop order where the offer becomes valid when a market price is reached or passed
- time-sensitive order where the offer becomes valid when a chain height is reached

Those orders types can be defined in future NIPs and enforced by the relay at order routing.

Merkle construction of the BOLT12 invoice signatures allow selective reveal of the offer fields and therefore
enable brokering service where a Nostr relay can announce an order to its clients, without revealing the issuer
pubkey or withholding some fields related to the order execution (e.g the `blinded_path`).

The dissociation of the event signature from the offer signature enable to transit the offer across "market
zones" (e.g from a exchange A to an exchange B) without breaking the validity of the offer signature itself.
The old order can be recycled as a new ones with corresponding tags to adapt to the new market zone policy.

## Specification

Order has the following format on the wire:

```json
{
  "id": 32-bytes lowercase hex-encoded sha256 of the serialized event data,
  "pubkey": 32-bytes lowercase hex-encoded public key of the event creator,
  "created_at": unix timestamp in seconds,
  "kind": 32_500,
  "tags": [
    ["d", "optional value"],
  ],
  "content": bolt12 string,
  "sig": 64-bytes hex of the signature of the sha256 hash of the serialized event data, which is the same as the "id" field
}
```

An `order` note creator note:
  - MUST set the `kind` field to `32_500`
  - MUST set the event `content` field to a valid BOLT12 string

An `order` receiving node:
  - MUST reject event of kind `32_500` if the content is not a valid BOLT12 string
  - MAY substitute the `pubkey` field by its own pubkey and re-sign the event

## Security

TODO: both relay/client-sides

## Backward compatibility
 
BOLT12-enabled Lightning wallets can read the content of order events and verify the authenticity of the payment or
trade information, without substantial change in the parsing or validation logic of the payment module. A Nostr client
is just responsible to transfer a bolt12 string to the payment module.

## Acknowledgements

The Lightning protocol development community for the BOLT12 payment protocol.
