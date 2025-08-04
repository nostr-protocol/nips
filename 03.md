NIP-03
======

OpenTimestamps Attestations for Events
--------------------------------------

`draft` `optional`

This NIP defines an event with `kind:1040` that can contain an [OpenTimestamps](https://opentimestamps.org/) proof for any other event:

```json
{
  "kind": 1040
  "tags": [
    ["e", <target-event-id>, <relay-url>],
    ["k", "<target-event-kind>"]
  ],
  "content": <base64-encoded OTS file data>
}
```

- The OpenTimestamps proof MUST prove the referenced `e` event id as its digest.
- The `content` MUST be the full content of an `.ots` file containing at least one Bitcoin attestation. This file SHOULD contain a **single** Bitcoin attestation (as not more than one valid attestation is necessary and less bytes is better than more) and no reference to "pending" attestations since they are useless in this context.

### Example OpenTimestamps proof verification flow

Using [`nak`](https://github.com/fiatjaf/nak), [`jq`](https://jqlang.github.io/jq/) and [`ots`](https://github.com/fiatjaf/ots):

```bash
~> nak req -i e71c6ea722987debdb60f81f9ea4f604b5ac0664120dd64fb9d23abc4ec7c323 wss://nostr-pub.wellorder.net | jq -r .content | ots verify
> using an esplora server at https://blockstream.info/api
- sequence ending on block 810391 is valid
timestamp validated at block [810391]
```
