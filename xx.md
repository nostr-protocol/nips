NIP-X
=====

Key Migration and Revocation
------

`draft` `optional` `author:braydonf`

This NIP defines the protocol that SHOULD be implemented by clients and relays to handle a key migration and revocation of a key. At a minimum this specification defines a protocol for a compromised private key to be revoked. Clients give warning that the key is compromised. Relays and clients delete events and reject future events from a revoked key. Also defined is a protocol to migrate to a new successor key with multiple optional methods for users of clients to verify and accept or reject the change. This includes methods such as: a social graph with attestations, recovery keys and side-channel identity anchors.

There are four new events introduced:

* [Recovery Keys Setup](#recovery-keys-setup-event)
* [Recovery Keys Attestation](#recovery-keys-attestation-event)
* [Key Migration and Revocation](#key-migration-and-revocation-event)
* [Key Migration Attestation](#key-migration-attestation-event)

## Recovery Keys Setup Event

This is an event that is non-replaceable. Its primary purpose is to define a set of recovery keys that can be used to migrate to a new key in the future, if it becomes necessary. The event can assign anywhere from `1` to `n` recovery keys assigned to be able to sign the _Key Migration and Revocation Event_. A threshold number of keys (`m` of `n`) can be assigned to verify this event.

```json
{
  "kind": "<tbd>",
  "pubkey": "<user-pubkey>",
  "tags": [
    ["p", "<recovery-pubkey-1>"],
    ["p", "<recovery-pubkey-2>"],
    ["p", "<recovery-pubkey-3>"],
    ["threshold", "2"],
    ["recovery-key-setup"]
  ],
  "content": ""
}
```

* A `p` tag MUST be included and be the hex encoded public keys for the recovery keys.
* The `recovery-key-setup` MUST be included, it's otherwise ignored, however can help prevent making this event by chance or accident.
* If `threshold` tag is NOT included, the threshold MUST default to `1`.
* The content MAY include a comment, most clients can ignore this field.

### Behaviors

* Clients MUST only consider one to be valid.
* If multiple events exist for a public key, a user interface SHOULD provide a means to pick one. There can be various means to help select the key including; displaying _public_ attestations from within a social graph or NIP-03 timestamp associated with the event. Please see [External References](#external-references) for UX examples.
* Any future events of this kind MUST NOT be automatically accepted and considered verified as it could be from an attacker due to a compromised private key, it could ALSO be the honest event.
* Every client SHOULD make either a _private_ or _public_ attestation when receiving a _Recovery Keys Setup Event_ for public keys that they follow. The default SHOULD be _private_. The client SHOULD provide user interaction to make attestations _public_ or _private_.
* The attestations SHOULD be stored locally to verify a possible future _Key Migration and Revocation Event_.
* Relays SHOULD store multiple events from a public key of this kind.
* Clients SHOULD implement a user interface to help prevent accidental broadcasts of this event.
* Clients MAY provide a manual verification process that can be verified through a side-channel to be able to independently replace the _Recovery Keys Setup Event_.
* Clients are ENCOURAGED to use hardware devices and NIP-06 seed phrases to backup the recovery keys.

## Recovery Keys Attestation Event

This is an event that is non-replaceable. This is a means to save a single valid _Recovery Keys Setup Event_ for a public key. The attestation can be either _private_ or _public_. By making a _public_ attestation, others in the network can see that they are able to verify the recovery keys for a profile; this can help built a robust fault-tolerant network. The default option SHOULD be _private_. The primary purpose for this event is for clients to be able to verify the recovery keys for a later _Key Migration and Revocation Event_.

```json
{
  "kind": "<tbd>",
  "pubkey": "<user-pubkey>",
  "tags": [
    ["p", "<pubkey-of-friend>"],
    ["recovery-key-attestation"]
  ],
  "content": "<recovery-key-setup-event>"
}
```

* The `p` tag for a _public_ attestation MUST include a public key and MUST match the public key for the Recovery Key Setup Event.
* A _private_ attestation MUST NOT include the `p` tag.
* The `content` field MUST include the Recovery Key Setup Event either encrypted and _private_ or unencrypted and _public_.
* The `recovery-key-attestation` MUST be included, it's otherwise ignored, however can help prevent making this event by chance or accident.
* A NIP-03 timestamp attestation MAY be included for this event and clients can use this to help with verification.

## Key Migration and Revocation Event

### Event Details

This is an event that is non-replaceable. It will revoke a public key and all events for the key will be deleted. It will also provide a key migration for clients and users to accept or reject the key migration based on various means of verification including; recovery keys, social graph and external identities.

```json
{
  "kind": "<tbd>",
  "pubkey": "<user-pubkey>",
  "tags": [
    ["new-key", "<new-pubkey>"],
    ["e", "<event-id-of-recovery-key-setup>"],
    ["key-migration-and-revocation"]
  ],
  "content": "<recovery-key-signatures-and-optional-comment>"
}
```

* The `content` MUST include the signatures for `m` of `n` public keys as specified in the referenced _Recovery Keys Setup Event_. The signature SHOULD be for the entire event as similar to the event signature.
* If a `new-key` IS provided, the `key-migration-and-revocation` tag MUST be included, it's otherwise ignored, however can help prevent making this event by chance or accident.
* If a `new-key` IS NOT provided, the `key-revocation` tag MUST be included, this is also to help prevent mistakes.
* The `new-key` tag SHOULD be included, otherwise it will be a key revocation without a successor key and all events will be deleted.
* Clients SHOULD implement a means to verify that users are aware of the account and behaviors of the event to avoid accidental broadcast.
* A NIP-03 timestamp attestation MAY be included for this event and clients can use this to help with verification.
* Clients MAY use a NIP-18 Generic Repost with a copy of the event in the content to help relay distribution.

### Event Handling for Clients

For a client, this event is both a revocation and a migration. The revocation MUST be handled by verifying only the event signature and MUST be automatic. The migration, on the other hand, MUST be presented and verified by the user to accept or reject the migration key change.

#### Behaviors
* Signature verification of the event and NOT the recovery keys MUST determine the revocation validity.
* Upon a valid key revocation:
  * All events MUST display a warning that the event is from a revoked public key.
  * All events of a revoked public key SHOULD be deleted, this MAY be after a duration of time depending on the client or preferences.
* A user interface MUST display to the user an option to accept or reject a key migration. This SHOULD include the recovery keys and how many have valid signatures, social graph verification of those that they follow that are now following the new key, and an other side-channel pinned identities such as with NIP-05. At least one method MUST be provided. The existence of a _Recovery Keys Setup Event_ is NOT REQUIRED to be able to handle a _Key Migration and Revocation Event_. Please see [External References](#external-references) for UX examples.
* Upon a valid key migration:
  * The old key MUST be unfollowed and the new key MUST be followed.
  * The old key MUST be stored, with a Key Migration Attestation Event, for future reference to able to block and delete future events from the old key.
  * The old key MAY be added to other mute lists.

### Event Handling for Relays

For a relay, this event is primarily a key revocation, and storing the necessary information for clients to verify the key migration.

#### Behaviors
* Signature verification of the event and NOT the recovery keys MUST determine the revocation validity.
* Upon a valid key revocation:
  * All events of a revoked public key MUST be deleted. The time-frame that events are deleted MAY be defined by an agreed upon terms between client and relay.
  * All future events, as determined when it was received and not the date on the event, of a revoked public key MUST be rejected except for another _Key Migration and Revocation Event_. This is to ensure that if a key is compromised and a fraudulent event is made, an honest event can also be made and broadcast. Each client can then verify which is honest.
* The recovery keys and signatures SHOULD NOT be verified, all key migration verification is handled by the client.
* For denial-of-service mitigation, a relay MAY require proof-of-work, a small fee or another solution to continue to write _Key Migration and Revocation Events_. This SHOULD be determined by the terms agreed upon by the client and relay.

## Key Migration Attestation Event

This is an event that is non-replaceable and MUST either be unencrypted and _public_ or encrypted and _private_. The default SHOULD be _private_. The primary purpose of this event is for each client to keep track of old keys that SHOULD be blocked, filtered and muted. The secondary purpose of this event is to signal to other clients of a successful path for key migration.

```json
  "kind": "<tbd>",
  "pubkey": "<user-pubkey>",
  "tags": [
    ["p", "<old-pubkey>"],
    ["e", "<event-id-of-key-migration-and-revocation>"],
    ["new-key", "<new-pubkey>"],
    ["key-migration-attestation"]
  ],
  "content": ""
```

* For a _public_ attestation, the tags `p`, `e` and `new-key` MUST be included.
* For a _private_ attestation, the tags `p`, `e` and `new-key` MUST NOT be included. This MUST instead be encrypted and base64 encoded into the content field.
* The `key-migration-attestation` tag MUST be included, it's otherwise ignored, however can help prevent making this event by chance or accident.
* A NIP-03 timestamp attestation MAY be included for this event and clients can use this to help with verification.

## External References

* [UX Example Storyboard (PDF)](https://github.com/braydonf/nostr-key-migration-and-revocation/blob/master/graphics/ux-storyboard.pdf?raw=true)
