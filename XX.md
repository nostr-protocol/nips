NIP-XX
======

Surveys / polls
-----------------------------------

`draft` `optional` `require:nip-20` `author:fernandolguevara`

The `surv` & `surv-resp` tags enables users to have surveys/polls experiences on the network.


#### Spec

##### Message

```
tag: surv
options:
 - <multi|single> allow others to reply with one or multiple options
 - <ttl> TTL (in seconds|timestamp) when surv expires, 0 TTL don't expire
 - [<choice>]: up to 4 choices each limited to 25 chars  
````

```
tag: surv-resp
options:
 - [<choice>]: based on surv type it can have one or multi
````

##### Relays

One vote per key, relays needs to discard all subsequent votes, as well as invalid requests.

##### Invalid responses
```json
["OK", <event_id>, false, 'ALREADY_ANSWERED'],
["OK", <event_id>, false, 'EXPIRED'],
["OK", <event_id>, false, 'SINGLE_OPTION'],
["OK", <event_id>, false, 'INVALID_OPTION', 'optionX', ...],
```

#### Example

```json
{
    "pubkey": "<pub-key>",
    "created_at": 1000000000,
    "kind": 1,
    "tags": [
      ["t", "hastag"],
      ["surv", "<multi|single>", "<ttl>", "option 1", "option 2", "option 3"]
    ],
    "content": "#hastag what is your favorite option?",
    "id": "<event-id>"
  },
  {
    "pubkey": "<pub-key>",
    "created_at": 1000000000,
    "kind": 1,
    "tags": [
      ["p", "<pub-key-root>", "wss://..."],
      ["e", "<event-id-root>", "wss://...", "root"],
      ["t", "tag"],
      ["surv-resp", "option 1", "option 2"...] // based on root event surv type it can have one or multi 
    ],
    "content": "hello #tag\n",
    "id": "<event-id>"
  }
```
