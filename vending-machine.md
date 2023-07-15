NIP-XX
======

Data Vending Machine
--------------------

`draft` `optional` `author:pablof7z`

This NIP defines the interaction between customers and Service Providers to perform on-demand computation.

## Rationale
Nostr can act as a marketplace for data processing, where users request jobs to be processed in certain ways (e.g. "speech-to-text", "summarization", etc.), but where they don't necessarily care about "who" processes the data.

This NIP is not to be confused with a 1:1 marketplace; but rather, a flow where user announces a desired output, willigness to pay, and service providers compete to fulfill the job requirement in the best way possible.

### Actors
There are two actors to the workflow described in this NIP:
* Customers (npubs who request a job)
* Service providers (npubs who fulfill jobs)

# Event Kinds
## Job request
A request to have data processed -- published by a customer

```json
{
    "kind": 68001,
    "content": "",
    "tags": [
        [ "j", "<job-type>", "<optional-model>" ],
        [ "i", "<data>", "<input-type>", "<marker>" ],
        [ "output", "<mime-type>" ],
        [ "relays", "wss://..."],
        [ "bid", "<msat-amount>", "<optional-max-price>" ],
        [ "exp", "<timestamp>" ],
        [ "p", "service-provider-1" ],
        [ "p", "service-provider-2" ],
    ]
}
```

* `content` field: An optional, human-readable description of what this job is for.
* `j` tag: Job-type to be executed.
    * A job request MUST have exactly one `j` tag.
    * It MAY include a second value specifying the name of a model to be used when computing the result.

* `i` tag: Input data for the job.
    * A job request CAN have zero or more inputs.
    * Positional arguments: `["i", "<data>", "<input-type>", "<relay>", "<marker>"]`
    * `<data>`: The argument for the input
    * `<input-type>`: The way this argument should be interpreted, one of:
        * `url`: a URL to be fetched
        * `event`: a nostr event ID, include an optional relay-url extra param
        * `job`: the output of a previous job with the specified event ID
    * `<relay>`: if `event` or `job` input-type, the relay where the event/job was published, otherwise optional or empty string.
    * `<marker>`: an optional field indicating how this input should be used.
* `output` tag: MIME type. Expected output format. Service Providers SHOULD publish the result of the job in this format.
* `bid` tag: Customer MAY specify a maximum amount (in millisats) they are willing to pay.
* `relays` tag: relays where Service Providers SHOULD publish responses to.
* `p` tags: Service Providers the customer is interested in having process this job. Other SP MIGHT still choose to process the job.
* `exp`: Optional expiration timestamp. Service Providers SHOULD not send results after this timestamp.

## Job result
The output of processing the data -- published by the Service Provider.
```json
{
    "pubkey": "service-provider pubkey in hex",
    "content": "<payload>",
    "kind": 68002,
    "tags" [
        [ "request", "<68001-event>" ],
        [ "e", "<id-of-68001-event>" ],
        [ "p", "<Customer's pubkey>" ],
        [ "status", "success", "<more-info>" ],
        [ "amount", "requested-payment-amount", "<optional-bolt11>" ]
    ]
}
```

## Job feedback
Both customers and service providers can give feedback about a job.

The result of the job SHOULD be included in the `content` field.

* `status` tag: Service Providers MAY indicate errors or extra info about the results by including them in the `status` tag.
* `amount`: millisats that the Service Provider is requesting to be paid. An optional third value can be a bolt11 invoice.

# Protocol Flow
* Customer publishes a job request
`{ "kind": 68001, "tags": [ [ "j", "speech-to-text" ], ... ] }`
* Service Prpvoders can submit `kind:68003` job-feedback events (e.g. `payment-required`, `processing`, `unprocessable-entity`, etc.).
* Upon completion, the service provider publishes the result of the job with a `kind:68002` job-result event.
* Upon acceptance, the user zaps the service provider, tagging the job result event with a `kind:7` 👍 reaction.

`kind:68002` and `kind:68003` events MAY include an `amount` tag, this can be interpreted as a suggestion to pay. Service Providers
SHOULD use the `payment-required` feedback event to signal that a payment must be done before moving on to the next step.

## Notes about the protocol flow
The flow is deliverately left ambiguos, allowing vast flexibility for the interaction between customers and service providers so that
service providers can model their behavior based on their own decisions. Some service providers might choose to submit a `payment-required`
as the first reaction before sending an `processing` or before delivering `kind:68002` results, some might choose to serve partial results
for the job (e.g. as a sample), send a `payment-required`to deliver the rest of the results, and some service providers might choose to
assess likelyhood of payment based on an npub's past behavior and thus serve the job results before requesting payment for the best possible UX.

# Payment
Customers SHOULD pay service providers whose job results they accept by zapping the Service Provider and tagging the `kind:68002` job result.

Additionally, if a service provider requests full or partial prepayment via a `kind:68003` job-feedback event, the customer SHOULD zap that event to pay the service provider.

# Cancellation
A `kind:68001` job request might be cancelled by publishing a `kind:5` delete request event tagging the job request event.

# Job chaining
A Customer MAY request multiple jobs to be processed in a chained form, so that the output of a job can be the input of the next job. (e.g. summarization of a podcast's transcription). This is done by specifying as `input` an eventID of a different job with the `job` marker.

Service Providers MAY begin processing a subsequent job the moment they see the prior job's result, but they will likely wait for a zap to be published first. This introduces a risk that Service Provider of job #1 might delay publishing the zap event in order to have an advantage. This risk is up to Service Providers to mitigate or to decide whether the service provider of job #1 tends to have good-enough results so as to not wait for a explicit zap to assume the job was accepted.

# Job Feedback

## Job request reactions
Service Providers might opt to give feedback about a job.

### E.g. Payment required
```json
{
    "kind": 68003,
    "content": "Please pay 7 sats for job xxxx",
    "tags": [
        [ "e", <job-request-id> ],
        [ "status", "payment-required" ],
        [ "amount", "7000" ],
    ]
}
```

## Job feedback
A user might choose to not accept a job result for any reason. A user can provide feedback via NIP-25 reactions.
The `content` of the `kind:7` event SHOULD include a description of how the user reacted to the job result.

## Not addressed in this NIP

### Reputation system
Service providers are at obvious risk of having their results not compensated. Mitigation of this risk is up to service providers to figure out (i.e. building reputation systems, requiring npub "balances", etc, etc).

It's out of scope (and undesirable) to have this NIP address this issue; the market should.

# Appendix 1: Examples

## Transcript of a podcast from second `900` to `930`.

### `kind:68001`: Job Request
```json
{
    "id": "12345",
    "pubkey": "abcdef",
    "content": "",
    "tags": [
        [ "j", "speech-to-text" ],
        [ "i", "https://bitcoin.review/episode1.mp3", "url" ],
        [ "params", "range", "900", "930" ],
        [ "bid", "5000", "9000" ],
        [ "output", "text/plain" ]
    ]
}
```

### `kind:68003`: Job Feedback: request for (partial) payment
```json
{
    "kind": 68003,
    "content": "",
    "tags": [
        ["e", "12345"],
        ["p", "abcdef"],
        ["status", "payment-required"],
        ["amount", "1000"]
    ]
}
```

* User zaps 1000 sats to event kind:68003.

### `kind:68002`: Job fulfillment + request for remaining payment
```json
{
    "content": "blah blah blah",
    "tags": [
        ["e", "12345"],
        ["p", "abcdef"],
        ["amount", "6000"]
    ]
}
```

## Summarization of a podcast

User publishes two job requests at the same time in the order they should be executed.

### `kind:68001`: Job Request #1
```json
{
    "id": "12345",
    "pubkey": "abcdef",
    "content": "I need a transcript of Bitcoin.review from second 900 to 930",
    "tags": [
        [ "j", "speech-to-text" ],
        [ "params", "range", "900", "930" ],
        [ "i", "https://bitcoin.review/episode1.mp3", "url" ],
        [ "bid", "5000", "9000" ]
    ]
}
```

### `kind:68001`: Job Request #2
```json
{
    "id": "12346",
    "pubkey": "abcdef",
    "content": "",
    "tags": [
        [ "j", "summarization" ],
        [ "params", "length", "3 paragraphs" ],
        [ "i", "12346", "job" ],
        [ "bid", "300", "900" ]
    ]
}
```

## Translation of a note
### `kind:68001`: Job Request #1
```json
{
    "id": "12346",
    "pubkey": "abcdef",
    "content": "",
    "tags": [
        [ "j", "translation" ],
        [ "i", "<hexid>", "event", "wss://relay.nostr.com" ]
        [ "params", "language", "es_AR" ],
        [ "bid", "100", "500" ]
    ]
}
```

### `kind:68003`: Job respomse
```json
{
    "kind": 68003,
    "content": "Che, que copado, boludo!",
    "tags": [
        ["e", "12346"],
        ["p", "abcdef"],
        ["amount", "1000"]
    ]
}
```

## AI-image of the summarization of 2 podcasts

### `kind:68001`: Job request #1 (transcribe podcast #1)
```json
{
    "id": "123",
    "tags": [
        [ "j", "speech-to-text" ],
        [ "i", "https://example.com/episode1.mp3", "url" ],
        [ "bid", "100", "500" ]
    ]
}
```

### `kind:68001`: Job request #2 (transcribe podcast #2)
```json
{
    "id": "124",
    "tags": [
        [ "j", "speech-to-text" ],
        [ "i", "https://example.com/episode2.mp3", "url" ],
        [ "bid", "100", "500" ]
    ]
}
```

### `kind:68001`: Job request #3 (summarize both podcasts into one podcast)
```json
{
    "id": "125",
    "tags": [
        [ "j", "summarize" ],
        [ "param", "length", "1 paragraph" ],
        [ "i", "123", "job" ],
        [ "i", "124", "job" ],
        [ "bid", "100", "500" ]
    ]
}
```

# Appendix 2: Job types

This NIP defines some example job types, Customers SHOULD specify these types for maximum compatibility with Service Providers. Other job types MAY be added to this NIP after being observed in the wild.

### `speech-to-text`
#### params
| param                          | req? | description
|--------------------------------|------|--------
| `range`                        | opt  | timestamp range (in seconds) of desired text to be transcribed
| `alignment`                    | opt  | word, segment, raw :  word-level, segment-level or raw outputs

### `summarization`
| param                          | req? | description
|--------------------------------|------|--------
| `length`                       | opt  | desired length

### `translation` -- Translate text to a specific language
#### params
| param                          | req? | description
|--------------------------------|------|--------
| `language`                     | req  | requested language in BCP 47 format.


# Notes

* Should there be a possibility of getting the job result delivered encrypted? I don't like it but maybe it should be supported.

* Ambiguity on job acceptance, particularly for job-chaining circumstances is deliberately ambiguous: service providers could wait until explicit job result acceptance / payment to start working on the next item on the chain, or they could start working as soon as they see a result of the previous job computed.

That's up to each service provider to choose how to behave depending on the circumstances. This gives a higher level of flexibility to service providers (which sophisticated service providers would take anyway).
