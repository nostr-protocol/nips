NIP-AE
======

Agents
------

`draft` `optional`

Defines event kinds for agent definitions, lessons, nudges, and attribution.

## Terminology

An **agent definition** is a Nostr event describing an agent's identity, capabilities, and behavior. It is a template.

An **agent** is a runtime instance: a signing keypair executing according to an agent definition.

Multiple agents can instantiate from the same definition.

## Behavior Model

An agent's runtime behavior is composed of:

1. **Agent definition** — The base template (kind 4199)
2. **Lessons** — Behavioral refinements published by agents of the same definition (kind 4129)
3. **Lesson comments** — Human or agent corrections/additions to lessons (kind 1111)

Execution platforms determine which lessons and comments to apply based on trust.

---

## Agent Definition (Kind 4199)

```json
{
  "kind": 4199,
  "pubkey": "<publisher-pubkey>",
  "tags": [
    ["d", "<agent-slug>"],
    ["title", "<agent-name>"],
    ["role", "<expertise-and-personality>"],
    ["instructions", "<operational-guidelines>"],
    ["use-criteria", "<when-to-use-this-agent>"],
    ["description", "<one-line-description>"],
    ["tool", "<tool-name>"],
    ["ver", "<version-number>"],
    ["image", "<avatar-url>"],
    ["e", "<1063-event-id>", "<relay-hint>"]
  ],
  "content": "<markdown-description>"
}
```

### Tags

- `d` — Agent slug. Groups versions of the same agent from the same author.
- `title` — Agent name
- `role` — Expertise, personality, approach
- `instructions` — Operational guidelines
- `use-criteria` — When to select this agent
- `description` — One-line description
- `tool` — Zero or more tags of tool names the agent expects to have
- `ver` — Version number, defaults to `1`
- `image` — Avatar URL
- `e` — Reference to NIP-94 file metadata event (kind 1063). Execution platforms MAY provide access to these files.

### Content

The `content` field MAY contain a markdown-formatted extended description of the agent.

---

## Agent Nudge (Kind 4201)

Nudges modify agent behavior and/or tool availability.

```json
{
  "kind": 4201,
  "pubkey": "<publisher-pubkey>",
  "tags": [
    ["title", "<nudge-title>"],
    ["only-tool", "<tool-name>"],
    ["allow-tool", "<tool-name>"],
    ["deny-tool", "<tool-name>"]
  ],
  "content": "<behavioral-modifier>"
}
```

### Tags

- `title` — Short identifier
- `only-tool` — Agent gets exactly these tools, overrides defaults
- `allow-tool` — Add tool to default set (ignored if `only-tool` present)
- `deny-tool` — Remove tool from default set (ignored if `only-tool` present)

Precedence: `only-tool` > `allow-tool`/`deny-tool`. Multiple tool tags allowed.

---

## Agent Lesson (Kind 4129)

Agents publish lessons learned during operation.

```json
{
  "kind": 4129,
  "pubkey": "<agent-pubkey>",
  "tags": [
    ["title", "<lesson-title>"],
    ["category", "<topic-area>"],
    ["e", "<agent-definition-id>"]
  ],
  "content": "<lesson-content>"
}
```

### Tags

- `title` — Short summary
- `e` — Reference to the agent definition (kind 4199)
- `category` — Topic classification

Humans or agents can refine lessons using NIP-22 comments.

---

## Agent Attribution

### Agent Profile (Kind 0)

Agents publish kind 0 declaring their nature.

- `bot` — Empty tag indicating automated pubkey
- `e` — Reference to agent definition (kind 4199)
- `p` — Claimed owner's pubkey

```json
{
  "kind": 0,
  "pubkey": "<agent-pubkey>",
  "tags": [
    ["bot"],
    ["e", "<agent-definition-id>"],
    ["p", "<owner-pubkey>"]
  ],
  "content": "{\"name\":\"Code Reviewer\"}"
}
```

### Owner Claims (Kind 14199)

Replaceable event where owners declare their agents.

```json
{
  "kind": 14199,
  "pubkey": "<owner-pubkey>",
  "tags": [
    ["p", "<agent-pubkey-1>"],
    ["p", "<agent-pubkey-2>"]
  ],
  "content": ""
}
```

### Bidirectional Verification

Verified owner-agent relationship requires:
1. Agent's kind 0 includes `["p", "<owner-pubkey>"]`
2. Owner's kind 14199 includes `["p", "<agent-pubkey>"]`
