NIP-XX
======

Marketplace Protocol
---------------------------

`draft` `optional`

// TODO: Mention the optionality of the different components used in this nip.

This NIP defines a comprehensive protocol for implementing decentralized marketplaces on Nostr, combining and enhancing the approaches from [NIP-15](15.md) and [NIP-99](99.md). It provides a complete e-commerce framework while maintaining the protocol's simplicity and interoperability.

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
    ["a", "30402:<pubkey>:<product-id>"], // Product references
    // Optional tags
    ["image", "<collection image>"],
    ["summary", "<collection description>"],
    ["location", "<location string>"],
    ["g", "<geo hash>"],
    ["shipping", "<shipping-option-id>"], // References to shipping options
    ["currency", "<collection-currency>"]
  ]
}
```

### Shipping Option (Kind: 30406)

This event type defines shipping methods, costs, and constraints. To ensure reliable tag association, each physical pickup location should be defined in a separate event. These events can be published by the merchant or a third-party provider, and can be subscribed to by the merchant. This approach allows merchants to easily define their shipping options manually, or reference shipping options published by a third-party provider, such as a delivery company, a DVM, etc.

```jsonc
{
  "kind": 30406,
  "created_at": <unix timestamp>,
  "content": "<optional shipping description>",
  "tags": [
    ["d", "<shipping identifier>"],
    ["name", "<shipping method name>"],
    ["price", "<base_cost>", "<currency>"],
    ["zone", "<ISO 3166-1 alpha-2 country code>"],  // Can be repeated for multiple countries
    ["region", "<ISO 3166-2 region code>"],         // Optional subdivision within country
    ["service", "<service-type>"],                  // e.g., "standard", "express", "overnight", "pickup"
    ["duration", "<min-hours>", "<max-hours>"],     // Estimated delivery window
    
    // Optional tags    
    ["location", "<pickup location description>"],   // Physical address
    ["g", "<geohash>"],                            // Precise location
    
    // Weight constraints
    ["weight-min", "<number>", "<unit>"],          // unit: g, kg, oz, lb
    ["weight-max", "<number>", "<unit>"],
    
    // Dimensional constraints
    ["dim-max", "<length>", "<width>", "<height>", "<unit>"],  // unit: cm, in
    ["dim-min", "<length>", "<width>", "<height>", "<unit>"],
    
    // Price calculations
    ["price-weight", "<price-per-unit>", "<currency>", "<weight-unit>"],
    ["price-volume", "<price-per-unit>", "<currency>", "<volume-unit>"],
    ["price-distance", "<price-per-unit>", "<currency>", "<distance-unit>"]
  ]
}
```

#### Example Events

Single pickup location:
```jsonc
{
  "kind": 30406,
  "created_at": 1703187600,
  "content": "Downtown Miami Store Pickup",
  "tags": [
    ["d", "miami-downtown-pickup"],
    ["name", "Downtown Miami Pickup"],
    ["price", "0", "USD"],
    ["zone", "US"],
    ["region", "US-FL"],
    ["service", "pickup"],
    ["location", "789 Brickell Ave, Miami, FL 33131"],
    ["g", "dhwm9c4ws"],
  ]
}
```

Separate pickup location (same merchant):
```jsonc
{
  "kind": 30406,
  "created_at": 1703187600,
  "content": "Miami Beach Store Pickup",
  "tags": [
    ["d", "miami-beach-pickup"],
    ["name", "Miami Beach Pickup"],
    ["price", "0", "USD"],
    ["zone", "US"],
    ["region", "US-FL"],
    ["service", "pickup"],
    ["location", "456 Ocean Drive, Miami Beach, FL 33139"],
    ["g", "dhwv1zp8k"],
  ]
}
```

Standard shipping option:
```jsonc
{
  "kind": 30406,
  "created_at": 1703187600,
  "content": "Standard domestic shipping within Florida",
  "tags": [
    ["d", "fl-standard"],
    ["name", "Florida Standard Shipping"],
    ["price", "5.99", "USD"],
    ["zone", "US"],
    ["region", "US-FL"],
    ["service", "standard"],
    ["duration", "24", "72"],
    ["weight-max", "30", "kg"],
    ["dim-max", "120", "60", "60", "cm"],
    ["price-weight", "0.75", "USD", "kg"]
  ]
}
```

#### Shipping Notes

1. For merchants with multiple pickup locations:
   - Create separate shipping option events for each physical location
   - Each location should have its own unique `d` tag identifier
   - Product listings can reference multiple pickup options

2. Clients should:
   - Group pickup locations by merchant when displaying options
   - Use geohash data to show pickup locations on a map
   - Sort pickup locations by distance from user when possible

3. Location identification:
   - Each pickup location must have both `location` and `g` tags
   - The `location` tag contains human-readable address
   - The `g` tag contains geohash for precise positioning

## Order Communication Flow

- Order processing and communication uses [NIP-17](17.md) encrypted direct messages.
  - Kind `14` is used for regular communication, enabling users to maintain a conversation. The subject can be an order ID or left blank, depending on the context.
  - Kind `15` is used for order processing and business logic.
- Message direction is determined by the `p` tag - when sent from buyer to merchant, `p` contains the merchant's pubkey, and when sent from merchant to buyer, `p` contains the buyer's pubkey. 
- The payment request message can be initiated in two ways, depending on whether the merchant has a server handling payments

### Message Types

1. Order Creation (buyer → merchant) (subject "order-info")
```jsonc
{
  "kind": 15,
  "tags": [
    ["p", "<merchant-pubkey>"],
    ["subject", "order-info"],
    ["order", "<order-id>"],
    ["item", "<product-id>", "<quantity>"],
    ["item", "<product-id>", "<quantity>"], // Multiple items possible
    ["shipping", "<shipping-option-id>"],
    ["amount", "<total-amount>"],
    ["address", "<shipping-address>"],
    ["email", "<customer-email>"],
    ["phone", "<customer-phone>"],
    // Other order related fields
  ],
  "content": "Additional notes: Please gift wrap the items."
}
```

2. Payment Request (merchant doesnt have a payment server) (merchant → buyer ) (subject "order-payment")
```jsonc
{
  "kind": 15,
  "tags": [
    ["p", "<buyer-pubkey>"],
    ["subject", "order-payment"],
    ["order", "<order-id>"],
    ["amount", "<total-amount>", "<currency>"],
    ["payment", "lightning", "<bolt11-invoice | ln-address(LUD16)>"],
    ["payment", "bitcoin", "<btc-address>"] // Multiple payment options possible,
    ["expiry", "<unix-timestamp>"]
  ],
  "content": "Payment is due within 24 hours."
}
```

3. Payment Request (merchant have a payment server) ( buyer → merchant ) (subject "order-payment")
```jsonc
{
  "kind": 15,
  "tags": [
    ["p", "<merchant-pubkey>"],
    ["subject", "order-payment"],
    ["order", "<order-id>"],
    ["amount", "<total-amount>"],
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
  "kind": 15,
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
  "kind": 15,
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
  "kind": 15,
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

7. Regular communication between users (subject "<order-id>")
```jsonc
{
  "kind": 14,
  "tags": [
    ["p", "<buyer-pubkey>"],
    ["subject", "<order-id | empty-string>"],
    ["order", "<order-id>"],
    ["status", "<order-status>"], // e.g., "confirmed", "processing", "completed"
    ["date", "<unix-timestamp>"]
  ],
  "content": "Your order is being prepared for shipping."
}
```

### Marketplace Server Role

Marketplace servers can optionally facilitate the payment process by:

1. Generating payment requests based on merchant preferences when buyers initiate orders
2. Verifying payments and generating receipts automatically
3. Managing inventory and order status updates
4. Coordinating shipping information
5. Price calculations

This provides a smoother user experience while maintaining the ability for direct merchant-buyer communication as a fallback mechanism.

### Payment Flow Notes

1. When a merchant has a payment server:
    - The buyer can immediately send a payment request message containing payment details obtained from the merchant's server
    - This eliminates the need to wait for the merchant to come online
    - The payment server is responsible for generating valid payment details and monitoring for completion
2. When no payment server is available:
    - The traditional flow is used where the merchant sends the payment request
    - The buyer waits for the merchant's response before proceeding with payment
3. In both cases:
    - The payment receipt is sent by the buyer after completing payment
    - All payment details should be verified against the original order
    - The message direction is clearly indicated by the `p` tag

## Notes and Considerations

1. Tags are used for all structured, machine-readable data to facilitate easier parsing and filtering.

2. The content field is reserved for human-readable messages and additional information that doesn't require machine parsing.

3. All timestamps should be in Unix format (seconds since epoch).

4. Order IDs should be used consistently across all related messages.

5. Message threading should follow [NIP-10](10.md) conventions when replies are needed.