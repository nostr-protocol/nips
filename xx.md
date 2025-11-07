NIP-XX
======

Attestations, Sequencers, and Key Rotation
------------------------------------------

`draft` `optional`

By default nostr public keys solely represent a user's identity, which makes key management very important to get right, and impossible to recover from. This NIP offers a way to add alternative keys to a base identity, as well as invalidate any key within the group.

All nostr pubkeys are members of a "key group", by default a set containing only the `root` pubkey itself. Key groups are identified by the `root` pubkey, and can be expanded using a `kind EXPAND` event signed by any key in the set, and contracted using a `kind CONTRACT`. The validity, order, and completeness of these "key group" events MUST be validated as defined in the [#Validation](validation) section of this page.

## Adding Keys

Any existing pubkey MAY add a key to the key group using a `kind EXPAND` event:

- a `root` tag containing the `root` pubkey
- an `e` tag containing an event id, a relay hint, and a pubkey hint
- a `p` tag containing a hex-encoded pubkey to add to the key group
- an optional message in the `content` field

```typescript
{
  // ... other fields
  kind: EXPAND,
  content: "This is the key I buried in the forest",
  tags: [
    ["root", "<root pubkey>"],
    ["e", "<event id>", "<relay url>", "<pubkey hint>"],
    ["p", "<hex pubkey>"]
  ]
}
```

## Removing Keys

Any key within a key group MAY remove any key from the group (including itself) using a `kind CONTRACT` event:

- a `root` tag containing the `root` pubkey
- an `e` tag containing an event id, a relay hint, and a pubkey hint
- a `p` tag containing a hex-encoded pubkey to add to the key group
- an optional message in the `content` field

```typescript
{
  // ... other fields
  kind: CONTRACT,
  content: "Someone dug up my key and used it to post bad memes :(",
  tags: [
    ["root", "<root pubkey>"],
    ["e", "<event id>", "<relay url>", "<pubkey hint>"],
    ["p", "<hex pubkey>"]
  ]
}
```

## Attestation Sequencing

Because event timestamps can be forged, forks and forgeries in the key group chain MUST be resolved using attestations curated by an external sequencer.

An attestation is an 80 byte string which is the result of concatenating the `pubkey` used to sign an event (not the `root` pubkey) and the first 16 characters of the event's `id`:

`<event pubkey><first 16 characters of event id>`

For example:

`89a3953aff215478f9ae5d04f40c6ea0ba9b10f2337452cebd5b2269c0736c92aeab0c2de9b492e0`

This format is designed so that it can be matched by prefix, to require 64 bits of work to forge an attestion (in the case of a leaked private key), and to fit within an `OP_RETURN`.

Sequencers are responsible for maintaining a complete, ordered record of attestations for all key group events.

Sequencers SHOULD also provide:

- A timestamp for each attestation.
- A signed copy of the event attested to.

### OP_RETURN Sequencing

Sequence records MAY be stored on the bitcoin blockchain using `OP_RETURN` data.

### Trusted Sequencing

Trusted sequencers MAY be used as an alternative or supplement to `OP_RETURN` (since they have the ability to store a copy of the attested event), but care should be taken to use multiple independent sequencers in order to avoid attacks related to attestation omission or re-ordering which can result in the loss or theft of an identity. Web-of-trust analysis MAY be used to select reliable sequencers. See [This PR to NIP 03](https://github.com/nostr-protocol/nips/pull/1737/files) for some ways that relays may be used as trusted sequencers.

## Validation

When attempting to link pubkeys, implementations must construct a validated sequence of state transitions for the given key group by linking together attestations and nostr events using the following process:

1. Identify at least one `pubkey` in the group to bootstrap from.
2. Fetch all attestations from trusted sequencer(s) with the first 64 characters matching the given pubkeys.
4. Fetch all `kind EXPAND` and `kind CONTRACT` events from known pubkeys' [outbox relays](./65.md).
5. Repeat steps 1-4 for all newly discovered `root` or `p`-tagged pubkeys.
6. Discard any events whose `pubkey` and `id` do not match an attestation.
7. Iterate over all sorted attestations, matching each to an event by `pubkey` and `id`.
8. Build a data structure recording key membership over time which can be used to validate events and build filters.

Because attestations can be trivially forged in some sequencer systems, attestations without a corresponding event may be discarded. However, genuinely missing events **may** result in an invalid or incorrect chain. For this reason, users should be careful to store events where they are easily discoverable, or use a sequencer that provides its own copy of events.

When checking the validity of a given event against key group state, it's important to keep in mind that events' `created_at` field may be forged, and so can't be trusted without reservation (although key validity windows do reduce the amount of damage an attacker can do). When validating events based on timestamp, it's recommended to obtain an attestation for that event as well, either from a relay, using [OTS](/03.md), or an attestation service.

### Using multiple sequencers

Multiple sequencers MAY be used in tandem to reduce the amount of trust placed in any given sequencer. If multiple sequencers are used, attestations not included in all result sets SHOULD be discarded to avoid forgeries. Alternatively, implementations MAY use timestamps provided by sequencers to reconcile disparate attestation result sets, but doing so correctly is out of the scope of this specification.

## Usage

All keys in a group should be considered a single identity, identified by the `root`, i.e., the `pubkey` used to sign the first `kind EXPAND` event. This has two implications:

- All events published by any key during the period in which it was a valid member of the group SHOULD be treated as if they were signed by the `root` directly.
- All references to any key published during the period in which the target key was a valid member of the group SHOULD be treated as if they were referencing the `root` directly.

Implementations MAY choose to stop building the key group at any point (or choose not to implement this protocol at all), leaving keys unlinked. For this reason, when creating a `kind EXPAND` event the author SHOULD re-sign and publish important metadata events (especially kinds `0`, `10002`, `10050`, and any other events containing important routing information).

Authors MAY also re-sign and publish other historical events (for example recent or pinned notes), however this should be done sparingly to prevent unnecessary duplicates from being downloaded.

When fetching events for a given identity, all pubkeys in the group SHOULD be included in `authors` or `#p` filters. Filters SHOULD also include `since` and `until` filters matching periods when the key in question was a valid member of the group.

Relays MAY implement key group validation and drop invalid events from their database.
