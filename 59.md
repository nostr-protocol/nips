NIP-59
======

Gift Wrap
---------

`optional`

This NIP defines a protocol for encapsulating any nostr event. This makes it possible to obscure most metadata
for a given event, perform collaborative signing, and more.

This NIP *does not* define any messaging protocol. Applications of this NIP should be defined separately.

This NIP relies on [NIP-44](./44.md)'s versioned encryption algorithms.

## Overview

This protocol uses three main concepts to protect the transmission of a target event: `rumor`s, `seal`s, and `gift wrap`s.

- A `rumor` is a regular nostr event, but is **not signed**. This means that if it is leaked, it cannot be verified.
- A `rumor` is serialized to JSON, encrypted, and placed in the `content` field of a `seal`. The `seal` is then
  signed by the author of the note. The only information publicly available on a `seal` is who signed it, but not what was said.
- A `seal` is serialized to JSON, encrypted, and placed in the `content` field of a `gift wrap`.

This allows the isolation of concerns across layers:

- A rumor carries the content but is unsigned, which means if leaked it will be rejected by relays and clients,
  and can't be authenticated. This provides a measure of deniability.
- A seal identifies the author without revealing the content or the recipient.
- A gift wrap can add metadata (recipient, tags, a different author) without revealing the true author.

## Protocol Description

### 1. The Rumor Event Kind

A `rumor` is the same thing as an unsigned event. Any event kind can be made a `rumor` by removing the signature.

### 2. The Seal Event Kind

A `seal` is a `kind:13` event that wraps a `rumor` with the sender's regular key. The `seal` is **always** encrypted
to a receiver's pubkey but there is no `p` tag pointing to the receiver. There is no way to know who the rumor is for
without the receiver's or the sender's private key. The only public information in this event is who is signing it.

```json
{
  "id": "<id>",
  "pubkey": "<real author's pubkey>",
  "content": "<encrypted rumor>",
  "kind": 13,
  "created_at": 1686840217,
  "tags": [],
  "sig": "<real author's pubkey signature>"
}
```

Tags MUST always be empty in a `kind:13`. The inner event MUST always be unsigned.

### 3. Gift Wrap Event Kind

A `gift wrap` event is a `kind:1059` event that wraps any other event. `tags` SHOULD include any information
needed to route the event to its intended recipient, including the recipient's `p` tag or [NIP-13](13.md) proof of work.

```json
{
  "id": "<id>",
  "pubkey": "<random, one-time-use pubkey>",
  "content": "<encrypted kind 13>",
  "kind": 1059,
  "created_at": 1686840217,
  "tags": [["p", "<recipient pubkey>"]],
  "sig": "<random, one-time-use pubkey signature>"
}
```

## Encrypting Payloads

Encryption is done following [NIP-44](44.md) on the JSON-encoded event. Place the encryption payload in the `.content`
of the wrapper event (either a `seal` or a `gift wrap`).

## Other Considerations

If a `rumor` is intended for more than one party, or if the author wants to retain an encrypted copy, a single
`rumor` may be wrapped and addressed for each recipient individually.

The canonical `created_at` time belongs to the `rumor`. All other timestamps SHOULD be tweaked to thwart
time-analysis attacks. Note that some relays don't serve events dated in the future, so all timestamps
SHOULD be in the past.

Relays may choose not to store gift wrapped events due to them not being publicly useful. Clients MAY choose
to attach a certain amount of proof-of-work to the wrapper event per [NIP-13](13.md) in a bid to demonstrate that
the event is not spam or a denial-of-service attack.

To protect recipient metadata, relays SHOULD guard access to `kind 1059` events based on user AUTH. When
possible, clients should only send wrapped events to relays that offer this protection.

To protect recipient metadata, relays SHOULD only serve `kind 1059` events intended for the marked recipient.
When possible, clients should only send wrapped events to `read` relays for the recipient that implement
AUTH, and refuse to serve wrapped events to non-recipients.

## An Example

Let's send a wrapped `kind 1` message between two parties asking "Are you going to the party tonight?"

- Author private key: `0beebd062ec8735f4243466049d7747ef5d6594ee838de147f8aab842b15e273`
- Recipient private key: `e108399bd8424357a710b606ae0c13166d853d327e47a6e5e038197346bdbf45`
- Ephemeral wrapper key: `4f02eac59266002db5801adc5270700ca69d5b8f761d8732fab2fbf233c90cbd`

Note that this messaging protocol should not be used in practice, this is just an example. Refer to other
NIPs for concrete messaging protocols that depend on gift wraps.

### 1. Create an event

Create a `kind 1` event with the message, the receivers, and any other tags you want, signed by the author.
Do not sign the event.

```json
{
  "created_at": 1691518405,
  "content": "Are you going to the party tonight?",
  "tags": [],
  "kind": 1,
  "pubkey": "611df01bfcf85c26ae65453b772d8f1dfd25c264621c0277e1fc1518686faef9",
  "id": "9dd003c6d3b73b74a85a9ab099469ce251653a7af76f523671ab828acd2a0ef9"
}
```

### 2. Seal the rumor

Encrypt the JSON-encoded `rumor` with a conversation key derived using the author's private key and
the recipient's public key. Place the result in the `content` field of a `kind 13` `seal` event. Sign
it with the author's key.

```json
{
  "content": "AqBCdwoS7/tPK+QGkPCadJTn8FxGkd24iApo3BR9/M0uw6n4RFAFSPAKKMgkzVMoRyR3ZS/aqATDFvoZJOkE9cPG/TAzmyZvr/WUIS8kLmuI1dCA+itFF6+ULZqbkWS0YcVU0j6UDvMBvVlGTzHz+UHzWYJLUq2LnlynJtFap5k8560+tBGtxi9Gx2NIycKgbOUv0gEqhfVzAwvg1IhTltfSwOeZXvDvd40rozONRxwq8hjKy+4DbfrO0iRtlT7G/eVEO9aJJnqagomFSkqCscttf/o6VeT2+A9JhcSxLmjcKFG3FEK3Try/WkarJa1jM3lMRQqVOZrzHAaLFW/5sXano6DqqC5ERD6CcVVsrny0tYN4iHHB8BHJ9zvjff0NjLGG/v5Wsy31+BwZA8cUlfAZ0f5EYRo9/vKSd8TV0wRb9DQ=",
  "kind": 13,
  "created_at": 1703015180,
  "pubkey": "611df01bfcf85c26ae65453b772d8f1dfd25c264621c0277e1fc1518686faef9",
  "tags": [],
  "id": "28a87d7c074d94a58e9e89bb3e9e4e813e2189f285d797b1c56069d36f59eaa7",
  "sig": "02fc3facf6621196c32912b1ef53bac8f8bfe9db51c0e7102c073103586b0d29c3f39bdaa1e62856c20e90b6c7cc5dc34ca8bb6a528872cf6e65e6284519ad73"
}
```

### 3. Wrap the seal

Encrypt the JSON-encoded `kind 13` event with your ephemeral, single-use random key. Place the result
in the `content` field of a `kind 1059`. Add a single `p` tag containing the recipient's public key.
Sign the `gift wrap` using the random key generated in the previous step.

```json
{
  "content": "AhC3Qj/QsKJFWuf6xroiYip+2yK95qPwJjVvFujhzSguJWb/6TlPpBW0CGFwfufCs2Zyb0JeuLmZhNlnqecAAalC4ZCugB+I9ViA5pxLyFfQjs1lcE6KdX3euCHBLAnE9GL/+IzdV9vZnfJH6atVjvBkNPNzxU+OLCHO/DAPmzmMVx0SR63frRTCz6Cuth40D+VzluKu1/Fg2Q1LSst65DE7o2efTtZ4Z9j15rQAOZfE9jwMCQZt27rBBK3yVwqVEriFpg2mHXc1DDwHhDADO8eiyOTWF1ghDds/DxhMcjkIi/o+FS3gG1dG7gJHu3KkGK5UXpmgyFKt+421m5o++RMD/BylS3iazS1S93IzTLeGfMCk+7IKxuSCO06k1+DaasJJe8RE4/rmismUvwrHu/HDutZWkvOAhd4z4khZo7bJLtiCzZCZ74lZcjOB4CYtuAX2ZGpc4I1iOKkvwTuQy9BWYpkzGg3ZoSWRD6ty7U+KN+fTTmIS4CelhBTT15QVqD02JxfLF7nA6sg3UlYgtiGw61oH68lSbx16P3vwSeQQpEB5JbhofW7t9TLZIbIW/ODnI4hpwj8didtk7IMBI3Ra3uUP7ya6vptkd9TwQkd/7cOFaSJmU+BIsLpOXbirJACMn+URoDXhuEtiO6xirNtrPN8jYqpwvMUm5lMMVzGT3kMMVNBqgbj8Ln8VmqouK0DR+gRyNb8fHT0BFPwsHxDskFk5yhe5c/2VUUoKCGe0kfCcX/EsHbJLUUtlHXmTqaOJpmQnW1tZ/siPwKRl6oEsIJWTUYxPQmrM2fUpYZCuAo/29lTLHiHMlTbarFOd6J/ybIbICy2gRRH/LFSryty3Cnf6aae+A9uizFBUdCwTwffc3vCBae802+R92OL78bbqHKPbSZOXNC+6ybqziezwG+OPWHx1Qk39RYaF0aFsM4uZWrFic97WwVrH5i+/Nsf/OtwWiuH0gV/SqvN1hnkxCTF/+XNn/laWKmS3e7wFzBsG8+qwqwmO9aVbDVMhOmeUXRMkxcj4QreQkHxLkCx97euZpC7xhvYnCHarHTDeD6nVK+xzbPNtzeGzNpYoiMqxZ9bBJwMaHnEoI944Vxoodf51cMIIwpTmmRvAzI1QgrfnOLOUS7uUjQ/IZ1Qa3lY08Nqm9MAGxZ2Ou6R0/Z5z30ha/Q71q6meAs3uHQcpSuRaQeV29IASmye2A2Nif+lmbhV7w8hjFYoaLCRsdchiVyNjOEM4VmxUhX4VEvw6KoCAZ/XvO2eBF/SyNU3Of4SO",
  "kind": 1059,
  "created_at": 1703021488,
  "pubkey": "18b1a75918f1f2c90c23da616bce317d36e348bcf5f7ba55e75949319210c87c",
  "id": "5c005f3ccf01950aa8d131203248544fb1e41a0d698e846bd419cec3890903ac",
  "sig": "35fabdae4634eb630880a1896a886e40fd6ea8a60958e30b89b33a93e6235df750097b04f9e13053764251b8bc5dd7e8e0794a3426a90b6bcc7e5ff660f54259",
  "tags": [["p", "166bf3765ebd1fc55decfe395beff2ea3b2a4e0a8946e7eb578512b555737c99"]],
}
```

### 4. Broadcast Selectively

Broadcast the `kind 1059` event to the recipient's relays only. Delete all the other events.

## Code Samples

### JavaScript

```javascript
import {bytesToHex} from "@noble/hashes/utils"
import type {EventTemplate, UnsignedEvent, Event} from "nostr-tools"
import {getPublicKey, getEventHash, nip19, nip44, finalizeEvent, generateSecretKey} from "nostr-tools"

type Rumor = UnsignedEvent & {id: string}

const TWO_DAYS = 2 * 24 * 60 * 60

const now = () => Math.round(Date.now() / 1000)
const randomNow = () => Math.round(now() - (Math.random() * TWO_DAYS))

const nip44ConversationKey = (privateKey: Uint8Array, publicKey: string) =>
  nip44.v2.utils.getConversationKey(bytesToHex(privateKey), publicKey)

const nip44Encrypt = (data: EventTemplate, privateKey: Uint8Array, publicKey: string) =>
  nip44.v2.encrypt(JSON.stringify(data), nip44ConversationKey(privateKey, publicKey))

const nip44Decrypt = (data: Event, privateKey: Uint8Array) =>
  JSON.parse(nip44.v2.decrypt(data.content, nip44ConversationKey(privateKey, data.pubkey)))

const createRumor = (event: Partial<UnsignedEvent>, privateKey: Uint8Array) => {
  const rumor = {
    created_at: now(),
    content: "",
    tags: [],
    ...event,
    pubkey: getPublicKey(privateKey),
  } as any

  rumor.id = getEventHash(rumor)

  return rumor as Rumor
}

const createSeal = (rumor: Rumor, privateKey: Uint8Array, recipientPublicKey: string) => {
  return finalizeEvent(
    {
      kind: 13,
      content: nip44Encrypt(rumor, privateKey, recipientPublicKey),
      created_at: randomNow(),
      tags: [],
    },
    privateKey
  ) as Event
}

const createWrap = (event: Event, recipientPublicKey: string) => {
  const randomKey = generateSecretKey()

  return finalizeEvent(
    {
      kind: 1059,
      content: nip44Encrypt(event, randomKey, recipientPublicKey),
      created_at: randomNow(),
      tags: [["p", recipientPublicKey]],
    },
    randomKey
  ) as Event
}

// Test case using the above example
const senderPrivateKey = nip19.decode(`nsec1p0ht6p3wepe47sjrgesyn4m50m6avk2waqudu9rl324cg2c4ufesyp6rdg`).data
const recipientPrivateKey = nip19.decode(`nsec1uyyrnx7cgfp40fcskcr2urqnzekc20fj0er6de0q8qvhx34ahazsvs9p36`).data
const recipientPublicKey = getPublicKey(recipientPrivateKey)

const rumor = createRumor(
  {
    kind: 1,
    content: "Are you going to the party tonight?",
  },
  senderPrivateKey
)

const seal = createSeal(rumor, senderPrivateKey, recipientPublicKey)
const wrap = createWrap(seal, recipientPublicKey)

// Recipient unwraps with their private key.

const unwrappedSeal = nip44Decrypt(wrap, recipientPrivateKey)
const unsealedRumor = nip44Decrypt(unwrappedSeal, recipientPrivateKey)
```
