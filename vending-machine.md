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
        // The type of data processing the user wants to be performed
        [ "j", "<job-type>", "<optional-model>" ],

        // input(s) for the job request
        [ "i", "<data>", "<input-type>", "<marker>" ],

        // relays where the job result should be published
        [ "relays", "wss://..."],

        // millisats amount that the user is offering to pay
        [ "bid", "<msat-amount>", "<optional-max-price>" ],
        [ "exp", "<timestamp>" ],
        [ "p", "service-provider-1" ],
        [ "p", "service-provider-2" ],
    ]
}
```

### `content` field
An optional, human-readable description of what this job is for.

### `j` tag
Specifies the job to be executed. A job request MUST have exactly one (1) `j` tag.

A `j` tag MAY include a second value specifying the name of a model to be used when computing the result.

### `i` (input) tag
Specifies the input data that the job is to be executed against. The input is relay-indexable so that clients interested in the exact same job can find the input data and the result result (if it's already fulfilled).

A job request CAN have zero or more inputs.

* `<data>`: The argument for the input
* `<input-type>`: The way this argument should be interpreted
    * Possible values:
        * `url`: a URL to be fetched
        * `event`: a nostr event ID
        * `job`: the output of a previous job with the specified event ID
* `<marker>`: an optional field indicating where the data can be found if it is a subset of the provided values, for example the name of the key(s) in a key/value set, or the start and end positions of the data if it's a bytestream.

### `bid` tag
The Customer MAY specify a maximum amount (in millisats) they are willing to pay for the job to be processed.

### `relays` tag
The Service Provider SHOULD publish job results to the relays specified in this this tag. 

### `p` tags
If a Customer has a preference for specific Service Provider(s) to process this job, they SHOULD indicate this by including the Service Provider(s) pubkey in a `p` tag. This is NOT intended to exclude other Service Providers and they MAY still choose to compete for jobs that have not tagged them.

### `exp`
A Customer MAY indicate that they will not pay for results produced after a specific Block height or Unix Timestamp. This is intended for time-sensitive jobs where the result is not relevant unless produced within a certain timeframe, e.g. a live transcription service.

## Job result
The output of processing the data -- published by the Service Provider.
```json
{
    "pubkey": "service-provider pubkey in hex",

    // result
    "content": "string: <payload>",
    "kind": 68002,
    "tags" [
        // stringified JSON request event
        [ "request", "<68001-event-as-stringified JSON>" ],
        [ "e", "<id-of-68001-event>" ],
        [ "p", "<Customer's pubkey>" ],
        [ "status", "success", "<more-info>" ],
        [ "amount", "requested-payment-amount" ]
    ]
}
```

The result of the job SHOULD be included in the `content` field. If the output is not text, the `content` field SHOULD be empty and an `output` tag should be used instead as described below.

#### `status` tag
The Service Provider MAY indicate errors during processing by including them in the `status` tag, these errors are intended to be consumed by the Customer.

#### `amount`
The amount (in millisats) that the Service Provider is requesting to be paid. This amount MAY differ to the amount specified by the Customer in the `bid` tag. The amount SHOULD be less than the maximum amount specified by the user in the `bid` tag.

## Job types

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

# Protocol Flow
* Customer publishes a job request
`{ "kind": 68001, "tags": [ [ "j", "speech-to-text" ], ... ] }`

* Service Providers subsribe to the type of jobs they can perform
`{"kinds":[68001], "#j": ["speech-to-text", "image-generation", ... ]}`

* When a job comes in, the Service Providers who opt to attempt to fulfill the request begin processing it, or they can react to it with feedback for the user (e.g. _payment required_, _unprocessable entity_, etc.)
* Upon completion, the service provider publishes the result of the job with a `job-result` event.
* Upon acceptance, the user zaps the service provider, tagging the job result event.

# Payment
Customers SHOULD pay service providers whose job results they accept by zapping the Service Provider and tagging the `kind:68002` job result.


# Job chaining
A Customer MAY request multiple jobs to be processed in a chained form, so that the output of a job can be the input of the next job. (e.g. summarization of a podcast's transcription). This is done by specifying as `input` an eventID of a different job with the `job` marker.

Service Providers MAY begin processing a subsequent job the moment they see the prior job's result, but they will likely wait for a zap to be published first. This introduces a risk that Service Provider of job #1 might delay publishing the zap event in order to have an advantage. This risk is up to Service Providers to mitigate or to decide whether the service provider of job #1 tends to have good-enough results so as to not wait for a explicit zap to assume the job was accepted.

# Reactions
> **Warning**
> Is this hijacking/modifying the meaning of NIP-25 reactions too much?

## Job request reactions
Service Providers might opt to give feedback about a job.

### E.g. Payment required
```json
{
    "kind": 7,
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

## Explicitly not addressed in this NIP

### Reputation system
Service providers are at obvious risk of having their results not compensated. Mitigation of this risk is up to service providers to figure out (i.e. building reputation systems, requiring npub "balances", etc, etc).

It's out of scope (and undesirable) to have this NIP address this issue; the market should.

## Notes

### Multitple job acceptance
* Nothing prevents a user from accepting multiple job results.

# Appendix 1: Examples

## Transcript of a podcast from second `900` to `930`.

### `kind:68001`: Job Request
```json
{
    "id": "12345",
    "pubkey": "abcdef",
    "content": "I need a transcript of Bitcoin.review",
    "tags": [
        [ "j", "speech-to-text" ],
        [ "params", "range", "900", "930" ],
        [ "i", "https://bitcoin.review/episode1.mp3", "url" ],
        [ "bid", "5000", "9000" ]
    ]
}
```

### `kind:1021`: Job fulfillment
```json
{
    "content": "Person 1: blah blah blah",
    "tags": [
        ["e", "12345"],
        ["p", "abcdef"],
        ["status", "success"]
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
    "content": "I need a summarization",
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
        [ "i", "<hexid>", "event" ]
        [ "params", "language", "es_AR" ],
        [ "bid", "100", "500" ]
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

# Notes

* Should there be a possibility of getting the job result delivered encrypted? I don't like it but maybe it should be supported.

* Ambiguity on job acceptance, particularly for job-chaining circumstances is deliberately ambiguous: service providers could wait until explicit job result acceptance / payment to start working on the next item on the chain, or they could start working as soon as they see a result of the previous job computed.

That's up to each service provider to choose how to behave depending on the circumstances. This gives a higher level of flexibility to service providers (which sophisticated service providers would take anyway).
