NIP-RP
======

Reservation Protocol v1.0
-------------------------

`draft` `optional`

This NIP defines a protocol to manage reservations via Nostr. The term "reservations" is used as a broad term and could be applied to restaurants, hotels, or any other business offering appointments. This NIP also defines a business transaction attestation event associated with a succesfully completed reservation so that customers can issue a **verified business review**.

The reservation process uses 4 different messages, each with its own kind, that are sent unsigned, sealed, and gift wrapped between the parties to maintain the privacy of the customer. Only the customer and the business are aware of the reservation.

## Overview

The Reservation Protocol uses four event kinds to support a complete negotiation flow:

- `reservation.request` - `kind:9901`: Initial message sent  by the customer to make a reservation request
- `reservation.response` - `kind:9902`: Message sent by the business or the customer to finalize the exchange of messages with status `confirmed`, `declined`, or `cancelled`
- `reservation.modification.request` - `kind:9903`: Message sent to modify a firm reservation or a reservation under negotiation
- `reservation.modification.response` - `kind:9904`: Message sent in response to a `reservation.modification.request`

Additionally, the Reservation Protocol also defines a transaction attestation event to enable verified business reviews. 
- `transaction.attestation` - `kind:9905`: Message sent by the business to attest that a specific customer transacted with the business.


Clients must support `kind:9901` and `kind:9902` messages. Support for `kind:9903`, `kind:9904` and `kind:9905` is optional but strongly recommended.

## Kind Definitions

### Reservation Request - Kind:9901

**Rumor Event Structure:**
```yaml
{
  "id": "<32-byte hex of unsigned event hash>",
  "pubkey": "<senderPublicKey>",
  "created_at": <unix timestamp in seconds>,
  "kind": 9901,
  "tags": [
    ["p", "<businessPublicKey>", "<relayUrl>"]
    // Additional tags MAY be included
  ],
  "content": "<content-in-plain-text>"
  // Note: No signature field - this is an unsigned rumor
}
```

**Content Structure:**
```yaml
{
  "party_size": <integer between 1 and 20>,
  "iso_time": "<ISO8601 datetime with timezone>",
  "notes": "<optional string, max 2000 chars>",
  "contact": {
    "name": "<optional string, max 200 chars>",
    "phone": "<optional string, max 64 chars>",
    "email": "<optional email>"
  },
  "constraints": {
    "earliest_iso_time": "<optional ISO8601 datetime>",
    "latest_iso_time": "<optional ISO8601 datetime>",
  }
}
```

**Required Fields:**
- `party_size`: Integer between 1 and 20
- `iso_time`: ISO8601 datetime string with timezone offset

**Optional Fields:**
- `notes`: Additional notes or special requests (max 2000 characters)
- `contact`: Contact information object
- `constraints`: Preferences for negotiation

---

### Reservation Response - Kind:9902

**Rumor Event Structure:**
```yaml
{
  "id": "<32-byte hex of unsigned event hash>",
  "pubkey": "<senderPublicKey>",
  "created_at": <unix timestamp in seconds>,
  "kind": 9902,
  "tags": [
    ["p", "<recipientPublicKey>", "<relay-url>"],
    ["e", "<unsigned-9901-rumor-id>", "", "root"]
    // Additional tags MAY be included
  ],
  "content": "<content-in-plain-text>"
  // Note: No signature field - this is an unsigned rumor
}
```

**Content Structure:**
```yaml
{
  "status": "<confirmed|declined|cancelled>",
  "iso_time": "<ISO8601 datetime with timezone> | null",
  "message": "<optional string, max 2000 chars>",
  "table": "<optional string | null>",
}
```

**Required Fields:**
- `status`: One of `"confirmed"`, `"declined"`, or `"cancelled"`
- `iso_time`: ISO8601 datetime string with timezone offset

**Optional Fields:**
- `message`: Human-readable message to the customer
- `table`: Table identifier (e.g., "A5", "12", "Patio 3")

**Threading:**
- MUST include an `e` tag with `["e", "<unsigned-9901-rumor-id>", "", "root"]` referencing the unsigned rumor ID of the original request (kind:9901).

---

### Reservation Modification Request - Kind:9903

**Rumor Event Structure:**
```yaml
{
  "id": "<32-byte hex of unsigned event hash>",
  "pubkey": "<senderPubKey>",
  "created_at": <unix timestamp in seconds>,
  "kind": 9903,
  "tags": [
    ["p", "<recipientPublicKey>", "<relay-url>"],
    ["e", "<unsigned-9901-rumor-id>", "", "root"],
    // Additional tags MAY be included
  ],
  "content": "<content-in-plain-text>"
  // Note: No signature field - this is an unsigned rumor
}
```

**Content Structure:**
```yaml
{
  "party_size": <integer between 1 and 20>,
  "iso_time": "<ISO8601 datetime with timezone>",
  "notes": "<optional string, max 2000 chars>",
  "contact": {
    "name": "<optional string, max 200 chars>",
    "phone": "<optional string, max 64 chars>",
    "email": "<optional email>"
  },
  "constraints": {
    "earliest_iso_time": "<optional ISO8601 datetime>",
    "latest_iso_time": "<optional ISO8601 datetime>",
  }
}
```

**Required Fields:**
- `party_size`: Integer between 1 and 20
- `iso_time`: ISO8601 datetime string with timezone offset

**Optional Fields:**
- `notes`: Additional notes or special requests (max 2000 characters)
- `contact`: Contact information object
- `constraints`: Preferences for negotiation

**Threading:**
- MUST include an `e` tags with `["e", "<unsigned-9901-rumor-id>", "", "root"]` referencing the unsigned rumor ID of the original request.

---

### Reservation Modification Response - Kind:9904

**Rumor Event Structure:**
```yaml
{
  "id": "<32-byte hex of unsigned event hash>",
  "pubkey": "<senderPublicKey>",
  "created_at": <unix timestamp in seconds>,
  "kind": 9904,
  "tags": [
    ["p", "<recipientPublicKey>", "<relay-url>"],
    ["e", "<unsigned-9901-rumor-id>", "", "root"],
    // Additional tags MAY be included
  ],
  "content": "<content-in-plain-text>"
  // Note: No signature field - this is an unsigned rumor
}
```

**Content Structure:**
```yaml
{
  "status": "<confirmed|declined>",
  "iso_time": "<ISO8601 datetime with timezone> | null",
  "message": "<optional string, max 2000 chars>",
}
```

**Required Fields:**
- `status`: One of `"confirmed"` or `"declined"`
- `iso_time`: ISO8601 datetime string with timezone offset

**Optional Fields:**
- `message`: Human-readable message to the customer


**Threading:**
- MUST include an `e` tags with `["e", "<unsigned-9901-rumor-id>", "", "root"]` referencing the unsigned rumor ID of the original request.


## Encryption, Wrapping, and Threading

All reservation messages MUST follow the [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) Gift Wrap protocol:

1. **Create Rumor**: Build an unsigned event of the appropriate kind (9901, 9902, 9903, or 9904) with plain text content
2. **Create Seal**: Wrap the rumor in a `kind:13` seal event, encrypted with [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md)
3. **Create Gift Wrap**: Wrap the seal in a `kind:1059` gift wrap event, addressed to the recipient via `p` tag

### Encryption and Wrapping Details

- **Content Encryption**: The JSON payload MUST be encrypted using [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) version 2 encryption
- **Seal Encryption**: The serialized rumor JSON MUST be encrypted using [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) version 2 encryption with a conversation key derived from the sender's private key and recipient's public key
- **Gift Wrap Encryption**: The serialized seal JSON MUST be encrypted using [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) version 2 encryption with a conversation key derived from a random ephemeral private key and recipient's public key

Per [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md), `created_at` timestamps SHOULD be randomized up to 2 days in the past for both seal and gift wrap events to prevent metadata correlation attacks.

### Sample Gift Wrap

**Gift Wrap**
```yaml
{
  "id": "<usual hash>",
  "pubkey": randomPublicKey,
  "created_at": randomTimeUpTo2DaysInThePast(),
  "kind": 1059, // gift wrap
  "tags": [
    ["p", receiverPublicKey, "<relay-url>"] // receiver
  ],
  "content": nip44Encrypt(
    {
      "id": "<usual hash>",
      "pubkey": senderPublicKey,
      "created_at": randomTimeUpTo2DaysInThePast(),
      "kind": 13, // seal
      "tags": [], // no tags
      "content": nip44Encrypt(unsignedKind990x, senderPrivateKey, receiverPublicKey),
      "sig": "<signed by senderPrivateKey>"
    },
    randomPrivateKey, receiverPublicKey
  ),
  "sig": "<signed by randomPrivateKey>"
}
```

---

### Threading

Following [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) and [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md), senders SHOULD publish gift wraps to both the recipient AND themselves (self-addressed). This ensures:
- Senders can retrieve their own messages across devices
- Full conversation history is recoverable with the sender's private key
- Each recipient gets a separately encrypted gift wrap

All messages in a reservation conversation after the original `reservation.request` `kind:9901` message MUST be threaded using the **unsigned rumor ID** of the original request as the root.
---

## Protocol Flow

### Simple Reservation Request 
1. Customer sends `reservation.request` `kind:9901` message to the business
2. Business responds with `reservation.response` `kind:9902` message to the customer with `"status":"confirmed"` or `"status":"declined"`
3. Message exchange ends

### Reservation Request With Business Suggesting Alternative Time
1. Customer sends `reservation.request` `kind:9901` message to the business
2. Business responds with `reservation.modification.request` `kind:9903` message to the customer with proposed new time
3. Customer responds with `reservation.modification.response` `kind:9904` message to the business with `"status":"confirmed"` or `"status":"declined"`
4. Business responds with `reservation.response` `kind:9902` message to the customer with matching status `confirmed` or `declined`
5. Message exchange ends

### Succesful Reservation Modification by Customer
1. Customer sends `reservation.modification.request` `kind:9903` message to the business with proposed new time
2. Business sends `reservation.modification.response` `kind:9904` message to the customer with `"status":"confirmed"` to indicate availability for the new time
3. Customer sends `reservation.response` `kind:9902` message to the business with status `confirmed`
4. Message exchange ends

Note: *This flow assumes that there is an existing confirmed reservation initiated by a `reservation.request` `kind:9901` message sent by the customer to the business. All messages should include the `"e"` tag with the rumor ID of the original `reservation.request` message to match the modification to the original reservation.*

### Unsuccesful Reservation Modification by Customer
1. Customer sends `reservation.modification.request` `kind:9903` message to the business with proposed new time
2. Business sends `reservation.modification.response` `kind:9904` message to the customer with `"status":"declined"` to indicate lack of availability for the new time
3. Customer sends `reservation.response` `kind:9902` message to the business with original time and status `"status":"confirmed"` to maintain original reservation or `"status":"cancelled"` to cancel the original reservation
4. Message exchange ends

Note: *This flow assumes that there is an existing confirmed reservation initiated by a `reservation.request` `kind:9901` message sent by the customer to the business. All messages should include the `"e"` tag with the rumor ID of the original `reservation.request` message to match the modification to the original reservation.*

### Reservation Cancellation Initated by the Business
1. Business sends `reservation.response` `kind:9902` message to the customer with `"status":"cancelled"`. Including a note in the `content.message` field is highly encouraged. 
2. Message exchange ends

No further action is expected from the customer. 

Note: *This flow assumes that there is an existing confirmed reservation initiated by a `reservation.request` `kind:9901` message sent by the customer to the business. All messages should include the `"e"` tag with the rumor ID of the original `reservation.request` message to match the modification to the original reservation.*

### Reservation Cancellation Initated by the Customer
1. Customer sends `reservation.response` `kind:9902` message to the business with `"status":"cancelled"`. Including a note in the `content.message` field is highly encouraged. 
2. Message exchange ends

No further action is expected from the business.

Note: *This flow assumes that there is an existing confirmed reservation initiated by a `reservation.request` `kind:9901` message sent by the customer to the business. All messages should include the `"e"` tag with the rumor ID of the original `reservation.request` message to match the modification to the original reservation.*

## JSON Schema Validation

Clients MUST validate payloads against JSON schemas before processing:

- Kind 9901: Validate against `nostrability/schemata/nips/nip-rp/kind-9901/schema.yaml`
- Kind 9902: Validate against `nostrability/schemata/nips/nip-rp/kind-9902/schema.yaml`
- Kind 9903: Validate against `nostrability/schemata/nips/nip-rp/kind-9903/schema.yaml`
- Kind 9904: Validate against `nostrability/schemata/nips/nip-rp/kind-9904/schema.yaml`


Invalid payloads MUST be rejected and not processed further.

## Business Discovery 

Businesses MUST advertise their capability to handle reservation messages using [NIP-89](https://github.com/nostr-protocol/nips/blob/master/89.md) Application Handlers.

### Handler Information Event (kind:31990)

Businesses MUST publish a `kind:31990` handler information event that declares support for all reservation message kinds:

```yaml
{
  "kind": 31990,
  "pubkey": "<businessPublicKey>",
  "tags": [
    ["d", "reservations-v1.0"],
    ["k", "9901"],
    ["k", "9902"],
    ["k", "9903"],
    ["k", "9904"]
  ],
  "content": ""
}
```

- The `d` tag MUST use the identifier `"reservations-v1.0"`
- The `k` tags MUST include all four supported kinds: `9901`, `9902`, `9903`, and `9904`
- The `content` field MAY be empty (clients will use the business' `kind:0` profile for display)

### Handler Recommendation Events (kind:31989)

Businesses MUST publish four `kind:31989` handler recommendation events, one for each supported event kind:

**For kind:9901 (reservation.request):**
```yaml
{
  "kind": 31989,
  "pubkey": "<businessPublicKey>",
  "tags": [
    ["d", "9901"],
    ["a", "31990:<businessPublicKey>:reservations-v1.0", "<relayUrl>", "all"]
  ],
  "content": ""
}
```

**For kind:9902 (reservation.response):**
```yaml
{
  "kind": 31989,
  "pubkey": "<businessPublicKey>",
  "tags": [
    ["d", "9902"],
    ["a", "31990:<businessPublicKey>:reservations-v1.0", "<relayUrl>", "all"]
  ],
  "content": ""
}
```

**For kind:9903 (reservation.modification.request):**
```yaml
{
  "kind": 31989,
  "pubkey": "<businessPublicKey>",
  "tags": [
    ["d", "9903"],
    ["a", "31990:<businessPublicKey>:reservations-v1.0", "<relayUrl>", "all"]
  ],
  "content": ""
}
```

**For kind:9904 (reservation.modification.response):**
```yaml
{
  "kind": 31989,
  "pubkey": "<businessPublicKey>",
  "tags": [
    ["d", "9904"],
    ["a", "31990:<businessPublicKey>:reservations-v1.0", "<relayUrl>", "all"]
  ],
  "content": ""
}
```

- Each `kind:31989` event MUST have a `d` tag with the event kind it recommends (`"9901"`, `"9902"`, `"9903"`, or `"9904"`)
- Each `kind:31989` event MUST include an `a` tag referencing the business' `kind:31990` handler information event
- The `a` tag format MUST be: `"31990:<businessPublicKey>:reservations-v1.0"`
- The second value of the `a` tag SHOULD be a relay URL hint for finding the handler
- The third value of the `a` tag SHOULD be `"all"` to indicate the recommendation applies to all platforms

---

### Publishing Requirements

- Businesses MUST publish the `kind:31990` handler information event when first setting up their reservation system
- Businesses MUST publish all four `kind:31989` recommendation events when first setting up their reservation system
- Businesses SHOULD republish these events whenever their handler configuration changes or when updating their business profile
- All handler events MUST be published to the same relays where reservation messages are expected to be received

---

### Client Discovery

Customer clients discovering businesses that support reservations SHOULD:

1. Query for `kind:31989` events with `#d` filters for `["9901"]`, `["9902"]`, `["9903"]`, and `["9904"]`
2. Extract the `a` tag values from recommendation events to find handler information events
3. Query for the corresponding `kind:31990` handler information events using the `a` tag coordinates
4. Verify that the handler information event includes all four `k` tags (`9901`, `9902`, `9903`, `9904`) before considering the business as fully supporting the protocol


## Verified Business Reviews
Customers who succesfully complete a business transaction after creating a reservation using the Reservation Protocol may issue a verified business review. Verified business reviews are reviews from real customers and should be considered more relevant than unverified reviews from users for whom it is not possible to determine if they have transacted with the business. 

The Reservation Protocol supports verified business reviews by expanding upon reviews as specified by the [market specification](https://github.com/GammaMarkets/market-spec/blob/main/spec.md) addendum to [NIP-99](https://github.com/nostr-protocol/nips/blob/master/99.md).

Once a reservation is fulfilled, for example when the restaurant check is closed, the business privately issues a token to the customer to attest the business transaction. This token is independent of the review itself and only attests for the fact that the customer and the business executed a transaction:
- It's created before the review is written
- Does not endorse the content of the review


The verified business review follows the [QTS guidelines](https://habla.news/u/arkinox@arkinox.tech/DLAfzJJpQDS4vj3wSleum) with labels specified by the business to ensure review uniformity regardless of the application used by the customer to issue the review. 

---

### Business Transaction Attestation – Kind:9905

`kind:9905` is a **signed** nostr event created by the business to attest that a business transaction occurred under a given reservation. The event is created by the business when a reservation is fulfilled and sent privately to the customer using an encrypted direct message (`kind:14`). The `kind:9905` event is **never** published to public relays to maintain the business transaction private until the customer decides to publish a review.

The event is intended as a business transaction attestation token that the customer MAY later embed in a public review. If the customer does not publish a review, then the reservation and business transaction will remain private. 

**Event Structure:**
```yaml
{
  "id": "<32-byte hex of event hash>",
  "pubkey": "<businessPublicKey>",
  "created_at": <unix timestamp in seconds>,
  "kind": 9905,
  "tags": [
    ["e", "<unsigned-9901-rumor-id>"],  # Reservation thread id 
    ["p", "<customerPublicKey>"]
  ],
  "content": "<content-in-plain-text>",
  "sig": "<signed by businessPrivateKey>"
}
```

**Content Structure:**
```yaml
{
  "iso_time": "<ISO8601 datetime with timezone>",
  "qts_labels": [
    "label1",
    "label2",
    "label3"
    # Add more labels as needed
  ]
}
```

**Required Tags:**
- `["e", "<unsigned-9901-rumor-id>"]`: MUST reference the unsigned rumor ID of the original reservation.request `kind:9901` message. This value is the reservation thread id.
- `["p", "<customerPublicKey>"]`: MUST reference the customer associated with the transaction.
- `iso_time`: reservation ISO8601 datetime string with timezone offset
- `qts_labels`: the array of labels to be used for the QTS review
---

The `transaction.attestation` `kind:9905` message is sent from the business to the customer as the content of a direct message `kind:14` with the same `<unsigned-9901-rumor-id>` thread ID to connect it to the reservation in question. 

```yaml
{
  "kind": 14,
  "pubkey": "<businessPublicKey>",
  "created_at": <unix timestamp in seconds>,
  "tags": [
    ["p", "<customerPublicKey>"],
    ["e", "<unsigned-9901-rumor-id>", "", "root"]
  ],
  "content": "<plain-text serialized and signed kind-9905 event>"
  // no sig field – this is a rumor, encrypted and transported via NIP-59
}
```
---

### Verified Business Review - Kind 31555

The verified business review is issued as a `kind:31555` nostr event following the NIP-99 market specification addendum with additional tags included for the verification process:
- `verified` tag with the base64 encoding of the full serialized `transaction.attestation` `kind:9905` event
- `e` tag with the original reservation thread id

When in conflict, the NIP-99 market specification addendum takes precedence over this NIP.

**Event Structure:**
```yaml
{
  "id": "<32-byte hex of event hash>",
  "pubkey": "<customerPublicKey>",
  "created_at": <unix timestamp in seconds>,
  "kind": 31555,
  "tags": [
    ["d", "p:<businessPublicKey>"],
    ["rating", "<0 or 1>", "thumb"],  # Primary rating, 0 for thumbs down and 1 for thumbs up
    // Optional rating categories
    ["rating", "0.8", <label1-from-qts-labels-field-in-transaction-attestation-event], # rating between 0 and 1 with one decimal point.
    ["rating", "1.0", <label1-from-qts-labels-field-in-transaction-attestation-event], # rating between 0 and 1 with one decimal point
    ["rating", "0.6", <label1-from-qts-labels-field-in-transaction-attestation-event], # rating between 0 and 1 with one decimal point
    # Add more labels as specified by the kind:9905 event.
    ["e", "<unsigned-9901-rumor-id>"], # Reservation thread id 
    ["verified", "<base64-encoded-transaction-attestation-event-kind-9905>"] 
    # Additional tags MAY be included
  ],
  "content": "<free-form review text>",
  "sig": "<signed by customerPrivateKey>"
}
```

**Required Tags**:
	- `["d", "p:<businessPublicKey>"]`: MUST specify the business being reviewed.
	- `["e", "<unsigned-9901-rumor-id>"]`: MUST reference the same reservation thread id used during the reservation flow.
  - `["verified", "<base64-encoded-transaction-attestation-event-kind-9905>"]`: The value MUST be a base64 encoding of the full serialized kind:9905 transaction attestation event.
	- `["rating", "<0 or 1>", "thumb"]`: Primary rating, 0 for thumbs down and 1 for thumbs up.
	-	`["rating", "<empty> | <0 to 1>", <labelN-from-qts-labels-field-in-transaction-attestation-event]`: additional rating between 0 and 1 with one decimal point. All labels listed in the `kind:9905` event should be included. Value may be empty if user did not provide a rating for an specific label. 

A client MAY treat a `kind:31555` event as a **verified business review** if all of the following conditions are met:
1.	The event has a `["verified", "<payload>"]` tag. 
2.	Decoding `<payload>` from base64 yields a valid nostr `transaction.attestation` `kind:9905` event with the following properties:
  - The `pubkey` field matches the business public key indicated by the `kind:31555` `["d", "p:<businessPublicKey>"]` tag
  - The customer public key of the `["p", "<customerPublicKey>"]` tag matches the public key signing the `kind:31555` review event
  - There is a `["e", "<unsigned-9901-rumor-id>"]` tag matching the `["e", "<unsigned-9901-rumor-id>"]` tag of the  `kind:31555` review event
  - The `transaction.attestation` `kind:9905` event has a valid signature computed according to NIP-01.

If verification succeeds, clients MAY consider the review as a **verified business review**. If verification fails, clients SHOULD NOT display the review. 

---

### Verified Business Review Flow

#### Business Transaction Attestation Issued By The Business
1. After the transaction is considered fulfilled, the business sends a `transaction.attestation` `kind:9905` message to the customer via a `kind:14` direct message. The `transaction.attestation` `kind:9905` message is **never** published to a relay.
2. Message exchange ends

No further action is expected from the business or the customer. 

#### Customer Elects to Not Publish a Review
1. Customer receives the `transaction.attestation` `kind:9905` message from the business.
2. Customer chooses to not issue a review
3. Message exchange ends

The fact that the customer transacted with the business remains a private fact known only to the customer and the business. 

#### Customer Elects to Publish a Review
1. Customer receives the `transaction.attestation` `kind:9905` message from the business.
2. Customer writes a review and publishes it as a `kind:31555` event that includes the `["verified", "<base64-encoded-transaction-attestation-event-kind-9905>"]` tag 
3. Message exchange ends

The fact that the customer transacted with the business becomes a public fact. 

### JSON Schema Validation
- Kind 9905: Validate against `nostrability/schemata/nips/nip-rp/kind-9905/schema.yaml`

---

### Verified Reviews Discovery

A client searching for verified reviews for a given business with `businessPublicKey` SHOULD:
  1. Query for `kind:31555` events with:
	  •	`["d", "p:<businessPublicKey>"]` to select reviews for this business
	  •	For each review, check for a `["verified", "<payload>"]` tag and, if present, perform the verification steps defined in section [Verified Business Review - Kind:31555](#verified-business-review–kind:31555).

If verification succeeds, the review MAY be treated as a **Verified Business Review**. 