NIP-XX
======

ContextVM: MCP JSON-RPC over Nostr
----------------------------------

`draft` `optional`

## Abstract

This NIP describes **ContextVM (CVM)**: a convention for transporting **Model Context Protocol (MCP)** JSON-RPC messages over the Nostr relay network using standard Nostr events.

ContextVM does **not** define new JSON-RPC schemas. Instead, it specifies a minimal set of Nostr-level conventions (event kinds, tags, correlation, and message lifecycle) and then defers all evolving protocol details to the canonical ContextVM documentation.

## Motivation

Nostr already provides:

- public-key identities and signatures
- relay-based message delivery
- event IDs for correlation
- optional end-to-end encryption patterns

ContextVM uses these primitives to run MCP client-server interactions without requiring domains, static IPs, or centralized hosting.

## Protocol overview

### Event kind

All ContextVM request/response traffic is carried in a single unified Nostr kind:

- kind `25910` (ephemeral)

### Payload encoding (`content`)

The Nostr event `content` field MUST be a UTF-8 string containing a **stringified JSON object** that is a valid MCP JSON-RPC message.

ContextVM does not change MCP method names or schemas; it only transports them.

### Addressing and correlation (`tags`)

ContextVM uses standard Nostr tags:

- `p` tag: identifies the intended recipient public key.
- `e` tag: correlates a response event to the request event by referencing the request event id.

## Message lifecycle

ContextVM follows a simple RPC pattern:

1. Client publishes a signed request event (kind `25910`) with a `p` tag targeting the server pubkey.
2. Server subscribes for matching requests, verifies signatures, parses JSON-RPC from `content`, execute.
3. Server publishes a signed response event (kind `25910`) that includes an `e` tag referencing the request event id.
4. Client subscribes for responses correlated to its requests, then matches responses by the referenced `e`.

### Request event (client -> server)

The client MUST publish a kind `25910` event whose `tags` includes `p` with the server pubkey.

Example:

```jsonc
{
  "kind": 25910,
  "pubkey": "<client-pubkey>",
  "created_at": 1700000000,
  "tags": [
    ["p", "<server-pubkey>"]
  ],
  "content": "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}"
}
```

### Response event (server -> client)

The server MUST publish a kind `25910` event that correlates to the request by including an `e` tag whose second element is the request event id.

Example:

```jsonc
{
  "kind": 25910,
  "pubkey": "<server-pubkey>",
  "created_at": 1700000001,
  "tags": [
    ["e", "<request-event-id>", "<optional-relay-hint>"],
    ["p", "<client-pubkey>"]
  ],
  "content": "{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{...}}"
}
```

The client SHOULD verify that:

- the response event was authored by the expected server pubkey
- the `e` tag references a request it previously sent

## ContextVM Enhancement Proposals (CEPs)

ContextVM is extended via **ContextVM Enhancement Proposals (CEPs)**. CEPs define optional conventions on top of the base transport described here.

This NIP intentionally keeps CEP details brief to avoid duplicating the evolving specification. The canonical CEP list and status are maintained at https://docs.contextvm.org.

### Examples of fundamental CEPs (informative)

- **Public server announcements / discovery**
  - kind `11316`: server announcement
  - kind `11317`: tools list
  - kind `11318`: resources list
  - kind `11319`: resource templates list
  - kind `11320`: prompts list
- **End-to-end encryption**
  - optional encryption using NIP-44 payloads and NIP-59 gift wraps, regular, or ephemeral (outer kind `1059`/`21059`) around an inner kind `25910` message

## Security considerations

- **Authentication**: Nostr signatures authenticate the event author (pubkey).
- **Authorization**: servers decide which client pubkeys are allowed to invoke capabilities.
- **Relay trust**: relays are transport and MUST be treated as untrusted.
- **Confidentiality**: requires optional end-to-end encryption; otherwise `content` is plaintext.

## References

- ContextVM documentation (canonical): https://docs.contextvm.org
- Model Context Protocol (MCP) specification: https://modelcontextprotocol.io/

## Comparison with DVMs

ContextVM and Data Vending Machines (DVMs) can both be used for requesting computation over Nostr.

- DVMs (see [`90.md`](90.md)) organize work around job-request kinds and job-result kinds.
- ContextVM keeps a single message kind (`25910`) and places the request/response semantics in the MCP JSON-RPC payload.

Because ContextVM carries MCP messages, it inherits MCP's capability negotiation and self-describing interfaces (e.g., listing tools and calling them) while still following the same core Nostr request/response pattern.
