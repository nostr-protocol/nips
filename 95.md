# NIP-95: Code Snippets

`draft` `optional`

## Abstract

This NIP defines a new event kind for sharing and storing code snippets. Unlike regular text notes (`kind:1`), code snippets have specialized metadata like language, extension, and other code-specific attributes that enhance discoverability, syntax highlighting, and improved user experience.

## Event Kind

This NIP defines `kind:1337` as a code snippet event.

The `.content` field contains the actual code snippet text.

## Required Tags

- `f` - Filename of the code snippet

## Optional Tags

- `l` - Programming language name (lowercase). Examples: "javascript", "python", "rust"
- `x` - File extension (without the dot). Examples: "js", "py", "rs"
- `description` - Brief description of what the code does
- `runtime` - Runtime or environment specification (e.g., "node v18.15.0", "python 3.11")
- `license` - License under which the code is shared (e.g., "MIT", "GPL-3.0", "Apache-2.0")
- `dep` - Dependency required for the code to run (can be repeated)
- `repo` - Reference to a repository where this code originates
- `version` - Version of the code or library

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
    ["x", "js"],
    ["f", "hello-world.js"],
    ["description", "A basic JavaScript function that prints 'Hello, Nostr!' to the console"],
    ["runtime", "node v18.15.0"],
    ["license", "MIT"],
    ["dep", "none"],
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

## Relay Behavior

Relays supporting this NIP SHOULD:

1. Index code snippets by language for efficient retrieval
2. Honor standard NIP-01 behaviors for storing and querying events

## Discovery and Search

Clients MAY implement specialized search for code snippets using combinations of:

1. Filename
2. Language
3. Extension
4. Content text

## Examples

### Simple JavaScript Function

```json
{
  "kind": 1337,
  "content": "function calculateSum(a, b) {\n  return a + b;\n}\n\nconsole.log(calculateSum(5, 10));",
  "tags": [
    ["l", "javascript"],
    ["x", "js"],
    ["f", "sum-calculator.js"],
    ["description", "A function that calculates the sum of two numbers"]
  ]
}
```

### Python Class Example

```json
{
  "kind": 1337,
  "content": "class Person:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n\n    def greet(self):\n        return f\"Hello, my name is {self.name} and I am {self.age} years old.\"\n\n# Create a person object\njohn = Person(\"John\", 30)\nprint(john.greet())",
  "tags": [
    ["l", "python"],
    ["x", "py"],
    ["f", "person-class.py"],
    [
      "description",
      "A simple Python class representing a person with greeting functionality"
    ],
    ["runtime", "python 3.11"]
  ]
}
```

## Motivation

Code sharing is a common activity in developer communities. Having a standardized way to share code snippets through Nostr facilitates developer collaboration, learning, and discovery. This NIP provides a structured approach to code sharing that enhances the experience beyond what's possible with simple text notes.

## Extensions and Interoperability

This NIP can be extended in the future to support:

1. Multi-file snippets
2. Version control history for snippets
3. Integration with execution environments

## Implementations

- [notebin.io](https://notebin.io)
