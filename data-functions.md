NIP-XX
======

Data Functions
---------------

`draft` `optional`

## Abstract

A **data function** is an addressable, reusable computation over Nostr events: code ([NIP-C0](C0.md) `kind:1337`) plus a fixed configuration (source relays, params, ttl). A [NIP-90](90.md) Data Vending Machine runs it on demand and publishes a **content-addressed cached result**, so clients read a cheap precomputed event instead of crawling and aggregating raw events themselves (e.g. comment/like counts, rolling averages).

## Motivation

Today every client or relay that needs derived data builds its own heavy, private cache. Data functions move caching into the network: anyone *defines* a computation once, *any* user's client can *trigger* it, and the cached result lands back on relays where it compounds for everyone — computed only when actually requested. Because a definition references reusable code, you can build a data function from someone else's snippet (and others from yours), forming an open market of composable, serverless-style functions. In effect, a decentralised CDN for derived Nostr data.

## Kinds

| kind | name | publisher | role |
|------|------|-----------|------|
| `1337` | code (NIP-C0) | author | the reusable logic; `async function main(inputs, nostr)` |
| `31337` | data function definition | author/user | addressable; references a `1337` + bundles config |
| `5910` | job request (NIP-90) | client | thin pointer at a `31337` (+ optional overrides) |
| `7000` | job feedback (NIP-90) | DVM | `processing` / `success` / `error` |
| `6910` | job result (NIP-90) | DVM | points at the cached result |
| `31338` | cached result | DVM | addressable; the payload, keyed by inputs |

## Data Function Definition (`kind:31337`)

Addressable. `.content` is empty.

- `d` - identifier (required)
- `code` - reference to the `kind:1337` code, as `"1337:<pubkey>:<d>"` (required)
- `relays` - source relays the code reads from (repeatable values)
- `output` - relay the cached result is published to
- `param` - default input, `["param", <key>, <value>]` (repeatable)
- `i` - subject the computation is about, `["i", <value>, <type>]`
- `ttl` - seconds a cached result stays fresh
- `runtime_ms`, `memory_mb` - per-function execution limits (clamped to DVM ceilings)

## Request (`kind:5910`)

`a` tag points at a `31337` definition: `["a", "31337:<pubkey>:<d>", <relay>]`. The same tags as the definition (`i`, `param`, `relays`, `ttl`) MAY be included to override per request. `["cache", "no"]` forces recompute; `["cache", "clear"]` deletes the cached result.

## Cached Result (`kind:31338`)

Addressable. `.content` is the JSON-serialized output.

- `d` - `sha256(canonical_json({ script, subject, params, relays }))` — the content address
- `expiration` - [NIP-40](40.md), `created_at + ttl`
- `i` - subject, if any

`script` is the definition address; identical inputs yield the same `d`, so a recompute replaces the prior result and many clients share one cache entry.

## Flow

1. Client computes the `d` cache key and reads `kind:31338`. Fresh (`now - created_at <= ttl`) → done.
2. On miss, publish a `5910`. The DVM resolves the `31337` → fetches the `1337` → runs `main` in a sandbox with a mediated `nostr.query(filters, relays?)` → publishes the `31338` cache and a `6910` result.

## Execution

Code MUST be run in an isolated sandbox with no ambient I/O; the only capability is `nostr.query`. Implementations enforce runtime, memory, output-size and event-count limits. Since a DVM executes arbitrary third-party code at its own cost, operators MAY restrict which authors' code they run and which pubkeys may trigger jobs — this is operator policy, not part of the protocol.

## Reference Implementation

[RelayKit](https://github.com/samthomson/relaykit) ships a `dvm-compute` worker that runs data functions in a [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten) sandbox.
