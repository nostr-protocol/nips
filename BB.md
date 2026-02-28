NIP-BB
========

Book
-----

`draft` `optional`

This NIP defines a protocol for publishing books on Nostr. It utilizes lexicographical fractional indexing for ordering chapters and episodes.

## Cover

The Cover is an addressable event that represents the book's metadata. Every book MUST have a Cover event.

```jsonc
{
	"kind": "30300",
	"content": "<book summary>",
	"tags": [
		["d", "<id>"],
		["title", "<title>"],
		["subtitle", "<subtitle>"], // optional
		["image", "<cover image URL>"], // optional
		["lang","<IETF BCP 47 language tag>"],
		["license", "<name e.g. CC BY-SA 4.0>", "<URL e.g. https://creativecommons.org/licenses/by-sa/4.0/>"],
		["status", "completed"] // optional
	],
}
```

## Index

The Index is an addressable event used to map an Episode or Chapter to its position within a book. To improve efficiency, clients SHOULD fetch Index events to construct the table of contents before downloading full episode content.

```jsonc
{
	"kind": "30301",
	"content": "",
	"tags": [
		["d", "<id>"],
		["title", "<index title>"],
		["K", "30300"], // Reference to the Cover kind
		["A", "<Cover address>", "<relay hint>"],
		["k", "<30302 or 30203>"], // Targeted Kind (Chapter or Episode)
		["a", "<target address>", "<relay hint>"],
		["rank", "<base62 fractional index>"]
	],
}
```

## Chapter

The Chapter is an addressable event that serves as a structural header or summary for a section of the book.

```jsonc
{
	"kind": "30302",
	"content": "<chapter summary>",
	"tags": [
		["image", "<chapter image URL>"] // optional
	],
}
```

## Episode

The Episode is an addressable event that contains the actual prose of the book. The prose content SHOULD be a plain text.

```jsonc
{
	"kind": "30303",
	"content": "<prose content>",
	"tags": [
		["image", "<illustration image URL>", "<position: start|middle|end>", "<alt text>"] // optional, multiple allowed
	],
}
```

_Note: It is recommended to keep the content under 30,000 characters to avoid relay rejection._

## Reviews and Comments

- **Comments**: Use [NIP-22](22.md). Clients SHOULD attach comments to the Cover or Index events.
- **Reviews**: Reviews are expressed via Zaps on the Cover or Index events. The Zap description serves as the review text. This mechanism discourages review bombing and incentivizes quality feedback.

## Future work

- Exclusive episodes