# Topic-Scoped Moderation Events (Draft NIP)

This document describes a **topic-scoped moderation system** implemented using a custom Nostr event kind.
It allows clients to express and aggregate moderation opinions **without global censorship**.

---

## Event Kind

kind: 1011

**Purpose:**
Represents moderation actions within a specific hashtag/topic.

---

## Supported Moderation Actions

### 1. Mark Note as Off-Topic

Marks a specific note as off-topic for a given topic.

Required Tags:

- ["t", "<topic>"] — The hashtag / topic being moderated
- ["e", "<note_id>"] — The note being marked off-topic

Content (human-readable):

Marked as off-topic

Semantics:

- The event does not delete or hide the note globally
- It expresses the publisher’s opinion that the note is off-topic
- Clients may aggregate multiple moderation events
- Clients may allow “show anyway” overrides

---

### 2. Remove User From Topic

Marks a user as excluded from a topic.

Required Tags:

- ["t", "<topic>"] — The hashtag / topic
- ["p", "<pubkey>"] — The user being removed

Content:

Removed user from topic

Semantics:

- Indicates the publisher believes this user’s posts are not relevant to the topic
- Applies to future and existing posts by that user under the topic
- Clients should treat this as topic-local filtering, not a global block

---

## Event Schema

kind: 1011  
pubkey: <moderator_pubkey>  
created_at: <unix_timestamp>

Tags:

- ["t", "<topic>"]
- Either ["e", "<note_id>"] OR ["p", "<pubkey>"]

Atleast one moderation target SHOULD be present.

---

## Aggregation Model

- Moderation is additive and opinion-based
- Multiple moderation events may exist for the same target
- Clients should aggregate by:
  - (topic, note_id) → off-topic curators
  - (topic, pubkey) → user removals
- No quorum or threshold is enforced at protocol level

---

## Trust & Visibility Model

Clients may support multiple feed modes:

Unfiltered:

- Ignore all moderation events

Filtered (Global):

- Hide content if a given threshold of moderators flagged it

Filtered (Web of Trust)

- Hide content only if flagged by a users Web of Trust

Clients may allow users to:

- Select which moderators they trust
- Override hidden content
- Persist moderator preferences locally

---

## UI Expectations (Recommended)

Clients supporting this spec should:

- Indicate why content is hidden
- Show who moderated it
- Allow temporary overrides
- Never hard-delete content based on moderation events

---

## Design Philosophy

This system avoids:

- Global censorship
- Centralized moderator lists

It provides:

- Topic-scoped moderation
- Social-graph-based trust
- User-controlled filtering
