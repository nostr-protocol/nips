NIP-X
=====

Key Migration and Revocation
------

`draft` `optional`

This NIP defines a protocol for clients and relays to gracefully recovery from a compromised private key.

At a minimum this includes the revocation of a private key. Clients give warning that the key is compromised with an option to migrate to a new key. Relays and clients reject future events from a revoked key and may delete existing events.

Also defined is a protocol to migrate to a new successor key. There are several non-mandatory methods to help with verification of the migration: a social graph with attestations from shared contacts, recovery keys, side-channel identity anchors and timestamps. Users can then verify and accept or reject the change and move to the new key.

There are four new events introduced:

* [Key Migration and Revocation](#key-migration-and-revocation-event)
* [Key Migration Attestation](#key-migration-attestation-event)
* [Recovery Keys Setup](#recovery-keys-setup-event)
* [Recovery Keys Attestation](#recovery-keys-attestation-event)

## Key Migration and Revocation Event

### Event Details

This is a regular event with kind `50`. It will revoke a public key (it has been compromised) and stop future events from the key. It will also provide a means to inform followers of the compromise and an option to migrate to a new key by deciding to accept or reject the key migration.

```js
{
  "kind": 50,
  "pubkey": "<user-pubkey>",
  "tags": [
	["new-key", "<new-pubkey>"],
	["e", "<event-id-of-recovery-key-setup>"],
	["key-migration"],
	["sigs", "<index-0-sig", "<index-1-sig>", "<index-2-sig>"]
  ],
  "content": "<optional-comment>"
}
```

* If a `new-key` IS provided:
  * The `key-migration` tag MUST be included, once and without a value.
  * There MUST NOT be multiple `new-key` tags or mulitple values.
  * The `e` tag MAY be included with reference to _Recovery Keys Setup Event_.
  * The `sigs` tag MAY be included with the signatures for `m` of `n` public keys as specified in the referenced _Recovery Keys Setup Event_.
* If a `new-key` IS NOT provided:
  * The `key-revocation` tag MUST be included, once and without a value.

#### Additional Notes
* The UX for clients SHOULD implement a means to avoid accidental broadcast.
* A NIP-03 timestamp attestation MAY be included for this event and clients can use this to help with verification.
* Clients MAY use a NIP-18 Generic Repost to help relay distribution.

### Event Handling for Clients

For a client, this event is both a revocation and a migration. The revocation MUST be handled by verifying only the event signature and MUST be automatic. The migration, if it is provided, MUST NOT be automatic and MUST be presented and verified by the user to accept or reject the migration key change.

#### Behaviors
* Signature verification of the event and NOT the recovery keys MUST determine the revocation validity.
* Upon a valid key revocation:
  * All events MUST display a warning that the event is from a revoked public key.
  * All events of a revoked public key MAY be deleted, this MAY be after a duration of time depending on the client or preferences.
* A user interface MUST display to the user an option to accept or reject a key migration. This SHOULD include the recovery keys and how many have valid signatures, social graph verification of those that they follow that are now following the new key, and an other side-channel pinned identities such as with NIP-05. At least one method MUST be provided. The existence of a _Recovery Keys Setup Event_ is NOT REQUIRED to be able to handle a _Key Migration and Revocation Event_. Please see [External References](#external-references) for UX examples.
* Upon a valid key migration:
  * The old key MUST be unfollowed and the new key MUST be followed.
  * The old key SHOULD be stored, with a Key Migration Attestation Event that is either _private_ or _public_, for future reference to able to block and delete future events from the old key.
  * The old key MAY be added to other mute lists.

### Event Handling for Relays

For a relay, this event is primarily a key revocation, and storing the necessary information for clients to verify the key migration.

#### Behaviors
* Signature verification of the event and NOT the recovery keys MUST determine the revocation validity.
* Upon a valid key revocation:
  * All future events, as determined when it was received and not the date on the event, of a revoked public key MUST be rejected except for another _Key Migration and Revocation Event_. This is to ensure that if a key is compromised and a fraudulent event is made, an honest event can also be made and broadcast. Each client can then verify which is honest.
  * All events of a revoked public key MAY be deleted. The time-frame that events are deleted MAY be defined by an agreed upon terms between client and relay.
* The recovery keys and signatures SHOULD NOT be verified, all key migration verification is handled by the client.
* For denial-of-service mitigation, a relay MAY require proof-of-work, a small fee or another solution to continue to write _Key Migration and Revocation Events_. This SHOULD be determined by the terms agreed upon by the client and relay.

## Key Migration Attestation Event

This is a parameterized replaceable event with kind `30050`. The primary purposes of this event are; to signal to others that the new key has been verified, and to record the verification. The event can either be _public_ or _private_.

Public:
```js
  "kind": 30050,
  "pubkey": "<user-pubkey>",
  "tags": [
	["d", "<old-pubkey>"]
	["p", "<old-pubkey>"],
	["e", "<event-id-of-key-migration-and-revocation>"],
	["new-key", "<new-pubkey>"],
	["key-migration-attestation"]
  ],
  "content": ""
```

Private:
```js
  "kind": 30050,
  "pubkey": "<user-pubkey>",
  "tags": [
	["d", "<encrypted-and-hashed-pubkey>"]
	["key-migration-attestation"]
  ],
  "content": Nip44Encrypt(JSONStringify([
	["p", "<old-pubkey>"],
	["e", "<event-id-of-key-migration-and-revocation>"],
	["new-key", "<new-pubkey>"]
  ]))
```

* For a _public_ attestation:
  * The tags `p`, `e` and `new-key` MUST be included.
  * The `d` tag MUST be the old public key.
  * The content MUST be empty.
* For a _private_ attestation:
  * The tags `p`, `e` and `new-key` MUST NOT be included.
  * The tags `p`, `e` and `new-key` MUST MUST be encrypted and base64 encoded into the content field.
  * The `d` tag MUST be an encrypted and hashed version of the public key, and MUST be the hex encoding of a sha256 hash of an encrypted, with NIP-44, of the old pubkey.
* The `key-migration-attestation` tag MUST be included once and without a value.

### Additional Notes
* A NIP-03 timestamp attestation MAY be included for this event and clients can use this to help with verification.
* The default SHOULD be _private_.

## Recovery Keys Setup Event

This is a regular event with kind `51`. Its primary purpose is to define a set of recovery keys that can be used to migrate to a new key in the future, if it becomes necessary. The event can assign anywhere from `1` to `n` recovery keys assigned to be able to sign the _Key Migration and Revocation Event_. A threshold number of keys (`m` of `n`) can be assigned to verify this event.

```js
{
  "kind": 51,
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

* A `p` tag MUST be included and be the hex encoded recovery public keys.
* The `recovery-key-setup` MUST be included once and without a value.
* The `threshold` tag MUST be included with a single, non-zero positive integer.
* The content MAY include a comment, most clients can ignore this field.

### Behaviors

* If multiple events exist for a public key, a user interface SHOULD provide a means to pick one the honest one. There can be various means to help select the key including; displaying _public_ attestations from within a social graph or NIP-03 timestamp associated with the event. Please see [External References](#external-references) for UX examples.
* Any future events of this kind MUST NOT be automatically accepted and considered verified as it could be from an attacker due to a compromised private key, it could ALSO be the honest event.
* Every client MAY make either a _private_ or _public_ attestation when receiving a _Recovery Keys Setup Event_ for public keys that they follow. The client SHOULD provide user interaction to make attestations _public_ or _private_. The default SHOULD be _private_.

#### Additional Notes
* Clients SHOULD implement a user interface to help prevent accidental broadcasts of this event.
* Clients MAY provide a manual verification process that can be verified through a side-channel to be able to independently replace the honest and valid _Recovery Keys Setup Event_.
* Clients are ENCOURAGED to use hardware devices and NIP-06 seed phrases to backup the recovery keys.

## Recovery Keys Attestation Event

This is a parameterized replaceable event with kind `30051`. The primary purposes of this event are; to signal to others that the recovery keys have been verified, and to record the verification. The event can either be _public_ or _private_. A verified and attested _Recovery Keys Setup Event_ can later be useful to verify a later _Key Migration and Revocation Event_.

Public:
```js
{
  "kind": 30051,
  "pubkey": "<user-pubkey>",
  "tags": [
	["d", "<pubkey-of-friend>"],
	["p", "<pubkey-of-friend>"],
	["e", "<recovery-key-setup-event-id>"],
	["setup", JSONStringify(recoveryKeySetupEvent)],
	["recovery-key-attestation"]
  ],
  "content": ""
}
```

Private:
```js
  "kind": 30051,
  "pubkey": "<user-pubkey>",
  "tags": [
	["d", "<encrypted-and-hashed-pubkey"],
	["recovery-key-attestation"]
  ],
  "content": Nip44Encrypt(JSONStringify([
	["p", "<pubkey-of-friend>"],
	["e", "<recovery-key-setup-event-id>"],
	["setup", JSONStringify(recoveryKeySetupEvent)]
  ]))
```

* For a _public_ attestation:
  * The `p` tag MUST include a public key and MUST match the public key for the _Recovery Key Setup Event_.
  * The `d` tag MUST be the same public key as the `p` tag.
  * The `e` tag MUST be the ID of the _Recovery Key Setup Event_.
  * The `setup` tag SHOULD include JSON stringified copy of the _Recovery Key Setup Event_.
* For a _private_ attestation:
  * The `d` tag MUST be an encrypted and hashed version of the public key, and MUST be the hex encoding of a sha256 hash of an encrypted, with NIP-44, of the public key.
  * The `p`, `e` and `setup` tag, as the same as the public attestation, MUST be JSON stringified and NIP-44 encrypted in the content field.
* The `recovery-key-attestation` MUST be included once and without a value.

### Additional Notes
* A NIP-03 timestamp attestation MAY be included for this event and clients can use this to help with verification.
* The default option SHOULD be _private_.

## External References

* [UX Example Storyboard (PDF)](https://github.com/braydonf/nostr-key-migration-and-revocation/blob/master/graphics/ux-storyboard.pdf?raw=true)
