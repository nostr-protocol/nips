NIP-XX
======

Generic Payment
-------------------------

`draft` `optional`

This NIP defines kind `30090` as a generic payment event that can represent any payment on nostr.

## Rationale:

Many applications that use nostr as their social layer have payments as a core part of their functionality which are not necessarily nostr-native in the form of a zap.

It is still valuable to represent these payments on nostr so they can be shared, rendered, and indexed across different clients.

## Generic Payment Events - Kind `30090`

Generic payment events are kind `30090` parameterized replaceable events signed by a semi-trusted provider which could be either:

- the app / service the user is sending the payment from
- the receiving users wallet pubkey (similar to zap receipts)

The events are parameterized replaceable so that if the `payer` or `payee` joins nostr after the payment was made, the payment events can be updated and assigned to their pubkey.

- `["d", "<unique_id>"]`
- `["currency", "BTC"]` - the ISO 4217 (https://en.wikipedia.org/wiki/ISO_4217) currency code of the payment with `BTC` used for bitcoin
- `["amount", "100000"]` - the payment amount in the currency's minor unit (usd cents, btc millisatoshis) formatted as a string
- `["payer", "<optional_pubkey>", "<optional_relay_hint>", "<optional_name>"]` - the entity paying
- `["payee", "<optional_pubkey>", "<optional_relay_hint>", "<optional_name>"]` - the entity being paid
- `["metadata": "{}"]` - optional generic metadata

---


### Examples:

_An anonymous donation to the human rights foundation with an 100,000 satoshi on-chain bitcoin payment:_

```jsonc
{
  "kind": 30090,
  "tags": [
    ["d", "867038d3-5648-4f64-ab9d-0a1f38f00b67"],
    ["currency", "BTC"],
    ["amount", "100000000"],
    ["payer", "", "", "Anonymous"],
    ["payee", "f1989a96d75aa386b4c871543626cbb362c03248b220dc9ae53d7cefbcaaf2c1", "wss://purplepag.es", "HRF"],
    ["metadata", "{\"program\":\"Bitcoin Development Fund\"}"]
    ],
  "content": "",
}
```


_A user named Bob without a nostr profile donating $100 to a donation page in dollars:_

```jsonc
{
  "kind": 30090,
  "tags": [
    ["d", "64eb241d-d05b-42ba-988a-1e24666a7cab"],
    ["currency", "USD"],
    ["amount", "10000"],
    ["payer", "", "", "Bob"],
    ["payee"],
  ],
  "content": "",
}
```

_A a podcast listener supporting the Joe Rogan Experience with a 10,000 satoshi donation:_

```jsonc
{
  "kind": 30090,
  "tags": [
    ["d", "f8604a8f-1ad5-4e90-a2f5-3a5e63cd7330"],
    ["currency", "BTC"],
    ["amount", "10000000"],
    ["payer"],
    ["payee", "", "", "The Joe Rogan Experience"],
    ["i", "podcast:guid:123"],
    ["i", "podcast:item:guid:123"],
    ["metadata", "{\"action\": \"boost\"}"]
  ],
  "content": "Great episode!",
}
```