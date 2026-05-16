NIP-XX
======

NIP-05 verification via Namecoin
--------------------------------

`draft` `optional`

This NIP specifies how a Nostr client verifies, and a publisher
publishes, a [NIP-05](05.md) identifier whose right-hand side is
anchored in the [Namecoin](https://www.namecoin.org/) blockchain
rather than in DNS + HTTPS. It is a complement to, not a replacement
for, NIP-05. A client MAY implement this NIP in addition to NIP-05 and
remain fully interoperable with publishers who use only DNS-based
NIP-05.

It builds on the existing Namecoin Domain Name Object schema defined
by [ifa-0001][ifa-0001]; no new top-level Namecoin record key is
introduced.

[ifa-0001]: https://github.com/namecoin/proposals/blob/master/ifa-0001.md

## Abstract

A `kind:0` event MAY contain `"nip05": "<identifier>"` where
`<identifier>` resolves through Namecoin instead of through DNS.
Verification proceeds by looking up the relevant Namecoin name,
reading a `nostr` item from the merged Domain Name Object, and
checking that the value at the corresponding local-part matches the
event's `pubkey`.

## Identifier grammar

The following identifier shapes MUST be recognised:

| Form | Example | Resolution |
|---|---|---|
| `<localpart>@<name>.bit` | `alice@example.bit` | `d/example`, look up `nostr.names.alice` |
| `<name>.bit` | `example.bit` | `d/example`, look up `nostr.names._` |
| `_@<name>.bit` | `_@example.bit` | Equivalent to `<name>.bit` |
| `d/<name>` | `d/example` | `d/example`, look up `nostr.names._` |
| `id/<name>` | `id/alice` | `id/alice`, look up `nostr.names._` |
| `<localpart>@<sub>.<name>.bit` | `alice@relay.example.bit` | `d/example`, walk `map.relay`, look up `nostr.names.alice` |
| `<sub>.<name>.bit` | `relay.example.bit` | `d/example`, walk `map.relay`, look up `nostr.names._` |

Multi-label subdomains are resolved through the ifa-0001 `map` item
(see §"Subdomains"). The walked node provides the `nostr` item;
ancestors do **not** contribute. Multi-label hosts are always
resolved via the parent registered name; implementations MUST NOT
synthesise `d/<sub>.<name>` and query it as a fallback.

The `<name>` part MUST match the ifa-0001 regex
`^(xn--)?[a-z0-9]+(-[a-z0-9]+)*$` and SHALL be matched
case-insensitively (i.e. `EXAMPLE.BIT` resolves to `d/example`). The
`<localpart>` is matched against `nostr.names` keys case-sensitively
to mirror NIP-05.

The bare `@<name>.bit` form (e.g. `@example.bit`) MAY be additionally
recognised by clients that render Namecoin identifiers in note
content, and SHOULD resolve identically to `_@<name>.bit`.

## Namecoin record container

The Namecoin Domain Name Object MAY contain an item with key `nostr`.
Its value SHALL be a JSON object holding mappings from local-part to
hex pubkey and, optionally, per-pubkey relay hints:

```jsonc
{
  "nostr": {
    "names":  { "_": "<hex>", "alice": "<hex>", "bob": "<hex>" },
    "relays": { "<hex>": [ "wss://r1/", "wss://r2/" ] }
  }
}
```

Implementations MUST ignore unknown keys inside the `nostr` object so
that this NIP can be extended in the future. An object with no
recognised keys is equivalent to the absence of the item.

`nostr` is a previously-unallocated key in the ifa-0001 schema.
Existing ifa-0001 consumers ignore unknown keys per
[ifa-0001 §"Item Suppression Rules"](https://github.com/namecoin/proposals/blob/master/ifa-0001.md#item-suppression-rules),
so adding a `nostr` item to a record does not affect DNS, TLS, or Tor
clients of the same name.

### Encoding constraints

- Hex pubkeys MUST be lowercase 64-character hex strings (32 bytes).
  Implementations MUST reject any other shape (e.g. `npub1...`,
  uppercase hex, prefixed `0x...`).
- Relay URLs MUST be valid `ws://` or `wss://` URLs as parsed by
  [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986). Implementations
  MUST drop entries that fail parsing or use other schemes.

### Reserved local-parts

The local-part `_` is RESERVED for the root identity associated with
the name itself, matching NIP-05's `_` convention. Implementations MUST
treat `_@<name>.bit` as a request for `nostr.names._`.

The local-part `*` is RESERVED for future wildcard semantics and MUST
NOT be used by publishers. Implementations MUST NOT silently substitute
`*` for a missing local-part lookup.

## Subdomains

Multi-label hosts (`alice.example.bit`, `relay.example.bit`,
`a.b.example.bit`) are realised through ifa-0001's
[`map`](https://github.com/namecoin/proposals/blob/master/ifa-0001.md#map)
item — they are **not** registered as separate Namecoin names. The
`d/` namespace is single-label.

Walking a subdomain to read `nostr`:

1. Split the host on dots, drop the trailing `.bit`, and reverse so
   labels are processed in DNS order (rightmost-most-significant
   first).
2. From the parent record's root, descend `value.map.<label>` for each
   remaining label.
3. At each step, prefer an exact label match. Fall back to
   `value.map["*"]` (wildcard). Honour the `""` empty-key default per
   ifa-0001.
4. Stop at the deepest matching node and read `nostr` **only from
   that node**.

Implementations MUST NOT inherit `nostr` from ancestor nodes when
walking. A subdomain only gets what its walked node declares (or what
comes through the wildcard / empty-key rules). Otherwise a parent
name's owner could silently authorise a Nostr identity on a subdomain
they did not control.

## `import`

The Namecoin `import` item from
[ifa-0001 §"import"](https://github.com/namecoin/proposals/blob/master/ifa-0001.md#import)
is fully supported and is the canonical way to split large records
across the 520-byte per-name limit. Implementations:

- MUST resolve `import` before reading `nostr`.
- MUST honour importer-precedence: the importing object's items win
  over the imported items, including `null` (which suppresses the
  imported value).
- MUST resolve at least 4 levels of recursion (the spec minimum).
  Deeper chains MAY be silently truncated.
- MUST break cycles via a per-chain visited set.
- SHOULD treat a failed `import` lookup (network error, missing name,
  malformed JSON) as `{}` rather than failing the importing record. A
  failed import MUST NOT cause the importing record's own fields to be
  ignored.
- MUST accept all four canonical shapes (string, single-element array,
  pair-array with subdomain selector, full array-of-arrays) per
  ifa-0001 §"import".

## Wire format

After resolving `import` and walking `map`, the merged Domain Name
Object is read for `nostr.names`. `names` SHALL be a JSON object whose
keys are local-parts and whose values are 32-byte hex pubkeys per
§"Encoding constraints".

Verification succeeds iff:

1. The name exists, is not expired (see §"Expiry"), and parses as
   valid ifa-0001 JSON.
2. After import-merge and subdomain walk,
   `nostr.names[<localpart>]` exists.
3. Its value, lowercased, equals the event's `pubkey` field.

If any of those conditions fail, the implementation MUST treat the
NIP-05 as unverified. It MUST NOT silently fall back to a DNS lookup
of `<name>.bit` — `.bit` is not a valid public TLD in DNS and any
match found via DNS is necessarily out-of-band.

### Root local-part fallback

For root lookups (no local-part, or local-part `_`), if `nostr.names._`
is absent but `names` is non-empty, an implementation MAY return the
first available entry in `names` to accommodate publishers who only
populate per-user identities. This MUST NOT apply to non-root lookups:
`alice@example.bit` MUST NOT match `nostr.names.bob`.

### Per-pubkey relays (optional)

`nostr.relays` MAY be present and is structurally identical to NIP-05's
`relays` map. When present, the listed relays are treated as
outbox-style hints for the corresponding pubkey. The
[NIP-65](65.md) (`kind:10002`) relay list still takes precedence when
both are available.

## Lookup transport

This NIP does not mandate a specific transport for retrieving the
Namecoin record. Implementations MAY use any of:

- [ElectrumX-NMC][electrumx-nmc] over **TCP+TLS** (the standard Electrum
  protocol port, typically `:50002`).
- [ElectrumX-NMC][electrumx-nmc] over **WebSocket** (`ws://` or
  `wss://`, typically `:50003` plaintext and `:50004` TLS). This is
  the only viable transport for browser-resident clients, which
  cannot open raw TCP sockets. See §"Browser / WebSocket transport".
- A local Namecoin Core RPC (`name_show d/<name>`).
- A trusted forward proxy that exposes one of the above.

The transport MUST NOT compromise on authenticity: the resolver MUST
either pin or fully validate the upstream certificate chain, or use
SPV/header verification, or run against a local node. A plaintext HTTP
proxy that allows tampering MUST NOT be used.

The transport itself is interchangeable — the same JSON-RPC method set
(`server.version`, `blockchain.scripthash.get_history`,
`blockchain.transaction.get`, `blockchain.headers.subscribe`) works
over all of them, and a single resolver implementation MAY pick its
transport per environment without changing its caller-facing API.

[electrumx-nmc]: https://github.com/namecoin/electrumx

### ElectrumX server set

When ElectrumX is used, the resolver SHOULD:

1. Negotiate `server.version` first.
2. Construct the canonical name index script for `d/<name>` or
   `id/<name>`, take its SHA-256 (reversed, hex), and call
   `blockchain.scripthash.get_history`.
3. Fetch the latest transaction via `blockchain.transaction.get`,
   parse the `NAME_UPDATE` script, and extract the value.
4. Call `blockchain.headers.subscribe` once per session for the
   current block height, used by §"Expiry".

The set of ElectrumX servers SHOULD be **caller-configurable**. This
NIP does **not** mandate a default server list. Implementations that
ship defaults SHOULD:

- Treat user-configured custom server lists as authoritative, i.e. use
  them exclusively when configured, so privacy-conscious users can
  pick their own observers.
- Expose the server list as a runtime parameter (a function returning
  a list, evaluated per request) rather than a hard-coded constant,
  so toggling Tor or switching ElectrumX servers takes effect
  immediately.
- Prefer a `.onion` ElectrumX server when the user has Tor enabled for
  NIP-05 lookups.

Library authors integrating this NIP into a generic Nostr SDK SHOULD
accept the server list (and ideally the transport itself, e.g. a
WebSocket factory) from the caller, so the same library works in a
browser, on a desktop with a local node, on a mobile app with a
pinned-cert TCP path, and behind a corporate proxy.

### Failover and local-primary deployments

Resolvers SHOULD support an **ordered list** of ElectrumX servers and
degrade gracefully when an entry is unreachable. The recommended
pattern is a circuit breaker:

1. Try hosts in list order, picking the first that is currently
   marked healthy (or, if all are open, force-probe the next in line).
2. On success, mark the host healthy and reset its failure counter.
3. On a connect/handshake error or timeout, increment the host's
   failure counter; once a small threshold (e.g. 3 failures inside a
   60 s window) is reached, mark the host *open* (failing fast) for a
   cooldown (e.g. 30 s) before allowing another probe.
4. *Definitive* errors from the resolver path (name expired, name
   missing, malformed value) MUST propagate immediately and MUST NOT
   record a host failure — they are facts about the chain, not about
   the host.

Server-side and gated-relay deployments SHOULD run a **local**
ElectrumX-NMC alongside their relay or service and list it *first* in
the resolver's server list, with one or more public servers as
fallback only. A single public ElectrumX would otherwise be a single
point of failure exactly like DNS + Web PKI was; the whole point of
this NIP is to remove that single point of failure for clients,
operators should not reintroduce it server-side. Local lookups also
never leak per-event author metadata to a third party and remove the
per-lookup network latency that otherwise dominates write-policy
decision time on busy relays.

Client deployments (mobile, desktop, browser) MAY still use public
servers as their only source: the privacy and availability trade-offs
there are a user-controlled setting.

### Browser / WebSocket transport

Browser clients resolve `.bit` identifiers entirely client-side
without any backend proxy. The transport differences from the TCP+TLS
path are minor and standardised below.

Server URL form:

- `wss://<host>[:<port>][/path]` for TLS WebSocket. Port `:50004` is
  the de facto standard for ElectrumX-NMC's WebSocket-TLS endpoint.
- `ws://<host>[:<port>][/path]` for plaintext. Port `:50003` is the de
  facto standard. Plaintext WebSocket MUST NOT be used over an
  untrusted network — its only legitimate uses are local development
  and explicit `localhost` setups.

Mixed-content rules:

- A page served from `https://` MUST default to `wss://` ElectrumX
  endpoints. Browsers will block `ws://` from a secure origin.
- A page served from `http://` MAY use `ws://` endpoints; it remains
  the implementation's responsibility to satisfy the
  §"Lookup transport" authenticity rule, typically by pinning the
  TLS endpoint anyway.
- Implementations that auto-select a server SHOULD pick the
  scheme-matching subset of their configured server list based on the
  current page scheme, rather than failing closed.

Framing and methods:

- Each WebSocket message frame carries exactly one JSON-RPC request or
  response object, terminated by a single `\n`. This is the same
  newline-delimited framing used by ElectrumX over TCP — the
  WebSocket transport does not change the wire JSON.
- The same four method calls listed above apply unchanged.

Cryptographic primitives:

- Browser implementations SHOULD use
  [Web Crypto](https://www.w3.org/TR/WebCryptoAPI/) `subtle.digest`
  for SHA-256 (scripthash derivation) rather than bundling a JS hash.
  It returns an `ArrayBuffer`; the Electrum scripthash is the
  **reversed** byte order of the digest, rendered as lowercase hex.

Server authenticity in the browser:

- Browsers cannot expose the validated certificate to JavaScript, so
  a browser-resident resolver cannot pin a SHA-256 fingerprint the
  way a TCP+TLS resolver can. The browser MUST instead rely on the
  user agent's TLS validation. This in turn means a browser
  implementation SHOULD only auto-select WebSocket-TLS servers whose
  certificate chains validate against the public CA trust store.
  Self-signed `.bit` ElectrumX servers remain reachable from native
  clients per the TCP+TLS path.

### Per-server concurrency

Implementations that talk to more than one ElectrumX server in parallel
MUST NOT serialize all lookups behind a single mutex; a slow or stuck
server would otherwise block requests to healthy ones. A per-server
mutex (or a connection pool keyed by server) is RECOMMENDED.

## Expiry

Namecoin names expire 36,000 blocks (~250 days) after their last
`NAME_UPDATE` transaction. An implementation MUST treat an expired
name as if it did not exist. Specifically:

1. Compute `currentHeight` from `blockchain.headers.subscribe` (or
   the equivalent on the chosen transport).
2. Compute `nameHeight` from the latest `NAME_UPDATE` transaction's
   confirmation height. Unconfirmed transactions (height ≤ 0) are
   treated as active.
3. If `currentHeight - nameHeight ≥ 36000`, treat the lookup as a
   failure (`null` / `NotFound`).
4. Otherwise, populate an `expiresIn` field (block count remaining)
   for downstream UI use.

Implementations SHOULD surface "expired" as a distinct UI state so
that users can prompt the publisher to renew, rather than silently
treating the identity as never-published.

## Caching

Implementations SHOULD cache positive lookup results with a TTL on
the order of an hour, and negative results with a shorter TTL (e.g.
5 minutes) to bound poisoning windows.

A cache entry MUST be invalidated when:

- The cached name is observed to be expired.
- The user explicitly refreshes a profile.
- The user changes the configured ElectrumX server set.

## Race-condition guidance

NIP-05 lookups are typically driven by user typing. The result for an
in-progress query (`d/test`) MUST NOT overwrite the result of a later
query (`d/testls`) just because it returned faster. Implementations
SHOULD use a "latest wins" combinator (Kotlin `mapLatest`, RxJS
`switchMap`, etc.) and explicitly re-throw / propagate cancellation
exceptions before any generic `catch`.

## Tor

When the user's Tor preference for NIP-05 verification is enabled,
the resolver SHOULD:

- Route ElectrumX TCP via the configured SOCKS5 proxy.
- Prefer `.onion` ElectrumX servers when available.
- Fall back to clearnet servers via Tor (rather than direct) so the
  resolver still works when no `.onion` server is reachable.

This MUST NOT exempt the resolver from the §"Lookup transport"
authenticity rule. Self-signed `.onion` ElectrumX servers MUST still
have their TLS certificate fingerprint pinned.

## Publishing

A publisher with a Namecoin name and a Nostr keypair publishes a
`kind:0` event whose `nip05` field uses any of the identifier shapes
above. The publisher's `kind:10002` (NIP-65) relay list SHOULD be
published in advance of, or together with, the `kind:0` so that
clients verifying the NIP-05 can also discover the publisher's relays.

If the publisher uses a relay that itself enforces this NIP on every
event, the publishing order MUST be:

1. `kind:0` with the `.bit` `nip05` value.
2. `kind:10002` (NIP-65 relay list).
3. The actual content events.

This ensures the gating relay accepts the content event when it
subsequently re-verifies the author.

## Security considerations

- A Namecoin name's owner controls the value, but not what consumers
  cache. To bound poisoning windows, implementations SHOULD use TTLs
  on the order of an hour and SHOULD invalidate cache entries when
  their owning name expires.
- A subdomain trap (`d/<sub>.<parent>` directly registered by a
  squatter) MUST NOT be queried as a fallback when walking `map`.
  Implementations MUST always go through the registered parent name,
  never through a synthesised single-label form.
- An ElectrumX server can lie about a non-existent name (denial of
  service) or about a stale value (replay across blocks). Pinning
  multiple servers and using one with SPV verification is
  RECOMMENDED.
- Local-part `_` falling back to "first available entry"
  (§"Root local-part fallback") is a usability concession.
  Implementations MAY make it configurable; security-critical
  deployments SHOULD disable it and require an explicit `_` entry.
- A NIP-05 identifier published in a Nostr event is signed by the
  Nostr key. The Nostr key is therefore the security anchor; a
  Namecoin record that points to a different pubkey is a verification
  failure, not a hijack of the Nostr identity.
- Records using `import` can pull fields from any name in the chain.
  Implementations SHOULD apply the same caching and TTL policy to the
  imported names as to the importing one.

## Backwards compatibility

This NIP is strictly additive to NIP-05:

- A client that does not implement this NIP sees a `.bit` `nip05`
  value as an unverifiable NIP-05 (since `.bit` is not a valid public
  DNS TLD, the well-known fetch will fail). No event signature
  verification or display is affected.
- A publisher who does not use this NIP is unaffected; the `nostr`
  item is a new optional key in the ifa-0001 schema.
- The two paths can coexist on the same identity. A publisher MAY
  publish both an `alice@example.com` (DNS) and an `alice@example.bit`
  (Namecoin) identity that resolve to the same pubkey, and a client
  that implements both NIPs MAY accept either.

## Reference implementations

The following implementations have shipped this NIP against a live
Namecoin chain, with cross-implementation byte-for-byte agreement on
the same on-chain records:

- **Amethyst** (Android / KMP iOS / Desktop, Kotlin):
  [#1734](https://github.com/vitorpamplona/amethyst/pull/1734) (initial),
  [#1771](https://github.com/vitorpamplona/amethyst/pull/1771)
  (race-condition fixes),
  [#1786](https://github.com/vitorpamplona/amethyst/pull/1786) (custom
  servers),
  [#1937](https://github.com/vitorpamplona/amethyst/pull/1937)
  (ElectrumX TLS pinning).
- **Nostur** (iOS, Swift):
  [#60](https://github.com/nostur-com/nostur-ios-public/pull/60).
- **nostr-tools** (TypeScript / Node, isomorphic):
  [#533](https://github.com/nbd-wtf/nostr-tools/pull/533).
- **dart-nostr** (Flutter / Dart):
  [#44](https://github.com/ethicnology/dart-nostr/pull/44).
- **Jumble** (web client, browser-resident `wss://` ElectrumX):
  [#774](https://github.com/CodyTseng/jumble/pull/774).
- **noStrudel** (web client):
  [#352](https://github.com/hzrd149/nostrudel/pull/352).
- **strfry NIP-05 sidecar** (relay-side, Rust + Node):
  https://github.com/mstrofnone/strfry-nip05-namecoin.
- **nostrlib** (Go): drop-in shape at
  https://github.com/mstrofnone/nostrlib-nip05-namecoin, per
  [`nak#123`](https://github.com/fiatjaf/nak/pull/123) discussion.

A live reference deployment is at `testls.bit` / `relay.testls.bit`
and is exercised by the test suites of every implementation above.

## Out of scope for this NIP

- **Relay discovery via Namecoin** (subdomain walking through `map`,
  Tor routing through ifa-0002 `tor`). Tracked separately and
  intended as a follow-up NIP; the `nostr.relays` field defined in
  §"Per-pubkey relays" is the only relay-related field specified
  here.
- **TLSA pinning of `.bit` relay WebSockets**. Belongs with relay
  discovery; tracked separately.
- **Service attestations** (binding higher-kind events to a Namecoin
  name at a specific block height). Builds on this NIP but does not
  affect it.

See https://github.com/nostr-protocol/nips/issues/2330 for the
broader track and links to the companion drafts.
