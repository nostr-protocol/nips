NIP-71 TMDB Metadata Enrichment Extension
==========================================

Community-Driven Metadata Corrections and Enrichments
------------------------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-71](71.md) that enables users to correct, enrich, or update TMDB metadata for video events (kind 21/22) using dedicated enrichment events. This allows community-driven metadata improvements while maintaining attribution and traceability.

## Overview

This extension enables:
1. **Metadata corrections**: Users can correct errors in TMDB metadata (wrong title, year, genres, etc.)
2. **Metadata enrichments**: Users can add missing information (actors, production details, etc.)
3. **Author updates**: Original authors can update their own metadata
4. **Community contributions**: Multiple users can contribute improvements
5. **Attribution tracking**: All enrichments are signed and traceable

## Implementation

### Enrichment Events (Kind 1986)

Users publish **kind 1986** events to enrich or correct TMDB metadata for video events.

**Format:**
```json
{
  "kind": 1986,
  "pubkey": "<user_pubkey>",
  "created_at": <unix_timestamp>,
  "content": "<optional explanation of the enrichment>",
  "tags": [
    ["e", "<video_event_id>", "<relay_url>"],  // Reference to video event (kind 21/22)
    ["k", "21"],  // Kind of the target event (21 or 22)
    ["L", "tmdb.metadata"],  // Namespace for TMDB metadata enrichments
    ["l", "correction", "tmdb.metadata"],  // Type: correction, enrichment, or update
    ["p", "<video_author_pubkey>", "<relay_url>"]  // Optional: reference to video author
  ]
}
```

**Content Field:**
The `.content` field contains a JSON object with the enriched/corrected TMDB metadata:

```json
{
  "tmdb": {
    "title": "Corrected Title",
    "year": "2024",
    "genres": ["Action", "Sci-Fi"],
    "director": "Director Name",
    "overview": "Updated overview...",
    "tagline": "Updated tagline",
    "vote_average": "8.5",
    "vote_count": "1234",
    "runtime": "120 minutes",
    "certification": "PG-13",
    "production_companies": ["Company 1", "Company 2"],
    "countries": ["USA", "France"],
    "languages": ["English", "French"],
    "series_name": "Series Name",  // For TV shows
    "episode_name": "Episode Name",  // For TV shows
    "season_number": 1,  // For TV shows
    "episode_number": 5,  // For TV shows
    "network": "Network Name",  // For TV shows
    "status": "Returning Series"  // For TV shows
  },
  "reason": "Corrected title and added missing genres",  // Optional explanation
  "source": "tmdb.org"  // Optional: source of the correction
}
```

### Tag Structure

**Required Tags:**
- `["e", "<video_event_id>", "<relay_url>"]`: Reference to the video event (kind 21 or 22)
- `["k", "21"]` or `["k", "22"]`: Kind of the target video event (helps with filtering)
- `["L", "tmdb.metadata"]`: Namespace indicating TMDB metadata enrichment
- `["l", "<type>", "tmdb.metadata"]`: Type of enrichment:
  - `"correction"`: Correcting an error in existing metadata
  - `"enrichment"`: Adding missing information
  - `"update"`: Updating outdated information
  - `"author_update"`: Author updating their own metadata (only if pubkey matches video author)

**Optional Tags:**
- `["p", "<video_author_pubkey>", "<relay_url>"]`: Reference to video author (for notifications)
- `["a", "<kind>:<pubkey>:<d>"]`: Reference to replaceable enrichment event (if updating a previous enrichment)

### Replaceable Enrichments (Kind 30001)

For authors who want to update their own metadata, they can use **kind 30001** (replaceable event) with a `d` tag:

```json
{
  "kind": 30001,
  "pubkey": "<author_pubkey>",
  "created_at": <unix_timestamp>,
  "content": "<JSON with updated TMDB metadata>",
  "tags": [
    ["d", "tmdb-metadata"],  // Identifier for this replaceable event
    ["e", "<video_event_id>", "<relay_url>"],
    ["k", "21"],
    ["L", "tmdb.metadata"],
    ["l", "author_update", "tmdb.metadata"]
  ]
}
```

**Note:** Only the video author (matching pubkey) should use kind 30001. Other users should use kind 1986 (non-replaceable) to allow multiple enrichments.

### Client Behavior

#### Loading Enrichments

1. **Query enrichments**: Fetch all kind 1986 events with:
   - `#e` tag matching the video event ID
   - `#L` tag matching `"tmdb.metadata"`
   - `#k` tag matching `"21"` or `"22"`

2. **Query author updates**: If video author matches current user, also fetch kind 30001 events with:
   - `#d` tag matching `"tmdb-metadata"`
   - `#e` tag matching the video event ID

3. **Merge enrichments**: Combine all enrichments with original metadata:
   - Start with metadata from `info.json` (via `info` tag in video event)
   - Apply enrichments in chronological order (oldest first)
   - For replaceable events (kind 30001), use only the latest version
   - For conflicts, prefer:
     1. Author updates (kind 30001)
     2. Most recent enrichment (kind 1986)
     3. Original metadata

#### Displaying Enrichments

1. **Show enrichment indicators**: Display badges showing:
   - Number of enrichments
   - Whether author has updated metadata
   - Most recent enrichment date

2. **Show enrichment history**: Allow users to view:
   - All enrichments with author and timestamp
   - Type of each enrichment (correction, enrichment, update)
   - Explanation from content field

3. **Allow contributions**: Provide UI for users to:
   - Submit corrections
   - Add missing information
   - Explain their enrichment

### Example Events

#### Correction by Community Member

```json
{
  "kind": 1986,
  "pubkey": "bob_pubkey",
  "created_at": 1704067200,
  "content": "{\"tmdb\":{\"title\":\"Corrected Title\",\"year\":\"2024\",\"genres\":[\"Action\",\"Sci-Fi\"]},\"reason\":\"Original title was misspelled\"}",
  "tags": [
    ["e", "video_event_id_abc123", "wss://relay.example.com"],
    ["k", "21"],
    ["L", "tmdb.metadata"],
    ["l", "correction", "tmdb.metadata"],
    ["p", "alice_pubkey", "wss://relay.example.com"]
  ]
}
```

#### Author Update (Replaceable)

```json
{
  "kind": 30001,
  "pubkey": "alice_pubkey",
  "created_at": 1704153600,
  "content": "{\"tmdb\":{\"title\":\"Updated Title\",\"genres\":[\"Action\",\"Sci-Fi\",\"Thriller\"],\"overview\":\"Updated description\"}}",
  "tags": [
    ["d", "tmdb-metadata"],
    ["e", "video_event_id_abc123", "wss://relay.example.com"],
    ["k", "21"],
    ["L", "tmdb.metadata"],
    ["l", "author_update", "tmdb.metadata"]
  ]
}
```

#### Enrichment (Adding Missing Info)

```json
{
  "kind": 1986,
  "pubkey": "charlie_pubkey",
  "created_at": 1704240000,
  "content": "{\"tmdb\":{\"director\":\"Director Name\",\"production_companies\":[\"Company 1\"],\"countries\":[\"USA\"]},\"reason\":\"Added missing production details\",\"source\":\"tmdb.org\"}",
  "tags": [
    ["e", "video_event_id_abc123", "wss://relay.example.com"],
    ["k", "21"],
    ["L", "tmdb.metadata"],
    ["l", "enrichment", "tmdb.metadata"],
    ["p", "alice_pubkey", "wss://relay.example.com"]
  ]
}
```

## Benefits

1. **Community-driven improvements**: Users can contribute better metadata
2. **Error correction**: Mistakes can be fixed by the community
3. **Attribution**: All enrichments are signed and traceable
4. **Flexibility**: Multiple enrichments can coexist
5. **Author control**: Authors can update their own metadata using replaceable events
6. **Transparency**: Full history of all enrichments is available
7. **Standards compliance**: Uses existing NIP-32 (Labeling) and NIP-33 (Replaceable Events) patterns

## Privacy Considerations

- Enrichments reveal who contributed metadata
- Users who want privacy can use throwaway keys
- Authors can choose to accept or ignore community enrichments

## Security Considerations

- All enrichments are signed (NOSTR standard)
- Clients should verify signatures before displaying enrichments
- Authors can publish their own updates to override community enrichments
- Malicious enrichments can be ignored by clients (author updates take precedence)

## Compatibility

This extension is backward compatible with NIP-71:
- Standard NIP-71 clients can ignore enrichment events
- Video events (kind 21/22) remain unchanged
- Enrichments are optional and additive
- Original metadata in `info.json` is preserved

## Client Recommendations

1. **Default behavior**: Show merged metadata (original + enrichments)
2. **User preference**: Allow users to choose:
   - Show only original metadata
   - Show only author updates
   - Show merged metadata (default)
3. **Enrichment indicators**: Display badges showing number of enrichments
4. **Contribution UI**: Provide easy way to submit enrichments
5. **History view**: Show all enrichments with timestamps and authors
6. **Verification**: Verify signatures before displaying enrichments

## Future Enhancements

1. **Voting system**: Allow users to vote on enrichments (most trusted wins)
2. **Reputation**: Track users' contribution quality
3. **Automated verification**: Cross-check enrichments with TMDB API
4. **Bulk enrichments**: Allow enriching multiple videos at once
5. **Enrichment templates**: Pre-filled forms for common enrichments

