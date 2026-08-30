# NIP-Draft: Checkpoints for Identity Continuity

## Summary

This draft defines an immutable checkpoint event for Nostr identity continuity.

It does not create an authoritative key rotation mechanism. It provides a common way to publish continuity claims and optional embedded evidence so observers can evaluate them using cryptographic and social corroboration.

In decentralized systems such as Nostr, there is no universal authority or mechanism that can conclusively determine identity continuity after key loss or compromise. This draft therefore standardizes claims and evidence, not truth, and assumes evaluation will remain probabilistic and observer-dependent.

## Motivation

In Nostr, users may lose keys, rotate keys, suffer compromise, or otherwise need to make continuity claims about identity over time. Today, these claims are often absent or expressed through other means like for example short text notes. That makes them harder for clients and observers to discover, interpret, and compare consistently.

This draft introduces a minimal checkpoint primitive so users can publish continuity attestations in a common event shape. The checkpoint itself does not prove identity continuity. Instead, it creates a durable protocol artifact around which evidence can accumulate over time, including embedded evidence, social responses, external attestations, and historical context.

## Goals and Non-Goals

Goals:

- define one simple checkpoint event shape for both root and linked checkpoints
- keep checkpoints immutable by using a regular kind
- standardize a minimal set of machine-readable tags
- support optional embedded continuity evidence directly in the checkpoint event
- allow open-ended corroborating evidence without defining a scoring formula
- make continuity claims easier for clients and users to discover and inspect
- avoid automatic client-side identity reassignment

Non-goals:

- defining an authoritative key rotation mechanism
- defining deterministic identity recovery
- forcing clients to accept a continuity claim
- defining a universal scoring or trust algorithm

## Event Kind

This draft uses regular kind `1842` because checkpoints are immutable historical assertions rather than replaceable state, and a single kind keeps discovery simple.

A dedicated kind is used so continuity claims can be discovered, indexed, and evaluated consistently across clients instead of being buried in profile text or application-specific conventions.

## Semantics

A checkpoint event means:

> The signing pubkey asserts an identity continuity claim at this point in time.

Common cases:

- **Root checkpoint**: the first known checkpoint in a lineage, with no previous checkpoint reference
- **Linked checkpoint**: a later checkpoint that claims continuity from an earlier checkpoint by referencing it with an `e` tag

A linked checkpoint MAY be signed either by the same pubkey as the previous checkpoint or by a different pubkey. Same-key linkage can be used to publish newer continuity evidence or preserve newer context. Different-key linkage can be used to claim continuity across a key transition.

## Event Structure

The event follows the standard Nostr event format.

```json
{
  "kind": 1842,
  "tags": [
    ["E", "<root-checkpoint-id>", "<relay-hint>"],
    ["e", "<previous-checkpoint-id>", "<relay-hint>"],
    ["commit", "sha256", "<hex-secret-commitment>"],
    ["reveal", "<secret-string>"],
    ["alt", "Identity continuity checkpoint"]
  ],
  "content": "Optional human-readable explanation",
  "created_at": 0,
  "pubkey": "<signing-pubkey>",
  "id": "<event-id>",
  "sig": "<signature>"
}
```

The `content` field is optional and is used for human-readable explanations.

## Tags

### Root and previous checkpoint references

This draft follows the root/direct-parent threading convention from [NIP-22](22.md). When a checkpoint claims continuity from an earlier checkpoint, it SHOULD include exactly one uppercase `E` tag referencing the root checkpoint of the lineage and exactly one lowercase `e` tag referencing the immediately previous checkpoint.

These references describe the structure of related continuity claims. They do not, by themselves, establish an authoritative truth about identity.

### Root checkpoint reference

Format:

```json
["E", "<root-checkpoint-id>", "<relay-hint>"]
```

Rules:

- a root checkpoint does not include this tag
- a linked checkpoint SHOULD include one root-checkpoint `E` tag
- the referenced event SHOULD be the first checkpoint in the lineage

### Previous checkpoint reference

Format:

```json
["e", "<previous-checkpoint-id>", "<relay-hint>"]
```

Rules:

- a root checkpoint does not include this tag
- a linked checkpoint SHOULD include one previous-checkpoint `e` tag
- the referenced event SHOULD be the immediately previous checkpoint in the lineage

The uppercase `E` tag identifies the lineage root, and the lowercase `e` tag identifies the direct parent.

### Root discovery tag

To support efficient discovery of lineage starting points while keeping a single event kind, a root checkpoint SHOULD include:

```json
["t", "root"]
```

This tag is a discovery hint for querying root checkpoints. It does not define rootness by itself. A checkpoint is a root checkpoint because it has no direct-parent `e` tag.

## Embedded Evidence

This draft standardizes one optional embedded evidence mechanism based on secret commitment and later revelation. One checkpoint may publish a commitment to a secret, and a later checkpoint may reveal the matching preimage. If the revealed preimage hashes to the earlier commitment, observers gain evidence linking the later checkpoint to material prepared before the transition.

### Secret commitment

A checkpoint MAY commit to a secret for later revelation.

Format:

```json
["commit", "sha256", "<hex-secret-commitment>"]
```

Rules:

- the third element MUST be the lowercase hex encoding of a SHA-256 digest
- the digest MUST be computed from the exact UTF-8 bytes of the revealed secret string
- implementations MUST NOT trim, normalize, or otherwise transform the string before hashing

### Secret reveal

A later checkpoint MAY reveal the preimage for a previous commitment.

Format:

```json
["reveal", "<secret-string>"]
```

Rules:

- the second element MUST be the exact secret string whose UTF-8 bytes were hashed for the commitment
- observers can hash the revealed preimage and compare it to an earlier `commit` tag

### Secret string encoding

The secret string MUST be encoded as UTF-8 before hashing and treated as opaque, byte-exact, and case-sensitive. Implementations MUST NOT trim, normalize, lower-case, upper-case, or otherwise transform it before hashing or verification. Applications SHOULD preserve the user-entered value exactly and warn that changing capitalization, spacing, or punctuation changes the commitment.

Any passphrase, sentence, or random string works. Because the secret may later be revealed publicly, users SHOULD avoid putting sensitive personal information in it. Secrets used for commitments SHOULD be high-entropy and randomly generated when stronger resistance to offline guessing is desired. Low-entropy or human-memorable secrets may be guessable offline.

### Alt tag

Checkpoint events SHOULD include an `alt` tag such as:

```json
["alt", "Identity continuity checkpoint"]
```

## External Corroborating Evidence

The checkpoint event does not declare an exhaustive list of relevant evidence. Applications and observers MAY consider any corroborating evidence they understand.

Important current mechanisms include:

- **Reactions** to the checkpoint event
- **Follow-list context** from kind `3` events to evaluate whether endorsers were part of the earlier social neighborhood
- **NIP-05 continuity** as corroboration but not authoritative key replacement
- **OpenTimestamps attestations** published using kind `1040`
- **Snapshots** of replaceable events, as described in [`spec/snapshot-nip-draft.md`](spec/snapshot-nip-draft.md), when historical kind `0` or kind `3` context matters

OTS is especially useful for root checkpoints because it reduces the credibility of retroactive fabrication. Implementations SHOULD encourage OTS attestations for the checkpoint itself and, when relevant, for supporting kind `0` and kind `3` events.

## Discovery

Applications can discover continuity evidence using standard event filters.

Suggested flow:

1. fetch kind `1842` events for the pubkey
2. inspect the latest relevant checkpoint
3. if it contains an `E` tag, use it to identify the root checkpoint
4. if it contains an `e` tag, fetch the referenced previous checkpoint
5. recursively trace earlier checkpoints as needed
6. inspect reactions to each checkpoint
7. inspect OTS attestations for each checkpoint
8. optionally inspect related kind `0`, kind `3`, and snapshot events for corroboration

## Verification Guidance

This draft does not define a deterministic verification algorithm. Implementations may assist users in evaluating continuity claims, but any conclusion remains local to the observer and based on the evidence they choose to trust.

Applications and users may consider:

- checkpoint lineage coherence
- whether a revealed preimage matches a prior commitment
- endorsements and disputes expressed through reactions
- whether endorsers belong to the earlier social context
- whether the same NIP-05 identifier corroborates the transition
- whether checkpoints and relevant supporting events were externally timestamped
- whether snapshots preserve the cited historical replaceable-state context

Evidence is cumulative and may conflict. Continuity evaluation is inherently probabilistic, and this draft intentionally does not define a scoring threshold or automatic migration rule.

## Client Behavior

Clients implementing this draft:

- SHOULD present checkpoints as claims requiring evaluation, not as confirmed identity migration
- SHOULD display checkpoint lineage and supporting signals clearly
- SHOULD distinguish embedded evidence from external corroboration
- SHOULD surface conflicting evidence when present
- MUST NOT automatically replace one followed pubkey with another solely because a checkpoint exists
- MAY provide tools that help users evaluate and manually act on continuity claims

## Security Considerations

- This draft does not create a canonical truth source for identity recovery; competing claims may exist.
- An attacker controlling a compromised key may publish misleading checkpoints or supporting signals.
- Poor client UX or local policy may overstate the meaning of checkpoints and create de facto migration behavior not defined by this draft.
- Different applications may weigh evidence differently and therefore reach different conclusions from the same checkpoints.
- If the old key is lost, continuity depends on prior evidence and later corroboration.
- Nostr timestamps alone are not sufficient to establish trustworthy chronology; OTS is strongly recommended.
- This draft does not solve Sybil resistance; endorsements from unrelated pubkeys may be weak evidence.
- Low-entropy secrets may be guessed or socially discovered.
- Revealing a secret preimage may expose personal information.

## Examples

### Root checkpoint

```json
{
  "kind": 1842,
  "content": "Publishing a continuity checkpoint for this identity.",
  "tags": [
    ["t", "root"],
    ["commit", "sha256", "9f2c6f8e7c4af0d0d5ec2d5a0cefa1c1d7d8d7c54f5119d3d5b2f7c5d0b8a123"],
    ["alt", "Identity continuity checkpoint"]
  ]
}
```

### Linked checkpoint

```json
{
  "kind": 1842,
  "content": "This is my new identity after compromise of the previous key.",
  "tags": [
    ["E", "<root-checkpoint-id>", "wss://relay.example"],
    ["e", "<previous-checkpoint-id>", "wss://relay.example"],
    ["commit", "sha256", "ef9610122f56f8e50aee8e4029fd74470ddc48add51c13c311633203e06efd8a"], // Commiting to a new secret for future reveal
    ["reveal", "my-dog:Rufus"],
    ["alt", "Identity continuity checkpoint"]
  ]
}
```
