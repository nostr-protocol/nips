NIP-XX
======

Attestations, Sequencers, and Key Rotation
------------------------------------------

`draft` `optional`

By default nostr public keys solely represent a user's identity, which makes key management very important to get right, and impossible to recover from. This NIP offers a way to add alternative keys to a base identity, as well as invalidate any key within the group.

All nostr pubkeys are members of a "key group", by default a set containing only the `root` pubkey itself. Key groups are identified by the `root` pubkey and organized hierarchically. The validity, order, and completeness of these "key group" events MUST be validated as defined in the [#Validation](validation) section of this page.

## Adding Keys

Any existing pubkey MAY add a key to the key group using a `kind ADD_KEY` event:

- a `r` tag containing the `root` pubkey and a relay hint
- a `p` tag containing a hex-encoded pubkey to add to the key group and a relay hint
- an optional message in the `content` field

This event is only valid if:

- The signing key is a member of the `root` key group
- It is matched by a `kind JOIN_GROUP` published by the target pubkey
- The target pubkey hasn't previously been added to or removed from the group

```typescript
{
  // ... other fields
  kind: ADD_KEY,
  content: "This is the key I buried in the forest",
  tags: [
    ["r", "<root pubkey>", "<relay url>"],
    ["p", "<hex pubkey>", "<relay url>"]
  ]
}
```

## Joining a Key Group

If added to a key group, the target key MUST mutually join the group. It doesn't matter which event happens first, just that the relationship is mutual.

- a `r` tag containing the `root` pubkey and a relay hint
- a `p` tag containing a hex-encoded pubkey to add to the key group and a relay hint
- an optional message in the `content` field

This event is only valid if:

- It is matched by a `kind ADD_KEY` published by the `root` pubkey
- It is the first `kind JOIN_GROUP` event published by the pubkey
- The key hasn't previously been added to or removed from the group

```typescript
{
  // ... other fields
  kind: JOIN_GROUP,
  content: "Yes, I do control this key",
  tags: [
    ["r", "<root pubkey>", "<relay url>"],
  ]
}
```

## Removing Keys

Keys can be removed from the group using a `kind REMOVE_KEY` event:

- a `r` tag containing the `root` pubkey and a relay hint
- a `p` tag containing a hex-encoded pubkey to add to remove from the group and a relay hint
- an optional message in the `content` field

This event is only valid if:

- The author is currently a member of the group
- The key being removed was originally added by this key or a descendant of it
- The key hasn't previously been removed from the group

```typescript
{
  // ... other fields
  kind: REMOVE_KEY,
  content: "Someone dug up my key and used it to post bad memes :(",
  tags: [
    ["r", "<root pubkey>", "<relay url>"],
    ["p", "<hex pubkey>", "<relay url>"]
  ]
}
```

## Sequencing

Because event timestamps can be forged, forks and forgeries in the key group chain MUST be resolved using a sequencer which is responsible for providing data that can be used to sort events in the order they actually occurred.

### OTS Sequencing

Open Time Stamp attestations via `kind 1040` events as defined in [NIP 03](./03.md) should be published to the tagged pubkey's outbox relays.

### Trusted Sequencing

Trusted sequencers MAY be used as an alternative or supplement to OTS, but care should be taken to use multiple independent sequencers in order to avoid attacks related to attestation omission or re-ordering which can result in the loss or theft of an identity. See [this PR to NIP 03](https://github.com/nostr-protocol/nips/pull/1737/files), or [this draft NIP](https://github.com/nostr-protocol/nips/pull/2113) for some possibilities.

## Validation

When attempting to link pubkeys, implementations must construct a validated sequence of state transitions for the given key group by linking together attestations and nostr events using the following process:

1. Identify at least one `pubkey` in the group to bootstrap from.
2. Fetch all matching attestations from trusted sequencer(s) by `p` tag.
4. Fetch all key group events from known pubkeys' [outbox relays](./65.md).
5. Repeat steps 1-4 for all newly discovered `r`- or `p`-tagged pubkeys.
6. Discard any events without a matching attestation.
7. Sort key group events using data provided by attestations.
8. Build a data structure recording key membership over time which can be used to validate events and build filters.

Because fake attestations can be created by third parties, attestations without a corresponding valid event may be discarded. However, genuinely missing events **may** result in an invalid or incorrect chain. For this reason, users should be careful to store events and attestations where they are easily discoverable. This protocol is *not* partition tolerant.

When checking the validity of a given event against key group state, it's important to keep in mind that events' `created_at` field may be forged, and so can't be trusted without reservation (although key validity windows do reduce the amount of damage an attacker can do). When validating events based on timestamp, it's recommended to obtain an attestation for that event as well, either from a relay, or using [OTS](/03.md).

### Using multiple sequencers

Multiple sequencers MAY be used in tandem to reduce the amount of trust placed in any given sequencer. If multiple sequencers are used, attestations not included in all result sets SHOULD be discarded to avoid forgeries. Alternatively, implementations MAY use timestamps provided by sequencers to reconcile disparate attestation result sets, but doing so correctly is out of the scope of this specification.

## Usage

All keys in a group should be considered a single identity, identified by the `root`, i.e., the `pubkey` used to sign the first `kind ADD_KEY` event. This has two implications for events not described in this spec:

- All events published by any key during the period in which it was a valid member of the group SHOULD be treated as if they were signed by the `root` directly.
- All references to any key published during the period in which the target key was a valid member of the group SHOULD be treated as if they were referencing the `root` directly.

Implementations MAY choose to stop building the key group at any point if it gets too complex (or choose not to implement this protocol at all), leaving keys unlinked. For this reason, when creating a `kind ADD_KEY` event the author SHOULD re-sign and publish important metadata events (especially kinds `0`, `10002`, `10050`, and any other events containing important routing information).

Authors MAY also re-sign and publish other historical events (for example recent or pinned notes), however this should be done sparingly to prevent unnecessary duplicates from being downloaded.

When fetching events for a given identity, all pubkeys in the group SHOULD be included in `authors` or `#p` filters. Filters SHOULD also include `since` and `until` filters matching the periods when the key in question was a valid member of the group.

Relays MAY implement key group validation and drop invalid events from their database.

## Example

In this example, Alice creates three different keys:

- Key `A` is her `root` key, since it's the first key she creates and where she begins her attestation chain.
- Key `B` is added and later compromised and subsequently invalidated by `A`
- Key `C` is added and later invalidates `A`

Throughout, Bob interacts with Alice's account by building key group state, fetching events using filters, and detecting forgeries and forks.

First, Alice decides she would like a backup key that she can use, so she publishes a `kind ADD_KEY` for key `B` from her `root` identity `A`:

```json
{
  "id": "<A.1>",
  "pubkey": "<A>",
  "kind": ADD_KEY,
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
