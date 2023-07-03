# NIP-XX: Data Vending Machine
Money in, data out.

## Rationale
Nostr can act as a marketplace for data processing, where users request jobs to be processed in certain ways (e.g. "speech-to-text", "summarization"), but where they don't necessarily care about "who" processes the data.

This NIP is not to be confused with a 1:1 marketplace; but rather, a flow where user announces a desired output, willigness to pay, and service providers compete to fulfill the job requirement in the best way possible.

### Actors
There are two actors to the workflow described in this NIP:
* Customers (npubs who request a job)
* Service providers (npubs who fulfill jobs)

## User flow
* User publishes a job request
`{ "kind": 68001, "tags": [ [ "j", "speech-to-text" ], ... ] }`

* Service providers listen for the type of jobs they can perform
`{"kinds":[68001], "#j": ["speech-to-text", "image-generation", ... ]}`

* When a job comes in, the service providers who opt to attempt to fulfill the request begin processing it
* Upon completion, the service provider publishes the result of the job with a `job-result` event.
* Upon acceptance, the user zaps the service provider, tagging the job request

## Kinds

This NIP introduces two new kinds:

* `kind:68001`: Job request -- a request to have a job be processed
* `kind:68002`: Job result -- a proposal of the resulting job

### Job request
A request to have data processed -- published by a user

```json
{
    "kind": 68001,
    "content": "",
    "tags": [
        // The type data processing the user wants to be performed
        // on the
        [ "j", "<job-type>", "<model>" ],
        [ "input", "<data>", "<input-type>", "<marker>" ],
        [ "relays", "wss://..."],

        // stringified sat amount that the user is offering to pay
        // for this request
        // should this include an optional max price or is it too
        // ambiguous?
        [ "bid", "<sat-amount>", ["<optional-max-price>"] ],

        // max timestamp at which the job is no longer to be processed
        [ "expiration", "<timestamp>" ]

        // p tags
        [ "p", "service-provider-1" ],
        [ "p", "service-provider-2" ],

        // NIP-33 d-tag
        [ "d", "<unique-job-name>"]
    ]
}
```

#### `content` field
An optional, human-readable description of what this job is for.

#### `j` tag
Specifies the job to be executed. A job request MUST have exactly one `j` tag.

A `j` tag MIGHT name a specific model to be used for the computed with.

#### `input` tag
Specified the input that the job should be executed with.

* `<data>`: The argument for the input
* `<input-type>`: The way this argument should be interpreted
    * Possible values:
        * `url`: a URL to be fetched
        * `event`: a different event ID
        * `job`: the output of a previous job
* `<marker>`:

#### `relays` tag
A list of relays the service provider should publish its job result to.

#### `p` tags (optional)
A user might want to explicitly request this job to be processed by specific service provider(s). Other service providers might still choose to compete for this job.

#### `expiration` (optional)
A user might specify that they will not be interested in results past a certain time (e.g. a time-sensitive job whos value is no longer relevant after some time, like a live transcription service)

### Job result
The output of processing the data -- published by the
```json
{
    "pubkey": "service-provider",

    // result
    "content": "<payload>",
    "tags" [
        // stringified JSON request event
        [ "request", "<2xxx1-event>" ],
        [ "e", <id-of-2xxx1-event>],
        [ "p", "<job-requester's pubkey>" ],
        [ "status", "success", "<more-info>"],
        [ "payment", "requested-payment-amount" ]
    ]
}
```

### `status` tag
The service provider might want to return an error to the user in case the job could not be processed correctly

### `payment`

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
| `language`                     | req  | desired language in BCP 47 format.

## Job chaining
A customer CAN request multiple jobs to be chained, so that the output of a job can be the input of the next job. (e.g. summarization of a podcast's transcription). This is done by specifying as `input` an eventID of a different job with the `job` marker.

Service providers might opt to start processing a subsequent job the moment they see the prior job's result, or they might choose to wait for a zap to have been published. This introduces the risk that service provider of job #1 might delay publishing the zap event in order to have an advantage. This risk is up to service providers to mitigate or to decide whether the service provider of job#1 tends to have good-enough results so as to not wait for a explicit zap to assume the job was accepted.

## Job feedback
> **Warning**
> Is this hijacking/modifying the meaning of NIP-25 reactions too much?

A user might choose to not accept a job result for any reason. A user can provide feedback via NIP-25 reactions.
The `content` of the `kind:7` event SHOULD include a description of how the user reacted to the job result, either
in the form of


## Explicitly not addressed in this NIP

### Reputation system
Service providers are at obvious risk of having their results not compensated. Mitigation of this risk is up to service providers to figure out (i.e. building reputation systems, requiring npub "balances", etc, etc).

It's out of scope (and undesirable) to have this NIP address this issue; the market should.

## Notes

### Multitple job acceptance
* Nothing prevents a user from accepting multiple job results.

