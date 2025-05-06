NIP-XX
======

Generic Payment
-------------------------

`draft` `optional`

This NIP defines kind `30090` as a generic payment event that can represent any payment on nostr.

## Rationale:

Many applications that use nostr as their social layer have payments as a core part of their functionality which are not necessarily nostr-native in the form of a zap.

It is still valuable to represent these payments on nostr so they can be shared, rendered, and indexed across different clients.

To avoid fake payments - the payment events are signed by a semi-trusted provider which in most cases will be the app that the user is posting from.

The events are parameterized replaceable events so that if the `payer` or `payee` joins nostr after the payment was made the payment events can be updated and assigned to their pubkey.

## Kind `30090`

- `["d", "<unique_id>"]`
- `["currency", "BTC"]` - the ISO 4217 (https://en.wikipedia.org/wiki/ISO_4217) currency code of the payment with `BTC` used for bitcoin
- `["amount", "0.001"]` - the payment amount formatted as a string
- `["payer", "<optional_pubkey>", "<optional_relay_hint>", "<optional_name>"]` - the entity paying
- `["payee", "<optional_pubkey>", "<optional_relay_hint>", "<optional_name>"]` - the entity being paid
- `["metadata": "{}"]` - optional generic metadata

---


### Examples:

_An anonymous donation to the human rights foundation with an on-chain bitcoin payment:_

```jsonc
{
  "kind": 30090,
  "tags": [
    ["d", "867038d3-5648-4f64-ab9d-0a1f38f00b67"],
    ["currency", "BTC"],
    ["amount", "0.01"],
    ["payer", "<payer_pubkey>"],
    ["payee", "<payee_pubkey>"],
    ["metadata": "{\"program\":\"Bitcoin Development Fund\"}"]
    ],
  "content": "",
}
```


_An anonymous user donating to a gofundme page in dollars:_

```jsonc
{
  "kind": 30090,
  "tags": [
    ["d", "64eb241d-d05b-42ba-988a-1e24666a7cab"],
      ["currency", "USD"],
      ["amount", "1000"],
      ["payee", "<payee_pubkey>"],
  ],
  "content": "",
}
```

_A Podcasting 2.0 payment:_

```jsonc
{
  "kind": 30090,
  "tags": [
    ["d", "f8604a8f-1ad5-4e90-a2f5-3a5e63cd7330"],
    ["currency", "BTC"],
    ["amount", "0.001"],
    ["payer", "<payer_pubkey>"],
    ["payee", "", "", "The Joe Rogan Experience"],
    ["i", "podcast:guid:123"],
    ["i", "podcast:item:guid:123"],
    ["metadata", "{\"action\": \"boost\"}"]
  ],
  "content": "Great episode!",
}
```