NIP-C0
======

Code Snippets
-------------

`draft` `optional`

## Abstract

This NIP defines a new event kind for sharing and storing code snippets. Unlike regular text notes (`kind:1`), code snippets have specialized metadata like language, extension, and other code-specific attributes that enhance discoverability, syntax highlighting, and improved user experience.

## Event Kind

This NIP defines `kind:1337` as a code snippet event.

The `.content` field contains the actual code snippet text.

## Optional Tags

- `l` - Programming language name (lowercase). Examples: "javascript", "python", "rust"
- `name` - Name of the code snippet, commonly a filename. Examples: "hello-world.js", "quick-sort.py"
- `extension` - File extension (without the dot). Examples: "js", "py", "rs"
- `description` - Brief description of what the code does
- `runtime` - Runtime or environment specification (e.g., "node v18.15.0", "python 3.11")
- `license` - License under which the code (along with any related data contained within the event, when available, such as the description) is shared. This MUST be a standard [SPDX](https://spdx.org/licenses/) short identifier (e.g., "MIT", "GPL-3.0-or-later", "Apache-2.0") when available. An additional parameter containing a reference to the actual text of the license MAY be provided. This tag can be repeated, to indicate multi-licensing, allowing recipients to use the code under any license of choosing among the referenced ones
- `dep` - Dependency required for the code to run (can be repeated)
- `repo` - Reference to a repository where this code originates. This MUST be either a standard URL or, alternatively, the address of a [NIP-34](34.md) Git repository announcement event in the form `"30617:<32-bytes hex a pubkey>:<d tag value>"`. If a repository announcement is referenced, a recommended relay URL where to find the event should be provided as an additional parameter

## Format

```json
{
  "id": "<32-bytes lowercase hex-encoded SHA-256 of the the serialized event data>",
  "pubkey": "<32-bytes lowercase hex-encoded public key of the event creator>",
  "created_at": <Unix timestamp in seconds>,
  "kind": 1337,
  "content": "function helloWorld() {\n  console.log('Hello, Nostr!');\n}\n\nhelloWorld();",
  "tags": [
    ["l", "javascript"],
    ["extension", "js"],
    ["name", "hello-world.js"],
    ["description", "A basic JavaScript function that prints 'Hello, Nostr!' to the console"],
    ["runtime", "node v18.15.0"],
    ["license", "MIT"],
    ["repo", "https://github.com/nostr-protocol/nostr"]
  ],
  "sig": "<64-bytes signature of the id>"
}
```

## Client Behavior

Clients that support this NIP SHOULD:

1. Display code snippets with proper syntax highlighting based on the language.
2. Allow copying the full code snippet with a single action.
3. Render the code with appropriate formatting, preserving whitespace and indentation.
4. Display the language and extension prominently.
5. Provide "run" functionality for supported languages when possible.
6. Display the description (if available) as part of the snippet presentation.

Clients MAY provide additional functionality such as:

1. Code editing capabilities
2. Forking/modifying snippets
3. Creating executable environments based on the runtime/dependencies
4. Downloading the snippet as a file using the provided extension
5. Sharing the snippet with attribution
