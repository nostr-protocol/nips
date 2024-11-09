
NIP-XX
======

Out-of-line Styles
------------------

`draft` `optional`

Out-of-line styles are text formatting data not inlined in the
event's `.content` field but placed into `st` (style) tags.

## Motivation

With markup languages such as Markdown, AsciiDoc and HTML, clients
would be required to add an ever growing number of parsers to
support textual event kinds.

If keeping `.content` field limited to plaintext,
clients can show text with no extraneous markup delimiter chars
that could impact readability.

When a client chooses to support formatting, it can
add parser code just once and it will work for all textual
events. If the parser in incomplete, there is not much
problem because the raw text inside `.content` is perfectly readable.

## Writing Text

A client should offer text formatting in any markup language,
for example, WYSIWYG powered by HTML, or Markdown editor.
However, before saving the event it should transform the resulting
text into an unformatted `.content` with added style tags.

## Style Tags

A style tag delimits an inclusive character range
and specifies a style to be applied using the following syntax:
`["st", "<starting-character-index>:<ending-character-index>", "<style-name>"]`

### Style Names

- `h<1-to-9>`: Header (h1) or subheader
- `strong`: Strong importance; should use heavier weight font.
- `em`: Emphasis; should use italic type.
- `small`: Small print, like copyright and legal text. Use smaller font-size.
- `strike`: Stricken text. Should remove leading and trailing `-`.
- `del`: Deleted text, such as after a git commit. Should remove leading `-` and spaces.
- `ins`: Inserted text, such as after a git commit. Should remove leading `+` and spaces.
- `sub`: Text should be displayed as subscript.
- `sup`: Text should be displayed as superscript.
- `link`: Alternative text to be displayed in place of a URL as a link. The alternative text can't itself be a URL.
E.g.: `["st", "0:35", "link", "my previous post"]`
- `mark` Text should be highlighted with a different background color.
- `quote`: Quoted text. Should remove leading and trailing `"`.
- `dsv` or `dsv:<delimiter-char-sequence>`: Delimiter separated value. The default delimiter is `|`.
Another delimiter that doesn't clash with the actual values may be choosed, e.g.: `dsv:#-#`. Values should be trimmed.
- `code` or `code:<lowercase-language-name-without-space>)`: Displays code, optionally in some language.

Styles may be combined, for instance, a `dsv`'s header may have its char range set to `h1`.

## Example

```js
{
  "tags": [
    ["st", "0:7", "h1"],
    ["st", "10:29", "h2"],
    ["st", "51:51", "h1"],
    ["st", "10:71", "dsv"]
  ],
  "content": "My Title

  |    B    |    C
D | Item B1 | Item C1
E | Item B2 | Item C2

  • Bullet points don't need style tags
  • I simply used spaces to ident these
  1) Here too
  1.1) Example"
  // other fields
}
```
