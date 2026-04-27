NIP-C6
======

Capability-URL References
-------------------------

`draft` `optional`

A tag schema and rendering convention for Nostr events that reference *capability-encrypted artifacts* hosted off-Nostr — where the artifact's read key lives in the URL fragment, the host is read-blind, and the event author is referencing or sharing the artifact rather than embedding its body.

## Motivation

Several systems use **capability URLs** as their addressing primitive:

```
https://example.com/artifact/{id}#{read_key}
```

The fragment (`#{read_key}`) never traverses to the host (RFC 3986 §3.5: fragment is client-side); the host stores ciphertext and serves it to anyone who asks for the id, but cannot decrypt. The combination of a known id and the bearer-fragment grants read access. This is the structural analog of a sealed envelope: the host carries it, only the holder of the URL can open it.

When an author wants to share or reference such an artifact on Nostr, they currently have one option: paste the URL into a `kind:1` text note. Clients render it as a clickable link. This works, but it is **strictly less than what Nostr clients could offer**:

- The fragment leaks to anyone reading the post — there is no way for an author to *cite* the artifact without granting bearer access.
- Clients have no metadata signal: they can't render "this is encrypted," "this expires in 12 days," or "this is a different kind of object than a normal link."
- There is no convention by which an author can express "I'm referencing this thing X authored" vs "I'm handing out access to thing X."

This NIP defines a small, scheme-agnostic tag schema that lets Nostr-aware clients render capability-URL references with rich semantics, while gracefully degrading to plain text on clients that haven't implemented it. It is intentionally generic: any artifact protocol whose URLs follow the `<canonical>#<read_key>` shape can use this schema by registering an opaque scheme identifier.

## Specification

### Event kind

This NIP uses `kind:1` (text note) as its primary form. Tags are additive; `content` carries the human-readable text. Non-aware clients render the event as a normal note. Aware clients detect the `c` tag and apply enhanced rendering.

The same schema MAY be used as the inner payload of a NIP-17 gift-wrapped private message; see §"DM context" below.

### Tags

#### `c` (capability) — REQUIRED

```
["c", "<canonical-url-without-fragment>", "<scheme-id>"]
```

- `canonical-url-without-fragment`: the artifact's URL, with the fragment stripped. Indexable. Relays MAY treat this as a URL reference for query purposes; clients MAY use it to find related events.
- `scheme-id`: an opaque ASCII string identifying the artifact protocol. Clients dispatch rendering by `scheme-id`. Clients that do not recognize a `scheme-id` MUST fall back to plain text rendering of `content` (see §"Compatibility").

**The fragment (read key) MUST NOT appear in the `c` tag.** Tags are indexable; fragments are bearer secrets.

#### `expires_at` — OPTIONAL

```
["expires_at", "<unix-seconds>"]
```

A soft hint that the artifact is expected to become unreadable from the host at the given Unix timestamp. Clients MAY use this to render expiration UI ("expires in 12 days") without round-tripping the host. Authors SHOULD set this when the artifact protocol provides TTL semantics; clients MUST tolerate its absence.

#### `k` (read key) — OPTIONAL

```
["k", "<base64url-read-key>"]
```

Distinguishes two semantics on the same schema:

- **Reference** (`c` tag, `k` tag absent): the event is *citing* the artifact. Reading the event grants the recipient knowledge of the URL but not the read key. The recipient would need to obtain the URL+fragment through whatever channel originally distributed it.
- **Share** (`c` tag + `k` tag): the event is *handing out* read access. The read key rides in the event. Treat as a bearer capability.

The `k` tag SHOULD be omitted in public-feed contexts unless the author intends the event to broadcast read access.

### Content

The `content` field carries human-readable prose at the author's discretion. By convention, when the author intends to broadcast read access, the canonical URL **with fragment** SHOULD also appear in `content` so that clients which haven't implemented this NIP still render a clickable link (graceful degradation).

```
content: "ask: anyone know a staff systems engineer? https://example.com/cap/abc#KEY"
```

When the event is reference-only (`k` tag absent), `content` SHOULD use the canonical URL **without** fragment, so the author's intent (cite, do not grant access) is preserved on every client.

### Public-feed context

The primary form. A regular `kind:1` note carrying the `c`/`expires_at`/`k` tags. Renders in every Nostr feed; aware clients enhance the rendering.

```json
{
  "kind": 1,
  "content": "ask: anyone know a staff systems engineer who's shipped at scale? https://example.com/cap/abc123#KEY",
  "tags": [
    ["c", "https://example.com/cap/abc123", "example-v1"],
    ["expires_at", "1717000000"],
    ["k", "KEY"]
  ],
  "pubkey": "<author-npub-hex>",
  "created_at": 1714000000,
  "id": "<event-id>",
  "sig": "<schnorr-sig>"
}
```

### DM context (NIP-17)

The same schema is used as the inner sealed event of a NIP-17 gift-wrapped private message. The recipient's NIP-17-aware client unwraps and processes the inner `kind:1` event by the rules above; aware clients then apply capability-URL rendering inline in the DM thread.

The `k` tag MAY be present in DM context, since NIP-17 transport seals the inner event end-to-end to the recipient. The `k` tag in this case shares read access with that specific recipient and no one else; relays observe only the sealed gift-wrap.

### Reference vs. share — recommended UX

Aware clients SHOULD render the two semantics distinctly:

- **Reference** (no `k`): a "cited artifact" badge with the canonical URL and any metadata (expires, scheme-id label). Tapping the badge MAY open the canonical URL in a new tab; the user's client cannot decrypt the artifact without the fragment.
- **Share** (with `k`): a "shared access" badge with the same metadata, plus an inline-decrypt affordance. Aware clients MAY fetch the canonical URL, locate the read key from the `k` tag (or the `content` fragment as a fallback), and decrypt the artifact body for inline preview.

### Privacy considerations

- The `c` tag's URL is indexable. Adversaries who can query relays for events with specific `c` tag values can build a graph of "who has talked about this URL." Authors who want unlinkability of citation SHOULD consider whether referencing a particular URL on a public Nostr feed is consistent with their threat model.
- Read keys MUST NOT appear in any tag other than `k`. In particular, a tag like `["c", "...#KEY", "..."]` is a privacy violation: tags are indexable, fragments are bearer secrets, and combining them defeats the host-blind property of the underlying capability URL.
- In public-feed contexts, a `k` tag and/or a fragment-bearing URL in `content` is a deliberate broadcast of bearer access to the artifact. Anyone reading the post (including indexers and archives) gains read access for as long as the host serves the ciphertext. Authors who want narrower distribution should use NIP-17 DM context or omit the read key entirely (reference form).
- The artifact's host learns nothing from this NIP: capability URLs are designed so the host cannot decrypt. Aware clients fetching via the URL traverse to the host with handle but not read-key.

### Scheme-id registry

Scheme-ids identify the artifact protocol. There is no central registry; first-claim by precedent. Implementers SHOULD:

- Use a short ASCII identifier ending in `-v<N>` for protocol versioning, e.g. `myprotocol-v1`.
- Publish a brief reference document describing how URL fragments encode read keys, the cipher/AAD shape clients should expect when decrypting, and any TTL semantics relevant to rendering.
- Coordinate via Nostr discussion / `nostr-protocol/nips` issues if a name conflict arises.

This NIP does not enumerate scheme-ids; they are open-ended.

## Reference

Minimal TypeScript template builder for clients implementing this NIP. Returns an unsigned event template; the caller signs via NIP-07 or any other Nostr signer.

```typescript
type CapabilityRefEvent = {
  kind: 1;
  content: string;
  tags: string[][];
  created_at: number;
};

function capabilityReferenceEvent(args: {
  url: string;            // canonical URL without fragment
  schemeId: string;       // e.g. "myprotocol-v1"
  readKey?: string;       // base64url read key; omit for reference-only
  expiresAtSec?: number;  // unix seconds
  contentText?: string;   // optional prose preamble
  createdAtSec?: number;  // defaults to Math.floor(Date.now() / 1000)
}): CapabilityRefEvent {
  const tags: string[][] = [["c", args.url, args.schemeId]];
  if (args.expiresAtSec !== undefined) {
    tags.push(["expires_at", String(args.expiresAtSec)]);
  }
  if (args.readKey !== undefined) {
    tags.push(["k", args.readKey]);
  }
  const fragmentSuffix = args.readKey ? "#" + args.readKey : "";
  const fullUrl = args.url + fragmentSuffix;
  const content = args.contentText
    ? `${args.contentText} ${fullUrl}`
    : fullUrl;
  return {
    kind: 1,
    content,
    tags,
    created_at: args.createdAtSec ?? Math.floor(Date.now() / 1000),
  };
}
```

## Examples

### Reference (no share)

The author cites an artifact without granting read access.

```json
{
  "kind": 1,
  "content": "thread on this artifact is wild — https://example.com/cap/abc123",
  "tags": [
    ["c", "https://example.com/cap/abc123", "example-v1"],
    ["expires_at", "1717000000"]
  ]
}
```

### Share (public)

The author broadcasts read access on the public feed.

```json
{
  "kind": 1,
  "content": "the answer: https://example.com/cap/abc123#9c2d8f...",
  "tags": [
    ["c", "https://example.com/cap/abc123", "example-v1"],
    ["expires_at", "1717000000"],
    ["k", "9c2d8f..."]
  ]
}
```

### Share via NIP-17 DM

The author shares read access with a specific recipient via gift-wrapped DM. The inner event uses the same schema.

```json
{
  "kind": 1,
  "content": "for you — https://example.com/cap/abc123#9c2d8f...",
  "tags": [
    ["c", "https://example.com/cap/abc123", "example-v1"],
    ["expires_at", "1717000000"],
    ["k", "9c2d8f..."],
    ["p", "<recipient-npub-hex>"]
  ]
}
```

The above event is then signed and sealed via NIP-17 gift-wrap addressed to the recipient. Relays observe only the gift-wrap envelope.

## Compatibility

This NIP introduces no new event kinds. The `c`, `expires_at`, and `k` tags are additive on `kind:1` (and may be applied to other kinds at the implementer's discretion).

- Non-aware clients: render the event as a normal `kind:1` text note. The `content` field with its embedded URL renders as plain text or a clickable link, exactly as it does today.
- Aware clients: detect the `c` tag, dispatch by `scheme-id`, render enhanced UI. Aware clients MUST NOT hide events whose `scheme-id` they don't recognize; they MUST fall back to ordinary text-note rendering.

The schema is forward-compatible with future tag additions (e.g., authorship attestations, per-artifact thread anchors). Subsequent NIPs MAY define additional tags consumed by this rendering pathway.

## Acknowledgements

Generic capability-URL addressing is an old idea predating Nostr — it appears in IPFS gateway URLs, magnet links, and several end-to-end-encrypted messaging primitives. This NIP does not invent it; it provides a Nostr-shaped pointer convention so that clients can render references to such artifacts as first-class objects rather than plain text.
