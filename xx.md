NIP-XX
======

Delegated aggregate signature verification
------------------------------------------

`draft` `optional`

Relays MAY choose to strip signatures from events. If they do so, they MUST provide a proof to clients that the relay has validated signatures for all events returned for a given REQ, using the `REQ-PROOF` verb with the request ID as the first argument, and the proof string as the second argument. This proof MUST be provided after the given `EVENT`s are sent, and applies to all previous events returned for the request since the last proof.

```
-> ["REQ", "<req-id>", <filter>]
<- ["EVENT", "<req-id>", <event1>]
<- ["EVENT", "<req-id>", <event2>]
<- ["EOSE", "<req-id>"]
<- ["REQ-PROOF", "<req-id>", "<proof>"] // This proof applies to the previous two events
<- ["EVENT", "<req-id>", <event3>]
<- ["REQ-PROOF", "<req-id>", "<proof>"] // This proof applies to the most recent event only
-> ["CLOSE", "<req-id>"]
```
