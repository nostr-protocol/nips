NIP-RP
======

Reservation Protocol v1.0
-------------------------

`draft` `optional`

This NIP defines a protocol to manage reservations via Nostr. The term "reservations" is used as a broad term and could be applied to restaurants, hotels, or any other business offering appointments. This NIP also defines a business transaction attestation event associated with a successfully completed reservation so that customers can issue a **verified business review**.

The reservation process uses 4 different messages, each with its own kind, that are sent unsigned, sealed, and gift wrapped between the parties to maintain the privacy of the customer. Only the customer and the business are aware of the reservation.

## Overview

The Reservation Protocol uses four event kinds to support a complete negotiation flow:

- `reservation.request` - `kind:9901`: Initial message sent  by the customer to make a reservation request
- `reservation.response` - `kind:9902`: Message sent by the business or the customer to finalize the exchange of messages with status `confirmed`, `declined`, or `cancelled`
- `reservation.modification.request` - `kind:9903`: Message sent to modify a firm reservation or a reservation under negotiation
- `reservation.modification.response` - `kind:9904`: Message sent in response to a `reservation.modification.request`

All four kinds are transmitted as unsigned rumors using [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) gift wraps.

Additionally, the Reservation Protocol also defines a transaction attestation event to enable verified business reviews. 
- `transaction.attestation` - `kind:9905`: Message sent by the business to the customer via [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) private direct message to attest that a specific customer transacted with the business.


Clients must support `kind:9901` and `kind:9902` messages. Support for `kind:9903`, `kind:9904` and `kind:9905` is optional but strongly recommended.

## Kind Definitions

The following tags are used across the different kinds defined by this NIP:
- `p`: public key of the recipient of the message.
- `relays`: one or more relay URLs identifying the author's preferred read relays for replies and follow-up messages in the reservation thread.
- `e`: tag used to connect all messages of the same reservation request (the reservation thread). Contains the `.id` field of the original `kind:9901` reservation request.
- `party_size`: number of people in the reservation.
- `time`: inclusive reservation start Unix timestamp in seconds.
- `tzid`: time zone of the reservation `time`, `earliest_time`, and `latest_time` Unix timestamps, as defined by the IANA Time Zone Database. e.g., `America/Costa_Rica`.
- `duration`: duration of the reservation in seconds.
- `name`: reservation holder. May be different from the party initiating the reservation flow.
- `telephone`: phone number for the reservation holder.
- `email`: email for the reservation holder.
- `earliest_time`: earliest start time Unix timestamp that the requestor would accept for the reservation.
- `latest_time`: latest start time that the requestor would accept for the reservation.
- `status`: status of the reservation as one of the following values `confirmed`, `declined`, or `cancelled`.
- `broker`: set to `True` if the party initiating the reservation flow is not the reservation holder

## Relay Routing

This NIP follows the outbox model described by [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) for routing reservation rumors between the customer and the business.

When sending a reservation rumor to a counterparty, clients MUST:
1. Look up the recipient's latest `kind:10002` relay list metadata event.
2. Publish the gift-wrapped event to the recipient's `read` relays from `kind:10002`. If a relay in `kind:10002` has no marker, it SHOULD be treated as both `read` and `write` as defined by NIP-65.
3. Include a `["relays", "<relay1>", "<relay2>", ...]` tag in the unsigned rumor listing the author's own preferred `read` relays, so the recipient knows where to publish the next message in the reservation thread.

The `relays` tag acts as a return address. In a `kind:9901` event, it tells the business where to publish a `kind:9902` or `kind:9903` reply for the customer. In a response from the business, it tells the customer where to publish any follow-up messages for the business.

Clients MUST include a `relays` tag in `kind:9901`, `kind:9902`, `kind:9903`, and `kind:9904` messages. If the recipient has no discoverable `kind:10002`, clients MAY fall back to the most recent `relays` tag seen for that counterparty in the reservation thread. The optional relay URL in the `p` tag MAY be used only as a final compatibility fallback when no better routing information is available.

The `p` tag identifies the recipient's public key. Clients MUST use the `relays` tag and `kind:10002` relay list metadata as the primary routing mechanism for this protocol.

### Reservation Request - Kind:9901

**Rumor Event Structure:**
```yaml
{
  "id": "<32-byte hex of unsigned event hash>", # the thread id to be used by all other messages for this reservation
  "pubkey": "<senderPublicKey>", # may be reservation holder or a broker acting on behalf of reservation holder
  "created_at": <unix timestamp in seconds>,
  "kind": 9901,
  "tags": [
    ["p", "<businessPublicKey>"],
    ["relays", "<customerReadRelay1>", "<customerReadRelay2>", "..."],
    ["party_size", "<integer between 1 and 20>"],
    ["time", "<unix timestamp in seconds>"],
    ["tzid", "<IANA Time Zone Database identifier>"],
    ["name", "<string, max 200 chars>"],
    ["telephone", "<optional string, 'tel:' URI as per RFC 3966>"], # one of email or telephone must be included 
    ["email", "<optional string, 'mailto:' URI as per RFC 6068>"],  # one of email or telephone must be included
    ["duration", <optional, duration of reservation in seconds>"],
    ["earliest_time", "<optional unix timestamp in seconds>"],
    ["latest_time", "<optional unix timestamp in seconds>"],
    ["broker", "<optional boolean, `True` | 'False'>"] 
  ],
  "content": "<reservation request message in plain text>"
  # Note: No signature field - this is an unsigned rumor
}
```

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
    ["p", "<recipientPublicKey>"],
    ["relays", "<authorReadRelay1>", "<authorReadRelay2>", "..."],
    ["e", "<unsigned-9901-rumor.id>", "", "root"], # connects message to reservation thread
    ["status", "<confirmed|declined|cancelled>"],
    ["time", "<unix timestamp in seconds>"],
    ["tzid", "<IANA Time Zone Database identifier>"],
    ["duration", <duration of reservation in seconds>"],
    # Additional tags MAY be included
  ],
  "content": "<reservation response message in plain text>"
  # Note: No signature field - this is an unsigned rumor
}
```

---

### Reservation Modification Request - Kind:9903

`kind:9903` is used to propose a revised set of reservation terms for an existing reservation thread. It MAY be used by the business as a counter-proposal while responding to a `kind:9901` request, or by either party after a reservation has already been confirmed to propose a replacement reservation. The tags in the event describe the full proposed reservation state that the sender wants the recipient to evaluate.

**Rumor Event Structure:**
```yaml
{
  "id": "<32-byte hex of unsigned event hash>",
  "pubkey": "<senderPubKey>",
  "created_at": <unix timestamp in seconds>,
  "kind": 9903,
  "tags": [
    ["p", "<recipientPublicKey>"],
    ["relays", "<authorReadRelay1>", "<authorReadRelay2>", "..."],
    ["e", "<unsigned-9901-rumor.id>", "", "root"], # connects message to reservation thread
    ["party_size", "<integer between 1 and 20>"],
    ["time", "<unix timestamp in seconds>"],
    ["tzid", "<IANA Time Zone Database identifier>"], 
    ["name", "<optional string, max 200 chars>"],
    ["telephone", "<optional string, 'tel:' URI as per RFC 3966>"],  # if included, should match the reservation holder information for the thread
    ["email", "<optional string, 'mailto:' URI as per RFC 6068>"],   # if included, should match the reservation holder information for the thread
    ["duration", <optional, duration of reservation in seconds>"],
    ["earliest_time", "<optional unix timestamp in seconds>"],
    ["latest_time", "<optional unix timestamp in seconds>"]
    # Additional tags MAY be included
  ],
  "content": "<reservation modification request message in plain text>"
  # Note: No signature field - this is an unsigned rumor
}
```

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
    ["p", "<recipientPublicKey>"],
    ["relays", "<authorReadRelay1>", "<authorReadRelay2>", "..."],
    ["e", "<unsigned-9901-rumor.id>", "", "root"], # connects message to reservation thread
    ["status", "<confirmed|declined|cancelled>"],
    ["time", "<unix timestamp in seconds>"],
    ["tzid", "<IANA Time Zone Database identifier>"],
    ["duration", <duration of reservation in seconds>"],
    # Additional tags MAY be included
  ],
  "content": "<reservation modification response message in plain text>"
  # Note: No signature field - this is an unsigned rumor
}
```
## Protocol Flow

### Simple Reservation Request 
1. Customer fetches the business's `kind:10002` relay list metadata event
2. Customer sends `reservation.request` `kind:9901` message to the business by publishing the gift wrap to the business's `read` relays and includes the customer's own `read` relays in the `relays` tag
3. Business responds with `reservation.response` `kind:9902` message to the customer with `"status":"confirmed"` or `"status":"declined"` by publishing the gift wrap to the customer's `read` relays hinted in the `relays` tag or discoverable from the customer's `kind:10002`
4. Message exchange ends

### Reservation Request With Business Suggesting Alternative Time
1. Customer fetches the business's `kind:10002` relay list metadata event
2. Customer sends `reservation.request` `kind:9901` message to the business by publishing the gift wrap to the business's `read` relays and includes the customer's own `read` relays in the `relays` tag
3. Business responds with `reservation.modification.request` `kind:9903` message to the customer with proposed new time, publishing the gift wrap to the customer's `read` relays hinted in the request's `relays` tag or discoverable from the customer's `kind:10002`
4. Customer responds with `reservation.modification.response` `kind:9904` message to the business with `"status":"confirmed"` or `"status":"declined"`, publishing the gift wrap to the business's `read` relays hinted in the business's `relays` tag or discoverable from the business's `kind:10002`
5. Business responds with `reservation.response` `kind:9902` message to the customer with matching status `confirmed` or `declined`

### Successful Reservation Modification by Customer
1. Customer sends `reservation.modification.request` `kind:9903` message to the business with proposed new time, publishing to the business's `read` relays discovered from `kind:10002` or the latest routing hints available in the reservation thread
2. Business sends `reservation.modification.response` `kind:9904` message to the customer with `"status":"confirmed"` to indicate availability for the new time, publishing to the customer's `read` relays discovered from `kind:10002` or the latest routing hints available in the reservation thread
3. Customer sends `reservation.response` `kind:9902` message to the business with status `confirmed`, publishing to the business's `read` relays discovered from `kind:10002` or the latest routing hints available in the reservation thread


### Unsuccessful Reservation Modification by Customer
1. Customer sends `reservation.modification.request` `kind:9903` message to the business with proposed new time, publishing to the business's `read` relays discovered from `kind:10002` or the latest routing hints available in the reservation thread
2. Business sends `reservation.modification.response` `kind:9904` message to the customer with `"status":"declined"` to indicate lack of availability for the new time, publishing to the customer's `read` relays discovered from `kind:10002` or the latest routing hints available in the reservation thread
3. Customer sends `reservation.response` `kind:9902` message to the business with original time and status `"status":"confirmed"` to maintain original reservation or `"status":"cancelled"` to cancel the original reservation, publishing to the business's `read` relays discovered from `kind:10002` or the latest routing hints available in the reservation thread


### Reservation Cancellation Initiated by the Business
1. Business sends `reservation.response` `kind:9902` message to the customer with `"status":"cancelled"`, publishing to the customer's `read` relays discovered from `kind:10002` or the latest routing hints available in the reservation thread. Including a note in the `.content` field of the event is highly recommended. 


### Reservation Cancellation Initiated by the Customer
1. Customer sends `reservation.response` `kind:9902` message to the business with `"status":"cancelled"`, publishing to the business's `read` relays discovered from `kind:10002` or the latest routing hints available in the reservation thread. Including a note in the `.content` field of the event is highly recommended. 


## Business Discovery 

Businesses MUST advertise their support for the Reservation Protocol using an external content id tag for NIP-RP compliant with NIP-73. The value `rp` may be changed in the future for a number once a number is assigned to this NIP.

```yaml
{
  "kind": 0,
  "tags": [
    ["i", "rp", "https://github.com/Synvya/reservation-protocol/blob/main/nostr-protocols/nips/rp.md"],
    ["k", "nip"],
    // additional tags
  ],
  // other fields...
}
```

## Verified Business Reviews
Customers who successfully complete a business transaction after creating a reservation using the Reservation Protocol may issue a verified business review. Verified business reviews are reviews from real customers and should be considered more relevant than unverified reviews from users for whom it is not possible to determine if they have transacted with the business.

The Reservation Protocol supports verified business reviews by expanding upon reviews as specified by the [market specification](https://github.com/GammaMarkets/market-spec/blob/main/spec.md) addendum to [NIP-99](https://github.com/nostr-protocol/nips/blob/master/99.md).

Once a reservation is fulfilled, for example when the restaurant check is closed, the business privately issues a token to the customer to attest the business transaction. This token is independent of the review itself and only attests for the fact that the customer and the business executed a transaction:
- It's created before the review is written
- Does not endorse the content of the review

Businesses MUST only issue a token if the `reservation.request` - `kind:9901` message had no `broker` tag or the tag was set to `False`. A token MUST never be issued for a reservation when the `broker` tag is set to `True`.

The verified business review follows the [QTS guidelines](https://habla.news/u/arkinox@arkinox.tech/DLAfzJJpQDS4vj3wSleum) with labels specified by the business to ensure review uniformity regardless of the application used by the customer to issue the review. 

---

### Business Transaction Attestation – Kind:9905

`kind:9905` is a **signed** nostr event created by the business to attest that a business transaction occurred under a given reservation. The event is created by the business when a reservation is fulfilled and sent privately to the customer as the content of a NIP-17 private direct chat message. The `kind:9905` event is **never** published to public relays to maintain the business transaction private until the customer decides to publish a review.

The event is intended as a business transaction attestation token that the customer MAY later embed in a public review. If the customer does not publish a review, then the reservation and business transaction will remain private. If the customer publishes a review, then the reservation and business transaction become public. 

**Event Structure:**
```yaml
{
  "id": "<32-byte hex of event hash>",
  "pubkey": "<businessPublicKey>",
  "created_at": <unix timestamp in seconds>,
  "kind": 9905,
  "tags": [
    ["p", "<customerPublicKey>"],
    ["e", "<unsigned-9901-rumor.id>", "", "root"], # connects message to reservation thread
    ["time", "<unix timestamp in seconds>"],
    ["tzid", "<IANA Time Zone Database identifier>"],
    ["qts_labels", "label1, label2, ..., labelN"] # comma separated list of labels
    
  ],
  "content": "",
  "sig": "<signed by businessPrivateKey>"
}
```

---

### Verified Business Review - Kind 31555
The customer issues a verified business review as a `kind:31555` nostr event following the NIP-99 market specification addendum with additional tags included for the verification process:
- `verified`: base64 encoding of the full serialized `transaction.attestation` `kind:9905` event.
- `e` tag used to connect all messages of the same reservation request (the reservation thread). Contains the `.id` field of the original `kind:9901` reservation request.

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
    # Optional rating categories
    ["rating", "0.8", <label1-from-qts-labels-field-in-transaction-attestation-event], # rating between 0 and 1 with one decimal point.
    ["rating", "1.0", <label2-from-qts-labels-field-in-transaction-attestation-event], # rating between 0 and 1 with one decimal point
    ["rating", "0.6", <labelN-from-qts-labels-field-in-transaction-attestation-event], # rating between 0 and 1 with one decimal point
    # Add more labels as specified by the kind:9905 event.
    ["e", "<unsigned-9901-rumor.id>", "", "root"], # connects message to reservation thread
    ["verified", "<base64-encoded-transaction-attestation-event-kind-9905>"] 
    # Additional tags MAY be included
  ],
  "content": "<free-form review text>",
  "sig": "<signed by customerPrivateKey>"
}
```

A client MAY treat a `kind:31555` event as a **verified business review** if all of the following conditions are met:
1.	The event has a `["verified", "<payload>"]` tag. 
2.	Decoding `<payload>` from base64 yields a valid nostr `transaction.attestation` `kind:9905` event with the following properties:
  - The `.pubkey` field matches the business public key indicated by the `kind:31555` `["d", "p:<businessPublicKey>"]` tag
  - The customer public key of the `["p", "<customerPublicKey>"]` tag matches the public key signing the `kind:31555` review event
  - There is a `["e", "<unsigned-9901-rumor.id>", "", "root"]` tag matching the `["e", "<unsigned-9901-rumor.id>", "", "root"]` tag of the  `kind:31555` review event
  - The `transaction.attestation` `kind:9905` event has a valid signature computed according to NIP-01.

If verification succeeds, clients MAY consider the review as a **verified business review**. If verification fails, clients SHOULD NOT display the review. 
