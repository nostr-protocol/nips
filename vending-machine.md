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
        // The type data processing the user wants to be performed
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
Specifies the job to be executed. A job request MUST have exactly one `j` tag.

A `j` tag MIGHT name a specific model to be used for the computed with as the second value.

### `i` (input) tag
Specifies the input that the job should be executed with. The input is relay-indexable so that clients interested in the exact same job can find it it's result if it's already fulfilled.

A job request CAN have zero or more inputs.

* `<data>`: The argument for the input
* `<input-type>`: The way this argument should be interpreted
    * Possible values:
        * `url`: a URL to be fetched
        * `event`: a nostr event ID
        * `job`: the output of a previous job with the specified event ID
* `<marker>`:

### `bid` tag
The user MIGHT specify an amount of millisats they are willing to pay for the job to be processed. The user MIGHT also specify a maximum amount of millisats they are willing to pay.

### `relays` tag
A list of relays the service provider should publish its job result to.

### `p` tags
A user MIGHT want to explicitly request this job to be processed by specific service provider(s). Other service providers might still choose to compete for this job.

### `exp`
A user might specify that they will not be interested in results past a certain time (e.g. a time-sensitive job whos value is no longer relevant after some time, like a live transcription service)

## Job result
The output of processing the data -- published by the service provider.
```json
{
    "pubkey": "service-provider",

    // result
    "content": "<payload>",
    "tags" [
        // stringified JSON request event
        [ "request", "<68001-event>" ],
        [ "e", <id-of-68001-event>],
        [ "p", "<job-requester's pubkey>" ],
        [ "status", "success", "<more-info>"],
        [ "amount", "requested-payment-amount" ]
    ]
}
```

The result of the job should be in the `content`. If the output is not text, the `content` field should be empty and an `output` tag should be used instead as described below.

#### `status` tag
The service provider might want to return an error to the user in case the job could not be processed correctly

#### `amount`
The amount of millisats the service provider is requesting to be paid. This amount MIGHT be different than the amount specified by the user in the `bid` tag. The amount SHOULD be less than the maximum amount specified by the user in the `bid` tag.

## Job types

This NIP defines some job types, clients SHOULD specify these types for maximum compatibility with service providers. Other job types might be added to this NIP.

### `speech-to-text`
#### params
| param                          | req? | description
|--------------------------------|------|--------
| `range`                        | opt  | timestamp range (in seconds) of desired text to be transcribed

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
* User publishes a job request
`{ "kind": 68001, "tags": [ [ "j", "speech-to-text" ], ... ] }`

* Service providers listen for the type of jobs they can perform
`{"kinds":[68001], "#j": ["speech-to-text", "image-generation", ... ]}`

* When a job comes in, the service providers who opt to attempt to fulfill the request begin processing it, or they can react to it with feedback for the user (e.g. _payment required_, _unprocessable entity_, etc.)
* Upon completion, the service provider publishes the result of the job with a `job-result` event.
* Upon acceptance, the user zaps the service provider, tagging the job result event.

# Payment
Customers SHOULD pay service providers whose job results they accept. Users should zap the service provider, tagging the `kind:68002` job result.


# Job chaining
A customer CAN request multiple jobs to be chained, so that the output of a job can be the input of the next job. (e.g. summarization of a podcast's transcription). This is done by specifying as `input` an eventID of a different job with the `job` marker.

Service providers might opt to start processing a subsequent job the moment they see the prior job's result, or they might choose to wait for a zap to have been published. This introduces the risk that service provider of job #1 might delay publishing the zap event in order to have an advantage. This risk is up to service providers to mitigate or to decide whether the service provider of job#1 tends to have good-enough results so as to not wait for a explicit zap to assume the job was accepted.

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
