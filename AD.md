NIP-AD
======

Super Zap
---------

`draft` `optional`

In a client, a zap sent to a relay's pubkey (the `self` or `pubkey` field in NIP-11) or the client's pubkey will be displayed as a specialized note within a specific area. This is called a Super Zap, in other words, Ads on Nostr.

## Benefits

- It provides an incentive to run relays without additional effort.
- Client developers and relay owners can sustain the ecosystem without relying on platformers.
- Users can use it for discoverability.
- Zap senders can choose where and what to promote.

## What relay owners need to do

- Prepare the relay's key-pair, then add it to the relay information document as a `self` or `pubkey`.
- Publish the relay list metadata (you should set your relay, of course).
- Publish the profile which includes `lud16` to receive zaps.

## What client developers need to do

- Fetch receipts of zaps sent to relays your client currently uses, as well as those sent to your client. Validate them. Extract the contents from the `description` field in the receipts. Display the specialized notes. It's up to you what to display from the zap.
- Prepare the client's key-pair.
- Publish the relay list metadata.
- Publish the profile which includes `lud16` to receive zaps.

A client MAY set a minimum threshold for sats to mute spam.
A client SHOULD mute super zaps or their senders when reported by trusted people.


## Future

- We should add `lud16` to NIP-11.