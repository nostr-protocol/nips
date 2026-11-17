NIP-XX
======

Namecoin resolution for nsites
------------------------------

`draft` `optional`

This NIP defines how a Namecoin name selects a static website described by
[NIP-5A](5A.md). It adds an optional `nsite` item to the Namecoin `nostr`
object and defines a compatibility path from previously deployed Namecoin
identity forms to nsite targets. It does not preserve ambiguous or conflicting
legacy identity behavior.

The `nostr` record container and Namecoin identity forms are introduced by the
companion [Namecoin NIP-05 draft](https://github.com/nostr-protocol/nips/pull/2349).
This NIP maps names to Nostr identifiers. It does not define a DNS resolver,
an HTTPS transport, a TLS certificate mechanism, or a replacement for the
canonical nsite URLs and Blossom retrieval rules in NIP-5A.

## Namecoin input

### Names and subdomains

A resolver accepts an explicit Namecoin identifier, such as `d/example`,
`id/example`, or `example.bit`, and obtains its current, unexpired value.
`d/` and `id/` inputs identify the Namecoin key directly.

For a `.bit` input, validate the DNS name, remove an optional final root dot,
and remove the final, case-insensitive `bit` label. The rightmost remaining
label, converted to lowercase, is the Namecoin `d/` name. Query that name
only. Walk all remaining labels through successive `map` objects in DNS order,
from right to left, using the exact label or the `*` entry when permitted by
[ifa-0001](https://github.com/namecoin/proposals/blob/master/ifa-0001.md).
For example, `www.example.bit` queries `d/example` and then selects `map.www`;
it MUST NOT query `d/www.example`.

If no permitted map entry exists, resolution fails. The `map[""]` item is
processed only using its ifa-0001 parent-default merge rule; it MUST NOT be
used as a fallback child for an unknown subdomain. Apply applicable `import`
and parent-default processing, then read `nostr` and any compatibility aliases
only from the final selected node. Ancestors do not otherwise contribute these
fields.

### Imports

The resolver MUST apply ifa-0001 `import` processing before reading the
selected resolution fields. In particular:

- the importing object has highest precedence, followed by the first imported
  object, then each later imported object in array order;
- a string, an array of strings, and an array of import-operation arrays have
  their distinct ifa-0001 meanings. An array of strings represents separate
  imports, not a name-and-subdomain-selector pair;
- imports inside an imported object are processed before that operation's
  subdomain selector;
- implementations MUST support at least the recursion degree required by
  ifa-0001, and MUST detect cycles.

If an import operation needed to determine the selected map path or effective
`nostr` value fails, is expired, is unavailable, exceeds the supported
recursion, or encounters a cycle, nsite resolution MUST fail. The resolver
MUST NOT substitute an empty object and then return a successful, legacy, or
cached resolution. Errors in unrelated items retain ifa-0001 error-recovery
behavior. These rules intentionally override conflicting behavior in earlier
Namecoin identity resolvers.

### Chain view and trust model

All names used during one resolution, including imports, MUST be resolved at
the same Namecoin chain view. Namecoin expiry, delegation failures, malformed
JSON, and transport failures MUST NOT be collapsed into a successful or empty
nsite resolution. Implementations SHOULD preserve distinct error states so a
temporary failure can be retried.

A resolver MUST use one of these explicit trust models:

1. **Blockchain-verified resolution:** obtain the value and expiration status
   from a synchronized Namecoin Core node on the valid consensus chain, or
   verify light-client name-value and expiration evidence against validated
   Namecoin headers. Bind the result to a specific chain height.
2. **Trusted-server resolution:** use an explicitly configured Namecoin
   indexer or ElectrumX service as a trust assumption, and make that trust
   assumption visible to the application or operator.

ElectrumX TLS, fallback servers, or agreement between servers does not by
itself constitute blockchain authentication. A trusted-server resolver MUST
NOT describe those properties as proof that a value is on the consensus
chain. Under either model, a resolver MUST NOT silently substitute a DNS
lookup for a Namecoin lookup.

## Record format

The preferred form stores one NIP-19 pointer in `nostr.nsite`:

```json
{
  "nostr": {
    "nsite": "nprofile1qqszv6q4uryjzr06xfxxew34wwc5hmjfmfpqn229d72gfegsdn2q3fgpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mgqgkxzj"
  }
}
```

A direct `nsite` pointer MUST be a JSON string containing exactly one
canonical lowercase [NIP-19](19.md) entity, with no `nostr:` prefix,
surrounding whitespace, path, query, or fragment. The legacy bare named-site
identifier form is defined below. Unknown keys inside `nostr` do not affect
this NIP.

A named site uses an `naddr` pointer instead:

```json
{
  "nostr": {
    "nsite": "naddr1qqzxymr0vuq3wamnwvaz7tmjv4kxz7fwv4uxzmtsd3jjucm0d5pzqfngzhsvjggdlgeycm96x4emzjlwf8dyyzdfg4hefp89zpkdgz99qvzqqqyf8qfhp5ys"
  }
}
```

A current root MAY also use an `naddr` with kind `15128` and an empty
identifier. For example, this pointer selects the same author and relay as the
`nprofile` above:

```text
naddr1qvzqqqpmrqpzqfngzhsvjggdlgeycm96x4emzjlwf8dyyzdfg4hefp89zpkdgz99qythwumn8ghj7un9d3shjtn90psk6urvv5hxxmmdqqqqk9fgz7
```

Namecoin values are currently limited to 520 bytes. Publishers SHOULD include
only useful relay hints and SHOULD use ifa-0001 `import` when a record does
not fit. A compact `npub` or `note` pointer MAY be used when no relay hints
are needed.

## NIP-19 decoding profile

Decoders MUST validate the complete TLV structure rather than relying on
first-value or last-value behavior for duplicate fields:

- `npub` and `note` MUST decode to exactly 32 bytes.
- `nprofile` MUST contain exactly one 32-byte special TLV.
- `nevent` MUST contain exactly one 32-byte special TLV, at most one 32-byte
  author TLV, and at most one four-byte kind TLV.
- `naddr` MUST contain exactly one special TLV, exactly one 32-byte author
  TLV, and exactly one four-byte kind TLV. Its special TLV is the UTF-8 `d`
  identifier and is empty for a normal replaceable root site.

Reject truncated TLVs, invalid TLV lengths, missing required TLVs, and
duplicate singleton TLVs. Relay TLVs MAY repeat; each MUST contain a valid
ASCII WebSocket relay URL. Unknown TLVs are ignored as specified by NIP-19.
The retrieved event MUST match every decoded event-id, author, kind, and
identifier constraint.

## Pointer semantics

| Prefix | Target | Requirements |
| --- | --- | --- |
| `npub` | Current root site | Decode the author pubkey. |
| `nprofile` | Current root site | Decode the author pubkey and optional relay hints. |
| `naddr` | Current root or named site | Kind `15128` requires an empty identifier. Kind `35128` requires a nonempty identifier. Other kinds are invalid. |
| `nevent` | Exact manifest event | Select the event id; enforce author and kind hints when present. |
| `note` | Exact manifest event | Select the event id. This form carries no author, kind, or relay hints. |

For a named `naddr`, the identifier is the exact NIP-01 `d` value. NIP-5A's
`^[a-z0-9-]{1,13}$` and no-trailing-hyphen restriction applies to canonical
named-site URLs; it does not invalidate every other NIP-01 identifier. An
application with a direct coordinate interface MAY resolve a noncanonical
identifier. A gateway that only supports canonical named-site URLs MUST
reject such a pointer rather than truncate, encode, or substitute its
identifier.

An event selected by `nevent` or `note` MUST have kind `15128`, `35128`, or
`5128` and satisfy the corresponding NIP-5A rules. Only kind `5128` is a
NIP-5A manifest snapshot. An exact kind `15128` or `35128` selection remains
pinned to that event id; it is not a request for the current replaceable event
and is not a snapshot.

### Current root and named selection

For every current root or named selection, including legacy identity-to-root
selection, first require a valid NIP-01 event id and signature. Events with a
different author or kind are not candidates.

For a root site, order all validly signed kind `15128` events by the selected
author before enforcing the NIP-5A prohibition on `d` tags. For a named site,
the candidate coordinate is the selected author, kind `35128`, and the first
`d` tag value; require that coordinate to equal the selected coordinate before
ordering.

Select the candidate with the greatest `created_at`. If timestamps are equal,
select the lexicographically lowest event id. Relay arrival order, response
order, and a `limit: 1` response MUST NOT determine selection. Clients SHOULD
query enough relays and retain sufficient history to apply this rule rather
than assuming one relay has the complete current set.

After selection, enforce all applicable NIP-5A manifest rules, including the
absence of `d` on a root and exactly one matching `d` tag on a named manifest
under this NIP. If the selected event fails those rules, resolution MUST fail
and MUST NOT select an older event. Invalidly signed events, invalid event
ids, and events outside the applicable author, kind, or named coordinate do
not suppress valid candidates.

### Exact-event selection and relay discovery

For `nevent` and `note`, retrieve the exact id and then validate its signature,
kind, hints, and NIP-5A manifest form. A newer event at the same replaceable
coordinate MUST NOT replace an exact selection.

Relay hints are discovery hints only. Whenever an author pubkey is known,
[NIP-65](65.md) discovery MAY supplement pointer or legacy hints; clients
SHOULD use that author's NIP-65 `write` relays when downloading the author's
events. For a direct pointer, a `nostr.relays` map entry MAY supplement hints
only when its key is the selected author. A legacy single-identity relay array
applies only to that legacy pubkey, not to a different direct-pointer author.
ElectrumX servers, Nostr relays, and Blossom servers are distinct services.

## Legacy named-site shorthand

Experimental resolvers used a bare canonical NIP-5A named-site identifier in
`nsite` and obtained the author from a legacy identity field:

```json
{
  "nostr": {
    "pubkey": "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5",
    "nsite": "blog"
  }
}
```

A bare identifier MUST match `^[a-z0-9-]{1,13}$` and MUST NOT end with `-`.
It selects the current kind `35128` manifest with that exact `d` value and the
legacy author selected below. It does not select a root site or exact
snapshot. This shorthand is intentionally narrower than direct `naddr`
resolution because it was designed for canonical named-site gateway URLs.

For compatibility with experimental records, a resolver MAY read `nsite` from
the top-level Domain Name Object when `nostr.nsite` is absent. The alias
accepts the same pointer or bare-identifier semantics. New publishers MUST use
`nostr.nsite`. If both locations are present, `nostr.nsite` takes exclusive
precedence; a malformed nested value MUST NOT be bypassed in favor of the
alias.

## Legacy identity resolution

When no direct NIP-19 pointer is present, a resolver MAY select an author from
the legacy forms below. Without a bare `nsite` identifier, it selects that
author's current root. With one, it selects the named site above. These forms
are NIP-05-style author discovery for nsites, not completed NIP-05 identity
verification, and do not relax the companion NIP-05 rules.

Legacy hex pubkeys MUST match `^[0-9a-fA-F]{64}$` and MUST be normalized to
lowercase before event lookup and relay-map selection.

### Simple pubkey form

```json
{
  "nostr": "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5"
}
```

### Single-identity object form

```json
{
  "nostr": {
    "pubkey": "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5",
    "relays": ["wss://relay.example.com"]
  }
}
```

### NIP-05-style names form

```json
{
  "nostr": {
    "names": {
      "_": "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5"
    },
    "relays": {
      "266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5": [
        "wss://relay.example.com"
      ]
    }
  }
}
```

When `names` is present, it is the only legacy identity source. Select `names._`
when present. If `_` is absent and exactly one non-`_` entry exists, a resolver
MAY select that entry for compatibility with single-identity records.
Otherwise fail. The selected value MUST be a valid pubkey. Failure to select
an unambiguous valid entry MUST NOT fall back to `pubkey`, and resolvers MUST
NOT use JSON member order.

Use `pubkey` only when `names` is absent. Per-pubkey hints in the `relays` map
apply to the normalized selected author; the single-identity `relays` array
applies to `pubkey`.

Some experimental gateways accepted a top-level `pubkey` hex string or `npub`
as an author alias. A resolver MAY accept either alias only when `nostr` is
absent or contains neither `names` nor `pubkey`. If a recognized identity field
inside `nostr` is present but invalid or ambiguous, resolution MUST fail rather
than switching to a top-level alias. New publishers MUST NOT use top-level
author aliases.

Once a legacy author has been selected, manifest unavailability, manifest
invalidity, or content failure MUST NOT cause selection of another identity
field, an older manifest, an ordinary website, or DNS.

## Precedence and failure behavior

A direct NIP-19 pointer in the selected `nsite` field has exclusive precedence
over every legacy identity field. This permits delegation to another author's
site while retaining `nostr.names` for NIP-05 identity verification; the two
authors need not match.

If the selected `nsite` field is present, any of these conditions MUST fail
resolution and MUST NOT trigger root-site or top-level-alias fallback:

- the value is not a string, is not an accepted pointer, and is not a valid
  bare named-site identifier;
- the pointer has the wrong kind, author, identifier, or event id;
- the selected event is missing, invalid, or fails NIP-5A validation;
- selected Blossom content fails its manifest hash check.

A transient relay or Blossom failure MAY be retried against the same target.
It MUST NOT cause fallback to a legacy identity, an older event, an ordinary
website, or DNS. A valid bare identifier still requires an unambiguous legacy
author. If `nsite` is absent and no unambiguous legacy identity exists, there
is no nsite mapping under this NIP; any other handling is outside this
specification and MUST be explicit in the application.

## Manifest selection and content serving

Request paths are resolved only after target selection, using the selected
manifest's `path` tags and NIP-5A index and `404.html` rules. URL paths,
queries, and fragments MUST NOT be included in the Namecoin lookup.

A gateway MAY translate `npub`, `nprofile`, or root `naddr` to the current
root-site URL, a canonical named `naddr` to the current named-site URL, and an
exact kind `5128` selection to the snapshot URL. An exact kind `15128` or
`35128` selection has no canonical NIP-5A URL that preserves its event id. It
MUST NOT be rewritten to a current root, current named, or snapshot URL. A
gateway without an exact-event-id resolution interface MUST reject that
pointer.

An application MAY instead pass the selected target to its existing
verified-nsite sandbox. Under this NIP, event validation, path-to-hash mapping,
Blossom retrieval, and SHA-256 verification of every served blob against its
selected `path` tag are REQUIRED. This intentionally strengthens NIP-5A's
SHOULD-level blob-verification rule for Namecoin-selected nsites.

This NIP does not make `https://example.bit` an authenticated HTTPS origin and
does not authorize ordinary-web interception or automatic web fallback.

## Optional NIP-73 discovery metadata

The companion [NIP-73 proposal](https://github.com/nostr-protocol/nips/pull/2353)
defines `namecoin:name:<namespace>/<name>` and `k` value `namecoin:name`. When
using that proposed [NIP-73](73.md) convention, a manifest author MAY advertise
an alias as follows:

```json
[
  ["i", "namecoin:name:d/example"],
  ["k", "namecoin:name"]
]
```

This metadata aids discovery only. It is not proof that the Namecoin owner
controls or authorizes the manifest, and it is not required for resolution. A
client showing a verified alias MUST resolve the current Namecoin value and
compare the displayed manifest with the resulting selection:

- for `nevent` and `note`, the selected event id MUST equal the displayed id;
- for `npub`, `nprofile`, root `naddr`, or legacy resolution, the displayed
  manifest MUST be the selected current root event for the decoded or selected
  author;
- for named `naddr`, it MUST be the selected current event for the decoded
  author, kind, and exact identifier.

A self-declared `i` tag MUST NOT replace Namecoin-to-nsite resolution.

## Caching and updates

Caches MUST distinguish at least Namecoin transport failure, name not found,
expired name, malformed record, no nsite mapping, manifest unavailable, and
invalid manifest or content. Transport failures MUST NOT be cached as name
not found.

A cached Namecoin mapping MUST be revalidated when the name expires or its
value changes. Current root and named targets, including legacy-selected
roots, MUST have bounded lifetimes or be kept current through relay
subscriptions. They MUST be replaced when a newer event wins the ordering
rules. Revalidating the Namecoin value does not revalidate the Nostr manifest.
Clients MUST provide an explicit refresh path.

An event-id-selected manifest MAY be cached as immutable after validation. The
Namecoin-to-pointer mapping for it remains subject to expiry and value-change
revalidation. After a Namecoin update, clients MUST apply the same precedence
and validation rules to the new value and MUST NOT retain a previous target
because the new target is malformed or unavailable.

## Security considerations

- The Namecoin name owner chooses the pointer under the selected chain-trust
  model; Nostr signatures and Blossom hashes authenticate the selected site.
- A legacy identity and direct target need not have the same author. Their
  coexistence is not a cross-signature or ownership proof.
- Explicit precedence prevents a malformed direct field from being hidden by
  an apparently valid legacy identity or alias.
- Ambiguous multi-identity records are rejected because JSON member order is
  not a safe authorization mechanism.
- Relay and Blossom hints are untrusted discovery data. Retrieved events and
  blobs require cryptographic validation.
- Name resolution, target selection, and ordinary-web fallback are separate
  security decisions.

## Compatibility

Existing consumers that understand only `nostr` identity fields can ignore
`nsite`. Publishers can include `nsite` and a legacy identity in the same
object, subject to these precedence rules, or omit `nsite` to retain legacy
root-site selection. The bare shorthand and top-level aliases preserve
experimental behavior without becoming canonical publisher forms.

NIP-5A canonical gateway URLs and NIP-19 sharing remain interoperable without
Namecoin. Namecoin is an optional naming layer, not a requirement for hosting
or resolving nsites.
