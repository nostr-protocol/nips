NIP-X
=====

Key Revocation and Migration
------

`draft` `optional`

This NIP defines a protocol for clients and relays to gracefully recovery from a compromised private key.

At a minimum this includes the revocation of a private key. Clients give warning that the key is compromised. Relays and clients reject future events from a revoked key and may delete existing events.

Also defined is a protocol for a user to be able to remember an associated public key for another user. In the event that a private key of the other user is compromised, the user is able to identity who it was and how to go about recovering from the compromise. This includes an ability to remember the original name, NIP-05 identification, website, migration keys and other associated metadata. Client implementations can provide various strategies to help that recovery, starting as simple as displaying that the key has been compromised.

There are two new events introduced:

* [Key Revocation](#key-revocation-event)
* [User Metadata Attestation](#user-metadata-attestation-event)

There is one new optional field (`migration_pubkeys`) for a user's metadata (`kind 0`):

* [Migration Keys](#migration-keys)

## Key Revocation Event

This is a regular event with kind `50`. It will revoke a public key _(it has been compromised)_ and stop future events from the key _(as determined as after the event was received)_. It will also provide a means to inform followers of the compromise and suggest a successor public key to follow.

```js
{
  "kind": 50,
  "pubkey": "<user-pubkey>",
  "tags": [
	["successor-key", "<successor-pubkey>"],
	["key-revocation"]
  ],
  "content": "<optional-comment>"
}
```

* The `key-revocation` tag MUST be included, once and without a value.
* There MUST NOT be multiple `successor-key` tags or multiple values.

### Event Handling for Clients

For a client, this event is a revocation with a suggestion for a migration to a successor public key. The revocation SHOULD be automatic. The migration, if it is provided, SHOULD NOT be automatic and MAY be presented and verified by the user to accept or reject the migration key change.

#### Key Revocation
* Upon a valid key revocation:
  * All events SHOULD display a warning that the event is from a revoked public key.
  * A user's profile SHOULD display a warning that the key has been compromised.
  * All events of a revoked public key MAY be deleted, this MAY be after a duration of time depending on the client or preferences.

#### Key Migration
* If a user has made a prior _User Metadata Attestation_:
  * The user interface MAY display the original name, NIP-05, migration keys and other user metadata that has been attested.
  * The user interface MAY provide a means to accept or reject a suggested key migration. This can include using NIP-05, migration keys _(with matching signatures)_  and/or a social graph of those the user follows that are now following the suggested successor public key.
* Upon the user accepting a suggested successor key:
  * The _predecessor public key_ SHOULD be unfollowed and the _successor public key_ SHOULD be followed.
  * The _predecessor public key_ SHOULD be added to a mute list.

### Event Handling for Relays

For a relay, this event is a key revocation.

#### Key Revocation
* Upon a valid key revocation:
  * All future events _(as determined when it was received)_ of a revoked public key MUST be rejected, except for another _Key Revocation Event_. This is to ensure that if a key is compromised and a fraudulent event is made, an honest event can also be made and broadcast.
  * All events of a revoked public key MAY be deleted. The time-frame that events are deleted MAY be defined by an agreed upon terms between client and relay.
* For denial-of-service mitigation, a relay MAY require proof-of-work, a small fee or another solution to continue to write _Key Revocation Events_. This MAY be determined by the terms agreed upon by the client and relay.

## User Metadata Attestation Event

This is a parameterized replaceable event with kind `30050`. This is an attestation for another user's metadata (`kind 0`). This will help a user remember what public key is associated with what `display_name`, `nip05`, `website` and other metadata (should that `kind 0` event be compromised in the future). It can also attest to a newly defined `migration_pubkeys` field that could be useful to be able to identify a user. The attestation can be _public_ or _private_.

Public:
```js
{
  "kind": 30050,
  "pubkey": "<user-pubkey>",
  "tags": [
	["d", "<pubkey-of-friend>"],
	["p", "<pubkey-of-friend>"],
	["p", "<optional-predecessor-pubkey-of-friend>"],
	["attestation", JSONStringify({
	  "pubkey": "<pubkey-of-friend>"
	  "tags": [<attested-to-tags>],
	  "content": {
		"<attested-key>": "<attested-value>",
		"<attested-key>": "<attested-value>"
	  }
	})]
  ],
  "content": ""
}
```

Private:
```js
  "kind": 30050,
  "pubkey": "<user-pubkey>",
  "tags": [
	["d", "<encrypted-and-hashed-pubkey"]
  ],
  "content": Nip44Encrypt(JSONStringify([
	["p", "<pubkey-of-friend>"],
	["attestation", JSONStringify({
	  "pubkey": "<pubkey-of-friend>"
	  "tags": [<attested-to-tags>],
	  "content": {
		"<attested-key>": "<attested-value>",
		"<attested-key>": "<attested-value>"
	  }
	})]
  ]))
```

* For a _public_ attestation:
  * The `d` tag and a `p` tag MUST include a public key for the attested to metadata.
  * Another `p` tag SHOULD be included if there was a predecessor public key. This helps to inform other users of a link between the predecessor public and a successor public key.
  * The `attestations` tag MUST include JSON stringified copy of the attested to event pubkey, tags and content of the `kind 0` event. It is a partial copy of the `kind 0` event.
* For a _private_ attestation:
  * The `d` tag MUST be an encrypted and hashed version of the public key (hex encoding of a sha256 hash of an encrypted, with NIP-44, of the public key).
  * The `p`, `metadata` and `attestations` tags, as the same as the public attestation, MUST be JSON stringified and NIP-44 encrypted in the content field.

## Migration Keys

This is a new field on a users metadata (`kind 0`) event with a key of `migration_keys`. Its purpose is to define a set of migration keys that can be used to help migrate to a successor key in the future. The event can assign anywhere from `1` to `n` migration keys. A threshold number of keys (`m` of `n`) can be assigned to verify this event.

The value should be as follows:

```js
[<threshold>, <migration-pubkey-1>, <migration-pubkey-2>]
```

* The array SHOULD be all strings, including the threshold.
* Clients MAY present a user interface to make an attestation, if this field is available on the metadata.
* Clients MAY use hardware devices and NIP-06 seed phrases to store the migration keys.

### Revocation Event Signing

A _Key Revocation Event_ MAY be signed with `m` of `n` of these migration keys. This can help assist the migration process for those that have previously attested to the `migration_keys`.

The following `migration-sigs` tag MAY be included:
```js
{
	"kind": 50,
	"tags": [
		// other tags
		["migration-sigs", "<index-0-sig", "<index-1-sig>", "<index-2-sig>"]
	]
	// other fields
}
```
