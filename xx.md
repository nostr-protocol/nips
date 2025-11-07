NIP-XX
======

Attestations, Sequencers, and Key Rotation
------------------------------------------

`draft` `optional`

By default nostr public keys solely represent a user's identity, which makes it impossible to recover from key loss or compromise. This NIP defines a simple mechanism for key rotation that uses a key-based ratchet mechanism to protect users from attackers. This allows users to increase the security of their main key by creating a single-purpose key which can be stored more securely than a user's main key.

Some terms:

- A `root` key is a user's initial nostr public key.
- An `live` key is a nostr public key that should be treated as having the same identity as the `root` key. A user's `root` key serves both as a user's first `live` key, and as the persistent identifier for the user's identity on nostr.
- A `dead` key is a nostr public key that has been invalidated.
- A `master` key is a nostr public key authorized in advance as the only way to generate or invalidate `live` keys.

These keys, combined with the event kinds defined below form a tree of keys. The current state of this tree MUST be validated as described in the [validation](#Validation) section below.

## Creating a Master Key

To designate a `master` key, a user may sign a `kind ADD_MASTER` event with one of their `live` keys and include the following tags:

- A `p` tag containing the `master` pubkey and a relay hint
- A `proof` tag containing a schnorr signature of the `live` key by the user's `master` key

Only the first `master` key published by a given `live` key is valid. If multiple conflicting `kind ADD_MASTER` events exist, the first one published MUST be used. Master keys cannot be invalidated except by invalidating the corresponding `live` key.

## Creating a Live Key

Only a `master` key can create a new delegate `live` key. However, any number of delegate `live` keys MAY be created from a single `master` key using a `kind ADD_KEY` event with the following tags:

- A `p` tag containing the new `live` pubkey and a relay hint
- A `proof` tag containing a schnorr signature of the `master` key by the new `live` key

## Invalidating a Live Key

A `live` key can be converted to a `dead` key by publishing a `kind KILL_KEY` event using either the `master` key that created the `live` key, or a `master` key created by the `live` key. Killing a `live` key also invalidates any `master` key created by it.

All events created by a `dead` key or its corresponding `master` key MUST be considered invalid.

Invalidating a key does not affect the identity of the user, which remains the original hex `root` pubkey.

## Sequencing

Because event timestamps can be forged, a sequencer is required in order to establish the order in which events were actually published. All events defined in this document MUST be attested to using `kind 1040` events as defined in [NIP 03](./03.md). These events MUST be published to the tagged pubkey's inbox relays.

> Trusted sequencers might be useful as an alternative or supplement to OTS, but care should be taken to use multiple independent sequencers in order to avoid attacks related to attestation omission or re-ordering which can result in the loss or theft of an identity. See [this PR to NIP 03](https://github.com/nostr-protocol/nips/pull/1737/files), or [this draft NIP](https://github.com/nostr-protocol/nips/pull/2113) for some possibilities.

## Validation

Key state transitions MUST be validated according to the following process:

1. Select a `target` pubkey to validate.
2. Fetch all `kind ADD_MASTER` events signed by the `target` key.
3. Fetch all `kind KILL_KEY` events signed by the `target`'s `master` key which `p`-tag the `target`. If any exist, events created by the `target` after that point are invalid and should be ignored.
4. Fetch all `kind ADD_KEY` events `p`-tagging the `target`. If no valid ones exist, the `target` key is its own `root` identity.
5. Fetch all `kind KILL_KEY` events `p`-tagging the `target`. If any valid ones exist, events created by the `target` after that point are invalid and should be ignored.
6. Validate the authors of the `kind ADD_KEY` and `kind KILL_KEY` events found in the previous step by fetching all `kind ADD_MASTER` events `p`-tagging them, then repeating steps 2-6 for the author of that event.

Because fake attestations can be created by third parties, attestations without a corresponding valid event may be discarded. However, genuinely missing events **may** result in an invalid or incorrect key state. For this reason, users should be careful to store events and attestations where they are easily discoverable. This protocol is *not* partition tolerant.

When checking the validity of a given event, it's important to keep in mind that events' `created_at` field may be forged, and so can't be trusted without reservation (although key validity windows do reduce the amount of damage an attacker can do). When validating events based on timestamp, it's recommended to obtain an sequencer attestation for that event as well.

## Usage

All keys in a tree should be considered a single identity, identified by the `root`, i.e., the `pubkey` used to sign the first `kind ADD_MASTER` event. This has two implications for events not described in this spec:

- All events published by any key during the period in which it was a valid member of the group SHOULD be treated as if they were signed by the `root` directly (except for the purposes of this sub-protocol).
- All references to any key published during the period in which the target key was a valid member of the group SHOULD be treated as if they were referencing the `root` directly (except for the purposes of this sub-protocol).

Implementations MAY choose to stop validating key transitions at any point if it gets too complex, leaving keys unlinked. Implementations SHOULD validate up to 8 levels of delegation, and users SHOULD avoid creating more than 8 levels of delegation.

In order to degrade gracefully when keys remain unlinked, when creating a `kind ADD_KEY` event the author SHOULD re-publish important metadata events under that key (especially kinds `0`, `10002`, `10050`, and any other events containing important routing information). Authors MAY also re-sign and publish other historical events (for example recent or pinned notes), however this should be done sparingly to prevent unnecessary duplicates from being downloaded.

When fetching events for a given identity, all `live` keys in the group SHOULD be included in `authors` or `#p` filters. Filters SHOULD also include `since` and `until` filters matching the periods when the key in question was a valid member of the tree.

Relays MAY implement key state transition validation and drop invalid events from their database.

## Example

In this example, Alice creates three different keys:

- Key `A` is her `root` key, since it's the first key she creates and where she begins her attestation chain.
- Key `B` is added and later compromised and subsequently invalidated by `A`
- Key `C` is added and later invalidates `A`

Throughout, Bob interacts with Alice's account by building key group state, fetching events using filters, and detecting forgeries and forks.

First, Alice decides she would like a backup key that she can use, so she publishes a `kind ADD_MASTER` for key `B` from her `root` identity `A`:

```json
{
  "id": "<A.1>",
  "pubkey": "<A>",
  "kind": ADD_MASTER,
  "tags": [
    ["r", "<pubkey A>", "<url">],
    ["p", "<pubkey B>", "<url">]
  ]
}
```

This isn't valid unless it's accepted, so she then publishes a `kind JOIN_GROUP` from key `B`:

```json
{
  "id": "<B.1>",
  "pubkey": "<B>",
  "kind": JOIN_GROUP,
  "tags": [
    ["r", "<pubkey A>", "<url">]
  ]
}
```

In this example, we'll gloss over how attestations get to the sequencers (they may be specifically published by Alice, scraped by the sequencers, replicated, or generated by relays), but these are the attestation records that would have to be created to validate the two events above:

```text
<pubkey A><event A.1>
<pubkey B><event B.1>
```

Alice also decides to re-publish her `kind 10002`, `kind 10050`, and `kind 0` events under the new key. She then sends a few `kind 1` events.

Bob is already following Alice, and normally reads only from key `A`. In the background his client:

- Picks up event `<A.1>`
- Requests attestations for pubkey `A` and matches the one result to the event he has already
- Because event `<A.1>` points to pubkey `B`, he requests attestations for pubkey `B`.
- He receives one result `<B.1>` and fetches it.

His key group for `A` now looks like this:

```
// Each entry is a list of time windows (since, until) where the given pubkey is valid in the group
A: [[0, ∞]]
B: [[<B.1.created_at>, ∞]]
```

Alice then realizes that the sticky she wrote the secret key for `B` on blew away, so now she wants to invalidate it:

```json
{
  "id": "<A.2>",
  "pubkey": "<A>",
  "kind": REMOVE_KEY,
  "tags": [
    ["r", "<pubkey A>", "<url">],
    ["p", "<pubkey B>", "<url">]
  ]
}
```


## Validation rules

- Time delay is necessary to avoid attacker publishing a migration. Or we could structure things in trees such that only the parent can invalidate the child, and ratchet keys downwards (use the child, store the parent, then rotate to child/grandchild)
- add/join must be mutual. Order doesn't matter
- Only the first join counts, keys can't be in multiple groups
- Once removed, a key can't be added again?
- Check that timestamps are in the same order as attestations. Actual value doesn't matter too much, and can be trusted for validating content events.

This combines the best of HD keys with pablo's key rotation scheme, without a time delay. The benefit of HD keys is that you can have one in cold storage and use other ones for signing. The drawbacks are that you can't rotate your base key (which on nostr is already exposed for lots of people). Pablo's scheme allows for simple key rotation, but leaves an opening for an attacker to hijack the rotation, permanently locking the original user out. This scheme uses a key ratchet mechanism which has the storage benefits of HD keys (you put one key in cold storage while using the other), and allows for simple rotation without giving an attack the ability to hijack the key.

```typescript
import { schnorr } from '@noble/curves/secp256k1'
import { bytesToHex } from '@noble/hashes/utils'

const makeKey = () => {
  const secret = schnorr.utils.randomPrivateKey()
  const pubkey = schnorr.getPublicKey(secret)

  return {secret, pubkey}
}

const active = makeKey()
const rotation = makeKey()

const event = signEvent(active.secret, {
  kind: ADD_MASTER,
  tags: [
    ["p", bytesToHex(rotation.pubkey), "<relay url>"],
    ["proof", schnorr.sign(bytesToHex(rotation.pubkey), active.secret)],
  ],
})
```
