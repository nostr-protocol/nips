NIP-XX
======

Marketplace Protocol
---------------------------

`draft` `optional`

This NIP defines a comprehensive protocol for implementing decentralized marketplaces on Nostr, combining and enhancing the approaches from [NIP-15](15.md) and [NIP-99](99.md). It provides a complete e-commerce framework while maintaining the protocol's simplicity and interoperability.

The focus for NIP-99 is on the product listing but this NIP also provides a structure for other necessary flows for a complete checkout procedure:

1) Order Communication Flow 
2) Shipping Calculation Flow
   This will be it's own kind ( replaceable event ) for updates during the shipping process, pricing schema for shipping costs and general shipping settings: Examples are zoning restrictions: USA, EU, NA, and free shipping: 50 USD
3) Payment Flows

A general checkout implementation can be structured as followed:
1) Items are gathered in a Local Basket 
2) Shipping details are required to calculate a full payment amount
3) Order gets send once Payment is received ( Zap Receipt , Nut Receipt, Marketplace server )

In practice a shop can have a preferred checkout and shipping option defined at the store level and product level. A option at the store level will be used if nothing is defined at the product level, essentially making it that product level shipping and payment options always overrule store level settings.

## Events and Kinds

### Product Listing (Kind: 30402)
Following NIP-99's schema for product representation:

```jsonc
{
  "kind": 30402,
  "created_at": <unix timestamp>,
  "content": "<product description in markdown>",
  "tags": [
    ["d", "<product identifier>"],
    ["title", "<product title>"],
    ["price", "<amount>", "<currency>", "<optional frequency>"],
    // Optional tags
    ["shipping", "<shipping-option-id>"], // References to shipping options
    ["summary", "<short description>"],
    ["image", "<url>", "<dimensions>"],
    ["location", "<location string>"],
    ["g", "<geo hash>"],
    ["t", "<category>"],
    ["a", "<product-list-id>"] // Reference to product collection if applicable
  ]
}
```

### Product Draft (Kind: 30403)
Draft version of a product listing, following the same schema as Kind 30402:

```jsonc
{
  "kind": 30403,
  "created_at": <unix timestamp>,
  "content": "<draft product description in markdown>",
  "tags": [
    // Same tag structure as Kind 30402
  ]
}
```

### Product Collection (Kind: 30405)
Using NIP-51 list format for grouping products:

```jsonc
{
  "kind": 30405,
  "created_at": <unix timestamp>,
  "content": "<optional collection description>",
  "tags": [
    ["d", "<collection identifier>"],
    ["name", "<collection name>"],
    // Optional tags
    ["image", "<collection image>"],
    ["summary", "<collection description>"],
    ["location", "<location string>"],
    ["a", "30402:<pubkey>:<product-id>"], // Product references
    ["shipping", "<shipping-option-id>"] // References to shipping options
  ]
}
```

### Shipping Option (Kind: 30406)
Dedicated event for shipping details:

```jsonc
{
  "kind": 30406,
  "created_at": <unix timestamp>,
  "content": "<optional shipping description>",
  "tags": [
    ["d", "<shipping identifier>"],
    ["name", "<shipping method name>"],
    ["price", "<base_cost>", "<currency>"],
    // ["location", "<service area>"],
    // ["duration", "<estimated delivery time>"]
    // Maybe we can use `L`and `l` tags for ontology, and use proper ISO3166 for shipping zones, also constraints for sizes and weight
  ]
}
```

## Order Communication Flow

- Order processing uses [NIP-17](17.md) encrypted direct messages. Message direction is determined by the `p` tag - when sent from buyer to merchant, `p` contains the merchant's pubkey, and when sent from merchant to buyer, `p` contains the buyer's pubkey. 
- The payment request message can be initiated in two ways, depending on whether the merchant has a server handling payments

### Message Types

1. Order Creation (buyer → merchant) (subject "order-info")
```jsonc
{
  "kind": 14,
  "tags": [
    ["p", "<merchant-pubkey>"],
    ["subject", "order-info"],
    ["order", "<order-id>"],
    ["item", "<product-id>", "<quantity>"],
    ["item", "<product-id>", "<quantity>"], // Multiple items possible
    ["shipping", "<shipping-option-id>"],
    ["address", "<shipping-address>"],
    ["email", "<customer-email>"],
    ["phone", "<customer-phone>"]
  ],
  "content": "Additional notes: Please gift wrap the items."
}
```

2. Payment Request (merchant doesnt have a payment server) (merchant → buyer ) (subject "order-payment")
```jsonc
{
  "kind": 14,
  "tags": [
    ["p", "<buyer-pubkey>"],
    ["subject", "order-payment"],
    ["order", "<order-id>"],
    ["amount", "<total-amount>", "<currency>"],
    ["payment", "lightning", "<bolt11-invoice>"],
    ["payment", "bitcoin", "<btc-address>"],
    ["expiry", "<unix-timestamp>"]
  ],
  "content": "Payment is due within 24 hours."
}
```

3. Payment Request (merchant have a payment server) ( buyer → merchant ) (subject "order-payment")
```jsonc
{
  "kind": 14,
  "tags": [
    ["p", "<merchant-pubkey>"],
    ["subject", "order-payment"],
    ["order", "<order-id>"],
    ["amount", "<total-amount>", "<currency>"],
    ["payment", "lightning", "<bolt11-invoice>"],
    ["payment", "bitcoin", "<btc-address>"],
    ["expiry", "<unix-timestamp>"]
  ],
  "content": "Payment details provided by merchant's payment server."
}
```
4. Payment Receipt (buyer → merchant) (subject "order-receipt")
```jsonc
{
  "kind": 14,
  "tags": [
    ["p", "<merchant-pubkey>"],
    ["subject", "order-receipt"],
    ["order", "<order-id>"],
    ["payment", "lightning", "<bolt11-invoice>", "<preimage>"],
    // or
    ["payment", "bitcoin", "<btc-address>", "<txid>"],
    ["date", "<unix-timestamp>"]
  ],
  "content": "Payment completed via Lightning Network"
}
```

5. Shipping Updates (merchant → buyer) (subject "shipping-info")
```jsonc
{
  "kind": 14,
  "tags": [
    ["p", "<buyer-pubkey>"],
    ["subject", "shipping-info"],
    ["order", "<order-id>"],
    ["status", "<shipping-status>"], // e.g., "processing", "shipped", "delivered"
    ["tracking", "<tracking-number>"],
    ["carrier", "<carrier-name>"],
    ["eta", "<unix-timestamp>"]
  ],
  "content": "Your order has been picked up by UPS and is on its way!"
}
```

6. Order Status Updates (merchant → buyer) (subject "order-info")
```jsonc
{
  "kind": 14,
  "tags": [
    ["p", "<buyer-pubkey>"],
    ["subject", "order-info"],
    ["order", "<order-id>"],
    ["status", "<order-status>"], // e.g., "confirmed", "processing", "completed"
    ["date", "<unix-timestamp>"]
  ],
  "content": "Your order is being prepared for shipping."
}
```



### Payment Flow Notes

A payment preference can be added to the Kind0 event in the following structure payment-preference = ecash | lud16 | bolt12 | manual

ORDER OF SUGGESTED PAYMENT ACCEPTANCE:

1) eCach

2)  Lightning (bolt11 / bolt12)
   
3) On-chain

4) Marketplace Server 

4.1. When a merchant has a payment server:
    - The buyer can immediately send a payment request message containing payment details obtained from the merchant's server
    - This eliminates the need to wait for the merchant to come online
    - The payment server is responsible for generating valid payment details and monitoring for completion
4.2 When no payment server is available:
    - The traditional flow is used where the merchant sends the payment request
    - The buyer waits for the merchant's response before proceeding with payment
43 In both cases:
    - The payment receipt is sent by the buyer after completing payment
    - All payment details should be verified against the original order
    - The message direction is clearly indicated by the `p` tag

5) Fiat Gateway ( Example Robosats )
### Marketplace Server Role

Marketplace servers can optionally facilitate the payment process by:

1. Generating payment requests based on merchant preferences when buyers initiate orders
2. Verifying payments and generating receipts automatically
3. Managing inventory and order status updates
4. Coordinating shipping information
5. Price calculations

This provides a smoother user experience while maintaining the ability for direct merchant-buyer communication as a fallback mechanism.



## Notes and Considerations

1. Tags are used for all structured, machine-readable data to facilitate easier parsing and filtering.

2. The content field is reserved for human-readable messages and additional information that doesn't require machine parsing.

3. All timestamps should be in Unix format (seconds since epoch).

4. Order IDs should be used consistently across all related messages.

5. Message threading should follow [NIP-10](10.md) conventions when replies are needed.
