NIP-CA
======

Cairns: links and short texts findable by event id prefix
---------------------------------------------------------

`draft` `optional`

This NIP defines `kind:1738`, a **cairn**: a regular event whose only job is to carry one URL or a
short text, so that it can be found again from the first few bytes of the event's id. A cairn is the
nostr equivalent of a stack of stones on a trail: anyone can build one anywhere, and it points
the way to somewhere else.

The kind number is a mnemonic for [RFC 1738](https://www.rfc-editor.org/rfc/rfc1738), *Uniform
Resource Locators (URL)*.

## Motivation

A nostr event id is 32 bytes. Its first 6 to 8 bytes are already almost certainly unique among
all the events on a relay, and a few bytes are short enough to carry by other means than a
link: drawn as [GlyphByte](https://glyphbyte.dev) glyphs on paper, chalk or a wall, read aloud,
or typed by hand. A cairn turns any URL, or a short text, into such an event, so it can travel as a
handful of bytes: publish a cairn, take the leading bytes of its id, and anyone holding those bytes
can ask a relay for the event and follow the URL or read the text.

Cairns get their own kind so that they never appear in anyone's feed (unlike `kind:1` notes),
carry no social meaning (unlike `kind:17` reactions to a website, [NIP-25](25.md)), and never change
once published (unlike `kind:39701` web bookmarks, [NIP-B0](B0.md), whose id changes with every
edit and would break every copy of its prefix).

## Event format

A cairn is either a **link cairn**, which carries one URL in an `r` tag, or a **text cairn**, which
has no `r` tag and carries its text in the content.

```jsonc
{
  "kind": 1738,
  "content": "https://example.com/menu?table=4 lunch menu for table 4",
  "tags": [
    ["r", "https://example.com/menu?table=4"],      // required: the URL, exactly one
    ["alt", "Cairn: https://example.com/menu?table=4"] // recommended
  ],
  // ...other fields
}
```

```jsonc
{
  "kind": 1738,
  "content": "Table 4 is reserved for the Okafor party at 7.",
  "tags": [
    ["alt", "Cairn: Table 4 is reserved for the Okafor party at 7."] // recommended
  ],
  // ...other fields
}
```

### `r` tag (link cairns)

At most one `r` tag ([NIP-24](24.md): a reference to a web URL). Its value is **the URL** of the
cairn, an absolute URI, stored exactly as the publisher gave it: no normalization, so that query
strings, fragments and letter case survive unchanged. The `r` tag is the only part of a cairn that
a reader opens or displays as the destination.

A cairn with more than one `r` tag is invalid. A cairn with none is a text cairn.

### `content`

In a link cairn: free text for people, usually the URL followed by a short comment. The content MAY
omit the URL entirely, and MAY be empty. If the content contains URLs, at least one of them MUST
equal the `r` URL exactly.

In a text cairn: the text itself, which is what the cairn carries. It MUST contain at least one
character that is not whitespace, and MUST NOT contain any URL. A text that contains a link is
published as a link cairn instead. Publishers SHOULD keep text cairns short (a few hundred
characters): they are meant to be read on a phone in front of the place they were drawn, and relays
may refuse large events.

For these rules the content is split into tokens at ASCII whitespace only (space, tab, line feed, form feed and
carriage return; no other Unicode space separates tokens), and a URL in the content is any token
that begins with `http://` or `https://`, or with the scheme of the `r` URL followed by `:`.
Publishers SHOULD put a space or a line break on both sides of a URL in the content, so that
sentence punctuation and brackets are never mistaken for part of it; readers compare whole tokens
and do not strip punctuation.

Putting the URL first in the content makes the cairn useful in clients that know nothing about
this kind: many show the content of an unknown event, and the URL in it stays clickable.

### `alt` tag (recommended)

A human-readable description for clients that do not know this kind. In a link cairn it has the
exact form `Cairn: <URL>`, where `<URL>` equals the `r` URL exactly. In a text cairn it is `Cairn: `
followed by the start of the text (publishers SHOULD keep it to one line of at most 80 characters),
and it MUST NOT contain a URL. A cairn whose `alt` tag is present but breaks these rules is invalid.

### Other tags (optional)

- `["title", "<title>"]`: a short title for the destination, as in [NIP-B0](B0.md). For display only.
- `["expiration", "<unix seconds>"]`: [NIP-40](40.md), for cairns meant to disappear.

### Immutability

To point somewhere else, publish a new cairn. A cairn can be withdrawn with a [NIP-09](09.md)
deletion request.

## Publishing

Any key may publish a cairn, including a fresh key made for that one cairn: a browser extension or
a button on an ordinary website can create one for a visitor without any nostr account. Before
publishing a link cairn, a client MAY query `{"kinds": [1738], "#r": ["<URL>"]}` and reuse an
existing cairn for the same URL instead of creating another.

The prefix of the event id is what people carry. Clients SHOULD present at least the first
**6 bytes** (12 hex characters) of the id, and MAY present more.

Cairns SHOULD be published to relays that answer prefix queries (below).

## Looking up a cairn by prefix

```json
["REQ", "cairn", {"ids": ["50e4e5e0ec93"], "kinds": [1738]}]
```

Prefix matching in `ids` was part of the first version of [NIP-01](01.md) and was removed from its
text in 2023; NIP-01 now requires full 64-character ids. Some relay software still answers
prefixes (for example [grain](https://github.com/0ceanslim/grain), which accepts prefixes of any
length), others reject them (`CLOSED`) or return nothing. Clients SHOULD test a relay before relying
on it, for example by fetching one event and asking for it again by an 8-character prefix.

A cairn shared by its full id (a [NIP-19](19.md) `nevent`) works on every relay; the prefix lookup
is what needs a prefix-capable relay.

## Reader behavior

A reader resolving a prefix:

1. MUST NOT resolve a cairn from fewer than 6 bytes (12 hex characters).
2. MUST discard results that are not valid cairns (the rules above) and results whose id does not
   start with the prefix.
3. MUST show every valid match, never pick one silently, and MUST NOT open a URL without the
   person's action.
4. MUST display the destination of a link cairn from the `r` tag, with its host shown prominently,
   and never a destination taken from the content. A text cairn has no destination: readers show
   its text as plain text.
5. MUST refuse to open `javascript:`, `data:`, `vbscript:` and `file:` URLs, and SHOULD show any
   scheme other than `https:` explicitly.
6. MAY mark a cairn as **published by its domain** when the cairn's pubkey is the root identity of
   the URL's host under [NIP-05](05.md): `https://<host>/.well-known/nostr.json?name=_` lists the
   pubkey under the name `_`. A website that publishes cairns with its own key gets this mark; a
   cairn from a fresh key is simply unmarked.

## Security considerations

**Prefix collisions by design.** An attacker can generate events until one's id starts with a
chosen prefix, then publish a cairn to a different URL under the same prefix. Each extra byte
multiplies the work by 256. At about 2 × 10^10 SHA-256 hashes per second on one current GPU, a
forged match takes on the order of: 4 bytes, under a second; 6 bytes, hours; 8 bytes, decades.
This is why readers show every match with its host and never open one automatically (rules 3 and
4), and why publishers of high-value links SHOULD present 8 bytes and SHOULD sign with a key their
domain vouches for (rule 6). Cairns from fresh keys carry no reputation: the prefix length and the
displayed host are their only protection.

**Accidental collisions.** With N cairns on a relay, the chance that another one shares a given
6-byte prefix is about N / 2^48: for N = 10^8, about 4 × 10^-7.

**Decoy URLs in the content.** The content may contain URLs other than the `r` URL. Generic
clients may display them as links; cairn readers never treat them as the destination (rule 4).

**Relay acceptance.** Relays may refuse events of kinds they do not know, or from keys without
history. A cairn is only findable where it is stored: publishers SHOULD confirm the relay's `OK`.

## Example

A cairn signed with a fresh key (never published):

```json
{
  "kind": 1738,
  "id": "50e4e5e0ec933d2b12b0e0cbe49b062ce38870d73d901830b528d748b8e5467a",
  "pubkey": "a97754301f691c73ac24eb50a932f006b1fba4f33fff10b59ddb44455b7473b2",
  "created_at": 1790000000,
  "tags": [
    ["r", "https://example.com/menu?table=4"],
    ["alt", "Cairn: https://example.com/menu?table=4"]
  ],
  "content": "https://example.com/menu?table=4 lunch menu for table 4",
  "sig": "d66bc5bb94906f734e154879a0fd4775833679afdc868a2264a61b8964153413daa1743f1a4c5850ff6de5e0de8eac354fef5b3d923057f8d1fbc75ce7a4ca04"
}
```

Its first 6 bytes, `50e4e5e0ec93`, drawn as GlyphByte glyphs: arrow, no dots; star, dot top-right;
star, dots top-right and bottom-left; star, no dots; star, dots top-left and top-right; tree, dots
bottom-right and bottom-left. A reader that sees the drawing sends the `REQ` above and shows a link
to `https://example.com/menu?table=4`.
