NIP-XX
======

Interactive Charts
------------------

`draft` `optional`

## Summary

This NIP defines `kind:1786`, a regular event whose `.content` is a declarative chart specification, and the rules clients follow to draw it as an interactive chart.

- The specification is JSON in a versioned dialect named by a `dialect` tag. Version 1 of the `vega-lite-nostr` dialect is a strict subset of [Vega-Lite](https://vega.github.io/vega-lite/). It has no expressions, no URLs and nothing else that can execute or fetch.
- Notes, comments and articles embed a chart the way they quote any other event: a `nostr:nevent1…` reference in `.content` plus a `q` tag ([NIP-21](21.md), [NIP-18](18.md)).
- Clients check the specification against an allow-list before drawing it. They never run code supplied by the author, never touch the network for a chart, and keep the renderer away from keys and session state.
- An `alt` tag carries a text alternative. Screen readers announce it, and clients that do not implement this NIP can display it instead of the chart.

## Motivation

Charts are a common way to make a point with data: zaps per week, relay latency, fee rates, poll results, research figures. Nostr has no way to publish one, so authors work around it:

| | Image ([NIP-92](92.md), [NIP-68](68.md)) | Link to a hosted chart | Text or ASCII chart in `kind:1` | Plotting code ([NIP-C0](C0.md)) or web page ([NIP-5A](5A.md)) | `kind:1786` |
|---|---|---|---|---|---|
| Tooltips, hover, zoom | no | yes, outside the client | no | only by running the author's code | yes |
| Values available to screen readers and other tools | no | depends on the site | partly | depends | yes |
| Data covered by the author's signature | file hash at most | no | yes | yes | yes |
| Can change after people reply, react or zap | if the host swaps the file | yes | no | code: no; page: yes | no |
| Viewing contacts a third-party server | yes, the media host | yes, the site and its trackers | no | likely | no |
| Follows the client's theme and screen size | no | sometimes | poorly | depends | yes |
| Runs code from the author or a third party | no | yes | no | yes | no |

Size matters too. The line chart in the examples below is a 3.1 KB event. A 2× PNG of the same chart is about 80 KB, stored on a media server that every viewer has to contact.

### Design choices

**A profile of Vega-Lite, not all of it.** Vega-Lite is a mature, well-documented grammar of graphics. Authors can produce it with existing tools such as Altair, vega-lite-api and the Vega editor, then convert the output to this subset: inline the data and remove `$schema` and `config`, for example. But the full feature set is not safe to accept from strangers. It has an expression language, event-stream filters that are themselves expressions, `data.url`, `image` marks and `href` links. Vega's published advisories include seven cross-site-scripting issues in the expression language, event filters among them: CVE-2020-26296, CVE-2023-26486, CVE-2023-26487, CVE-2025-25304, CVE-2025-26619, CVE-2025-27793 and CVE-2025-59840. A further advisory, GHSA-cp47-r258-q626, is arbitrary code execution through `href` links. Version 1 keeps the declarative core and drops every construct that executes code or fetches anything. Every object is closed, so any property the dialect does not list makes the document invalid. Its seven mark types match the mark types of native toolkits such as Swift Charts, so clients without a JavaScript engine can implement it.

**Not SVG.** SVG is a document format with scripts, event-handler attributes, `foreignObject` and external references, and it is hard to sanitize. DOMPurify alone had two sanitizer bypasses in 2024, CVE-2024-45801 and CVE-2024-47875. Even a sanitized SVG is a static picture whose data cannot be read back.

**A separate event, not an attachment.** A chart in its own event can be quoted by many notes and embedded in any kind with readable content. People can comment on it, react to it and zap it by `id`. A chart carried in a tag of a `kind:1` note would disappear without a trace in clients that do not support it, and nobody could reuse it.

**Regular, not addressable.** See [Event kind](#event-kind).

## Specification

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY and OPTIONAL are to be interpreted as described in RFC 2119 and RFC 8174.

### Event kind

This NIP defines `kind:1786`, a chart. The number is a mnemonic: William Playfair's *Commercial and Political Atlas*, which popularized line and bar charts, was published in 1786.

`kind:1786` is a **regular** event as defined in [NIP-01](01.md) (`1000 <= kind < 10000`). Relays keep every chart, and other events refer to a chart by its `id`. Because the `id` is a hash that covers `.content`, it commits to the exact data. That matters because a chart is a claim about data, and replies, reactions, zaps, quotes and reports have to keep pointing at the numbers they responded to. An addressable kind (`30000 <= kind < 40000`, formerly called "parameterized replaceable") would break this. The author could replace the data behind an existing `naddr` while the reactions stayed attached, and relays would discard the old version.

To correct a chart, the author publishes a new `kind:1786` event that links to the old one with the `supersedes` role (see [Tags](#tags)). The author MAY also send a [NIP-09](09.md) deletion request for the old chart. Charts that update continuously, such as live dashboards, are out of scope. A later NIP could define an addressable kind that reuses this content format.

### Content

`.content` MUST be a JSON object serialized as a string, and it MUST conform to the dialect named by the `dialect` tag. It MUST be [I-JSON](https://www.rfc-editor.org/rfc/rfc7493): UTF-8, no duplicate member names, no unpaired surrogates, and only numbers within the range of IEEE 754 doubles.

Authors MUST keep the whole event within 65,536 bytes when it is serialized as compact JSON with non-ASCII characters written as raw UTF-8. That limit is strfry's default `maxEventSize`. Inside the event, `.content` is escaped, which makes it larger: by 17% to 23% in the examples below. Clients MUST NOT render a `.content` longer than 65,536 bytes.

**No executable code, ever.** Dialects defined under this NIP, in any version, MUST NOT contain anything that a client evaluates as code. That covers expressions, functions, callbacks, templates, regular expressions, event-stream selectors, markup (HTML, SVG or Markdown) and URLs. Every string in `.content` is a value or a label.

### Dialect `vega-lite-nostr`, version 1

Version 1 is a strict subset of [Vega-Lite](https://vega.github.io/vega-lite/docs/) 5 and 6. Every valid document is also a valid Vega-Lite specification with the same meaning. Each allowed property has the meaning given in the Vega-Lite documentation, and this NIP only defines which properties are allowed. Every object is closed: a property not listed here makes the whole document invalid. Lengths are counted in Unicode code points.

The tables below use these value types:

- **Text** is a string of 1 to 120 code points. It contains no `"`, `'` or `\`, no control characters (U+0000 to U+001F and U+007F to U+009F), and neither U+2028 nor U+2029. Typographic quotes such as `’` are fine. Vega-Lite copies titles, format strings and sort values into the expression code it generates, and it does not escape them reliably. A backslash or line separator in a title stops the chart from rendering in Vega-Lite 5 and 6, and a quote in a time format runs code chosen by the author in Vega-Lite 5.
- **Color** is `#rgb` or `#rrggbb`. Color names, `url(…)` and gradients are not allowed.
- **FieldName** matches `^[A-Za-z][A-Za-z0-9]{0,63}$` and is not one of `constructor`, `prototype`, `toString`, `toLocaleString`, `valueOf`, `hasOwnProperty`, `isPrototypeOf` or `propertyIsEnumerable`. Vega-Lite treats `.`, `[` and `\` in field names as path syntax and compiles field names into expressions. It also writes derived fields such as `<field>_start` and `<field>_end` into each row, which would overwrite an author's field of that name, so underscores are not allowed. JavaScript renderers look fields up on ordinary objects, where the excluded names already exist.
- **ParamName** matches `^[a-z][a-z0-9]{0,31}$`. It is not one of `width`, `height`, `padding`, `autosize`, `background`, `cursor`, `unit`, `datum`, `event`, `item`, `parent`, `group`, `constructor` or `prototype`. It is also not an ECMAScript reserved word or literal: `await`, `break`, `case`, `catch`, `class`, `const`, `continue`, `debugger`, `default`, `delete`, `do`, `else`, `enum`, `export`, `extends`, `false`, `finally`, `for`, `function`, `if`, `import`, `in`, `instanceof`, `new`, `null`, `return`, `super`, `switch`, `this`, `throw`, `true`, `try`, `typeof`, `var`, `void`, `while`, `with`, `yield`, `implements`, `interface`, `let`, `package`, `private`, `protected`, `public`, `static`, `arguments`, `eval` or `undefined`. Vega-Lite writes parameter names into its generated code as bare identifiers, and many of these words break it. It also derives internal names such as `<name>_tuple` from each parameter name, so underscores are not allowed.
- **NumberFormat** is a [d3-format](https://d3js.org/d3-format) specifier of at most 16 code points, with at most two digits each for width and precision. Its fill character follows the character rules of Text. d3-format puts no bound on width, so `0100000000d` would produce a 100-million-character label.
- **TimeFormat** is at most 32 code points of literal text and [d3-time-format](https://d3js.org/d3-time-format) directives. The literal text follows the character rules of Text. The allowed directives are `%a %A %b %B %c %d %e %f %g %G %H %I %j %L %m %M %p %q %Q %s %S %u %U %V %w %W %x %X %y %Y %Z %%`, each optionally preceded by `-`, `_` or `0`.
- **SortOrder** is `"ascending"`, `"descending"`, `null`, or an array of 1 to 200 numbers and strings. Strings in the array are at most 256 code points and follow the character rules of Text.

#### Top level

A document is either a **unit**, which draws one mark, or a **layer**, which draws up to four marks that share data and scales.

| Property | Unit | Layer | Value |
|---|---|---|---|
| `data` | required | required | `{"values": [Row, …]}` with 1 to 5,000 rows |
| `mark` | required | — | Mark |
| `encoding` | required | optional | Encoding. In a layer, every layer item shares it. |
| `layer` | — | required | 1 to 4 items, each `{"mark": Mark, "encoding"?: Encoding, "params"?: Params}` |
| `params` | optional | layer items only | Params |
| `title` | optional | optional | Text, or `{"text": Text, "subtitle"?: Text}` |
| `width`, `height` | optional | optional | Integer from 50 to 2000. This is a size hint, and clients override it (rule 14). |

A **Row** is a flat object with 1 to 32 members. Member names are FieldNames. Values are strings of at most 256 code points, numbers, booleans or `null`.

#### Marks

`mark` is one of `bar`, `line`, `area`, `point`, `rule`, `rect` or `arc`. It can also be an object whose `type` is one of those, plus any of these properties:

| Property | Value |
|---|---|
| `tooltip` | `true`, `false` or `{"content": "encoding"}`. The tooltip lists the encoded fields. |
| `point` | Boolean. On `line` and `area`, draws a point at each vertex. |
| `interpolate` | `linear`, `monotone`, `step`, `step-before` or `step-after` |
| `color` | Color |
| `opacity` | 0 to 1 |
| `filled` | Boolean |
| `size` | 0 to 2500 |
| `strokeWidth` | 0 to 20 |
| `strokeDash` | Array of up to 4 numbers, each from 1 to 50 |
| `shape` | `circle`, `square`, `cross`, `diamond`, `triangle-up`, `triangle-down`, `triangle-right` or `triangle-left` |
| `innerRadius` | 0 to 1000. On `arc`, this makes a donut. |
| `cornerRadius` | 0 to 100 |

#### Encoding

An Encoding is an object with at least one of these channels:

| Channel | Allowed definitions |
|---|---|
| `x`, `y` | Position field definition |
| `x2`, `y2` | `{"field": FieldName, "title"?: Text \| null}` |
| `xOffset`, `yOffset` | `{"field", "type": "nominal" \| "ordinal", "title"?, "sort"?: SortOrder}` |
| `theta` | `{"field", "type": "quantitative", "title"?, "stack"?: true \| "normalize"}` |
| `color` | Color field definition, `{"value": Color}` or a Condition |
| `opacity` | `{"value": 0–1}` or a Condition |
| `size` | `{"field", "type": "quantitative", "title"?, "legend"?}`, `{"value": 0–2500}` or a Condition |
| `strokeWidth` | `{"value": 0–20}` or a Condition |
| `shape` | `{"field", "type": "nominal" \| "ordinal", "title"?, "legend"?, "sort"?: SortOrder}` or `{"value": shape}` |
| `strokeDash` | `{"field", "type": "nominal" \| "ordinal", "title"?, "legend"?, "sort"?: SortOrder}` or `{"value": [numbers]}` |
| `tooltip` | A tooltip field definition, an array of 1 to 10 of them, or `null` |

Every field definition has a `field` (FieldName) and a `type`, which is `quantitative`, `temporal`, `ordinal` or `nominal`. It MAY have a `title`, which is Text or `null`.

A **position field definition** MAY also have these properties:

- `axis` is `null`, or an object with any of these: `title` (Text or `null`), `format`, `labelAngle` (−90 to 90), the booleans `grid`, `labels` and `ticks`, `tickCount` (integer from 1 to 50) and `orient` (`top`, `bottom`, `left` or `right`). `format` is a NumberFormat for `quantitative` fields and a TimeFormat for `temporal` fields. No other field type allows it.
- `scale` depends on the field type:
  - For `quantitative`, any of `type` (`linear`, `log`, `sqrt` or `symlog`), `domain` (two numbers) and the booleans `zero`, `nice` and `reverse`.
  - For `temporal`, `{"type": "utc"}` is REQUIRED, and the booleans `nice` and `reverse` are OPTIONAL.
  - For `ordinal` and `nominal`, any of `type` (`band` or `point`), `domain` (1 to 200 numbers or strings of at most 256 code points) and the boolean `reverse`.
- `sort` is a SortOrder or the name of another channel: `"x"`, `"-x"`, `"y"`, `"-y"`, `"color"` or `"-color"`.
- `stack` is `"zero"`, `"normalize"` or `null`. Only `quantitative` fields allow it.

A **color field definition** has `type` `quantitative`, `ordinal` or `nominal`. It MAY have:

- `legend`, which is `null` or `{"title"?, "orient"?: "left" | "right" | "top" | "bottom"}`.
- `sort`, a SortOrder.
- `scale`, with any of `type`, `domain` (1 to 200 numbers or strings of at most 256 code points), `range` (1 to 20 Colors), `zero` and `reverse`. `type` is `linear`, `log`, `sqrt` or `symlog` for `quantitative` fields, and `ordinal` otherwise.

A **tooltip field definition** is `{"field", "type", "title"?, "format"?}`, where `type` is `quantitative`, `ordinal` or `nominal`. `format` is a NumberFormat and is allowed only on `quantitative` fields.

A **Condition** is `{"condition": {"param": ParamName, "empty"?: boolean, "value": V}, "value": V}`, where `V` is any value the channel accepts. On `color` only, the inner object MAY instead be a color field definition with `param` and `empty` added.

**Temporal values.** The `temporal` type is allowed only on `x` and `y`, and its scale MUST be `utc`. Each non-null value of a temporal field, and of an `x2` or `y2` field paired with a temporal `x` or `y`, MUST be a string in one of two forms:

- `YYYY-MM-DD`, meaning midnight UTC.
- `YYYY-MM-DDTHH:MM:SS`, optionally followed by `.sss` (exactly three digits), and then by `Z` or `±HH:MM`.

The date MUST exist in the calendar. Hours MUST be 00 to 23, minutes 00 to 59 and seconds 00 to 59, so leap seconds are not allowed. An offset MUST be at most `±23:59`. Both forms are valid RFC 3339, and ECMAScript's `Date.parse` reads each one as the same instant (a date alone as midnight UTC).

Temporal fields MUST NOT appear in `tooltip`. To show them in a tooltip, set `"tooltip": true` on the mark, which formats them through the UTC position scale. Vega-Lite formats an explicit temporal tooltip field in the viewer's local time zone, so such a chart would show different times to different readers.

#### Params

`params` holds one or two selections. Each is one of these:

- A **point selection** is `{"name": ParamName, "select": {"type": "point", …}, "bind"?: "legend"}`. `select` MAY contain:
  - `on`: `"click"` or `"pointerover"`
  - `clear`: `"dblclick"`, `"pointerout"` or `false`
  - `fields`: 1 to 4 FieldNames
  - `encodings`: 1 to 4 of `x`, `y`, `color`, `shape` and `strokeDash`
  - `nearest` and `toggle`: booleans
- An **interval selection** is `{"name": ParamName, "select": {"type": "interval", …}, "bind"?: "scales"}`. `select` MAY contain:
  - `encodings`: `["x"]`, `["y"]` or `["x", "y"]`
  - `clear`: `"dblclick"` or `false`
  - `translate` and `zoom`: booleans

  With `"bind": "scales"`, the selection pans and zooms the chart.

In full Vega-Lite, `on`, `clear`, `translate`, `zoom` and `toggle` also accept event-stream selectors and expressions such as `click[event.shiftKey]`. This dialect accepts only the literal values listed above.

#### Additional constraints

A document is valid only if it also meets these constraints, which the property rules above cannot express:

1. Parameter names are unique within the document, and every `condition.param` names a declared parameter.
2. Every FieldName used in `field` or `fields` appears in at least one row.
3. Temporal values meet the rules above.
4. A position `sort` that names a channel names a different channel of the same unit, and that channel holds a field definition. For a layer item, the unit is the item's `encoding` merged over the layer's shared `encoding`.
5. `xOffset` requires `x` to be an `ordinal` or `nominal` field on a band scale. `yOffset` has the same requirement for `y`.
6. `nearest: true` is allowed only in a unit whose mark is `point`.
7. A selection with `"bind": "legend"` does not set `clear`.

Constraints 4 to 7 exclude combinations that crash the Vega-Lite 5 and 6 compilers or that Vega-Lite ignores.

A non-normative JSON Schema (draft-07) for the property rules is published at [`vega-lite-nostr-1.schema.json`](https://github.com/defauxking/Interactive-Charts-kind-1786/blob/main/vega-lite-nostr-1.schema.json). The schema cannot express the additional constraints, the I-JSON rules or the size limit. The same [repository](https://github.com/defauxking/Interactive-Charts-kind-1786) has a reference validator that checks all of them, with test cases. Where the schema or the validator disagrees with this NIP, this NIP is authoritative.

### Tags

| Tag | Required | Format |
|---|---|---|
| `dialect` | exactly one | `["dialect", "vega-lite-nostr", "1"]` |
| `alt` | exactly one | `["alt", "<plain-text description>"]` |
| `summary` | at most one | `["summary", "<plain-text description>"]` |
| `e` | no | `["e", "<event-id>", "<relay-url>", "<role>", "<author-pubkey>"]` |
| `a` | no | `["a", "<kind>:<pubkey>:<d-tag>", "<relay-url>", "<role>"]` |
| `r` | no | `["r", "<url>", "source"]` |
| `p` | no | as in [NIP-01](01.md) |
| `t` | no | hashtag |

**`dialect`** names the grammar of `.content` and its version (see [Dialect versioning](#dialect-versioning)).

**`alt`** is the chart's text alternative. It SHOULD describe what the data shows, not how the chart looks. For example: "Bar chart of sats zapped per weekday; highest on Saturday, at 61,500". It serves the same purpose as `alt` in [NIP-68](68.md), [NIP-71](71.md) and [NIP-94](94.md), and clients that do not know `kind:1786` can display it instead of the chart. It SHOULD be at most 250 code points.

**`summary`** MAY give a longer description, covering trends, extremes and notable values. It is for screen-reader users and for clients that show charts as text. It SHOULD be at most 1,000 code points. Clients MAY shorten either text for display.

**Linkage.** `e` and `a` tags link related events. A role, when present, is the fourth element of the tag. NIP-10 markers and NIP-54's `source` marker use the same position. An `e` tag MAY add the author's pubkey after the role. The relay URL MAY be an empty string. There are two roles:

- `source` means the chart's data comes from that event or is derived from it. The source could be a [NIP-94](94.md) file holding the raw CSV, a poll ([NIP-88](88.md)) or another chart. An `r` tag with the `source` role does the same for an external URL.
- `supersedes` (on `e` tags only) points to a previous chart that this one corrects. A client showing a chart MAY look for a correction with the filter `{"kinds": [1786], "authors": [<author>], "#e": [<chart id>]}`. It MUST treat a result as a correction only if the result has the same `pubkey` and an `e` tag for this chart with the `supersedes` role.

An `e` or `a` tag without a role only says that the events are related. Clients MAY show an `r` source as a link if its scheme is `https` or `http`, and MUST NOT show URLs with any other scheme as links. They MUST NOT fetch `r` URLs automatically, for example to build link previews.

### Embedding charts in other events

Any event with readable `.content`, such as `kind:1`, `kind:1111` or long-form `kind:30023`, embeds a chart the same way it quotes any other event. It puts a [NIP-21](21.md) `nostr:nevent1…` reference where the chart should appear and adds a [NIP-18](18.md) `q` tag:

```json
["q", "<chart-event-id>", "<relay-url>", "<chart-author-pubkey>"]
```

The `nevent` SHOULD include the kind (`1786`), a relay hint and the author. With the kind included, clients can tell that the reference is a chart before fetching it.

Clients that implement this NIP SHOULD draw the chart where the reference appears. Other clients treat the reference like any other quoted event, and the `alt` tag gives them something meaningful to show. Charts can also appear in feeds on their own.

Comments on a chart are [NIP-22](22.md) comments whose root scope is the chart, so their `K` tag is `1786`. Reposts are [NIP-18](18.md) `kind:16` events with `["k", "1786"]`. Reactions ([NIP-25](25.md)) and zaps ([NIP-57](57.md)) work the same as for any other event.

### Rendering rules

These rules apply to any client that draws `kind:1786` content, including any library it draws with.

#### Validation

1. Clients MUST check that the event is `kind:1786` and has exactly one non-empty `alt` tag. It MUST also have exactly one `dialect` tag, whose name the client supports and whose version is a positive integer that [Dialect versioning](#dialect-versioning) allows the client to render.
2. Clients MUST parse `.content` as I-JSON and treat any violation as invalid. They MUST NOT repair the document.
3. Clients MUST validate the whole document against the dialect before rendering it: closed objects, value ranges, limits and additional constraints. They MUST NOT render an invalid document, not even part of it. They MUST NOT drop unknown properties and render the rest.
4. Clients MUST render the object they validated, changing only the drawing size as rule 14 requires. They MUST NOT parse `.content` again between validating and rendering, and they MUST NOT merge it into their own renderer configuration.

#### No code

5. Clients MUST NOT evaluate any part of `.content`, `alt` or `summary` as code, an expression, a template, a regular expression, markup or a URL. They MUST render these strings as plain text. They MUST NOT turn them into links, mentions ([NIP-27](27.md)) or custom emoji ([NIP-30](30.md)).
6. Web renderers built on Vega MUST use Vega 6.2 or later and Vega-Lite 6.1 or later. Earlier Vega releases are affected by the advisories listed under [Design choices](#design-choices), and Vega-Lite 5 does not escape format strings in the code it generates (tested with 5.20 and 5.21). These renderers MUST evaluate the expressions that Vega-Lite generates internally with Vega's CSP-safe AST interpreter (`vega-interpreter`). They MUST NOT expose the Vega module or `View` instances as global variables. Global exposure was the precondition for CVE-2025-59840, which works even with the interpreter.

#### No network

7. Rendering a chart and interacting with it MUST NOT cause any network request. The only exception is the relay queries a client makes for Nostr events anyway, such as looking up a correction. That rules out loading data, images, fonts, stylesheets, scripts or schemas, building link previews, and sending telemetry. Renderers built on Vega MUST pass a loader whose `load`, `sanitize`, `http` and `file` methods all reject. Clients using `vega-embed` MUST disable its actions menu (`actions: false`), because its default "Open in Vega Editor" action sends the specification to an external site.
8. Tooltips MUST be built from text nodes. vega-tooltip's default handler renders an entry named `image` as `<img src="…">`, so hovering over a mark would request whatever URL the data contains. Clients MUST NOT use that behavior.

#### Isolation

9. The renderer MUST NOT have access to secret keys, signers ([NIP-07](07.md) `window.nostr` or [NIP-46](46.md) sessions), session tokens, cookies or client storage.
10. Web clients MUST render each chart in an `<iframe sandbox="allow-scripts">`, which gives the frame an opaque origin. They MUST NOT add `allow-same-origin`, `allow-popups`, `allow-top-navigation`, `allow-forms`, `allow-modals` or `allow-downloads`.

    The frame's document MUST carry a Content Security Policy that blocks every fetch and allows only the renderer's own script, by hash or nonce. The policy MUST NOT allow `'unsafe-eval'`, MUST NOT allow `'unsafe-inline'` scripts, and MUST set `form-action 'none'` and `base-uri 'none'`. For example:

    `default-src 'none'; script-src 'sha256-<renderer>'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'`

    The parent page sends the validated document with `postMessage`. The frame MUST accept a document only if `event.source` is `window.parent`, and the parent MUST accept a message only if `event.source` is that frame. A sandboxed frame can still navigate itself, and CSP cannot stop that, so the rules above still apply inside the sandbox.
11. Native clients SHOULD draw charts with native code. If they use a WebView, it MUST have network loads disabled, no JavaScript bridges, no file access and a non-persistent data store.
12. Clients MUST keep each chart inside its box. The renderer MUST NOT be able to navigate the client, open windows, download files, write to the clipboard or request permissions. Clients SHOULD frame each chart and show its author, so that text inside a chart cannot pass for the client's own interface.
13. Clients MAY impose limits stricter than the dialect's and fall back when a chart exceeds them. Clients SHOULD render a chart only once it is on screen.
14. Clients MUST set the chart's drawing width and height to the space they give it, overriding `width` and `height`. Discrete scales then shrink to fit. Without a fixed size, Vega-Lite gives each category 20 pixels, so 5,000 categories would make a 100,000-pixel view.

#### Presentation and accessibility

15. Clients SHOULD apply their own theme to charts, including the font, background, axis colors and default palette, so that charts match light and dark modes. Clients MAY replace author colors to meet contrast or color-vision needs. They MUST NOT change the data, scale domains, sort order, stacking or which marks are drawn.
16. Clients MUST display temporal values in UTC. They MUST format every number and date shown in axes, legends and tooltips with the conventions of d3's default `en-US` locale, whether or not the document gives a format, so every reader sees the same labels.
17. Clients MUST expose `alt` as the chart's accessible name and SHOULD expose `summary` as its accessible description. The author writes `alt`, and it may not match the data. Clients MAY therefore also announce a description they generate from the validated document, such as the chart type, the series and the value ranges.
18. Clients SHOULD offer a plain-text table of `data.values` that keyboard and assistive-technology users can reach.

#### Fallback

19. A client SHOULD display `alt` and `summary` when it does not support the kind or the dialect version, or when it finds the document invalid. It MAY also display `.content` as preformatted plain text.

### Dialect versioning

Versions are positive integers. Each version of a dialect MUST be a strict superset of the earlier ones, and a document that is valid in version N MUST mean the same thing in every later version.

A client that supports version N SHOULD render valid documents that declare version N or lower. It MUST NOT render a document that declares a higher version unless the document also validates against version N. In every other case the client falls back (rule 19).

New versions and new dialects are added by amending this NIP, for example a dialect for node-and-edge graphs. Every version and dialect is bound by the "no executable code" rule.

### Relays

Relays need no new behavior. They MAY reject `kind:1786` events whose `.content` is not valid JSON or exceeds 65,536 bytes.

## Examples

These examples are signed with a throwaway key whose secret is public, so don't reuse it. Their ids and signatures verify, and their contents meet every rule in this NIP.

### Simple bar chart

This is a unit document: one `bar` mark, weekdays in an explicit order, and SI-prefixed axis labels (`~s` turns 60000 into `60k`).

```json
{
  "id": "f9eb862d69e4c943af4da1cea750b5cb87e55325e0d147c40c6dc50ac7071ae1",
  "pubkey": "9428faefca1d6d9376bce0cf043b63ce457c90604a8df3f2ada9f604b334cc0b",
  "created_at": 1791201600,
  "kind": 1786,
  "tags": [
    ["dialect", "vega-lite-nostr", "1"],
    ["alt", "Bar chart of sats zapped per weekday (UTC), week of 28 Sep 2026. Highest: Saturday, 61,500 sats. Lowest: Wednesday, 18,200 sats. Total: 274,350 sats."],
    ["t", "zaps"]
  ],
  "content": "{\"title\":\"Sats zapped per weekday\",\"data\":{\"values\":[{\"day\":\"Mon\",\"sats\":21000},{\"day\":\"Tue\",\"sats\":33450},{\"day\":\"Wed\",\"sats\":18200},{\"day\":\"Thu\",\"sats\":40100},{\"day\":\"Fri\",\"sats\":52800},{\"day\":\"Sat\",\"sats\":61500},{\"day\":\"Sun\",\"sats\":47300}]},\"mark\":\"bar\",\"encoding\":{\"x\":{\"field\":\"day\",\"type\":\"ordinal\",\"title\":\"Day (UTC)\",\"sort\":[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\",\"Sun\"],\"axis\":{\"labelAngle\":0}},\"y\":{\"field\":\"sats\",\"type\":\"quantitative\",\"title\":\"Sats\",\"axis\":{\"format\":\"~s\"}}}}",
  "sig": "add8f2950a375bf92b3068cdd61707265e38d0c9d1328c59beee7ea85e84a15724d0a19c85fad082888bf747c75e61f8e8051061f32c769245678d10979742d4"
}
```

Decoded `.content`:

```json
{
  "title": "Sats zapped per weekday",
  "data": {
    "values": [
      {"day": "Mon", "sats": 21000},
      {"day": "Tue", "sats": 33450},
      {"day": "Wed", "sats": 18200},
      {"day": "Thu", "sats": 40100},
      {"day": "Fri", "sats": 52800},
      {"day": "Sat", "sats": 61500},
      {"day": "Sun", "sats": 47300}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "field": "day",
      "type": "ordinal",
      "title": "Day (UTC)",
      "sort": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "axis": {"labelAngle": 0}
    },
    "y": {
      "field": "sats",
      "type": "quantitative",
      "title": "Sats",
      "axis": {"format": "~s"}
    }
  }
}
```

### Line chart with hover tooltips

The second layer draws invisible points with a hover selection (`"fields": ["t"]`, `"nearest": true`). When the pointer comes near a point, the selection picks every point at that time on both lines and makes them opaque. `"tooltip": true` on the same layer shows the hovered point's encoded fields. The time is formatted with the `%H:%M` axis format on the UTC scale, so every reader sees `12:00` for `2026-10-09T12:00:00Z`.

The `e` tags link to the raw data, a NIP-94 CSV file, and to the first version of this chart, which had a typo.

```json
{
  "id": "4b1b4beef4f1ef5db8ce30d722af8d7b12d5cdaafae13ffe9b9ee1fa76a46963",
  "pubkey": "9428faefca1d6d9376bce0cf043b63ce457c90604a8df3f2ada9f604b334cc0b",
  "created_at": 1791622800,
  "kind": 1786,
  "tags": [
    ["dialect", "vega-lite-nostr", "1"],
    ["alt", "Line chart of median relay round-trip time on 9 Oct 2026 (UTC) for relay-a.example and relay-b.example. Both peak at 12:00 UTC, at 236 ms and 165 ms."],
    ["summary", "relay-a.example is slower than relay-b.example at every 3-hourly sample, by 34 to 71 ms. Both rise through the morning to a peak at 12:00 UTC (236 ms and 165 ms) and fall back by 21:00 (149 ms and 109 ms)."],
    ["e", "b292fe417328fdfaef7655b4de9fbfb1bf8634c9822537fb14629bcfdfcbc8dd", "wss://relay.example.com", "source", "9428faefca1d6d9376bce0cf043b63ce457c90604a8df3f2ada9f604b334cc0b"],
    ["e", "bbdc922810b63fae049c0d4e23a43c3b471a86298ad010da6c99ecf7ef2f3c45", "wss://relay.example.com", "supersedes", "9428faefca1d6d9376bce0cf043b63ce457c90604a8df3f2ada9f604b334cc0b"],
    ["t", "relays"]
  ],
  "content": "{\"title\":{\"text\":\"Relay round-trip time\",\"subtitle\":\"Median of 3-hourly probes, 9 Oct 2026 (UTC)\"},\"data\":{\"values\":[{\"t\":\"2026-10-09T00:00:00Z\",\"relay\":\"relay-a.example\",\"ms\":142},{\"t\":\"2026-10-09T03:00:00Z\",\"relay\":\"relay-a.example\",\"ms\":138},{\"t\":\"2026-10-09T06:00:00Z\",\"relay\":\"relay-a.example\",\"ms\":151},{\"t\":\"2026-10-09T09:00:00Z\",\"relay\":\"relay-a.example\",\"ms\":189},{\"t\":\"2026-10-09T12:00:00Z\",\"relay\":\"relay-a.example\",\"ms\":236},{\"t\":\"2026-10-09T15:00:00Z\",\"relay\":\"relay-a.example\",\"ms\":214},{\"t\":\"2026-10-09T18:00:00Z\",\"relay\":\"relay-a.example\",\"ms\":171},{\"t\":\"2026-10-09T21:00:00Z\",\"relay\":\"relay-a.example\",\"ms\":149},{\"t\":\"2026-10-09T00:00:00Z\",\"relay\":\"relay-b.example\",\"ms\":98},{\"t\":\"2026-10-09T03:00:00Z\",\"relay\":\"relay-b.example\",\"ms\":104},{\"t\":\"2026-10-09T06:00:00Z\",\"relay\":\"relay-b.example\",\"ms\":97},{\"t\":\"2026-10-09T09:00:00Z\",\"relay\":\"relay-b.example\",\"ms\":121},{\"t\":\"2026-10-09T12:00:00Z\",\"relay\":\"relay-b.example\",\"ms\":165},{\"t\":\"2026-10-09T15:00:00Z\",\"relay\":\"relay-b.example\",\"ms\":158},{\"t\":\"2026-10-09T18:00:00Z\",\"relay\":\"relay-b.example\",\"ms\":126},{\"t\":\"2026-10-09T21:00:00Z\",\"relay\":\"relay-b.example\",\"ms\":109}]},\"encoding\":{\"x\":{\"field\":\"t\",\"type\":\"temporal\",\"title\":\"Time (UTC)\",\"scale\":{\"type\":\"utc\"},\"axis\":{\"format\":\"%H:%M\"}},\"y\":{\"field\":\"ms\",\"type\":\"quantitative\",\"title\":\"Round-trip (ms)\"},\"color\":{\"field\":\"relay\",\"type\":\"nominal\",\"title\":\"Relay\"}},\"layer\":[{\"mark\":{\"type\":\"line\",\"interpolate\":\"monotone\"}},{\"mark\":{\"type\":\"point\",\"filled\":true,\"size\":70,\"tooltip\":true},\"params\":[{\"name\":\"hover\",\"select\":{\"type\":\"point\",\"on\":\"pointerover\",\"clear\":\"pointerout\",\"nearest\":true,\"fields\":[\"t\"]}}],\"encoding\":{\"opacity\":{\"condition\":{\"param\":\"hover\",\"value\":1,\"empty\":false},\"value\":0}}}]}",
  "sig": "ff7f65e9bf45b51f307f9bed40df767c74729f86e1de1985018067e8343e5435c99530d40f74a30f4e7c45518249d767153d2ea3cda4f1d076ffd83c869ae899"
}
```

Decoded `.content`:

```json
{
  "title": {"text": "Relay round-trip time", "subtitle": "Median of 3-hourly probes, 9 Oct 2026 (UTC)"},
  "data": {
    "values": [
      {"t": "2026-10-09T00:00:00Z", "relay": "relay-a.example", "ms": 142},
      {"t": "2026-10-09T03:00:00Z", "relay": "relay-a.example", "ms": 138},
      {"t": "2026-10-09T06:00:00Z", "relay": "relay-a.example", "ms": 151},
      {"t": "2026-10-09T09:00:00Z", "relay": "relay-a.example", "ms": 189},
      {"t": "2026-10-09T12:00:00Z", "relay": "relay-a.example", "ms": 236},
      {"t": "2026-10-09T15:00:00Z", "relay": "relay-a.example", "ms": 214},
      {"t": "2026-10-09T18:00:00Z", "relay": "relay-a.example", "ms": 171},
      {"t": "2026-10-09T21:00:00Z", "relay": "relay-a.example", "ms": 149},
      {"t": "2026-10-09T00:00:00Z", "relay": "relay-b.example", "ms": 98},
      {"t": "2026-10-09T03:00:00Z", "relay": "relay-b.example", "ms": 104},
      {"t": "2026-10-09T06:00:00Z", "relay": "relay-b.example", "ms": 97},
      {"t": "2026-10-09T09:00:00Z", "relay": "relay-b.example", "ms": 121},
      {"t": "2026-10-09T12:00:00Z", "relay": "relay-b.example", "ms": 165},
      {"t": "2026-10-09T15:00:00Z", "relay": "relay-b.example", "ms": 158},
      {"t": "2026-10-09T18:00:00Z", "relay": "relay-b.example", "ms": 126},
      {"t": "2026-10-09T21:00:00Z", "relay": "relay-b.example", "ms": 109}
    ]
  },
  "encoding": {
    "x": {
      "field": "t",
      "type": "temporal",
      "title": "Time (UTC)",
      "scale": {"type": "utc"},
      "axis": {"format": "%H:%M"}
    },
    "y": {"field": "ms", "type": "quantitative", "title": "Round-trip (ms)"},
    "color": {"field": "relay", "type": "nominal", "title": "Relay"}
  },
  "layer": [
    {
      "mark": {"type": "line", "interpolate": "monotone"}
    },
    {
      "mark": {"type": "point", "filled": true, "size": 70, "tooltip": true},
      "params": [
        {
          "name": "hover",
          "select": {
            "type": "point",
            "on": "pointerover",
            "clear": "pointerout",
            "nearest": true,
            "fields": ["t"]
          }
        }
      ],
      "encoding": {
        "opacity": {
          "condition": {"param": "hover", "value": 1, "empty": false},
          "value": 0
        }
      }
    }
  ]
}
```

### Embedding the chart in a note

The note cites the chart with a `nostr:nevent1…` reference, which carries the kind, a relay hint and the author, and with a `q` tag.

```json
{
  "id": "675266b77a2f87c8bf2d95b49f6c392af8a2610383b0e476921a4dc39b3a226a",
  "pubkey": "9428faefca1d6d9376bce0cf043b63ce457c90604a8df3f2ada9f604b334cc0b",
  "created_at": 1791623100,
  "kind": 1,
  "tags": [
    ["q", "4b1b4beef4f1ef5db8ce30d722af8d7b12d5cdaafae13ffe9b9ee1fa76a46963", "wss://relay.example.com", "9428faefca1d6d9376bce0cf043b63ce457c90604a8df3f2ada9f604b334cc0b"]
  ],
  "content": "Round-trip times to both relays I probe peaked around midday UTC yesterday. Corrected chart (the first version had a typo at 12:00):\n\nnostr:nevent1qqsykx6tam60rm6ahr8rp4ez47xhkyk4ek404cfll6deac06w6jxjccpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mgzyz2z37h0egwkmymkhnsv7ppmv08y2lysvp9gmulj4k5lvp9nxnxqkqcyqqqqd7s4u6pj7",
  "sig": "88ef77950cefeaa3650517d416a7e57887f07541b3c4b2a5b4406b2ce516d3d8064a9fb008f501fe9f6c81ff1cb627129f92ae609f5167f3244b90432683d8f9"
}
```
