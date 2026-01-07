NIP-54
======

Wiki
----

`draft` `optional`

This NIP defines `kind:30818` (an _addressable event_) for descriptions (or encyclopedia entries) of particular subjects, and it's expected that multiple people will write articles about the exact same subjects, with either small variations or completely independent content.

Articles are identified by lowercase, normalized `d` tags.

## Articles
```json
{
  "content": "A wiki is a hypertext publication collaboratively edited and managed by its own audience.",
  "tags": [
    ["d", "wiki"],
    ["title", "Wiki"]
  ]
}
```

## `d` tag normalization rules

- All letters with uppercase/lowercase variants MUST be converted to lowercase.
- Whitespace MUST be converted to `-`.
- Punctuation and symbols SHOULD be removed.
- Multiple consecutive `-` SHOULD be collapsed to a single `-`.
- Leading and trailing `-` SHOULD be removed.
- Non-ASCII letters (e.g., Japanese, Chinese, Arabic, Cyrillic) MUST be preserved as UTF-8.
- Numbers MUST be preserved.

For example:
- `"Wiki Article"` → `"wiki-article"`
- `"What's Up?"` → `"whats-up"`
- `"  Hello  World  "` → `"hello-world"`
- `"Article 1"` → `"article-1"`
- `"ウィキペディア"` → `"ウィキペディア"` (Japanese, no case change)
- `"Ñoño"` → `"ñoño"` (Spanish, lowercased)
- `"Москва"` → `"москва"` (Russian, lowercased)
- `"日本語 Article"` → `"日本語-article"` (mixed scripts)

## Content

The `content` should be [Djot](https://djot.net/) with two special functionalities:

1. Links can have target URIs in [NIP-21](21.md) format, like `[Bob](nostr:npub1...)`.
2. When a reference can't be found for a reference-style link, it should link to the wiki article with that name instead (wikilink behavior). The target is normalized following the `d` tag normalization rules above.

For example:

```djot
Bitcoin is a [cryptocurrency][] invented by [Satoshi Nakamoto][].

See also: [proof of work][] and [lightning network][Lightning Network].

[Satoshi Nakamoto]: nostr:npub1satoshi...
```

In the article above:
- `[cryptocurrency][]` links to the wiki article with `d` tag `"cryptocurrency"` (no reference defined, so it becomes a wikilink)
- `[Satoshi Nakamoto][]` links to the npub (reference is defined)
- `[proof of work][]` links to the article with `d` tag `"proof-of-work"`
- `[lightning network][Lightning Network]` links to `"lightning-network"`, displays as "lightning network"

Wikilinks also work with non-Latin scripts following the same normalization rules:
- `[ビットコイン][]` → links to article with `d` tag `"ビットコイン"`
- `[Japanese Article][日本語 記事]` → links to `"日本語-記事"`, displays as "Japanese Article"
- `[Биткойн][]` → links to article with `d` tag `"биткойн"` (Cyrillic, lowercased)

[NIP-21](21.md) `nostr:` links can also be used to link to profiles or arbitrary Nostr events. It is not recommended to link to specific versions of articles — the wikilink syntax should be preferred instead, since it should be left to the reader and their client to decide what version of any given article they want to read.

## Optional extra tags

  - `title`: for when the display title should be different from the `d` tag.
  - `summary`: for display in lists.
  - `a` and `e`: for referencing the original event a wiki article was forked from.

## Merge Requests

Event `kind:818` represents a request to merge from a forked article into the source. It is directed to a pubkey and references the original article and the modified event.

```json
{
  "content": "I added information about the block size limit",
  "kind": 818,
  "tags": [
    ["a", "30818:<destination-pubkey>:bitcoin", "<relay-url>"],
    ["e", "<version-against-which-the-modification-was-made>", "<relay-url>"],
    ["p", "<destination-pubkey>"],
    ["e", "<version-to-be-merged>", "<relay-url>", "source"]
  ]
}
```

- `.content`: an optional explanation detailing why this merge is being requested.
- `a` tag: tag of the article which should be modified (i.e. the target of this merge request).
- `e` tag: optional version of the article on which this modification is based.
- `e` tag with `source` marker: the ID of the event that should be merged. This event id MUST be of a `kind:30818` as defined in this NIP.

The destination pubkey can create [NIP-25](25.md) reactions that tag the `kind:818` event with `+` or `-` to accept or reject the merge request.

## Redirects

Event `kind:30819` is also defined to stand for "wiki redirects", i.e. if one thinks "BTC" should redirect to "Bitcoin" they can issue one of these events instead of replicating the content. These events can be used for automatically redirecting between articles on a client, but also for generating crowdsourced "disambiguation" pages ([common in Wikipedia](https://en.wikipedia.org/wiki/Help:Disambiguation)).

```json
{
  "kind": 30819,
  "tags": [
    ["d", "btc"],
    ["a", "30818:<pubkey>:bitcoin", "<relay-url>"]
  ],
  "content": ""
}
```

## How to decide what article to display

As there could be many articles for each given name, some kind of prioritization must be done by clients. Criteria for this should vary between users and clients, but some means that can be used are described below:

### Reactions

[NIP-25](25.md) reactions are very simple and can be used to create a simple web-of-trust between wiki article writers and their content. While just counting a raw number of "likes" is unproductive, reacting to any wiki article event with a `+` can be interpreted as a recommendation for that article specifically and a partial recommendation of the author of that article. When 2 or 3-level deep recommendations are followed, suddenly a big part of all the articles may have some form of tagging.

### Relays

[NIP-51](51.md) lists of relays can be created with the kind 10102 and then used by wiki clients in order to determine where to query articles first and to rank these differently in relation to other events fetched from other relays.

### Contact lists

[NIP-02](02.md) contact lists can form the basis of a recommendation system that is then expanded with relay lists and reaction lists through nested queries. These lists form a good starting point only because they are so widespread.

### Wiki-related contact lists

[NIP-51](51.md) lists can also be used to create a list of users that are trusted only in the context of wiki authorship or wiki curationship.

## Forks

Wiki-events can tag other wiki-events with a `fork` marker to specify that this event came from a different version. Both `a` and `e` tags SHOULD be used and have the `fork` marker applied, to identify the exact version it was forked from.

## Deference

Wiki-events can tag other wiki-events with a `defer` marker to indicate that it considers someone else's entry as a "better" version of itself. If using a `defer` marker both `a` and `e` tags SHOULD be used.

This is a stronger signal of trust than a `+` reaction.

This marker is useful when a user edits someone else's entry; if the original author includes the editor's changes and the editor doesn't want to keep/maintain an independent version, the `defer` tag could effectively be considered a "deletion" of the editor's version and putting that pubkey's WoT weight behind the original author's version.

## Why Djot?

[Djot](https://djot.net/) is a markup language created by John MacFarlane (author of Pandoc and co-author of CommonMark). It was chosen for the following reasons:

- **Well-defined spec**: Unlike Markdown (many incompatible dialects) or Asciidoc (spec tied to Ruby implementation), Djot has a clear, standalone specification.
- **Native implementations**: Available in JavaScript, Lua, Rust, Go, and other languages without transpilation.
- **Rich features**: Supports superscript, subscript, footnotes, tables, definition lists, and math — features useful for encyclopedic content.
- **Familiar syntax**: Similar to basic Markdown, making it easy to learn.
- **Fast parsing**: Designed for efficient linear-time parsing.
