NIP-84
======

Highlights
----------

`draft` `optional`

This NIP defines `kind:9802`, a "highlight" event, to signal content a user finds valuable.

## Format
The `.content` of these events is the highlighted portion of the text.

`.content` might be empty for highlights of non-text based media (e.g. NIP-94 audio/video).

### References
Events SHOULD tag the source of the highlight, whether nostr-native or not.
`a` or `e` tags should be used for nostr events and `r` tags for URLs.

When tagging a URL, clients generating these events SHOULD do a best effort of cleaning the URL from trackers
or obvious non-useful information from the query string.

### Attribution
Clients MAY include one or more `p` tags, tagging the original authors of the material being highlighted; this is particularly
useful when highlighting non-nostr content for which the client might be able to get a nostr pubkey somehow
(e.g. prompting the user or reading a `<link rel="me" href="nostr:nprofile1..." />` tag on the document). A role MAY be included as the
last value of the tag.

```jsonc
{
  "tags": [
    ["p", "<pubkey-hex>", "<relay-url>", "author"],
    ["p", "<pubkey-hex>", "<relay-url>", "author"],
    ["p", "<pubkey-hex>", "<relay-url>", "editor"]
  ],
  // other fields...
}
```

### Context
Clients MAY include a `context` tag, useful when the highlight is a subset of a paragraph and displaying the
surrounding content might be beneficial to give context to the highlight.

## Quote Highlights
A `comment` tag may be added to create a quote highlight. This MUST be rendered like a quote repost with the highlight as the quoted note.

This is to prevent the creation and multiple notes (highlight + kind 1) for a single highlight action, which looks bad in micro-blogging clients where these notes may appear in succession.

p-tag mentions MUST have a `mention` attribute to distinguish it from authors and editors.

r-tag urls from the comment MUST have a `mention` attribute to distinguish from the highlighted source url. The source url MUST have the `source` attribute.
