NIP-XXDLC
=========

Discreet Log Contract Oracles on Nostr
--------------------------------------

`draft` `optional`

This NIP describes event kinds using the placeholder `xxdlc`, for [Discreet Log Contract (DLC)](https://bitcoinops.org/en/topics/discreet-log-contracts/) oracles to publish their announcements and attestations over Nostr. Clients can consume these signed events to create conditional payment contracts which fulfill differently based on the oracles' attestations.

This NIP is scoped to the DLC v0 message format. Future incompatible DLC message versions should use a different NIP or event format so clients do not fetch oracle messages they cannot parse.

## Format

DLC protocol messages are binary-serialized messages described concretely in [this document](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md). Whenever embedding DLC messages inside Nostr events, which are encoded as JSON, we serialize those DLC messages in base64.

## DLC Oracle Gossip

DLCs require an oracle to attest to the outcome of real world events. This is done by the oracle signing a message containing the outcome of the event. Before they attest to the outcome, they must create an announcement where they publish the intent to sign the future event. This announcement is then used by the DLC participants to create the contract. Here we define events using the placeholder `kind:xxdlc`, to be replaced by assigned event kind numbers, for publishing the oracle's announcement and attestations respectively.

### Announcement Event (`kind:xxdlc`)

```jsonc
{
  "kind": xxdlc,
  "content": "BA/cNhCpdD25j/MwDaa4F42QIq8NsOGmaW1MxyswZnipGWirwoxPhL1SmoHcp1JuCjYXF...",
  "tags": [
    [
      "relays", // the relays the oracle will publish attestations to
      "wss://nostr.mutinywallet.com",
      "wss://relay.damus.io"
    ],
    [
      "title",
      "Optional Event Title"
    ],
    [
      "description",
      "An optional human-readable description of the event which the oracle will attest to, in plain text."
    ],

    // optional, if this is a numeric event for an asset pair
    ["n", "BTC"],
    ["n", "USD"]
  ],
  "pubkey": "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322",
  "created_at": 1679673265,
  "id": "30efed56a035b2549fcaeec0bf2c1595f9a9b3bb4b1a38abaf8ee9041c4b7d93",
  "sig": "f2cb581a84ed10e4dc84937bd98e27acac71ab057255f6aa8dfa561808c981fe8870f4a03c1e3666784d82a9c802d3704e174371aa13d63e2aeaf24ff5374d9d"
}
```

The `content` field must be the base64-encoding of a binary-serialized [`oracle_announcement` object](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#the-oracle_announcement-type).

The optional `title` tag gives observers a short human-readable title with which to display the announcement in cards, hyperlinks, etc. It _should_ be at most 100 characters of UTF-8 text. Clients _should_ ignore or truncate titles longer than 100 characters. This tag must NOT be parsed as markdown or HTML.

The optional `description` tag provides a human-readable summary of the real-world event which this announcement is for. The `description` should give observers context, so that they know how the real-world event in question will be reflected in the oracle's final attestation. This tag must NOT be parsed as markdown or HTML.

The optional `n` tag is described further down this document.

Upon receiving an announcement event of `kind:xxdlc`, clients _should_ validate:

- the base64-encoded announcement data contains a copy of the correct oracle attestation pubkey. The oracle's attestation key may be distinct from the oracle's Nostr key.
- the announcement is signed correctly by the expected oracle attestation pubkey.
- [the event descriptor included in the announcement](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#the-event_descriptor-type) matches the tags in the `kind:xxdlc` event.

### Attestation Event (`kind:xxdlc`)

```jsonc
{
  "kind": xxdlc,
  "content": "w7HSaUaPQn7Fa00PoUwTqkR2+wXHCPjD8Da5f4OcJ0EACsUw6uSdQgUDLLG9o/e9daS...",
  "tags": [
    [
      "e", // the Nostr event id of the announcement
      "30efed56a035b2549fcaeec0bf2c1595f9a9b3bb4b1a38abaf8ee9041c4b7d93"
    ],

    // optional, if this is a numeric attestation for an asset pair
    ["n", "BTC"],
    ["n", "USD"]
  ],
  "pubkey": "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322",
  "created_at": 1679673265,
  "id": "30efed56a035b2549fcaeec0bf2c1595f9a9b3bb4b1a38abaf8ee9041c4b7d93",
  "sig": "f2cb581a84ed10e4dc84937bd98e27acac71ab057255f6aa8dfa561808c981fe8870f4a03c1e3666784d82a9c802d3704e174371aa13d63e2aeaf24ff5374d9d"
}
```

The `content` field must be the base64-encoding of a binary-serialized [`oracle_attestation` object](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#the-oracle_attestation-type).

Note that the `e` tag is the _Nostr event identifier_ for the `kind:xxdlc` announcement event, which is distinct from the identifier embedded [in the announcement](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#oracle_event) or [in the attestation itself](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#oracle_attestation). The `e` tag is intended to be used to look up the corresponding announcement event.

Upon receiving an attestation, clients _should_ validate:

- the base64-encoded attestation data [contains a copy](https://github.com/discreetlogcontracts/dlcspecs/blob/master/Messaging.md#the-oracle_attestation-type) of the correct oracle attestation pubkey. This should be the same as the pubkey contained in the corresponding announcement event, of `kind:xxdlc`.
- the `event_id` field inside the `oracle_attestation` object matches the `event_id` field in the original `oracle_announcement` object, referred to by the `e` tag.
- the attestation signatures are valid under the oracle's attestation key.

### The `n` Tag

DLCs are often numeric events, in which the oracle signs the relative price of two assets. In this common case, `kind:xxdlc` events may include exactly two `n` tags which indicate the ticker symbols of the assets whose relative value is being signed.

The order of the tags implies a specific denomination of the price attestation: The attestation's outcome should be **the value of the first symbol in units of the second symbol.** For example, `[... ["n", "BTC"], ["n", "USD"]]` indicates the attestation supposedly signs the price of `BTC` in units of `USD`.

### Oracle Pubkeys

Oracles are responsible for choosing how to manage their attestation keypair(s). Oracle announcements and attestations embed their own copies of the oracle's BIP340 attestation public key. Oracles should ideally never change their attestation key pair between events, but they _may_ choose to migrate their attestation key, or use different keys for different types of events if they desire. Clients are responsible for choosing secure policies regarding which oracle attestation keys to trust and use.

The Nostr event's `pubkey` identifies the Nostr key that published the event, but it does not replace or authenticate the oracle attestation key embedded in the DLC message. Clients MUST validate announcement and attestation signatures against the oracle attestation key from the DLC payload, not against the Nostr event key.

### Trusted Oracle List (`kind:xxdlc`)

Kind `xxdlc` lists a user's trusted oracle publication sources, for the purpose of third party protocols negotiating DLCs or DLC-adjacent conditional payment contracts with the user. A `kind:xxdlc` event contains one or more `s` tags with an oracle publisher's Nostr pubkey, and one or more relays where that publisher's announcement events (`kind:xxdlc`) may be found.

```jsonc
{
  "kind": xxdlc,
  "tags": [
    ["s", "4fd5e210530e4f6b2cb083795834bfe5108324f1ed9f00ab73b9e8fcfe5f12fe", "wss://bitagent.prices"],
    // ...
  ]
}
```

Clients that use `kind:xxdlc` for discovery MUST still validate the DLC oracle attestation key in each discovered announcement and attestation according to their own trust policy.
