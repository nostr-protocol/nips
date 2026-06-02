NIP-GC
======

Geocaching Events
-----------------

`draft` `optional`

This NIP defines event kinds for geocaching on Nostr. These events allow users to create, share, and log geocaches in a decentralized manner.

## Geocache Listing Event (Kind 37516)

Geocache listing events are addressable events of kind `37516` with the following structure:

```json
{
  "kind": 37516,
  "content": "<cache description>",
  "tags": [
    ["d", "<cache-identifier>"],
    ["name", "<cache-name>"],
    ["g", "<geohash>"],
    ["D", "<1-5>"],
    ["T", "<1-5>"],
    ["S", "<size>"],
    ["t", "<type>"],
    ["n", "<type-modifier>"],
    ["hint", "<plaintext hint>"],
    ["mission", "<key quest mission>"],
    ["image", "<image-url>"],
    ["r", "<relay-url>"],
    ["verification", "<verification-pubkey-hex>"]
  ]
}
```

Listing events require all information about the cache and information relevant to finding the cache. These include the `name`, location (`g`), difficulty (`D`) and terrain (`T`) scores, and size (`S`). The type of cache (`t`) is optional and defaults to `traditional` if not specified.

Cache types are determined by individual clients, with common types including `traditional`, `multi`, and `mystery`. Clients should decide which cache types they support based on their implementation needs.

These requirements are well-known and follow existing standards, such as those outlined on [geocaching.com](https://www.geocaching.com/help/index.php?pg=kb.chapter&id=97).

These events are assumed to be owned by the submitter of the cache, and core details should be maintained by that submitter. However, community logs should also provide context on the current state and validity of the cache.

### Content

The content field contains the cache description and any additional information about the cache.

### Tags

- `d` (required) - unique identifier for the cache
- `name` (required) - human-readable name for the cache  
- `g` (required) - geohash of cache location. To allow for a proximity search, include multiple geohash tags at different precision levels (3-9 characters)
- `D` (required) - integer 1-5 indicating puzzle/finding difficulty (indexed)
- `T` (required) - integer 1-5 indicating terrain difficulty (indexed)
- `S` (required) - one of: `micro`, `small`, `regular`, `large`, `other` (indexed)
- `t` (optional) - cache type, with common values including: `traditional`, `multi`, `mystery`. Defaults to `traditional` if not specified
- `n` (optional) - type modifier(s) that affect lifecycle, claim semantics, or prize nature. See [Type Modifiers](#type-modifiers). Multiple `n` tags MAY be present, but at most one per modifier category
- `hint` (optional) - plaintext hint to help find the cache
- `mission` (optional) - plaintext "Key Quest" mission that finders are expected to complete to legitimately claim the cache (e.g. a passphrase, riddle answer, or item to bring). A treasure MUST NOT include more than one `mission` tag; if multiple are present, clients SHOULD use the first and ignore the rest. When present, clients SHOULD restrict found-log submission to finders who have proof of physical presence (typically the verification key from the cache location). Completions of the mission MAY be recorded as [NIP-GD](NIP-GD.md) Good Deed events whose `a` tag references the cache
- `image` (optional) - image URLs related to the cache
- `r` (optional) - preferred relay URLs for logs
- `verification` (optional) - hex-encoded public key for verifying finds at this cache
- `F` (optional) - locks in the first-to-find winner. Only valid when the treasure carries the `first-to-find` `n` modifier. Format: `["F", "<winner-pubkey-hex>"]`. See [Type Modifiers › `first-to-find`](#claim-semantics). At most one `F` tag SHOULD be present

## Found Log Event (Kind 7516)

Found log events record successful visits to geocaches:

```json
{
  "kind": 7516,
  "content": "<log message>",
  "tags": [
    ["a", "37516:<pubkey>:<d-tag>"]
  ]
}
```

### Tags

- `a` (required) - reference to the geocache being logged
- `image` (optional) - photos from the visit
- `verification` (optional) - embedded verification event (see Verified Finds section)

## Comment Log Events (Kind 1111)

Non-found logs use comment events (kind `1111`) following NIP-22 comment structure:

```json
{
  "kind": 1111,
  "content": "<log message>",
  "tags": [
    ["A", "37516:<pubkey>:<d-tag>"],
    ["K", "37516"],
    ["P", "<cache-owner-pubkey>"],
    ["a", "37516:<pubkey>:<d-tag>"],
    ["k", "37516"],
    ["p", "<cache-owner-pubkey>"],
    ["t", "<log-type>"]
  ]
}
```

These events capture failures, notes, and status-related information about the cache via human reporting, following the NIP-22 comment threading model where the geocache listing is both the root and parent content.

Comment log types include `dnf` (did not find), `note` (helpful or neutral context), and `maintenance` (cache needs attention). If no `t` tag is present, the comment is assumed to be a general note.

Owners of the cache can officially retire caches using an `archived` tag value in the tag `t`, thus allowing the cache's history to be preserved without fully deleting it.

### Tags

The `A`/`K`/`P` (root) and `a`/`k`/`p` (parent) tags follow [NIP-22](https://github.com/nostr-protocol/nips/blob/master/22.md). For these top-level comments, the root and parent are identical: they reference the geocache listing (`37516:<pubkey>:<d-tag>`), kind `37516`, and the cache owner's pubkey.

- `t` (optional) - log type: `dnf`, `note`, `maintenance`, `archived`. If omitted, assumed to be `note`
- `image` (optional) - photos from the visit

## Geocache Verification Event (Kind 7517)

Verification events provide cryptographic proof that someone physically located a geocache. These events are signed by the cache's verification private key.

```json
{
  "kind": 7517,
  "content": "Geocache verification for <finder-npub>",
  "tags": [
    ["a", "<finder-pubkey-hex>:<geocache-naddr>"]
  ]
}
```

### Content

The content field must follow the static format: `"Geocache verification for <finder-npub>"` where `<finder-npub>` is the NIP-19 encoded public key (npub) of the person who found the cache.

### Tags

- `a` (required) - composite identifier containing the finder's pubkey in hex format and the geocache naddr being verified

### Usage

Verification events are created when a finder obtains access to the cache's verification private key (typically via QR code at the cache location). The event must be signed by the cache's verification private key and can be:

1. Embedded in the `verification` tag as a JSON string in the Verified Found Log event (kind 7516).
2. Published to relays as standalone events
3. Both embedded and published for redundancy

## Verified Finds

Geocaches with verification enabled can provide cryptographic proof that a finder physically located the cache. This is accomplished through a verification event (kind 7517) signed by the cache's verification key.

### Verification Process

When a cache has a `verification` tag containing a public key, finders can create a verified log by:

1. Obtaining the cache's verification private key (typically via QR code at the cache location)
2. Creating a verification event (kind 7517) signed by this key
3. Embedding the verification event in their log entry

### Verification Validation

To validate a verified find:

1. Check that the verification event is signed by the expected verification public key
2. Verify that the finder pubkey in the `a` tag matches the log author
3. Confirm the geocache naddr in the `a` tag correctly references the target cache
4. Validate the event signature using standard Nostr verification

## Type Modifiers

Geocache listings MAY include one or more `n` tags that classify the geocache with additional type modifiers. Unlike the `t` cache-type tag (which describes *how* a cache is found), `n` modifiers describe *how the cache behaves* once published — its lifecycle, claim semantics, or prize nature.

The `mission` tag is also a type modifier in the broader sense, but it uses its own dedicated tag because it carries a payload (the mission text). Clients SHOULD treat `mission` and `n` modifiers consistently for display purposes (badges, filters, etc.).

### Rules

1. Each modifier value belongs to exactly one **category** (see below).
2. A geocache SHOULD include at most one `n` tag per category. If multiple values from the same category are present, clients SHOULD use the first occurrence and ignore the rest.
3. Modifiers from different categories compose freely. Any combination is valid unless a specific modifier's definition states otherwise.
4. Clients SHOULD ignore `n` values they do not recognize, allowing forward compatibility as new modifiers are defined.

### Categories and Modifiers

#### Claim semantics

Modifiers that affect how claims on the treasure are interpreted.

- `first-to-find` — Single-claim geocache listing. The first verified found log (kind 7516 with valid embedded kind 7517) constitutes the exclusive claim. Subsequent verified found logs remain valid records of physical presence at the location but do not constitute additional claims. Clients SHOULD render the geocache listing as effectively archived once any valid verified found log exists, hiding find-submission affordances and displaying the winning finder prominently. Requires a `verification` tag on the geocache listing event.

  Determining the winning log (provisional, before lock-in):
  - The winning log is the verified found log with the earliest `created_at` value.
  - Ties on `created_at` are broken by ascending lexicographic comparison of the event `id`.
  - All verified logs are evidence of physical presence (QR access was required to produce them); the exclusive claim is attributed only to the earliest one.

  Locking in the winner (`F` tag):
  - Once the geocache listing creator has confirmed the claim, the creator SHOULD publish a new revision of the geocache listing event that BOTH archives the listing (adds `["t", "archived"]`) AND locks the winner in by appending an `F` tag:
    `["F", "<winner-pubkey-hex>"]`
  - The value is the winning finder's pubkey (lowercase hex). The specific winning verified found log is recoverable by querying for verified found logs whose `a` tag references this treasure and whose author matches the `F` pubkey.
  - At most one `F` tag SHOULD be present. If multiple are present, clients SHOULD use the first.
  - When an `F` tag is present, clients MUST attribute the exclusive claim to the pubkey in the `F` tag, regardless of which verified found log currently appears earliest. Because `created_at` is author-supplied and forgeable, this protects the locked-in claim from being displaced by a later log carrying a forged earlier timestamp.

#### Prize nature

Modifiers that describe what the physical treasure IS.

- `art` — The geocache itself is a physical work of art (a print, sculpture, sticker, zine, painted object, mural, installation, etc.). Whether the work is takeable, viewable in place, photographable only, or otherwise interacted with is determined by other modifiers and by the treasure's `content` description.

### Forward Compatibility

New modifiers MAY be defined in future revisions of this NIP or in supplementary NIPs. New categories MAY also be introduced. Clients implementing this NIP SHOULD ignore unknown `n` values rather than rejecting the event.

## Geocache Curation List Event (Kind 37517)

Curation list events are addressable events of kind `37517` that group geocaches into curated collections. Clients may present these as adventures, trails, treasure hunts, or any other themed experience.

```json
{
  "kind": 37517,
  "content": "<full description>",
  "tags": [
    ["d", "<list-identifier>"],
    ["title", "<list-title>"],
    ["description", "<short summary>"],
    ["image", "<banner-image-url>"],
    ["g", "<geohash>"],
    ["theme", "<page-theme>"],
    ["map", "<map-style>"],
    ["a", "37516:<pubkey>:<d-tag>"],
    ["a", "37516:<pubkey>:<d-tag>"]
  ]
}
```

### Content

The content field contains the full description of the curation list — rules, tips, narrative, or any other context the creator wants to provide.

### Tags

- `d` (required) - unique identifier for the list
- `title` (required) - human-readable name for the list
- `a` (required, 1+) - references to geocache listing events (kind 37516 or 37515). Order is preserved and meaningful
- `description` (optional) - short summary shown in browse/card views
- `image` (optional) - banner image URL
- `g` (optional) - geohash of list center location. Include multiple precision levels (3-6 characters) for discovery
- `theme` (optional) - default page theme for the list. Clients should apply this theme when displaying the list, unless the user has explicitly chosen a different theme. Supported values: `adventure`, `mojave`
- `map` (optional) - default map style for the list. Clients should use this as the initial map style when displaying the list, but allow the user to change it. Supported values: `original`, `dark`, `satellite`, `adventure`

### Cross-Author References

Curation lists can reference any public geocache regardless of author. The `a` tags use standard Nostr addressable event coordinates (`<kind>:<pubkey>:<d-tag>`), allowing a single list to span geocaches from multiple creators.

## Clients

For the best Geocaching experience, clients implementing geocaching support should:

- Support hint encoding, such as ROT13, to prevent spoilers.
- Determine cache status from recent log patterns. Multiple DNF entries and/or maintenance notes would indicate an issue with the cache.
- Publish logs to relays specified in the cache's `r` tags when available.
- Validate geohash precision meets minimum requirements (8+ characters, 9+ for micro caches) before accepting cache submissions.

## Examples

### Basic Cache

```json
{
  "kind": 37516,
  "content": "The first Nostr treasure, left in the aftermath of Oslo Freedom Forum!",
  "tags": [
    ["d", "first-treasure-1748619568668"],
    ["name", "First Treasure"], 
    ["g", "u4x"],
    ["g", "u4xs"],
    ["g", "u4xsu"],
    ["g", "u4xsu6"],
    ["g", "u4xsu6r"],
    ["g", "u4xsu6ry"],
    ["g", "u4xsu6ryb"],
    ["D", "1"],
    ["T", "1"],
    ["S", "small"],
    ["t", "traditional"],
    ["hint", "In the branches"],
    ["image", "https://blossom.primal.net/74efe01a767b27dead71b8a9bb8278a108360438e78e55194ed9ab14a9382dd3.jpg"]
  ]
}
```

### Verified Cache

```json
{
  "kind": 37516,
  "content": "High-security treasure requiring physical verification!",
  "tags": [
    ["d", "verified-treasure-1748619568669"],
    ["name", "Verified Treasure"], 
    ["g", "u4xsu6ry"],
    ["D", "3"],
    ["T", "2"],
    ["S", "small"],
    ["t", "traditional"],
    ["hint", "Look for the secret code"],
    ["verification", "6805d4e5c0df48b4f76e2fdcb67a2acb1d97567b01c6fe17a236dc32f34f1c07"]
  ]
}
```

### Cache with Key Quest

```json
{
  "kind": 37516,
  "content": "Solve the riddle to claim your prize.",
  "tags": [
    ["d", "key-quest-treasure-1748619568670"],
    ["name", "Riddle of the Old Oak"],
    ["g", "u4xsu6ry"],
    ["D", "4"],
    ["T", "2"],
    ["S", "small"],
    ["t", "mystery"],
    ["hint", "Count the rings on the fallen log"],
    ["mission", "Bring a token of nature you found along the way"],
    ["verification", "6805d4e5c0df48b4f76e2fdcb67a2acb1d97567b01c6fe17a236dc32f34f1c07"]
  ]
}
```

### First-to-Find Art

A single-claim treasure where the cache itself is a physical artwork. The first verified finder is the exclusive claimant; how the work is fulfilled (taken home, photographed, etc.) is described in the cache content.

```json
{
  "kind": 37516,
  "content": "Hand-pulled linocut, edition of 1, signed on the back next to the QR. Whoever finds it keeps it.",
  "tags": [
    ["d", "linocut-aftermath-1748619568671"],
    ["name", "Aftermath (Linocut #1)"],
    ["g", "u4xsu6ry"],
    ["D", "2"],
    ["T", "2"],
    ["S", "small"],
    ["t", "traditional"],
    ["n", "first-to-find"],
    ["n", "art"],
    ["hint", "Behind glass, but not in a frame"],
    ["image", "https://blossom.primal.net/example-linocut.jpg"],
    ["verification", "6805d4e5c0df48b4f76e2fdcb67a2acb1d97567b01c6fe17a236dc32f34f1c07"]
  ]
}
```

### Found Log

```json
{
  "kind": 7516,
  "content": "Found it! Great hiding spot.",
  "tags": [
    ["a", "37516:0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:first-treasure-1748619568668"]
  ]
}
```

### DNF Log

```json
{
  "kind": 1111,
  "content": "Searched for 30 minutes but couldn't find it. Maybe it's missing?",
  "tags": [
    ["A", "37516:0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:first-treasure-1748619568668"],
    ["K", "37516"],
    ["P", "0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd"],
    ["a", "37516:0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:first-treasure-1748619568668"],
    ["k", "37516"],
    ["p", "0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd"],
    ["t", "dnf"]
  ]
}
```

### Note Log

```json
{
  "kind": 1111,
  "content": "Lots of muggles around during the day. Best to visit in the evening.",
  "tags": [
    ["A", "37516:0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:first-treasure-1748619568668"],
    ["K", "37516"],
    ["P", "0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd"],
    ["a", "37516:0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:first-treasure-1748619568668"],
    ["k", "37516"],
    ["p", "0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd"],
    ["t", "note"]
  ]
}
```

### Verification Event

```json
{
  "kind": 7517,
  "content": "Geocache verification for npub1qc0lc5lxnhxnfxlw2lxkv4x4vp6xsf4d5qwvlhfx6qmz6x4nfhqd8h2z3",
  "tags": [
    ["a", "0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:naddr1qqxnzd3e8q6n2dfk8qcnjve48qmnsw3jsqgswaehxw309aex2mrp0yhx6tpdsek6w309aex2mrp0yh56tnwdus8vatjvs6kzdrz956k7tjzw6qzypzgd2dmgxhxf34hnlw2y03nckr8f4g6mw9flxqq65v94zkp77rqfgrf8"]
  ],
  "pubkey": "6805d4e5c0df48b4f76e2fdcb67a2acb1d97567b01c6fe17a236dc32f34f1c07",
  "created_at": 1672531200,
  "sig": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456789012345678901234567890abcdef1234567890abcdef1234567890abcdef12"
}
```

### Verified Found Log

```json
{
  "kind": 7516,
  "content": "Found it! Great hiding spot.",
  "tags": [
    ["a", "37516:0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:verified-treasure-1748619568669"],
    ["verification", "{\"kind\":7517,\"content\":\"Geocache verification for npub1qc0lc5lxnhxnfxlw2lxkv4x4vp6xsf4d5qwvlhfx6qmz6x4nfhqd8h2z3\",\"tags\":[[\"a\",\"0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:naddr1qqxnzd3e8q6n2dfk8qcnjve48qmnsw3jsqgswaehxw309aex2mrp0yhx6tpdsek6w309aex2mrp0yh56tnwdus8vatjvs6kzdrz956k7tjzw6qzypzgd2dmgxhxf34hnlw2y03nckr8f4g6mw9flxqq65v94zkp77rqfgrf8\"]],\"pubkey\":\"6805d4e5c0df48b4f76e2fdcb67a2acb1d97567b01c6fe17a236dc32f34f1c07\",\"created_at\":1672531200,\"sig\":\"a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456789012345678901234567890abcdef1234567890abcdef1234567890abcdef12\"}"]
  ]
}
```

### Geocache Curation List

```json
{
  "kind": 37517,
  "content": "Explore the festival grounds and find all hidden treasures before the jousting tournament!",
  "tags": [
    ["d", "ren-fest-hunt-1748619568670"],
    ["title", "Texas Ren Fest Treasure Hunt"],
    ["description", "Find all the hidden treasures at the festival!"],
    ["image", "https://blossom.primal.net/banner-example.jpg"],
    ["g", "9vk"],
    ["g", "9vk5"],
    ["g", "9vk5b"],
    ["g", "9vk5b7"],
    ["theme", "adventure"],
    ["map", "adventure"],
    ["a", "37516:0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:first-treasure-1748619568668"],
    ["a", "37516:0461fcbecc4c3374439932d6b8f11269ccdb7cc973ad7a50ae362db135a474dd:verified-treasure-1748619568669"]
  ]
}
```
