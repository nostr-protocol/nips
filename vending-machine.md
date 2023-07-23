NIP-90
======

Data Vending Machine
--------------------

`draft` `optional` `author:pablof7z`

This NIP defines the interaction between customers and Service Providers for performing on-demand computation.

Money in, data out.

## Kinds
This NIP reserves the range `65000-66000` for data vending machine use.

| Kind | Description |
| ---- | ----------- |
| 65000 | Job feedback |
| 65001 | Job result |
| 65002-66000 | Job request kinds |

[Appendix 2](#appendix-2-job-types) defines the job types.

## Rationale
Nostr can act as a marketplace for data processing, where users request jobs to be processed in certain ways (e.g., "speech-to-text", "summarization", etc.), but they don't necessarily care about "who" processes the data.

This NIP is not to be confused with a 1:1 marketplace; instead, it describes a flow where a user announces a desired output, willingness to pay, and service providers compete to fulfill the job requirement in the best way possible.

### Actors
There are two actors in the workflow described in this NIP:
* Customers (npubs who request a job)
* Service providers (npubs who fulfill jobs)

# Event Kinds
## Job request
A request to have data processed, published by a customer

```json
{
    "kind": xxx, // kind in 65002-66000 range
    "content": "",
    "tags": [
        [ "i", "<data>", "<input-type>", "<marker>", "<relay>" ],
        [ "output", "<mime-type>" ],
        [ "relays", "wss://..."],
        [ "bid", "<msat-amount>" ],
        [ "exp", "<timestamp>" ],
        [ "t", "bitcoin" ]
    ]
}
```

All tags are optional.

* `i` tag: Input data for the job (zero or more inputs may exist)
    * `<data>`: The argument for the input
    * `<input-type>`: The way this argument should be interpreted, MUST be one of:
        * `url`: A URL to be fetched
        * `event`: A Nostr event ID, include an optional relay-url extra param
        * `job`: The output of a previous job with the specified event ID
        * `text`: `<data>` is the value of the input, no resolution is needed
    * `<marker>`: An optional field indicating how this input should be used within the context of the job
    * `<relay>`: If `event` or `job` input-type, the relay where the event/job was published, otherwise optional or empty string
* `output`: MIME type. Expected output format. Service Providers SHOULD publish the result of the job in this format if it has been specified
* `bid`: Customer MAY specify a maximum amount (in millisats) they are willing to pay
* `relays`: Relays where Service Providers SHOULD publish responses to
* `p`: Service Providers the customer is interested in. Other SPs MIGHT still choose to process the job
* `exp`: Expiration timestamp. Service Providers SHOULD not send results after this timestamp

## Job result

The output of processing the data -- published by the Service Provider.

```json
{
    "pubkey": "<service-provider pubkey>",
    "content": "<payload>",
    "kind": 65001,
    "tags": [
        [ "request", "<job-request>" ],
        [ "e", "<job-request-id>", "<relay-hint>" ],
        [ "p", "<Customer's pubkey>" ],
        [ "amount", "requested-payment-amount", "<optional-bolt11>" ]
    ]
}
```

* `request` tag: The job request event ID.
* `amount`: millisats that the Service Provider is requesting to be paid. An optional third value can be a bolt11 invoice.

## Job feedback
Both customers and service providers can give feedback about a job.

The result of the job SHOULD be included in the `content` field.

* `status` tag: Service Providers MAY indicate errors or extra info about the results by including them in the `status` tag.
* `amount`: as defined in the [Job Result](#job-result) section.

# Protocol Flow
* Customer publishes a job request (e.g. `kind:65002`).
* Service Providers can submit `kind:65000` job-feedback events (e.g. `payment-required`, `processing`, `error`, etc.).
* Upon completion, the service provider publishes the result of the job with a `kind:65001` job-result event.
* At any point, the user can pay the included `bolt11` or zap any of the events the service provider has sent to the user.

`kind:65000` and `kind:65001` events MAY include an `amount` tag, this can be interpreted as a suggestion to pay. Service Providers SHOULD use the `payment-required` feedback event to signal that a payment is required and no further actions will be performed until the payment is sent. Customers can always either pay the included `bolt11` invoice or zap the event requesting the payment and service providers should monitor for both if they choose to include a bolt11 invoice.

## Notes about the protocol flow
The flow is deliberately ambiguous, allowing vast flexibility for the interaction between customers and service providers so that service providers can model their behavior based on their own decisions/perceptions of risk.

Some service providers might choose to submit a `payment-required` as the first reaction before sending a `processing` or before delivering `kind:65001` results, some might choose to serve partial results for the job (e.g. as a sample), send a `payment-required` to deliver the rest of the results, and some service providers might choose to assess likelihood of payment based on an npub's past behavior and thus serve the job results before requesting payment for the best possible UX.

It's not up to this NIP to define how individual vending machines should choose to run their business.

# Cancellation
A job request might be cancelled by publishing a `kind:5` delete request event tagging the job request event.

# Job chaining
A Customer MAY request multiple jobs to be processed as a chain, where the output of a job can be the input of another job. (e.g. podcast transcription -> summarization of the transcription). This is done by specifying as input an event id of a different job with the `job` type.

Service Providers MAY begin processing a subsequent job the moment they see the prior job's result, but they will likely wait for a zap to be published first. This introduces a risk that Service Provider of job #1 might delay publishing the zap event in order to have an advantage. This risk is up to Service Providers to mitigate or to decide whether the service provider of job #1 tends to have good-enough results so as to not wait for an explicit zap to assume the job was accepted.

This gives a higher level of flexibility to service providers (which sophisticated service providers would take anyway).

Consult [Appendix 1: Example](#appendix-1-examples)'s [Summarization of a podcast](#summarization-of-a-podcast)

### E.g. Payment required (with sample content)
```json
{
    "kind": 65000,
    "content": "This is the transcription service that you",
    "tags": [
        [ "e", <job-request-id>, <relay-hint> ],
        [ "p", <customer-pubkey> ],
        [ "status", "payment-required" ],
        [ "amount", "7000" ],
    ]
}
```

## Not addressed in this NIP

### Reputation system
Service providers are at an obvious risk of having their results not compensated. Mitigation of this risk is up to service providers to figure out (i.e., building reputation systems, requiring npub "balances", etc.). It's out of scope (and undesirable) to have this NIP address this issue; the market should.

### Encrypted job requests
Not to be included in the first draft of this NIP, but encrypted job requests should be added. A few ways:
    * publish job requests with some useful metadata of the job "e.g., length of audio to be transcribed", service providers offer to do the job, the customer replies with a NIP-04-like encrypted job requested encrypted with the service provider's pubkey.


# Appendix 1: Examples

## Transcript of a podcast from second `900` to `930`.

### `kind:65002`: Speech-to-text job request
```json
{
    "id": "12345",
    "pubkey": "abcdef",
    "content": "",
    "kind": 65002,
    "tags": [
        [ "i", "https://bitcoin.review/episode1.mp3", "url" ],
        [ "params", "range", "900", "930" ],
        [ "output", "text/vtt" ],
        [ "bid", "50000" ],
        [ "output", "text/plain" ]
    ]
}
```

### `kind:65000`: Job Feedback: request for (partial) payment
* The SP is signaling here that it won't start processing until 100 sats are paid
```json
{
    "kind": 65000,
    "content": "",
    "tags": [
        ["e", "12345"],
        ["p", "abcdef"],
        ["status", "payment-required"],
        ["amount", "100000"]
    ]
}
```

* User zaps 100 sats to the `kind:65000` job-feedback

### `kind:65001`: Job result + request for remaining payment
```json
{
    "content": "blah blah blah",
    "tags": [
        ["e", "12345"],
        ["p", "abcdef"],
        ["amount", "400000"]
    ]
}
```

## Summarization of a podcast
User publishes two job requests at the same time. A job that transcribes an audio and a job that summarizes the transcription (output of job #1).

User publishes event #1 and #2 together.

### `kind:65002`: Job Request #1: speech-to-text
```json
{
    "id": "12345",
    "pubkey": "abcdef",
    "kind": 65002,
    "content": "",
    "tags": [
        [ "i", "https://bitcoin.review/episode1.mp3", "url" ],
        [ "output", "text/plain" ],
        [ "params", "range", "900", "930" ],
        [ "bid", "100000" ]
    ]
}
```

### `kind:65002`: Job Request #2: summarization of job #1's result
```json
{
    "id": "12346",
    "pubkey": "abcdef",
    "kind": 65003,
    "content": "",
    "tags": [
        [ "i", "12345", "job" ], // input is the output of job with id 12345
        [ "output", "text/plain" ],
        [ "params", "length", "3 paragraphs" ],
        [ "bid", "10000" ]
    ]
}
```

## Translation of a note
### `kind:65004`: Job Request #1: translation of an existing note
```json
{
    "id": "12346",
    "pubkey": "abcdef",
    "content": "",
    "kind": 65004,
    "tags": [
        [ "i", "<hexid>", "event", "wss://relay.nostr.com" ]
        [ "output", "text/plain" ],
        [ "params", "lang", "es_AR" ],
        [ "bid", "5000" ]
    ]
}
```

### `kind:65001`: Job result
```json
{
    "kind": 65001,
    "content": "Che, que copado, boludo!",
    "tags": [
        ["e", "12346"],
        ["p", "abcdef"],
        ["amount", "4000"]
    ]
}
```

## AI-image of the summarization of 2 podcasts

### `kind:65002`: Job request #1 (transcribe podcast #1)
```json
{
    "id": "123",
    "kind": 65002,
    "tags": [
        [ "i", "https://example.com/episode1.mp3", "url" ],
        [ "bid", "100000" ]
    ]
}
```

### `kind:65002`: Job request #2 (transcribe podcast #2)
```json
{
    "id": "124",
    "kind": 65002,
    "tags": [
        [ "i", "https://example.com/episode2.mp3", "url" ],
        [ "bid", "100000" ]
    ]
}
```

### `kind:65003`: Job request #3 (summarize the two job's outputs into one paragraph)
```json
{
    "id": "125",
    "kind": 65003,
    "tags": [
        [ "param", "length", "1 paragraph" ],
        [ "i", "123", "job" ],
        [ "i", "124", "job" ],
        [ "bid", "100000" ]
    ]
}
```

### `kind:65005`: Job request #4 (generate image based on the summary)
```json
{
    "id": "126",
    "kind": 65004,
    "tags": [
        [ "i", "125", "job" ],
        [ "param", "prompt", "photorealistic" ],
        [ "param", "size", "4000x4000" ],
        [ "bid", "500000" ]
    ]
}
``

## AI-image of embedded input

### `kind:65005`: Job request
```json
{
    "kind": 65004,
    "tags": [
        [ "i", "Millions of vending machines, interconnected with tubes with eah other", "text" ],
        [ "param", "prompt", "photorealistic" ],
        [ "bid", "500000" ]
    ]
}
```

# Appendix 2: Job types

This is a list of all the supported job requests.

## speech-to-text: `kind:65002`

### params

| param      | req? | description                                               |
|------------|------|-----------------------------------------------------------|
| `range`    | opt  | timestamp range (in seconds) of desired text to be transcribed |
| `alignment`| opt  | word, segment, raw:  word-level, segment-level, or raw outputs |

## summarization: `kind:65003`

| param     | req? | description   |
|-----------|------|---------------|
| `length`  | opt  | desired length |

## translation: `kind:65004`

| param     | req? | description                                |
|-----------|------|--------------------------------------------|
| `lang`    | req  | desired language in BCP 47 format.         |

## image generation: `kind:65005`

| param     | req? | description                                           |
|-----------|------|-------------------------------------------------------|
| `prompt`  | opt  | extra prompt to be used for the image generation      |
| `size`    | opt  | desired size of the image                             |


# Appendix 3: Job feedback status

| status | description |
|--------|-------------|
| `payment-required` | Service Provider requires payment before continuing. |
| `processing` | Service Provider is processing the job. |
| `error` | Service Provider was unable to process the job. |
| `success` | Service Provider successfully processed the job. |
| `failure` | Service Provider failed to process the job. |
| `partial` | Service Provider partially processed the job. The `.content` might include a sample of the partial results. |

Any job feedback event MIGHT include results in the `.content` field, as described in the [Job Result](#job-result) section. This is useful for service providers to provide a sample of the results that have been processed so far.

# Appendix 4: Service provider discoverability

Service Providers can use NIP-89 announcements to advertise their support for job kinds:

```json
{
    "kind": 31990,
    "pubkey": "<pubkey>",
    "tags": [
        [ "k", 65002 ], // e.g. speech-to-text
        [ "t", "bitcoin" ] // e.g. optionally advertises it specializes in bitcoin audio transcription that won't confuse "Drivechains" with "Ridechains"
    ]
}
```

Customers can use NIP-89 to see what service providers their follows use.