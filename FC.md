NIP-FC
======

Financial Cashtags
------------------

`draft` `optional`

This NIP defines how an author can identify a financial instrument, asset, market, or benchmark mentioned with a `$`-prefixed cashtag in event content. A cashtag is a display label, **not** a globally unique identifier: `YPF` can denote different securities, and `BTC/USD` can denote different markets. The author selects the intended reference while composing the event, and readers use the published identifier rather than guessing from the symbol.

This NIP applies to the human-readable text in the `content` of the following kinds:

| kind                                  | description                   |
| ------------------------------------- | ----------------------------- |
| `1`                                   | Short Text Note               |
| `9`                                   | Chat Message                  |
| `11`                                  | Thread                        |
| `20`                                  | Picture                       |
| `21`, `22`, `34235`, `34236`          | Video Events                  |
| `24`                                  | Public Message                |
| `42`                                  | Channel Message               |
| `1068`                                | Poll                          |
| `1111`                                | Comment                       |
| `1311`                                | Live Chat Message             |
| `30023`                               | Long-form Content             |
| `30818`                               | Wiki article                  |

Other kinds can adopt it by saying so in their own specification. For events that embed another event in their `content`, such as reposts, this NIP applies to the embedded event according to its own kind. It does not apply to text in tags, such as titles or poll options.

This NIP does not define payment handles (including Cash App handles in [NIP-A3](A3.md)), prices, or data feeds.

## Cashtag syntax

The following ASCII grammar defines a cashtag (square brackets denote an optional part, braces denote repetition):

```text
cashtag = "$", ["^"], segment, {("." | "-"), segment},
           ["/", segment, {("." | "-"), segment}]
segment = one or more ASCII letters or digits
```

The `$` MUST NOT be immediately preceded by an ASCII letter, digit, `_`, or `$`, and the last character MUST NOT be followed by an ASCII letter, digit, or `_`. A cashtag consisting of a single all-digit segment MUST have four to six digits (`$0700` and `$600519`, but not `$5`).

This covers `$AAPL`, `$BRK-B`, `$BP.L`, `$0700`, `$^GSPC`, and `$BTC/USD`. The _symbol_ of a cashtag is its text without the leading `$`, with ASCII letters converted to uppercase and every other character preserved: `$bp.l` becomes `BP.L` and `$0700` remains `0700`.

## The `cashtag` tag

For each cashtag the author has bound to a reference, the event includes a `cashtag` tag:

```text
["cashtag", "<symbol>", "<external-id>"]
["cashtag", "<symbol>", "<external-id>", "<start>", "<end>"]
```

`external-id` is one of the identifiers described [below](#identifiers); it MUST NOT be a bare ticker.

Without offsets, the tag binds every cashtag in `content` that has this symbol, the same way a `t` tag relates to a hashtag. This is the normal form. Relays do not index this tag; it is only read by clients rendering the event.

`start` and `end` bind a single occurrence instead. They are base-10 UTF-8 **byte** offsets into the raw `content` string, `start` inclusive and `end` exclusive, covering the whole cashtag including `$`. They are needed only when one event binds the same symbol to different references:

- When a symbol is bound to a single external ID in an event, publishers SHOULD use one `cashtag` tag without offsets.
- When a symbol is bound to two or more external IDs in an event, every `cashtag` tag for that symbol MUST have offsets, one tag per occurrence.

Clients rendering an event find the cashtags in `content` and look up the `cashtag` tags with the same symbol:

- A tag with offsets applies only to the cashtag at exactly that byte range. If that range is not a cashtag with the tag's symbol, the tag MUST be ignored.
- A tag without offsets applies to every occurrence of its symbol that no tag with offsets applies to.
- If more than one external ID applies to an occurrence, clients MUST NOT silently pick one. They MAY offer a choice or leave it as text.
- A cashtag with no applicable `cashtag` tag is ordinary text. Clients MUST NOT infer a reference for it from a catalog, even one that returns a single result.

## Discovery

Events are found through [NIP-73](73.md) `i` tags. For each `cashtag` tag, publishers MUST also include:

- `["i", "cashtag:<symbol>"]` and `["k", "cashtag"]`, for the displayed symbol.
- `["i", "<external-id>"]` and a `k` tag for its identifier scheme, for the selected reference.

Each distinct `i` and `k` value is included once. Publishers MAY add `i` tags with other identifiers of the same reference (for example its ISIN next to its FIGI) to help discovery. An `i` tag alone does not bind any cashtag in `content`.

- `{"#i": ["cashtag:AAPL"]}` finds events by symbol. It is an exact match (`cashtag:BP` does not match `cashtag:BP.L`) and can return different instruments sharing the symbol.
- `{"#i": ["figi:BBG000B9XRY4"]}` finds events about one specific instrument, whatever cashtag was displayed.

## Selecting a reference

A client MAY offer autocomplete after `$`, using any catalog or provider. Suggestions SHOULD let the author tell references apart by name, type, market, and identifier, for example the YPF ADS traded in the US and the YPF shares traded in Argentina. No ticker registry or autocomplete service is defined here. Provider-specific spellings such as Yahoo Finance's `YPFD.BA` can be used as the displayed cashtag, but they are not identifiers.

## Identifiers

The external ID MUST identify what the author actually selected. An issuer is not its shares, an ADS is not the local share, Bitcoin is not a BTC/USD market, and USD is not USDT. The formats are specified in [NIP-73](73.md):

- `caip19:<CAIP-19 asset type>` for a cryptoasset on a network. It does not identify an exchange market or trading pair.
- `iso4217:<code>` for a currency. It does not identify an FX pair.
- `figi:<FIGI>` for a security, market, contract, FX pair, index, or other benchmark. FIGIs exist at several levels (share class, country composite, trading venue, trading pair, venue-specific market), and publishers MUST use the level being discussed: a pair-level FIGI does not identify one venue's market, and an index FIGI does not identify a fund or future tracking it.
- `isin:<ISIN>` for a security when no suitable FIGI is available. It does not identify a trading venue.

Publishers SHOULD prefer the schemes in the order above, so that events about the same thing share an `i` value. If a client cannot identify the reference at the level the author intends, it MUST NOT add a `cashtag` tag. Clients MUST NOT assume that two different IDs identify the same thing, and old events keep their IDs after ticker changes, delistings, or corporate actions.

## Examples

Several shares, identified by their US composite FIGIs:

```json
{
  "kind": 1,
  "content": "Watching $F, $T, $KO, $AAPL and $MSFT. Adding to $AAPL.",
  "tags": [
    ["cashtag", "F", "figi:BBG000BQPC32"],
    ["cashtag", "T", "figi:BBG000BSJK37"],
    ["cashtag", "KO", "figi:BBG000BMX289"],
    ["cashtag", "AAPL", "figi:BBG000B9XRY4"],
    ["cashtag", "MSFT", "figi:BBG000BPH459"],
    ["i", "cashtag:F"],
    ["i", "cashtag:T"],
    ["i", "cashtag:KO"],
    ["i", "cashtag:AAPL"],
    ["i", "cashtag:MSFT"],
    ["i", "figi:BBG000BQPC32"],
    ["i", "figi:BBG000BSJK37"],
    ["i", "figi:BBG000BMX289"],
    ["i", "figi:BBG000B9XRY4"],
    ["i", "figi:BBG000BPH459"],
    ["k", "cashtag"],
    ["k", "figi"]
  ]
}
```

The YPF ADS identified by ISIN, with a URL hint:

```json
{
  "kind": 1,
  "content": "Looking at $YPF",
  "tags": [
    ["cashtag", "YPF", "isin:US9842451000"],
    ["i", "cashtag:YPF"],
    ["i", "isin:US9842451000", "https://finance.yahoo.com/quote/YPF/"],
    ["k", "cashtag"],
    ["k", "isin"]
  ]
}
```

Bitcoin as an asset and USD as a currency, not a BTC/USD market:

```json
{
  "kind": 1,
  "content": "Selling $USD for $BTC",
  "tags": [
    ["cashtag", "USD", "iso4217:USD"],
    ["cashtag", "BTC", "caip19:bip122:000000000019d6689c085ae165831e93/slip44:0"],
    ["i", "cashtag:USD"],
    ["i", "cashtag:BTC"],
    ["i", "iso4217:USD"],
    ["i", "caip19:bip122:000000000019d6689c085ae165831e93/slip44:0"],
    ["k", "cashtag"],
    ["k", "iso4217"],
    ["k", "caip19"]
  ]
}
```

The same symbol bound to two venue-specific markets, [Kraken BTC/USD](https://www.openfigi.com/id/KKG000006F26) and [Coinbase BTC/USD](https://www.openfigi.com/id/KKG0000048G9). The offsets count bytes, so the 4-byte emoji puts the first cashtag at `5`:

```json
{
  "kind": 1,
  "content": "🔥 $BTC/USD (Kraken) vs $BTC/USD (Coinbase)",
  "tags": [
    ["cashtag", "BTC/USD", "figi:KKG000006F26", "5", "13"],
    ["cashtag", "BTC/USD", "figi:KKG0000048G9", "26", "34"],
    ["i", "cashtag:BTC/USD"],
    ["i", "figi:KKG000006F26"],
    ["i", "figi:KKG0000048G9"],
    ["k", "cashtag"],
    ["k", "figi"]
  ]
}
```

The S&P 500 index, a benchmark that is not itself tradable:

```json
{
  "kind": 1,
  "content": "Index $^GSPC",
  "tags": [
    ["cashtag", "^GSPC", "figi:BBG000H4FSM0"],
    ["i", "cashtag:^GSPC"],
    ["i", "figi:BBG000H4FSM0"],
    ["k", "cashtag"],
    ["k", "figi"]
  ]
}
```
