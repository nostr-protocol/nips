NIP-5D
======

Nostr Web Applets
-----------------

`draft` `optional`

This NIP defines a protocol for sandboxed web applications ("napplets") running in iframes to communicate with a hosting application ("shell") via postMessage using a generic JSON envelope. Protocol messages are defined by NUB (Napplet Unified Blueprint) extension specs.

## Philosophy

A napplet is a Nostr applet - a small, focused application that does one thing well. Napplets SHOULD be single-purpose rather than monolithic. A chat widget, a feed viewer, a profile editor, and a relay manager are four napplets, not one application with four tabs. The shell composes napplets; napplets do not compose themselves.
 
## Terminology

| Term | Definition |
|------|------------|
| Shell | Web application hosting napplet iframes |
| Napplet | Sandboxed iframe application communicating with the shell via postMessage |
| dTag | Napplet type identifier from the [NIP-5A](5A.md) manifest `d` tag |
| Aggregate hash | SHA-256 of napplet build files per [NIP-5A](5A.md) |
| NUB | Napplet Unified Blueprint -- extension spec defining protocol messages for a capability domain |

## Transport

Communication uses `postMessage`. Napplet to shell: `window.parent.postMessage(msg, '*')`. Shell to napplet: `iframeWindow.postMessage(msg, '*')`. The `'*'` target origin is required because napplets have opaque origins (no `allow-same-origin`).

Napplet iframes MUST use this sandbox attribute:

    sandbox="allow-scripts"

The `allow-same-origin` token MUST NOT be present. Shells MAY add additional sandbox tokens (`allow-forms`, `allow-modals`, `allow-downloads`, `allow-popups`) based on shell policy. Napplets have no access to `localStorage`, `sessionStorage`, `IndexedDB`, direct WebSocket connections, or signing keys. All storage, signing, encryption, and relay access is proxied through the shell.

The shell identifies senders via `MessageEvent.source` (unforgeable Window reference). Messages from unknown sources (iframes not created by the shell) MUST be silently dropped.

Shells MUST NOT provide `window.nostr` (NIP-07) to napplet iframes. Signing and encryption are security-critical operations that MUST be mediated by the shell. See the Security Rationale section below.

## Wire Format

All messages between napplet and shell are JSON objects with a `type` field:

    { "type": "<domain>.<action>", ...payload }

The `type` field is a string discriminant in `domain.action` format. Domains correspond to NUB capability names (e.g., a NUB named `foo` owns all `foo.*` types). NUB specs define the valid type strings and payload shapes for their domain. This NIP does not enumerate message types.

Example — a hypothetical `foo` NUB with a request/response pattern:

    { "type": "foo.bar", "id": "abc", "data": {...} }
    { "type": "foo.bar.result", "id": "abc", "result": {...} }

Messages with an unrecognized `type` MUST be silently ignored. This allows forward compatibility as new NUBs are defined.

## Identity

The shell assigns napplet identity at iframe creation time. No negotiation is required.

When the shell creates a napplet iframe, it maps the iframe's `Window` reference to the napplet's `(dTag, aggregateHash)` tuple from the [NIP-5A](5A.md) manifest. This mapping is the napplet's identity for the session. How the shell internally represents or derives identity is an implementation detail.

The shell MUST verify `MessageEvent.source` on every inbound message. Messages from Window references not mapped to a napplet identity MUST be silently dropped.

## Manifest and NUB Negotiation

Napplet manifests ([NIP-5A](5A.md) kind 35128) declare required capabilities using `requires` tags:

    ["requires", "<nub-name>"]

Each `requires` value is a short NUB name matching a NUB domain (e.g., `foo`). Manifests MUST NOT use spec identifiers (e.g., use `foo`, not `NUB-FOO`).

At napplet load time, the shell checks `requires` tags against its own capabilities. If a required capability is absent, the shell SHOULD reject the napplet or display a compatibility warning. If the manifest has no `requires` tags, the shell loads the napplet with whatever capabilities it provides.

### Runtime Capability Query

Napplets query capability support at runtime:

    window.napplet.shell.supports('foo')           // NUB capability — boolean
    window.napplet.shell.supports('perm:popups')   // permission — boolean

Shells MUST implement `window.napplet.shell.supports()`. The argument is a namespaced capability string:

| Prefix   | Example            | Meaning                         |
|----------|--------------------|---------------------------------|
| *(bare)* | `'relay'`          | Shorthand for `'nub:relay'`     |
| `nub:`   | `'nub:identity'`   | Shell implements the identity NUB |
| `perm:`  | `'perm:popups'`    | Shell grants popup permission   |

Napplets MUST gracefully degrade when a capability is absent.

## NUB Extension Framework

Protocol messages are defined by NUB (Napplet Unified Blueprint) specs. Each NUB owns a message domain and defines the `type` strings, payload shapes, and semantics for that domain. A NUB spec is self-contained — it references this NIP only for envelope format and transport.

For example, a NUB named `foo` would own all `foo.*` message types (e.g., `foo.bar`, `foo.bar.result`) and define their payloads and shell behavior.

NUB specs MUST:
- Define all valid `type` strings for their domain
- Specify the payload shape for each message type
- Document expected shell behavior for each message
- Be independently implementable — a shell MAY support any subset of NUBs

## Security Considerations

Napplets are untrusted code. The shell is trusted. The browser enforces iframe sandbox boundaries. `MessageEvent.source` provides unforgeable sender identity.

**Mitigations:**
1. Iframe sandbox: `allow-scripts` is the only required token -- shells MUST NOT add `allow-same-origin`. Adding `allow-same-origin` would grant the napplet a real origin, allowing it to register a service worker, read shell `localStorage`, and bypass shell mediation entirely -- this prohibition is the load-bearing precondition for browser-enforced isolation of any kind.
2. postMessage `'*'` origin is required for opaque-origin iframes; sender identification uses `MessageEvent.source`, NOT `event.origin`.
3. Identity binding: the shell maps `MessageEvent.source` to napplet identity at iframe creation. The browser's `MessageEvent.source` is unforgeable within the same browsing context.
4. Aggregate hash verification against [NIP-5A](5A.md) manifests; mismatch MAY result in napplet rejection.
5. Unrecognized message types are silently ignored, preventing capability probing.
6. Napplets produce cleartext only. Shells MUST NOT sign or broadcast events containing ciphertext received from a napplet. Shells MUST NOT provide `window.nostr` (NIP-07) or any signing/encryption primitives.

Storage isolation, relay access control, and ACL enforcement are defined by their respective NUB specs.

**Class-posture delegation.** NUBs MAY define napplet classes with different security postures delivered through shell-controlled HTTP response headers. Class taxonomy, the mechanism for assigning a class to a napplet, and the wire or header shapes used to express a class are out of scope for this NIP. NUB specs that define class-contributing capabilities document their own posture and their own shell responsibilities; NIP-5D provides only the transport, identity, manifest-negotiation, and capability-query primitives on which such NUB-level machinery can layer.

**Non-Guarantees:** The protocol does NOT protect against a compromised browser, a malicious shell, side-channel attacks, or social engineering.

## References

- [NIP-5A](5A.md) -- Napplet manifest format and aggregate hash
