NIP-XX
======

AI Agent Messages
-----------------

`draft` `optional`

This NIP defines a protocol for bidirectional communication between Nostr clients
and AI agent runtimes over Nostr relays.

Until a NIP number is assigned, this document uses placeholder number `XX` in the
title and filename.

## Kinds

This NIP reserves the following kinds for AI Agent communication:

| Kind  | Description            | Ephemeral |
| ----- | ---------------------- | --------- |
| 25800 | ai.status              | Yes       |
| 25801 | ai.delta               | Yes       |
| 25802 | ai.prompt              | No        |
| 25803 | ai.response            | No        |
| 25804 | ai.tool_call           | Yes       |
| 25805 | ai.error               | Yes       |
| 25806 | ai.cancel              | Yes       |
| 31340 | ai.info                | No        |

Prompt events (`25802`) and response events (`25803`) are non-ephemeral, allowing
durable prompt/response replay for state restoration and audit. Streaming/tooling
telemetry (`25800`, `25801`, `25804`, `25805`, `25806`) remains ephemeral.

## Rationale

Nostr has emerged as a universal transport for decentralized applications.
AI agents are increasingly being deployed as networked services, and this protocol
adds messaging shape for interactive, sessioned, streaming agent workflows.

- **Decentralized identity**: Agents and clients identify via Nostr pubkeys.
- **Interactive sessions**: Support multi-turn workflows with optional session grouping.
- **Streaming**: Delta events let clients render partial output.
- **Tool telemetry**: Agents can expose tool activity.
- **Structured discovery**: `ai.info` advertises capabilities, limits, and supported formats.

## Definitions

### Run

A **run** is a single prompt/response interaction.

- One prompt event (`ai.prompt`, kind `25802`).
- Optional cancellation request (`ai.cancel`, kind `25806`) from client while non-terminal.
- Optional status (`ai.status`, kind `25800`) and delta (`ai.delta`, kind `25801`) events.
- Optional tool-call events (`ai.tool_call`, kind `25804`).
- Exactly one terminal event: `ai.response` (`25803`) or `ai.error` (`25805`).

The run identifier is the **prompt event id** (hex string). Non-prompt events MUST
reference it in an `e` tag with marker `root`.

### Session

A **session** groups related runs.

- The `s` tag identifies a session.
- `s` is optional on protocol events.
- If `s` is omitted, recipients SHOULD use `sender:<lowercase-hex-pubkey>`.
- The default is deterministic and can be reproduced by all parties.

Clients MAY also use `["s","session:<opaque-hash>"]` for higher-level session IDs.

### Actors

- **Client**: User-facing app that sends prompts and renders agent output.
- **Agent Runtime**: Nostr-native service that processes prompts.
- **Relays**: Transport/storage layer.

## Encryption

All protocol payloads in encrypted event kinds (`25800`, `25801`, `25802`, `25803`,
`25804`, `25805`, `25806`) MUST use [NIP-44](44.md) v2.

### Required tag

All encrypted events in this NIP MUST include:

```text
["encryption", "nip44_v2"]
```

If an agent and client both publish additional supported encryption schemes, senders
MUST choose a scheme supported by both sides.
If no overlap exists, implementations MUST fail the request with
`UNSUPPORTED_ENCRYPTION`.

### Key agreement

Encryption uses the sender’s private key and recipient’s public key.
In nostr-tools this is:

```javascript
const conversationKey = nip44.v2.utils.getConversationKey({
  privateKey: senderPrivateKey,
  publicKey: recipientPublicKey
})
const encrypted = nip44.v2.encrypt(plaintext, conversationKey)
```

The plaintext must be JSON with a `ver` field.

Each message MUST use a fresh nonce as defined by NIP-44 v2.

### NIP-59 metadata privacy (optional)

NIP-44 encrypts content, but event metadata remains visible:
authors, pubkeys, tags, timestamps, and kind.

Clients and runtimes MAY wrap these events using [NIP-59](59.md) for metadata
privacy. When gift-wrapped:

- routing SHOULD use the outer wrapper’s `p` tag and `kinds` filters;
- inner tags are not intended for relay indexing;
- clients still need to unwrap before applying payload validation.

This NIP defines two privacy profiles:

1. **default**: NIP-44 encryption only.
2. **privacy-first**: NIP-44 + NIP-59 wrapping + minimal disclosure in tool output.

If wrapped, tool metadata in `ai.tool_call` should avoid sensitive argument/output fields.

## Event Formats

All fields marked `required` in tables and schemas below MUST be present.

For any event type where a field is repeated in both encrypted content and a tag
(`tool`, `phase`, etc.), the encrypted content is the canonical source of truth.
If a mirror tag is present and differs from the encrypted payload, implementations
MAY reject the event as `INVALID_SCHEMA`.

### `ai.info` (kind 31340)

Agent capability discovery event. This is a replaceable event (`kind 31340`).
Agents SHOULD publish this in their pubkey namespace.

**Tags**

| Tag | Required | Description |
|-----|----------|-------------|
| d   | Yes      | Fixed identifier, e.g. `"agent-info"` |

Agents SHOULD keep exactly one active `d` value and SHOULD not change it after first
publication, so clients can reliably cache capabilities.

Clients SHOULD cache the newest valid `ai.info` publication by `(created_at, id)` and
refresh cached capabilities when capability entries change.

**Content (JSON, unencrypted)**

```json
{
  "ver": 1,
  "supports_streaming": true,
  "supports_nip59": true,
  "dvm_compatible": false,
  "encryption": ["nip44_v2"],
  "supported_models": ["gpt-4.1-mini", "llama-3.1-70b"],
  "default_model": "gpt-4.1-mini",
  "tool_names": ["web_fetch", "calculator"],
  "tool_schema_version": 1,
  "max_prompt_bytes": 32000,
  "max_context_tokens": 128000,
  "tool_schemas": {
    "calculator": {
      "schema_version": 1,
      "description": "Evaluate arithmetic expressions",
      "requires_approval": false,
      "input_schema": {
        "type": "object",
        "properties": {
          "expr": { "type": "string" },
          "precision": { "type": "number" }
        },
        "required": ["expr"]
      }
    }
  },
  "pricing_hints": {
    "currency": "USD",
    "per_1k_prompt_tokens": 0.002,
    "per_1k_output_tokens": 0.004
  }
}
```

### Model and schema negotiation

Clients SHOULD use `ai.info` before sending prompts. For each prompt:

- If `model` is omitted, agents SHOULD use `default_model`.
- If `model` is set, the agent MUST have it listed in `supported_models`.
- If the sender supplies `tool_schema_version`, the agent MUST use that exact version.
- If the sender omits `tool_schema_version`, agents MUST use `tool_schema_version` from
  their latest `ai.info`.
- If no compatible model/schema is advertised/supported, the agent MUST return an
  `ai.error` with:
  - `UNSUPPORTED_MODEL` when the requested model is unknown.
  - `UNSUPPORTED_SCHEMA_VERSION` when the requested `tool_schema_version` is
    incompatible.
  and MUST NOT continue execution.

The `tool_schema_version` requested in a prompt binds accepted `ai.tool_call` JSON
shapes for that run.

### Prompt (kind 25802)

Client → agent invocation.

**Tags**

| Tag        | Required | Description |
|------------|----------|-------------|
| p          | Yes      | Agent recipient pubkey |
| encryption | Yes      | Must be `"nip44_v2"` |
| s          | No       | Session identifier |

**Content (JSON, encrypted)**

```json
{
  "ver": 1,
  "message": "user's message text",
  "thinking": "low|medium|high|max",
  "provider": "optional provider identifier",
  "model": "optional model name",
  "tool_schema_version": 1,
  "fallback_models": ["list", "of", "fallbacks"]
}
```

### Cancel (kind 25806)

Client → agent cancellation request.

Clients MAY emit this if they lose UI interest in a run.
Agents SHOULD treat `ai.cancel` as idempotent for the same run (`p` + `e`).
Agents MUST ignore `ai.cancel` for completed runs and MUST NOT emit additional terminal
events in that case.

**Tags**

| Tag        | Required | Description |
|------------|----------|-------------|
| p          | Yes      | Agent recipient pubkey |
| e          | Yes      | Prompt id (`#e` root) |
| encryption | Yes      | Must be `"nip44_v2"` |
| s          | No       | Session identifier |

**Content (JSON, encrypted)**

```json
{
  "ver": 1,
  "reason": "user_cancel|timeout|policy"
}
```

### Response (kind 25803)

Agent → client terminal response.

**Tags**

| Tag        | Required | Description |
|------------|----------|-------------|
| p          | Yes      | Client recipient pubkey |
| e          | Yes      | Prompt id (`#e` root) |
| encryption | Yes      | Must be `"nip44_v2"` |
| s          | No       | Session identifier |

**Content (JSON, encrypted)**

```json
{
  "ver": 1,
  "text": "complete agent response",
  "timestamp": 1710000000,
  "usage": {
    "input_tokens": 100,
    "output_tokens": 250
  }
}
```

### Delta (kind 25801)

Agent → client streaming fragment.

**Tags**

| Tag        | Required | Description |
|------------|----------|-------------|
| p          | Yes      | Client recipient pubkey |
| e          | Yes      | Prompt id (`#e` root) |
| encryption | Yes      | Must be `"nip44_v2"` |
| s          | No       | Session identifier |

**Content (JSON, encrypted)**

```json
{
  "ver": 1,
  "text": "partial response text",
  "seq": 0
}
```

`seq` MUST be strictly increasing by `1` within a run.

### Status (kind 25800)

Agent → client state updates.

**Tags**

| Tag        | Required | Description |
|------------|----------|-------------|
| p          | Yes      | Client recipient pubkey |
| e          | Yes      | Prompt id (`#e` root) |
| encryption | Yes      | Must be `"nip44_v2"` |
| s          | No       | Session identifier |

**Content (JSON, encrypted)**

```json
{
  "ver": 1,
  "state": "thinking|tool_use|done",
  "progress": 50,
  "info": "additional status info"
}
```

### Tool Call (kind 25804)

Agent tool-call telemetry. Agents own tool execution.

For this section, payload fields are canonical (`name` and `phase`), and `tool` and
`phase` tags are optional index hints only.

If any optional hint tag is present, it SHOULD match the encrypted payload field.
A mismatch MAY be treated as `INVALID_SCHEMA`.

To reduce telemetry leakage, agents SHOULD avoid including sensitive data in `output`
unless strictly required for user intent; clients SHOULD treat tool output as potentially
untrusted and avoid surfacing secrets.

**Tags**

| Tag        | Required | Description |
|------------|----------|-------------|
| p          | Yes      | Client recipient pubkey |
| e          | Yes      | Prompt id (`#e` root) |
| encryption | Yes      | Must be `"nip44_v2"` |
| s          | No       | Session identifier |
| tool       | No       | Optional index hint |
| phase      | No       | Optional index hint: `start`/`result` |

**Content (JSON, encrypted)**

```json
{
  "ver": 1,
  "name": "calculator",
  "phase": "start|result",
  "arguments": {
    "expr": "12 * 7"
  },
  "output": {
    "stdout": "84",
    "stderr": "",
    "exit_code": 0
  },
  "success": true,
  "duration_ms": 120
}
```

### Error (kind 25805)

Terminal failure event.

**Tags**

| Tag        | Required | Description |
|------------|----------|-------------|
| p          | Yes      | Client recipient pubkey |
| e          | Yes      | Prompt id (`#e` root) |
| encryption | Yes      | Must be `"nip44_v2"` |
| s          | No       | Session identifier |

**Content (JSON, encrypted)**

```json
{
  "ver": 1,
  "code": "RATE_LIMIT",
  "message": "provider unavailable",
  "retry_after": 30,
  "details": {
    "provider": "provider-id"
  }
}
```

Error codes:

| Code               | Meaning |
|--------------------|---------|
| UNSUPPORTED_ENCRYPTION | Requested encryption scheme unsupported |
| UNSUPPORTED_MODEL  | Requested model unavailable |
| UNSUPPORTED_SCHEMA_VERSION | Requested tool schema version unsupported |
| CANCELLED          | Run cancelled |
| RATE_LIMIT         | Request throttled |
| UNAUTHORIZED       | Sender or agent unauthorized |
| BLOCKED_SENDER     | Sender blocked by policy |
| MODEL_UNAVAILABLE  | Requested model/provider unavailable |
| SESSION_LIMIT      | Session turns exceeded |
| PARSE_ERROR        | Prompt payload invalid |
| EMPTY_RESPONSE     | No response produced |
| TOOL_ERROR         | Tool execution failed |
| INVALID_SCHEMA     | Payload failed schema validation |
| UNSUPPORTED_FEATURE | Requested feature/tool/scheme unsupported |
| INVALID_SEQUENCE    | Delta sequence invalid for this run |
| INTERNAL_ERROR     | Unexpected runtime failure |

## JSON Schema

### Common fields

```json
{
  "$id": "https://example.com/nip-xx-agent-message.json",
  "type": "object",
  "required": ["ver"],
  "properties": {
    "ver": { "const": 1 }
  },
  "additionalProperties": true
}
```

### Prompt schema (`25802`)

```json
{
  "$id": "https://example.com/nip-xx-prompt.json",
  "type": "object",
  "required": ["ver", "message"],
  "properties": {
    "ver": { "const": 1 },
    "message": { "type": "string", "minLength": 1 },
    "thinking": { "type": "string", "enum": ["low", "medium", "high", "max"] },
    "provider": { "type": "string", "minLength": 1 },
    "model": { "type": "string", "minLength": 1 },
    "tool_schema_version": { "type": "integer", "minimum": 1 },
    "fallback_models": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

### Cancel schema (`25806`)

```json
{
  "$id": "https://example.com/nip-xx-cancel.json",
  "type": "object",
  "required": ["ver", "reason"],
  "properties": {
    "ver": { "const": 1 },
    "reason": { "type": "string", "enum": ["user_cancel", "timeout", "policy"] }
  }
}
```

### Response schema (`25803`)

```json
{
  "$id": "https://example.com/nip-xx-response.json",
  "type": "object",
  "required": ["ver", "text"],
  "properties": {
    "ver": { "const": 1 },
    "text": { "type": "string" },
    "timestamp": { "type": "integer", "minimum": 0 },
    "usage": {
      "type": "object",
      "properties": {
        "input_tokens": { "type": "integer", "minimum": 0 },
        "output_tokens": { "type": "integer", "minimum": 0 }
      },
      "required": ["input_tokens", "output_tokens"]
    }
  }
}
```

### Delta schema (`25801`)

```json
{
  "$id": "https://example.com/nip-xx-delta.json",
  "type": "object",
  "required": ["ver", "text", "seq"],
  "properties": {
    "ver": { "const": 1 },
    "text": { "type": "string" },
    "seq": { "type": "integer", "minimum": 0 }
  }
}
```

### Status schema (`25800`)

```json
{
  "$id": "https://example.com/nip-xx-status.json",
  "type": "object",
  "required": ["ver", "state"],
  "properties": {
    "ver": { "const": 1 },
    "state": { "type": "string", "enum": ["thinking", "tool_use", "done"] },
    "progress": { "type": "integer", "minimum": 0, "maximum": 100 },
    "info": { "type": "string" }
  }
}
```

### Tool-call schema (`25804`)

```json
{
  "$id": "https://example.com/nip-xx-tool-call.json",
  "type": "object",
  "required": ["ver", "name", "phase"],
  "properties": {
    "ver": { "const": 1 },
    "name": { "type": "string", "minLength": 1 },
    "phase": { "type": "string", "enum": ["start", "result"] },
    "arguments": { "type": "object" },
    "output": { "type": "object" },
    "success": { "type": "boolean" },
    "duration_ms": { "type": "integer", "minimum": 0 }
  }
}
```

### Error schema (`25805`)

```json
{
  "$id": "https://example.com/nip-xx-error.json",
  "type": "object",
  "required": ["ver", "code", "message"],
  "properties": {
    "ver": { "const": 1 },
    "code": {
      "type": "string",
      "enum": [
        "UNSUPPORTED_ENCRYPTION",
        "UNSUPPORTED_MODEL",
        "UNSUPPORTED_SCHEMA_VERSION",
        "CANCELLED",
        "RATE_LIMIT",
        "UNAUTHORIZED",
        "BLOCKED_SENDER",
        "MODEL_UNAVAILABLE",
        "SESSION_LIMIT",
        "PARSE_ERROR",
        "EMPTY_RESPONSE",
        "TOOL_ERROR",
        "INVALID_SCHEMA",
        "UNSUPPORTED_FEATURE",
        "INVALID_SEQUENCE",
        "INTERNAL_ERROR"
      ]
    },
    "message": { "type": "string", "minLength": 1 },
    "retry_after": { "type": "integer", "minimum": 1 },
    "details": { "type": "object" }
  }
}
```

### Info schema (`31340`)

```json
{
  "$id": "https://example.com/nip-xx-info.json",
  "type": "object",
  "required": ["ver", "encryption", "tool_names"],
  "properties": {
    "ver": { "const": 1 },
    "supports_streaming": { "type": "boolean" },
    "supports_nip59": { "type": "boolean" },
    "dvm_compatible": { "type": "boolean" },
    "encryption": {
      "type": "array",
      "items": { "type": "string" },
      "contains": { "const": "nip44_v2" }
    },
    "supported_models": { "type": "array", "items": { "type": "string" } },
    "default_model": { "type": "string" },
    "tool_names": { "type": "array", "items": { "type": "string" } },
    "tool_schema_version": { "type": "integer", "minimum": 1 },
    "tool_schemas": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["schema_version", "description", "input_schema"],
        "properties": {
          "schema_version": { "type": "integer", "minimum": 1 },
          "description": { "type": "string" },
          "requires_approval": { "type": "boolean" },
          "input_schema": { "type": "object" },
          "output_schema": { "type": "object" }
        }
      }
    },
    "max_prompt_bytes": { "type": "integer", "minimum": 1 },
    "max_context_tokens": { "type": "integer", "minimum": 1 },
    "pricing_hints": { "type": "object" }
  }
}
```

## Validation and failure rules

Implementations MUST follow these validation and failure rules:

- JSON parse failures in encrypted payloads MUST be reported with `code = PARSE_ERROR`.
- Missing required tags (`p`, `e` where required, `encryption`, `d`) or malformed tag values
  MUST be treated as `INVALID_SCHEMA`.
- Invalid protocol content (for example unknown `state`/`thinking`/`code`) MUST be treated as
  `INVALID_SCHEMA`.
- `e` tags on non-prompt events MUST reference an existing or referenced prompt event id.
- Non-`ai.prompt` events MUST require `e` marker `root`.
- `ai.delta` with non-monotonic `seq` for the same run MUST be treated as
  `INVALID_SEQUENCE`.
- `ai.cancel` without matching active run MUST be ignored.
- Duplicate `ai.cancel` for unfinished runs SHOULD be treated as idempotent and MUST NOT
  change accepted terminal selection.
- Clients SHOULD ignore `ai.status`, `ai.delta`, and `ai.tool_call` for runs already in a
  terminal state, except when retained for audit/debug tooling.
- Agents SHOULD emit at most one terminal `ai.error` with `code=CANCELLED` for a given run.
- If a run reaches a terminal state and emits additional terminal events, clients MUST keep
  only the terminal event with the highest `created_at` and highest `id` as tie-breaker.
- If a run is missing a terminal response after reasonable timeout, clients MAY treat it as
  an incomplete run and surface an implementation-specific state.

## Streaming and reconciliation

For `ai.delta` events (`kind 25801`):

- Clients MUST ignore deltas where `(e, p, encryption)` do not match the subscribed run and
  recipient.
- `seq` MUST be contiguous starting at `0`.
- Clients SHOULD collect deltas, sort by `(seq, created_at, id)` and render text in that order.
- Clients MUST dedupe duplicates by `(event.id)` and by identical `(seq, text)`.
- If a gap is detected (missing `seq`), clients SHOULD continue best-effort rendering and
  can display a soft placeholder (“streaming degraded”) until `ai.response` arrives.
- Final render MUST be taken from `ai.response` text, not from the delta stream.
- Clients MUST NOT apply deltas after a terminal event has been accepted for a run.

## Protocol Flow

1. Client SHOULD read `ai.info` for capabilities:
   ```text
   {"kinds":[31340],"authors":["<agent-pubkey>"]}
   ```
   If no `ai.info` exists, clients SHOULD:
   - proceed with `supports_streaming = true`
   - assume `encryption = ["nip44_v2"]`
   - assume `tool_names = []`
   - disable tool-related UI
2. If `supports_nip59` is true and stronger privacy is desired, client and agent SHOULD
   use NIP-59 wrappers.
3. Client sends `25802` prompt:
   - `p` = agent pubkey
   - optional `s`
   - optional `model` and `tool_schema_version` matching `ai.info`
   - `encryption = nip44_v2`
   - encrypted JSON payload
4. Agent subscribes to prompts:
   ```text
   {"kinds":[25802],"#p":["<agent-pubkey>"]}
   ```
5. Agent emits `25800`, `25801`, and optional `25804`.
6. Client MAY cancel a non-terminal run by emitting `25806` (same prompt id in `e`).
7. If cancellation is effective before terminal output, agent SHOULD emit `25805` with
   `code = CANCELLED`.
8. Agent emits terminal event:
   - `25803` on success
   - `25805` on failure
   If a cancellation arrives after a terminal event has already been emitted, the
   cancellation MUST be treated as no-op.
9. Client subscribes to terminal and streaming events:
   ```text
     {
       "kinds": [25800,25801,25803,25804,25805],
     "#p": ["<client-pubkey>"],
     "#e": ["<prompt-event-id>"],
     "authors": ["<agent-pubkey>"]
    }
   ```
   Clients SHOULD additionally enforce run-local ordering by matching the selected
   `#e` value and `authors` set.

### Session recovery recipe

- Find active session:
  ```text
  {"kinds":[25802],"#s":["sender:<client-pubkey>"],"#p":["<agent-pubkey>"]}
  ```
- Resume a run:
  ```text
  {"#e":["<prompt-id>"], "authors":["<agent-pubkey>"], "kinds":[25800,25801,25803,25804,25805]}
  ```
- Latest terminal event should be taken as the current run state; deltas may be stale on relay replay.

## Tool model and security

This NIP defines a **runtime-exec model**:

- Agents own tool execution and emit `ai.tool_call` telemetry only.
- Clients MUST NOT execute tools based on `ai.tool_call`.
- Tool schemas advertised in `ai.info` let clients present expected UI affordances.
- Agents MUST negotiate `model` and `tool_schema_version`; if unsupported, MUST return
  `UNSUPPORTED_MODEL` or `UNSUPPORTED_SCHEMA_VERSION`.

### Security and abuse controls

- Agents SHOULD reject unknown senders not in allowlists and return `UNAUTHORIZED`.
- Agents SHOULD reject senders blocked by policy and return `BLOCKED_SENDER`.
- Agents SHOULD reject unsupported tools and return `UNSUPPORTED_FEATURE`.
- Agents SHOULD validate schemas before execution and return `INVALID_SCHEMA` on mismatch.
- Agents SHOULD map execution or transport throttling to `RATE_LIMIT`.
- Agents SHOULD return `UNSUPPORTED_ENCRYPTION` when the requested scheme is unsupported.
- `retry_after` SHOULD be present for transient failures where retry is useful.
- Clients SHOULD prefer the newest terminal event by `(created_at,id)` when multiple terminal
  events are observed.

## Full example (encrypted payloads shown as placeholders)

```text
Prompt (25802, from client A to agent B)
{
  "kind": 25802,
  "pubkey": "A",
  "tags": [
    ["p","B"],
    ["s","sender:A"],
    ["encryption","nip44_v2"]
  ],
  "content": "<nip44-ciphertext>"
}

Status (25800)
{
  "kind": 25800,
  "tags": [
    ["p","A"],
    ["e","d5f...3a","", "root"],
    ["s","sender:A"],
    ["encryption","nip44_v2"]
  ],
  "content": "<nip44-ciphertext>"
}

Delta (25801, seq 0)
{
  "kind": 25801,
  "tags": [
    ["p","A"],
    ["e","d5f...3a","", "root"],
    ["encryption","nip44_v2"]
  ],
  "content": "<nip44-ciphertext>"
}

Delta (25801, seq 1)
{
  "kind": 25801,
  "tags": [
    ["p","A"],
    ["e","d5f...3a","", "root"],
    ["s","sender:A"],
    ["encryption","nip44_v2"]
  ],
  "content": "<nip44-ciphertext>"
}

Tool call telemetry (25804)
{
  "kind": 25804,
  "tags": [
    ["p","A"],
    ["e","d5f...3a","", "root"],
    ["tool","calculator"],
    ["phase","start"],
    ["encryption","nip44_v2"]
  ],
  "content": "<nip44-ciphertext>"
}

Cancel request (25806)
{
  "kind": 25806,
  "tags": [
    ["p","A"],
    ["e","d5f...3a","", "root"],
    ["s","sender:A"],
    ["encryption","nip44_v2"]
  ],
  "content": "<nip44-ciphertext>"
}

Response (25803)
{
  "kind": 25803,
  "tags": [
    ["p","A"],
    ["e","d5f...3a","", "root"],
    ["encryption","nip44_v2"]
  ],
  "content": "<nip44-ciphertext>"
}
```

### Conformance examples

1. **Invalid schema**: `ai.prompt` with `message` missing MUST be rejected and MAY
   return `ai.error` with `INVALID_SCHEMA`.
2. **Unknown tool**: `tool_call.name` not in `ai.info.tool_names` SHOULD be treated as
   unsupported and MAY return `UNSUPPORTED_FEATURE`.
3. **Out-of-order deltas**: clients reorder by `seq` as described in reconciliation.
4. **Encryption mismatch**: noncompliant `encryption` tag content MUST be rejected as
   `UNSUPPORTED_ENCRYPTION` or `INVALID_SCHEMA`.
5. **Duplicate terminal events**: clients MUST dedupe by `(created_at,id)` and render with
   only the newest terminal event.
6. **Cancel path**: client can cancel a run by `25806` and should treat subsequent
   `25805` with `code = CANCELLED` as expected terminal completion.
7. **Response/cancel race**: if both `25803` and `25805` for the same run exist, clients
   MUST keep the terminal event with highest `(created_at,id)` and apply normal ordering.

## Backward Compatibility

Implementations MUST:

- Ignore unknown encrypted JSON fields.
- Use canonical fields.
- Avoid field duplication for historical aliases in future versions.
- Keep `s` optional and default to `sender:<lowercase-hex-pubkey>` when absent.

This document defines `ver: 1`; field names and meanings MUST NOT be redefined in
the same major version.

## Implementations

- **clawlet**: Web client (Next.js) with Rust runtime
  - Web: https://github.com/klabo/clawlet
  - Runtime: https://github.com/klabo/nostr-agent-runtime

## Copyright

This document is placed in the public domain.
