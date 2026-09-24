# NIP-Draft: Snapshot Events for Replaceable Nostr Events

## Summary

This draft defines an immutable snapshot event for preserving one exact version of a replaceable Nostr event.

Its purpose is to keep a verifiable historical copy of a replaceable event so observers can inspect it later even if relays no longer retain that version.

Snapshot events are generic and can be used with any replaceable event kind.

## Goals

- define one simple immutable event shape for preserving a single replaceable event version
- preserve the full original event payload rather than selected fields
- allow independent verification of the embedded event id and signature
- keep the mechanism generic rather than application-specific

## Event Kind

This draft uses regular kind `1843` because snapshots are immutable historical records and a single kind keeps discovery simple.

## Semantics

A snapshot event means:

> The signing pubkey publishes an immutable preserved copy of one specific replaceable event version.

A snapshot preserves an event for later inspection. It does not by itself endorse or validate the truth of the embedded content.

## Event Structure

The snapshot event uses the normal Nostr event structure.

```json
{
  "kind": 1843,
  "content": "{\"id\":\"<archived-event-id>\",\"pubkey\":\"<pubkey>\",\"created_at\":1700000000,\"kind\":3,\"tags\":[[\"p\",\"<followed-pubkey>\"]],\"content\":\"\",\"sig\":\"<sig>\"}",
  "tags": [
    ["a", "3:<pubkey>:"],
    ["e", "<archived-event-id>"],
    ["k", "3"],
    ["alt", "Snapshot of replaceable event"]
  ]
}
```

Rules:

- the event MUST be a regular immutable event of kind `1843`
- the `content` field MUST contain the full serialized JSON representation of exactly one archived replaceable event
- the event MUST include exactly one `a` tag whose second element is the archived event coordinate in the standard `kind:pubkey:d` form (for normal replaceable events, the `d` component is empty, so the value ends with a trailing colon)
- the event MUST include exactly one `e` tag whose second element is the id of the archived event
- the event MUST include exactly one `k` tag whose second element is the decimal string form of the archived event kind
- the archived event kind MUST be replaceable
- the snapshot event SHOULD include an `alt` tag describing the event

## Verification

Clients MUST parse the embedded JSON in `content` as a Nostr event object and verify it independently.

At minimum, clients MUST verify:

- the embedded event contains the required Nostr fields
- the embedded event kind matches the declared `k` tag
- the embedded event coordinate matches the declared `a` tag
- the embedded event id matches the declared `e` tag
- the embedded event id recomputes correctly from the embedded event fields
- the embedded event signature verifies correctly

If any of these checks fail, the snapshot event MUST be treated as invalid snapshot evidence.

## Discovery

Applications can discover snapshot events using standard event filters.

Suggested flow:

1. fetch kind `1843` events
2. inspect the `a` tag to determine which replaceable event coordinate is being snapshot
3. inspect the `e` tag to determine the exact archived revision being snapshot
4. inspect the `k` tag to determine the archived event kind
4. parse and verify the embedded JSON event in `content`

## Usage Notes

Useful examples include:

- snapshotting a kind `3` contact list so later observers can inspect an earlier social graph
- snapshotting a kind `0` metadata event so later observers can inspect earlier profile metadata
- snapshotting any event in the replaceable and addressable range so later observers can inspect the event's history

Per [NIP-01](01.md:97), snapshot targets may include:

- special replaceable kinds such as kind `0` metadata events and kind `3` contact lists
- replaceable kinds in the `10000 <= n < 20000` range
- addressable kinds in the `30000 <= n < 40000` range

Examples:

- kind `0` metadata event, with coordinate `0:<pubkey>:`
- kind `3` contact list, with coordinate `3:<pubkey>:`
- kind `10002` relay list metadata, with coordinate `10002:<pubkey>:`
- kind `30023` long-form article identified by a `d` tag such as `30023:<pubkey>:my-article`
