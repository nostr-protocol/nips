NIP-XX
======

Cashtags
--------

`draft` `optional`

This NIP defines how clients recognize `$TICKER` mentions in text, and an
optional `cashtag` tag with which an author says which asset a ticker means
and how to show it.

## Cashtags in text

A cashtag is `$` followed by 2 to 6 ASCII letters, where:

- the character before `$` is the start of the text, or is neither a word
  character nor `$`;
- the character after the letters is the end of the text, or is not a word
  character.

A word character is `_` or any code point in the Unicode general categories
L, M or N. Text is not normalized first.

The ticker is the letters upper-cased: `$xmr`, `$Xmr` and `$XMR` are all
`XMR`.

| Text | Cashtags |
| --- | --- |
| `Bought some $XMR today` | `XMR` |
| `($BTC), $ETH!` | `BTC`, `ETH` |
| `$5`, `$562.82`, `$X`, `$ABCDEFG` | none |
| `US$XMR`, `$$XMR`, `$XMR2`, `$XMRé` | none |

Before tokenizing, clients skip these spans, in this order, and replace every
code point in them with `_`:

1. fenced code, from ```` ``` ```` to the next ```` ``` ```` (or the end of
   the text);
2. inline code: `` ` ``, then one or more characters other than `` ` `` and
   newline, then `` ` ``;
3. URLs: `http://` or `https://` up to the next whitespace;
4. `nostr:` followed by lower-case letters and digits (NIP-21).

## The `cashtag` tag

```json
["cashtag", "<TICKER>", "<mode>", "<asset id>"]
```

- `TICKER`: 2 to 6 upper-case ASCII letters. It MUST appear as a cashtag in
  the event's content.
- `mode`: `compact` (an inline chip) or `expanded` (a chart or card under the
  note).
- `asset id`: optional. Leave it out rather than guess.

An event carries at most one `cashtag` tag. It is the author's one choice of
attachment, not a list of every ticker in the text. The tag MAY be used on any
event whose content is text for people (kind 1, kind 1111, kind 30023).

Readers:

1. use only the first `cashtag` tag;
2. upper-case its ticker, and ignore the tag if the ticker isn't a valid
   ticker or doesn't appear as a cashtag in the content;
3. treat a missing or unknown `mode` as `compact`;
4. ignore an asset id that is malformed or not bound to the ticker (below),
   and fall back to the ticker alone.

### Asset ids

The fourth element is either a CAIP-19 asset id, recognized by its `/`, or a
short id:

| Short id | Means |
| --- | --- |
| `<ticker>:native` | The coin of the ticker's own network, from the table below. Short ids not in the table are ignored. |
| `<ticker>:equity` | Shares of the listed company with that ticker. |
| `<ticker>:<chain>:<address>` | A token contract or mint on `<chain>` (table below). The address keeps its case. |

The first part of a short id MUST equal the tag's ticker in lower case;
otherwise readers ignore the asset id. So
`["cashtag", "XMR", "compact", "btc:native"]` can't show Bitcoin under a
`$XMR` mention.

| Short id | CAIP-19 |
| --- | --- |
| `xmr:native` | `monero:418015bb9ae982a1975da7d79277c270/slip44:128` |
| `btc:native` | `bip122:000000000019d6689c085ae165831e93/slip44:0` |
| `eth:native` | `eip155:1/slip44:60` |
| `sol:native` | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501` |

| Chain slug | CAIP-2 | Token namespace |
| --- | --- | --- |
| `ethereum` | `eip155:1` | `erc20` |
| `optimism` | `eip155:10` | `erc20` |
| `bsc` | `eip155:56` | `erc20` |
| `polygon` | `eip155:137` | `erc20` |
| `base` | `eip155:8453` | `erc20` |
| `arbitrum` | `eip155:42161` | `erc20` |
| `solana` | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | `token` |

`<ticker>:<chain>:<address>` maps to `<CAIP-2>/<namespace>:<address>`. Use
CAIP-19 for other chains.

### Showing contract assets

Anyone can deploy a token with any symbol, so for CAIP-19 ids and
`<ticker>:<chain>:<address>` ids a reader that looks the asset up compares its
symbol with the ticker:

- Same symbol: show `$TICKER` together with the chain and a shortened address
  (`$USDC · Base · 0x8335…2913`). Readers MAY leave out the chain and address
  for contracts on a list of known assets they ship or trust.
- Different symbol: show the asset's own name and symbol with its chain and
  address, marked as not matching the text. Never show it as `$TICKER`.
- Not found: show the ticker alone, and say the asset couldn't be checked.

Readers that group notes by asset group by the CAIP-19 id when there is one,
and by the short id otherwise, never by ticker alone when an id is present.

## Search

Relays only index single-letter tags, so writers MAY add a `t` tag per
distinct cashtag in the content: the ticker in lower case with its `$`, in
first-seen order, at most 10.

```json
["t", "$xmr"]
```

`$xmr` doesn't collide with the hashtag `xmr`, and `{"#t": ["$xmr"]}` works on
every relay. These tags are only for search; the `cashtag` tag alone carries
the mode and asset.

## Example

```json
{
  "kind": 1,
  "content": "Moved my savings to $XMR this week.",
  "tags": [
    ["cashtag", "XMR", "expanded", "xmr:native"],
    ["t", "$xmr"]
  ]
}
```

A reader shows a Monero card under the note. A reader that doesn't know this
NIP shows the text unchanged.

## Test vectors

Tokenizer, event, search and display cases, with a standard-library checker:
https://github.com/nkips/nkips/tree/main/nkips/nkip-0005
