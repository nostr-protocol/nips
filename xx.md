NIP-X
=====

Secure Profiles
------

`draft` `optional`

This NIP defines a protocol to secure user profile metadata (`kind 0`) with attestations of tags, keys and values. Users can verify other users' profile metadata with a public or private attestations.

This has several advantages:
* Protection of the impersonation of user profiles. It's possible to verify a user profile without following them.
* An ability to verify different values of the metadata as a user or through a user's web-of-trust. This could be useful for various spam mitigation and filtering techniques.
* Post-compromise security of a profile. The verified NIP-05 nostr address and other values can remain original. This could expand to have additional pubkeys for a profile to help determine honesty.
* Ability to expand into a naming system for (.onion addresses, nostr addresses and etc).
* Granularity, not all metadata is verified, any tag or key/value can be verified and duplicated in the attestation.

## User Metadata Attestation Event

This is a parameterized replaceable event with kind `30050`. This is an attestation for another user's metadata (`kind 0`). This will help a user record what public key is associated with what `display_name`, `nip05`, `website` and other metadata. The attestation can be _public_ or _private_.

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
  * The `attestations` tag MUST include JSON serialized copy of the attested to event pubkey, tags and content of the `kind 0` event. It is a partial copy of the `kind 0` event.
* For a _private_ attestation:
  * The `d` tag MUST be an encrypted and hashed version of the public key (hex encoding of a sha256 hash of an encrypted, with NIP-44, of the public key).
  * The `p`, `metadata` and `attestations` tags, as the same as the public attestation, MUST be JSON serialized and NIP-44 encrypted in the content field.
