NIP-XX
======

Commands
--------

`draft` `optional`

A command is an interface published by a service, invoked as plain text in the content of any event. Invocations carry no tags and require no client support.

## Command definition

A kind `31992` event defines a command using the following tags:

- `command` - the trigger, without a leading slash. Required.
- `title` - short human-readable name. Required.
- `description` - usage, including any reply or context conventions. Required.
- `arg` - one argument. Ordered.
- `s` - a `scope` (defined below) indicating what events trigger this command.
- `ignore` - subtractive `scope` indicating exceptions to matched scopes.

An `arg` tag is `["arg", <name>, <type>, "required" | "optional", <label>, <choice>...]`. `<choice>` elements apply to type `enum` only.

Arguments are positional. Optional/text arguments MUST come after required arguments, and there can be at most one of either.

`scopes` are defined as follows:

- `kind:<kind>` - an invocation's `kind` must match `<kind>`.
- `relay:<url>` - the executor only listens on the given `<url>`.
- `author:<pubkey>` - an invocation must have an `author` matching `<pubkey>`.
- `tag:<tag>:<value>` - an invocation must have a `<tag>` tag matching `{value}`.

Scopes combine like a filter: those of the same type (grouped by tag name, for `tag` scopes) are alternatives, scopes of different types must all match, and an absent type is unrestricted. Ignored scopes combine the same way, and the final set should be the difference between the two.

```json
{
  "kind": 31992,
  "tags": [
    ["d", "8f2c1a"],
    ["command", "ban"],
    ["title", "Ban a user"],
    ["description", "Removes a user. Reply to a message to ban its author."],
    ["arg", "target", "pubkey", "required", "Who to ban"],
    ["arg", "reason", "text", "optional", "Why"],
    ["s", "kind:9"],
    ["s", "kind:11"],
    ["s", "tag:h:62af9b0"],
    ["s", "relay:wss://relay.example"],
    ["ignore", "tag:p:<some guy who like to invoke commands for no reason>"]
  ]
}
```

## Invocation

```
/<command>[@<pubkey>] [<arg>...] [<text>]
```

Invocations appear in the `content` of any event and carry no tags.

- An invocation MUST begin at index `0` of `content`.
- `<pubkey>` is `npub1…`, and terminates at the end of the bech32 character set.
- Without `<pubkey>`, the invocation targets every command whose `command` tag matches and whose scope includes the event, which may result in multiple invocations across different executors.
- Arguments are separated by whitespace. A `text` argument consumes the remainder of `content` verbatim, including whitespace and newlines.

```
/ban@npub1qqqs... nostr:npub1abcd... repeatedly spamming links
/ban
```

## Argument types

- `pubkey` - hex, `npub1…`, `nprofile1…`
- `event` - hex, `note1…`, `nevent1…`
- `address` - `naddr1…`
- `relay` - websocket URL
- `number` - decimal digits
- `bool` - `true|false|yes|no|1|0|t|f|y|n`
- `enum` - one of the `<choice>` values on the `arg` tag
- `word` - any run of non-whitespace characters
- `text` - the remainder of `content`

## Executor behavior

An executor reads events within the scope it declares and matches invocations against its own definitions. It MUST ignore content not beginning at index `0`, and MUST accept both the bare and `nostr:`-prefixed forms of a qualifier and of any argument.

Executors may document additional trigger conditions, reply conventions, or ways to bring in additional context in the `description`. For example, a bot may take a `q` tagged event into consideration, or respond multiple times with emojis, zaps, comments, emails, etc.

## Client behavior

All client support is optional.

Clients MAY offer autocomplete for definitions in scope, insert arguments through a picker appropriate to each type, and render recognized invocations as a chip. A client SHOULD omit `@<pubkey>` and MAY insert it to target a single executor. Where a trigger resolves to more than one definition, a client SHOULD present all of them.

A client MUST NOT require its own support to send an invocation, and MUST send content that fails to parse as ordinary text.

## Command discovery

Commands should be published to relays where they can be discovered by the relevant users:

- For commands related to relays-as-groups or nip29 groups, command definitions and invocations should be published to the group relay
- For commands related to broadcast social media use cases, command definitions should be published to executor outboxes and optionally command-specific indexing relays, while command invocations should be published to executor inboxes.
