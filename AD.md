NIP-AD
======

MCP Server and Skill Announcements
----------------------------------

`draft` `optional`

Defines event kinds for announcing MCP servers and skills.

---

## MCP Server Announcement (Kind 4200)

Announces an MCP server that provides tools to agents.

```json
{
  "kind": 4200,
  "pubkey": "<publisher-pubkey>",
  "tags": [
    ["name", "<server-name>"],
    ["description", "<what-the-server-does>"],
    ["command", "<execution-command>"]
  ],
  "content": ""
}
```

### Tags

- `name` — Server identifier
- `description` — What the server provides
- `command` — Command to start the server (e.g., `npx @anthropic-ai/mcp-server-fetch`)

---

## Skill Announcement (Kind 4202)

Announces a skill—packaged capabilities with instructions and associated files.

```json
{
  "kind": 4202,
  "pubkey": "<publisher-pubkey>",
  "tags": [
    ["title", "<skill-name>"],
    ["description", "<what-the-skill-does>"],
    ["e", "<1063-event-id>"],
    ["license", "<SPDX-identifier>"]
  ],
  "content": "<skill-instructions>"
}
```

### Tags

- `title` — Skill name
- `description` — One-line description
- `e` — Reference to NIP-94 file metadata (kind 1063), one or more
- `license` — SPDX license identifier

### Content

Contains skill instructions in markdown, injected into agent context when active.

### Referenced Files

Each `e` tag references a kind 1063 event with:
- `url` — File location
- `name` — Relative filepath for installation
- `m` — MIME type
- `x` — SHA-256 hash
