NIP-XXX
=======

On Behalf of - Delegation (and revocation) of responsibility to other accounts
-----

`draft` `optional`

This NIP defines how a publisher public key (a media manager, another device, a sub account) can create events on-behalf of an author public key (the content author). Unlike NIP-26, here the attestations live in a repository controlled by the author, which is the `kind 0` replaceable profile event.

Another application of this proposal is to abstract away the use of the 'root' keypairs when interacting with clients on different devices, for example, a user could generate new keypairs for each client they wish to use and authorize those keypairs with their root `kind 0` event, to generate events on behalf of their root profile, where the root keypair is stored in cold storage. This allows also the revocation of those attestations if needed.

### References

This proposal came together with inputs from many other proposals and discussions, but these are the main ones:

[NIP-26: Delegated Event Signing](https://github.com/nostr-protocol/nips/blob/master/26.md)<br>
[NIP-46: Nostr Connect](https://github.com/nostr-protocol/nips/blob/master/46.md)

[Why I don’t like NIP-26 as a solution for key management](https://fiatjaf.com/4c79fd7b.html)<br>
[Thoughts on Nostr key management](https://fiatjaf.com/72f5d1e4.html)

[Stateless key rotation using a series of hidden commitments](https://github.com/nostr-protocol/nips/issues/103)<br>
[Key distribution, rotation, and recovery](https://github.com/nostr-protocol/nostr/issues/45)<br>
[Key rotation verified through root key attestation](https://github.com/nostr-protocol/nips/issues/116)<br>
[Trusted public-key-bundle attestations for key rotation and group definition](https://github.com/nostr-protocol/nips/issues/123)

### Introducing the 'b' (on-Behalf) tag

This NIP introduces a new tag: `b`, which is indexable by relays, and can be present in publisher (delegatee) events, provided that the author (delegator) attests with a delegation for that event  `kind`, in its `kind 0` profile event, formatted as follows:

```json
[ "b", <pubkey of the delegator> ]
```

### Introducing the 'attest' (attestation) tag

This NIP also introduces the new tag: `attest` which can be present multiple times in author's (delegator) `kind 0` event, formatted as follows:

```json
[
  "attest",
  <pubkey of the delegatee>,
  <attestation string>
]
```

#### Delegation Attestation String

The **Delegation Attestation** should be a string in the following format:

```
del:<kinds list>:<timestamp>
```

#### Revocation Attestation String

The **Revocation Attestation** should be a string in the following format:

```
rev:<kinds list>:<timestamp>
```

> This way the author (delegator) can decide, depending on the use case, if it makes sense to keep the published content after delegation valid, by adding a `b` tag with a revocation attestation, or if is preferable to invalidate all content published by that keypair by simply removing the delegation attestation.

##### Attestation String Components

- `<kinds list>` is a coma separated list of event `kind`s that this attestation refers to
- `<timestamp>` is a UTC unix timestamp in seconds, after which that attestation produces effect

##### Conflicting Attestations Resolution

As the attestations are all timestamped, most conflicts should be resolved based on their timestamps, but in the rare event of the same timestamp in attestations for the same public key, the latest in the tags array should override the previous.

#### Examples

```
# Delegator:
pubkey:  8e0d3d3eb2881ec137a11debe736a9086715a8c8beeeda615780064d68bc25dd

# Delegatee:
pubkey:  477318cfb5427b9cfc66a9fa376150c1ddbc62115ae27cef72417eb959691396
```

Delegation tag to allow delegatee to publish `kind 1` and `kind 7` events on-behalf of the delegator, present in delegator `kind 0` replaceable event:

```json
"tags": [
    [
        "attest",
        "477318cfb5427b9cfc66a9fa376150c1ddbc62115ae27cef72417eb959691396",
        "del:1,7:1674834236"
    ],
    ...
]
```

When delegator (8e0d3d3e) decides to revoke that delegation for `kind 7` only, can just add another tag to his `kind 0` profile:

```json
"tags": [
    ["attest",
    "477318cfb5427b9cfc66a9fa376150c1ddbc62115ae27cef72417eb959691396", "del:1,7:1674834236"],
    ["attest",
    "477318cfb5427b9cfc66a9fa376150c1ddbc62115ae27cef72417eb959691396", "rev:7:1721934607"],
    ...
]
```

Or in the case that the delegatee (477318cf) got compromised, and it is best to consider all content published from that key to be compromised, then the delegator simply removes the delegation attestation from his `kind 0` profile:

```json
"tags": [
    ...
]
```

The delegatee (477318cf), while the delegator (8e0d3d3e) has a valid delegation attestation at its `kind 0` profile event, can publish on-behalf of the delegator, using the `b` tag on the event:

```json
{
  "id": "e93c6095c3db1c31d15ac771f8fc5fb672f6e52cd25505099f62cd055523224f",
  "pubkey": "477318cfb5427b9cfc66a9fa376150c1ddbc62115ae27cef72417eb959691396",
  "created_at": 1677426298,
  "kind": 1,
  "tags": [
    [
      "b",
      "8e0d3d3eb2881ec137a11debe736a9086715a8c8beeeda615780064d68bc25dd"
    ]
  ],
  "content": "Hello, world!",
  "sig": "633db60e2e7082c13a47a6b19d663d45b2a2ebdeaf0b4c35ef83be2738030c54fc7fd56d139652937cdca875ee61b51904a1d0d0588a6acd6168d7be2909d693"
}
```

The event should be considered as published on-behalf of the author (8e0d3d3e), if at the timestamp `1677426298` the author had a valid delegation attestation on the `attest` tags in its `kind 0` profile event. If the `b` tag is not validated by an active delegation attestation, that content is considered invalid and relays and clients can ignore it.

Clients should display the on-behalf events as if they were published directly by the delegator (8e0d3d3e).


#### Relay & Client Support

Relays should answer requests such as `["REQ", "", {"authors": ["A"]}]` by querying both the `pubkey` and delegation `#b` tags `[1]` value.

Relays SHOULD allow the delegator (8e0d3d3e) to delete the events published by the delegatee (477318cf).
