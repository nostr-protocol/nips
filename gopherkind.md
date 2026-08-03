NIP-XX
======

Gopherkind documents
--------------------

`draft` `optional`

Kind `31436`, numbered after RFC 1436, defines one text document at one
absolute path. A collection of these addressable events under one pubkey can
be presented as a gopherhole, but this NIP defines the events rather than any
particular bridge or frontend.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as defined in
RFC 2119.

## Event format

```json
{
  "kind": 31436,
  "tags": [
    ["d", "/phlog/2026-08-02.txt"],
    ["type", "0"],
    ["title", "First post"]
  ],
  "content": "..."
}
```

A valid event has:

- exactly one `d` tag, whose second element is a valid path;
- exactly one `type` tag, whose second element is `0` or `1`;
- zero or one `title` tag. Its second element MUST consist of well-formed
  Unicode scalar values and MUST NOT contain a control character. A missing
  title means the path is used as the display name.

Further elements in those tags and unrecognised tags are ignored. An event
that does not meet these requirements is not a gopherkind document and MUST
NOT be served or listed. In particular, a missing `d` MUST NOT be interpreted
as the root document.

For type `0`, `content` is plain UTF-8 text. For type `1`, `content` is a
kindmap as defined below. Publishers SHOULD keep each event within the size
accepted by their relays.

## Paths

A valid path is `/`, or one or more segments each preceded by `/`. Each
segment:

- is non-empty;
- is not `.` or `..`;
- contains no `/`;
- consists of well-formed Unicode scalar values (no unpaired surrogate);
- contains no Unicode control character in U+0000-U+001F or
  U+007F-U+009F.

Only the root path ends in `/`. Paths are compared as their exact UTF-8 byte
sequences. Consumers MUST NOT case-fold, Unicode-normalise, percent-decode or
otherwise rewrite the `d` value before comparison. Publishers SHOULD produce
NFC paths, but consumers do not enforce that recommendation. There is no
lower-case recommendation because paths are case-sensitive.

The `d` tag stores the raw path, not a URL-encoded form. Consequently `/a b`
and `/a%20b` are different documents. A URL frontend encodes each path
segment once, so their URL paths are `/a%20b` and `/a%2520b` respectively,
and decodes each received segment once.

An RFC 1436 selector is commonly limited to 255 bytes. When the selector also
contains an `npub`, publishers SHOULD keep the path at or below 190 UTF-8
bytes so it remains usable through a gopher bridge.

## Replacement, expiry and deletion

Kind `31436` is addressable. For a given `(pubkey, d)`, consumers first select
from all kind `31436` events they received for that NIP-01 coordinate the event
with the greatest `created_at`; on a tie the event with the lowest id wins.
Only then is the winning event validated as a gopherkind document. If it is
invalid, the path is absent. A consumer MUST NOT reveal an older valid revision
after a malformed winner, because a relay may already have discarded that
older event under NIP-01.

Expiry is likewise applied only after that winner has been selected and
validated. If the winning event has a NIP-40 `expiration` at or before the
current time, the path is absent. A consumer MUST NOT fall back to an older
revision: relays may already have discarded it, and fallback would make the
result depend on the relays queried.

NIP-40 permits a relay to delete an expired winner. If that relay retained an
older revision, a later consumer cannot infer that an unseen replacement once
existed. Expiration therefore does not provide durable tombstone semantics for
an addressable coordinate. Publishers that require a path to remain absent
must arrange deletion of the coordinate's earlier revisions rather than rely
on a single expiring replacement, and must retain the usual caveat that NIP-09
deletion requests can be ignored by relays.

A NIP-09 deletion request for a document SHOULD include:

- an `a` tag containing `31436:<pubkey>:<path>`;
- a `k` tag containing `31436`;
- an `e` tag for a known current event MAY also be included.

Deletion remains a request to relays and is not guaranteed.

## Kindmap

Type `1` content is a **kindmap**, a host-independent menu source. Records are
separated by LF; a CR immediately before an LF is removed. One final empty
record caused by a terminating LF is discarded, while deliberate blank
records are retained. Empty content contains no records.

A record without a tab is information text. A leading literal `i` is removed
from such a record; it is otherwise displayed in full.

A record containing a tab has this form:

```text
<item-type><display><TAB><link>
```

The first tab separates the heading from the link. The first character of the
heading is the item type and the rest is the display text. The link ends at
the next tab, if present; further fields are ignored so a pasted RFC 1436
gophermap has deterministic behaviour.

The item type MUST be one printable ASCII character from `!` through `~`.
Unknown printable item types are retained. A type `i` record or a record with
an empty link is information text and its link is ignored.

Display text and links MUST NOT contain control characters. A syntactically
invalid record MUST be rendered as information text using only its heading,
with control characters replaced by spaces; it MUST NOT produce a link.
Consumers MUST likewise neutralise tabs and CR/LF in every field emitted to a
line-oriented frontend.

The defined link forms are:

| Link form | Meaning |
|---|---|
| `/path` | A valid path in the same author's document set |
| `naddr1...` for kind `31436` | A document in another author's set |
| `npub1...` or `nprofile1...` | Another author's root document |
| `gopher://host[:port]/T/selector` | An RFC 1436 resource |
| `http://...`, `https://...` or `gemini://...` | An external URL |

Nostr entity links MAY have a `nostr:` prefix. NIP-19 relay hints SHOULD be
used when resolving an `nprofile` or `naddr`. A same-author path or decoded
kind `31436` identifier that is not a valid path is an invalid link.

Only the forms above produce links. In particular, a consumer MUST NOT turn
an unrecognised scheme such as `javascript:` or `data:` into a clickable or
otherwise actionable target. Authors SHOULD use the target's conventional
gopher item type: `0` for text, `1` for a menu, and `h` for an external URL.
A gopher renderer emits an external URL as an `h` item with a `URL:` selector.

## Security considerations

Paths, titles, kindmaps and linked relay hints are attacker-controlled.
Consumers must apply the validation above before producing gophermap or
gemtext lines. Networked readers should bound relay hints and reject relay or
proxy targets that resolve to loopback, private or link-local addresses.

Gopher is plaintext and unauthenticated. A bridge MUST NOT accept credentials
or treat a remote gopher connection as an authenticated user.

## Rationale

Each document is signed and addressed by an author's pubkey and a path rather
than by one server. The content remains inline on relays, so a text-only hole
does not depend on an HTTP origin or a separate blob store.

The nsite event family also describes pubkey-owned paths, but carries hashes
for Blossom-hosted arbitrary assets. Gopherkind deliberately carries UTF-8
text inline and gives menus a small, host-independent grammar. Kind `30023`
is for long-form Markdown articles rather than arbitrary path-addressed text
and menus.

Virtual documents, social views, search, pagination, relay policy, Gemini and
HTTP URL spaces, and signer-backed account features are application behaviour
and are deliberately outside this NIP.

## Test vectors

Path identity:

| `d` value | URL path segment | Result |
|---|---|---|
| `/a b` | `/a%20b` | valid document |
| `/a%20b` | `/a%2520b` | different valid document |
| `/a//b` | n/a | invalid event |
| `/a/../b` | n/a | invalid event |
| `/a/` | n/a | invalid event |

Kindmap parsing:

| Input record | Parsed result |
|---|---|
| `0About<TAB>/about.txt` | type `0`, display `About`, link `/about.txt` |
| `hello` | information text `hello` |
| `ihello` | information text `hello` |
| `1Home<TAB>/<TAB>old.example<TAB>70` | type `1`, display `Home`, link `/` |
| `1Broken<TAB>` | information text `Broken` |

A type `0` body `"hello\n.hidden\n"` is rendered over gopher as
`hello\r\n..hidden\r\n.\r\n`.
