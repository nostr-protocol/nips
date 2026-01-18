# NIP-CD: Document Synchronization Protocol

`draft` `optional`

This NIP defines a protocol for CouchDB-like document synchronization over Nostr, enabling multi-master replication with conflict detection and resolution.

## Abstract

This specification describes how to use Nostr events to implement a distributed document database with bidirectional synchronization capabilities similar to CouchDB/PouchDB. It enables offline-first applications where multiple clients can modify documents independently and synchronize changes through Nostr relays.

## Motivation

CouchDB's replication protocol has proven to be one of the most robust solutions for distributed data synchronization. By implementing similar semantics over Nostr, we can:

- Enable offline-first applications on the Nostr network
- Leverage Nostr's existing relay infrastructure for document storage and sync
- Allow applications to maintain local document stores that sync across devices

## Terminology

- **Document**: Data with a unique identifier
- **Revision**: A specific version of a document, identified by a revision ID
- **Conflict**: When two or more revisions of a document are created independently
- **Winning Revision**: The revision selected by deterministic conflict resolution
- **Tombstone**: A deletion marker for a document

## Syncable Event Range

This NIP proposes a new top-level event kind range for **syncable events**:

```
for kind n such that 40000 <= n < 50000, events are syncable
```

### Syncable Event Semantics

Syncable events differ from other event categories:

| Category                  | Range       | Relay Behavior                                      |
|---------------------------|-------------|-----------------------------------------------------|
| Regular                   | 1000-9999   | Store all events                                    |
| Replaceable               | 10000-19999 | Keep only latest per pubkey+kind                    |
| Ephemeral                 | 20000-29999 | Do not store                                        |
| Parameterized Replaceable | 30000-39999 | Keep only latest per pubkey+kind+d                  |
| **Syncable**              | 40000-49999 | Store all revisions, support revision queries       |

### Relay Requirements for Syncable Events

Relays implementing this NIP:

**MUST:**
- Store ALL events in the syncable range (no replacement)

**SHOULD:**
- Implement efficient queries for "all revisions of document X" (filter by `#d`)

**MAY:**
- Implement compaction (pruning old revisions) with configurable retention
- Optimize storage for documents with many revisions

## Event Kinds

This NIP reserves the following kind range:

| Kind        | Description                          |
|-------------|--------------------------------------|
| 40000-49998 | Syncable document types              |
| 49999       | Document purge                       |

Applications choose a kind in the 40000-49998 range for their document types. For example:
- `40000`: Generic documents
- `40001`: Notes
- `40002`: Tasks/Todos
- `40003`: Contacts
- `40004`: Calendar events

## Document Event (kind: 40000-49999)

A document event represents a single revision of a document.

### Document Ownership

All revisions of a document MUST have the same `pubkey`. A document is uniquely identified by the combination of `pubkey` + `kind` + `d` tag.

### Content

The `content` field contains the document data. The format is application-defined and may be JSON, plain text, or any other format appropriate for the document type.

### Required Tags

| Tag       | Description                                                    |
|-----------|----------------------------------------------------------------|
| `d`       | Document ID (unique identifier for this document)              |
| `i`     | Revision ID in format `{generation}-{hash}`                    |
| `v`       | Previous revision ID(s) this revision is based on. Required for updates; omit for first revision |

### Optional Tags

| Tag         | Description                                                  |
|-------------|--------------------------------------------------------------|
| `encrypted` | Encryption algorithm used (if content is encrypted)          |
| `deleted`   | Present (with empty value) if this revision is a deletion    |

### Revision ID Format

Revision IDs follow CouchDB's format: `{generation}-{hash}`

- **generation**: Integer incremented with each update (starts at 1)
- **hash**: First 32 hex characters (128 bits) of SHA-256 hash of: `{prev_rev}:{content_hash}` (for first revision, use content hash alone)

Example: `3-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### Example

```json
{
  "kind": 40001,
  "pubkey": "<author-pubkey>",
  "created_at": 1234567890,
  "content": "Hello world",
  "tags": [
    ["d", "note-abc123"],
    ["i", "2-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"],
    ["v", "1-x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4"]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

## Document Deletion

To delete a document, publish a new revision with a `deleted` tag and empty content. This follows CouchDB's tombstone pattern.

### Example Deletion

```json
{
  "kind": 40001,
  "pubkey": "<author-pubkey>",
  "created_at": 1234567890,
  "content": "",
  "tags": [
    ["d", "note-abc123"],
    ["i", "3-d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9"],
    ["v", "2-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"],
    ["deleted", ""]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

A deleted document can be "undeleted" by publishing a new revision without the `deleted` tag. Deletions participate in conflict resolution like any other revision.

## Document Purge (kind: 49999)

NOTE: (maybe we should just have a tag called purge on the regular document kind?)

While deletion creates a tombstone revision that preserves the document's history, **purge** completely removes a document and all its revisions from the database. This is useful when:
- Content must be permanently removed (e.g., for legal compliance)
- Storage space needs to be reclaimed
- A document was created in error

### Purge Event Structure

```json
{
  "kind": 49999,
  "pubkey": "<owner-pubkey>",
  "created_at": 1234567890,
  "content": "",
  "tags": [
    ["d", "<document-id>"],
    ["k", "<original-kind>"]
  ],
  "id": "<event-id>",
  "sig": "<signature>"
}
```

| Tag | Description                                           |
|-----|-------------------------------------------------------|
| `d` | Document ID to purge                                  |
| `k` | Kind of the document to purge (e.g., "40001")         |

### Authorization

Only the document owner can purge their documents. The purge event `pubkey` MUST match the `pubkey` of the document being purged. Relays MUST reject purge events from non-owners.

### Relay Behavior

When a relay receives a valid purge event, it:

1. **MUST** delete all events matching the document identifier (`pubkey` + `kind` from `k` tag + `d` tag)
2. **SHOULD** store the purge event itself (to enable replication)
3. **MAY** discard purge events after a configurable retention period
4. **SHOULD** broadcast the purge event to subscribers

### Replication

Purge events replicate to other relays like regular events. When a relay receives a replicated purge event, it applies the same purge logic, ensuring eventual consistency across the network.

### Important Notes

- Purge is irreversible - all revision history is lost
- Purge differs from delete: delete preserves history, purge removes it
- Clients receiving a purge event SHOULD remove the document from local storage
- The purge event acts as a record that the document was purged

### Example

To purge a note document:

```json
{
  "kind": 49999,
  "pubkey": "abc123...",
  "content": "",
  "tags": [
    ["d", "note-xyz789"],
    ["k", "40001"]
  ]
}
```

## Conflict Detection and Resolution

### Detecting Conflicts

A conflict occurs when:
1. Two or more document events exist with the same `pubkey`, `kind`, and `d` tag
2. They have the same `v` revision (or both have no `v`)
3. They have different `i` values

### Deterministic Resolution

To ensure all clients converge to the same winning revision without coordination:

1. Compare revision generations (higher wins)
2. If generations are equal, compare revision hashes lexicographically (higher wins)
3. The losing revision(s) are stored as conflicts

### Accessing Conflicts

Clients SHOULD track conflicting revisions locally and MAY expose them to users for manual resolution.

To resolve a conflict, create a new document event with:
- `v` tag containing ALL conflicting revision IDs
- New `i` with incremented generation

### Example Conflict Resolution

```json
{
  "kind": 40001,
  "content": "Merged content from both edits",
  "tags": [
    ["d", "note-abc123"],
    ["i", "4-m3r9g4e5d6c7o8n9f0l1i2c3t4r5e6s7"],
    ["v", "3-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"],
    ["v", "3-z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4"]
  ]
}
```

## Synchronization Protocol

### Basic Sync (using standard Nostr subscriptions)

#### Initial Sync

1. Client subscribes to document events filtered by kind and/or author `pubkey`
2. Client receives all document events from relay(s)
3. Client builds local document state by applying conflict resolution

#### Incremental Sync

1. Client subscribes with `since` filter using last seen timestamp
2. Client receives new/updated document events
3. Client merges changes with local state, detecting conflicts
4. Client publishes local changes not yet on relay

#### Subscription Filters

To sync all notes for a user:

```json
{
  "kinds": [40001],
  "authors": ["<pubkey>"],
  "since": 1234567890
}
```

### Changes Feed (optional relay extension)

The basic sync protocol uses Nostr's `since` timestamp filter, which has limitations:
- Multiple events can share the same timestamp (second precision)
- Clock drift between clients causes ordering issues
- Replication checkpointing is imprecise

Relays MAY implement a changes feed extension that provides CouchDB-like incremental sync with monotonic sequence numbers.

#### Sequence Numbers

Each stored event is assigned a monotonically increasing sequence number (`seq`). This provides:
- Precise ordering of all changes
- Efficient replication checkpointing
- No timestamp collision issues

#### CHANGES Message

Request changes since a sequence number:

```json
["CHANGES", {
  "since": 0,
  "limit": 100,
  "kinds": [40001],
  "authors": ["<pubkey>"]
}]
```

| Field     | Type     | Description                                      |
|-----------|----------|--------------------------------------------------|
| `since`   | integer  | Return changes with seq > since (default: 0)     |
| `limit`   | integer  | Maximum number of changes to return (optional)   |
| `kinds`   | int[]    | Filter by event kinds (optional)                 |
| `authors` | string[] | Filter by author pubkeys (optional)              |

Response:

```json
["CHANGES", {
  "changes": [
    { "seq": 1, "event": { ... } },
    { "seq": 2, "event": { ... } }
  ],
  "lastSeq": 42
}]
```

| Field     | Type   | Description                                         |
|-----------|--------|-----------------------------------------------------|
| `changes` | array  | Array of `{ seq, event }` objects                   |
| `lastSeq` | integer| Sequence number for next query checkpoint           |

The `lastSeq` value is always the global maximum sequence number, even when no changes match the filter. This allows clients to advance their checkpoint past events from other users without re-querying the same range.

#### LASTSEQ Message

Get the current maximum sequence number:

```json
["LASTSEQ"]
```

Response:

```json
["LASTSEQ", 42]
```

#### Sync Flow with Changes Feed

**Initial sync:**
1. Query `["CHANGES", { "since": 0, "kinds": [...], "authors": [...] }]`
2. Process all returned events
3. Store `lastSeq` as checkpoint

**Incremental sync:**
1. Query `["CHANGES", { "since": <checkpoint>, "kinds": [...], "authors": [...] }]`
2. Process new events
3. Update checkpoint to returned `lastSeq`

#### Relay Capability Advertisement

Relays supporting the changes feed SHOULD advertise it in their NIP-11 document:

```json
{
  "supported_messages": ["EVENT", "REQ", "CLOSE", "CHANGES", "LASTSEQ"]
}
```

### Continuous Changes Feed (optional relay extension)

For real-time sync, relays MAY implement a continuous changes feed that streams new changes as they occur.

#### CHANGES_SUB Message

Subscribe to continuous changes:

```json
["CHANGES_SUB", "<subscription_id>", {
  "since": 42,
  "kinds": [40001],
  "authors": ["<pubkey>"]
}]
```

| Field     | Type     | Description                                      |
|-----------|----------|--------------------------------------------------|
| `since`   | integer  | Start streaming from seq > since (default: 0)    |
| `kinds`   | int[]    | Filter by event kinds (optional)                 |
| `authors` | string[] | Filter by author pubkeys (optional)              |

The relay first sends all existing changes matching the filter, then continues streaming new changes in real-time.

#### CHANGES_EVENT Message

Sent by relay for each matching change:

```json
["CHANGES_EVENT", "<subscription_id>", { "seq": 43, "event": { ... } }]
```

#### CHANGES_EOSE Message

Sent by relay after all stored events have been sent, indicating the subscription is now "live":

```json
["CHANGES_EOSE", "<subscription_id>", { "lastSeq": 50 }]
```

After CHANGES_EOSE, any new events matching the subscription will be sent as CHANGES_EVENT messages in real-time.

#### CHANGES_UNSUB Message

Unsubscribe from a continuous changes feed:

```json
["CHANGES_UNSUB", "<subscription_id>"]
```

#### Real-Time Sync Flow

1. Subscribe: `["CHANGES_SUB", "sync1", { "since": 0, "kinds": [...], "authors": [...] }]`
2. Receive CHANGES_EVENT for each stored event
3. Receive CHANGES_EOSE when caught up (note the `lastSeq`)
4. Continue receiving CHANGES_EVENT in real-time as new events arrive
5. Unsubscribe when done: `["CHANGES_UNSUB", "sync1"]`

#### Relay Capability Advertisement

Relays supporting the continuous changes feed SHOULD advertise it in their NIP-11 document:

```json
{
  "supported_messages": ["EVENT", "REQ", "CLOSE", "CHANGES", "LASTSEQ", "CHANGES_SUB", "CHANGES_UNSUB"]
}
```

## Encryption

For private documents, content MAY be encrypted using NIP-44.

When encrypted:
- Add `encrypted` tag with value `nip44`
- Content contains the encrypted document
- Revision hash is computed on encrypted content

## Client Implementation Guidelines

### Local Storage

Clients SHOULD maintain:
- Current winning revision for each document
- Conflict revisions (for user resolution)
- Revision history (for sync efficiency)

### Offline Support

Clients SHOULD:
- Queue local changes when offline
- Assign provisional revision IDs
- Recompute revision IDs on sync (to include server state)
- Handle conflicts arising from offline edits

### Performance Considerations

- Use `limit` in subscriptions for large document sets
- Implement pagination for initial sync
- Consider compaction (pruning old revisions) for long-lived documents

## Relay Recommendations

Relays implementing this NIP SHOULD:
- Index documents by `d` tag for efficient lookups
- Retain document history for sync protocol

## Reference Implementation

A reference implementation is available at: [TODO: Add repository link]

## Security Considerations

- Document IDs in `d` tags are public; use encryption for sensitive content
- Revision history reveals edit patterns; consider privacy implications
- Validate `v` chains to prevent revision injection attacks

## Appendix A: Revision Hash Algorithm

```
function computeRevisionHash(prevRev, content):
    contentHash = sha256(content)
    if prevRev is empty:
        return contentHash.substring(0, 32)
    combined = prevRev + ":" + contentHash
    fullHash = sha256(combined)
    return fullHash.substring(0, 32)

function computeRevisionId(generation, prevRev, content):
    hash = computeRevisionHash(prevRev, content)
    return generation + "-" + hash
```

## Appendix B: Conflict Resolution Algorithm

```
function selectWinningRevision(revisions):
    sort revisions by:
        1. generation (descending)
        2. hash (descending, lexicographic)
    return revisions[0]
```

