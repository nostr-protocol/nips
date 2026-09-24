NIP-71 Video User Tags Extension
=================================

User-Generated Tags for Video Events
-------------------------------------

`draft` `extension` `optional`

This document describes an extension to [NIP-71](71.md) that enables users to add tags to video events (kind 21/22) using [NIP-32](32.md) Labeling. This allows community-driven categorization, tag clouds, and tag-based search functionality.

## Overview

This extension enables:
1. **User-generated tags**: Any user can add tags to any video
2. **Tag aggregation**: Build tag clouds showing most popular tags
3. **Tag-based search**: Find videos by user-contributed tags
4. **Community categorization**: Collective organization of video content

## Implementation

### Tag Events (NIP-32)

Users add tags to videos by publishing **kind 1985** events (NIP-32 Labeling) that reference the video event.

**Format:**
```json
{
  "kind": 1985,
  "pubkey": "<user_pubkey>",
  "created_at": <unix_timestamp>,
  "content": "",  // Optional: explanation for the tag
  "tags": [
    ["L", "ugc"],  // User-generated content namespace (NIP-32)
    ["l", "bitcoin", "ugc"],  // Tag value with namespace mark
    ["e", "<video_event_id>", "<relay_url>"],  // Reference to video event
    ["k", "21"]  // Kind of the target event (21 or 22)
  ]
}
```

### Tag Structure

**Required Tags:**
- `["e", "<video_event_id>", "<relay_url>"]`: Reference to the video event (kind 21 or 22)
- `["l", "<tag_value>", "ugc"]`: The tag value (lowercase, alphanumeric + hyphens/underscores)
- `["L", "ugc"]`: Namespace indicating user-generated content (NIP-32)

**Optional Tags:**
- `["k", "21"]` or `["k", "22"]`: Kind of the target video event (helps with filtering)
- `["p", "<video_author_pubkey>", "<relay_url>"]`: Reference to video author (optional, for notifications)

**Content Field:**
- Can contain explanation or context for the tag
- Empty string is acceptable

### Tag Naming Conventions

**Recommended:**
- Use lowercase: `bitcoin`, `tutorial`, `music`
- Use hyphens for multi-word: `machine-learning`, `web-development`
- Use underscores for compound: `video_game`, `how_to`
- Keep tags concise (1-3 words max)
- Avoid special characters except hyphens and underscores

**Examples:**
- ✅ `bitcoin`, `crypto`, `tutorial`, `music`, `comedy`
- ✅ `machine-learning`, `web-development`, `cooking-tips`
- ❌ `Bitcoin` (should be lowercase)
- ❌ `bitcoin tutorial` (use hyphen: `bitcoin-tutorial`)
- ❌ `bitcoin!` (no special chars)

### Multiple Tags per User

A single user can add multiple tags to the same video by publishing multiple kind 1985 events:

```json
// Event 1: Add "bitcoin" tag
{
  "kind": 1985,
  "tags": [
    ["L", "ugc"],
    ["l", "bitcoin", "ugc"],
    ["e", "<video_id>", "<relay>"],
    ["k", "21"]
  ]
}

// Event 2: Add "tutorial" tag
{
  "kind": 1985,
  "tags": [
    ["L", "ugc"],
    ["l", "tutorial", "ugc"],
    ["e", "<video_id>", "<relay>"],
    ["k", "21"]
  ]
}
```

### Removing Tags

To remove a tag, users can publish a [NIP-09](09.md) deletion event targeting their own kind 1985 tag event:

```json
{
  "kind": 5,
  "tags": [["e", "<tag_event_id>"]],
  "content": "deleted tag"
}
```

## Tag Aggregation

### Building Tag Clouds

Clients aggregate all kind 1985 events referencing video events to build tag statistics:

**Query:**
```javascript
// Fetch all tag events for videos
const filter = {
  kinds: [1985],
  "#L": ["ugc"],
  "#k": ["21", "22"]  // Only tags for video events
};

// Group by tag value and count
const tagCounts = {};
tagEvents.forEach(event => {
  const tagValue = event.tags.find(t => t[0] === 'l')?.[1];
  if (tagValue) {
    tagCounts[tagValue] = (tagCounts[tagValue] || 0) + 1;
  }
});
```

**Tag Cloud Data Structure:**
```json
{
  "bitcoin": 42,
  "tutorial": 38,
  "music": 35,
  "comedy": 28,
  "cooking": 15,
  ...
}
```

### Per-Video Tag Aggregation

For a specific video, aggregate all tags:

**Query:**
```javascript
const filter = {
  kinds: [1985],
  "#e": [videoEventId],
  "#L": ["ugc"]
};

// Result: Array of tag events
// Extract unique tag values and count occurrences
const videoTags = {};
tagEvents.forEach(event => {
  const tagValue = event.tags.find(t => t[0] === 'l')?.[1];
  const taggerPubkey = event.pubkey;
  if (tagValue) {
    if (!videoTags[tagValue]) {
      videoTags[tagValue] = {
        count: 0,
        taggers: []
      };
    }
    videoTags[tagValue].count++;
    videoTags[tagValue].taggers.push(taggerPubkey);
  }
});
```

**Result:**
```json
{
  "bitcoin": {
    "count": 5,
    "taggers": ["pubkey1", "pubkey2", "pubkey3", "pubkey4", "pubkey5"]
  },
  "tutorial": {
    "count": 3,
    "taggers": ["pubkey1", "pubkey6", "pubkey7"]
  }
}
```

## Tag-Based Search

### Finding Videos by Tag

**Query Pattern:**
```javascript
// Step 1: Find all tag events with specific tag
const tagFilter = {
  kinds: [1985],
  "#l": ["bitcoin"],  // Tag value
  "#L": ["ugc"]
};

// Step 2: Extract video event IDs from tag events
const videoEventIds = tagEvents
  .map(event => event.tags.find(t => t[0] === 'e')?.[1])
  .filter(Boolean);

// Step 3: Fetch video events
const videoFilter = {
  kinds: [21, 22],
  ids: videoEventIds
};
```

### Multi-Tag Search (AND)

Find videos tagged with multiple tags:

```javascript
// Find videos tagged with both "bitcoin" AND "tutorial"
const tag1Events = await fetchTagEvents("bitcoin");
const tag2Events = await fetchTagEvents("tutorial");

const videoIds1 = extractVideoIds(tag1Events);
const videoIds2 = extractVideoIds(tag2Events);

// Intersection
const commonVideoIds = videoIds1.filter(id => videoIds2.includes(id));
```

### Multi-Tag Search (OR)

Find videos tagged with any of multiple tags:

```javascript
// Find videos tagged with "bitcoin" OR "ethereum"
const allVideoIds = new Set();
const tag1Events = await fetchTagEvents("bitcoin");
const tag2Events = await fetchTagEvents("ethereum");

[...tag1Events, ...tag2Events].forEach(event => {
  const videoId = event.tags.find(t => t[0] === 'e')?.[1];
  if (videoId) allVideoIds.add(videoId);
});
```

## Backend Implementation

### API Endpoint: GET /api/video/tags

Aggregate tags for videos and return tag cloud statistics.

**Query Parameters:**
- `video_id` (optional): Specific video event ID
- `limit` (optional): Number of top tags to return (default: 50)
- `min_count` (optional): Minimum tag count to include (default: 1)

**Response:**
```json
{
  "success": true,
  "tag_cloud": {
    "bitcoin": 42,
    "tutorial": 38,
    "music": 35
  },
  "total_tags": 150,
  "unique_videos": 75
}
```

### API Endpoint: GET /api/video/tags/{video_id}

Get all tags for a specific video.

**Response:**
```json
{
  "success": true,
  "video_id": "abc123...",
  "tags": {
    "bitcoin": {
      "count": 5,
      "taggers": ["pubkey1", "pubkey2", ...]
    },
    "tutorial": {
      "count": 3,
      "taggers": ["pubkey1", ...]
    }
  },
  "total_tag_count": 8,
  "unique_tags": 2
}
```

### API Endpoint: GET /youtube?tag={tag_value}

Extend existing `/youtube` endpoint to filter by user tags.

**Query Parameters:**
- `tag`: Tag value to filter by
- `tags`: Comma-separated list for OR search (e.g., `tags=bitcoin,ethereum`)
- `tags_and`: Comma-separated list for AND search (e.g., `tags_and=bitcoin,tutorial`)

**Response:** Same format as `/youtube` but filtered by tags.

## Frontend Implementation

### JavaScript Functions

#### Add Tag to Video

```javascript
/**
 * Add a user tag to a video
 * @param {string} videoEventId - Video event ID (kind 21 or 22)
 * @param {string} tagValue - Tag value (lowercase, alphanumeric)
 * @param {string} videoAuthorPubkey - Video author's pubkey (optional)
 * @param {string} relayUrl - Relay URL where video is stored
 * @returns {Promise<object>} Result object
 */
async function addVideoTag(videoEventId, tagValue, videoAuthorPubkey = null, relayUrl = null) {
    // Validate tag format
    if (!/^[a-z0-9_-]+$/.test(tagValue)) {
        throw new Error('Invalid tag format. Use lowercase alphanumeric with hyphens/underscores.');
    }
    
    // Ensure NOSTR connection
    const pubkey = await ensureNostrConnection();
    if (!pubkey) {
        throw new Error('NOSTR connection required');
    }
    
    // Build tags
    const tags = [
        ['L', 'ugc'],
        ['l', tagValue.toLowerCase(), 'ugc'],
        ['e', videoEventId, relayUrl || window.relayUrl]
    ];
    
    // Add kind tag if we know the video kind
    // (Could be determined by fetching the video event first)
    // tags.push(['k', '21']);  // or '22'
    
    // Add author pubkey if provided
    if (videoAuthorPubkey) {
        tags.push(['p', videoAuthorPubkey, relayUrl || window.relayUrl]);
    }
    
    // Publish tag event
    const result = await publishNote('', tags, 1985, {
        silent: false
    });
    
    return {
        success: result.success,
        tagEventId: result.eventId,
        tagValue: tagValue
    };
}
```

#### Remove Tag from Video

```javascript
/**
 * Remove a user tag from a video
 * @param {string} tagEventId - The kind 1985 event ID to delete
 * @returns {Promise<object>} Result object
 */
async function removeVideoTag(tagEventId) {
    const pubkey = await ensureNostrConnection();
    if (!pubkey) {
        throw new Error('NOSTR connection required');
    }
    
    // Publish deletion event (NIP-09)
    const result = await publishNote('deleted tag', [['e', tagEventId]], 5, {
        silent: false
    });
    
    return {
        success: result.success,
        deletedEventId: tagEventId
    };
}
```

#### Fetch Tags for Video

```javascript
/**
 * Fetch all tags for a video
 * @param {string} videoEventId - Video event ID
 * @param {number} timeout - Timeout in ms (default: 5000)
 * @returns {Promise<object>} Tags object with counts and taggers
 */
async function fetchVideoTags(videoEventId, timeout = 5000) {
    await connectToRelay();
    
    if (!window.nostrRelay) {
        throw new Error('Relay not connected');
    }
    
    const filter = {
        kinds: [1985],
        '#e': [videoEventId],
        '#L': ['ugc']
    };
    
    const tagEvents = await window.nostrRelay.list([filter], { timeout });
    
    // Aggregate tags
    const tags = {};
    tagEvents.forEach(event => {
        const tagValue = event.tags.find(t => t[0] === 'l')?.[1];
        if (tagValue) {
            if (!tags[tagValue]) {
                tags[tagValue] = {
                    count: 0,
                    taggers: [],
                    events: []
                };
            }
            tags[tagValue].count++;
            tags[tagValue].taggers.push(event.pubkey);
            tags[tagValue].events.push(event.id);
        }
    });
    
    return tags;
}
```

#### Fetch Tag Cloud

```javascript
/**
 * Fetch tag cloud statistics
 * @param {number} limit - Number of top tags to return (default: 50)
 * @param {number} minCount - Minimum tag count (default: 1)
 * @returns {Promise<object>} Tag cloud object
 */
async function fetchTagCloud(limit = 50, minCount = 1) {
    await connectToRelay();
    
    if (!window.nostrRelay) {
        throw new Error('Relay not connected');
    }
    
    const filter = {
        kinds: [1985],
        '#L': ['ugc'],
        '#k': ['21', '22']  // Only tags for video events
    };
    
    const tagEvents = await window.nostrRelay.list([filter], { timeout: 10000 });
    
    // Aggregate tag counts
    const tagCounts = {};
    const videoIds = new Set();
    
    tagEvents.forEach(event => {
        const tagValue = event.tags.find(t => t[0] === 'l')?.[1];
        const videoId = event.tags.find(t => t[0] === 'e')?.[1];
        
        if (tagValue && videoId) {
            tagCounts[tagValue] = (tagCounts[tagValue] || 0) + 1;
            videoIds.add(videoId);
        }
    });
    
    // Filter by minCount and sort
    const filtered = Object.entries(tagCounts)
        .filter(([tag, count]) => count >= minCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .reduce((obj, [tag, count]) => {
            obj[tag] = count;
            return obj;
        }, {});
    
    return {
        tags: filtered,
        totalTags: tagEvents.length,
        uniqueVideos: videoIds.size
    };
}
```

#### Search Videos by Tag

```javascript
/**
 * Search videos by tag(s)
 * @param {string|Array<string>} tags - Tag value(s) to search for
 * @param {string} operator - 'AND' or 'OR' (default: 'OR')
 * @returns {Promise<Array<string>>} Array of video event IDs
 */
async function searchVideosByTag(tags, operator = 'OR') {
    await connectToRelay();
    
    if (!window.nostrRelay) {
        throw new Error('Relay not connected');
    }
    
    const tagArray = Array.isArray(tags) ? tags : [tags];
    
    if (operator === 'AND') {
        // Find intersection
        const videoIdSets = await Promise.all(
            tagArray.map(async tag => {
                const filter = {
                    kinds: [1985],
                    '#l': [tag],
                    '#L': ['ugc']
                };
                const events = await window.nostrRelay.list([filter], { timeout: 5000 });
                return new Set(events.map(e => e.tags.find(t => t[0] === 'e')?.[1]).filter(Boolean));
            })
        );
        
        // Intersection
        let result = videoIdSets[0];
        for (let i = 1; i < videoIdSets.length; i++) {
            result = new Set([...result].filter(id => videoIdSets[i].has(id)));
        }
        return Array.from(result);
    } else {
        // Find union (OR)
        const allVideoIds = new Set();
        await Promise.all(
            tagArray.map(async tag => {
                const filter = {
                    kinds: [1985],
                    '#l': [tag],
                    '#L': ['ugc']
                };
                const events = await window.nostrRelay.list([filter], { timeout: 5000 });
                events.forEach(event => {
                    const videoId = event.tags.find(t => t[0] === 'e')?.[1];
                    if (videoId) allVideoIds.add(videoId);
                });
            })
        );
        return Array.from(allVideoIds);
    }
}
```

### UI Components

#### Tag Input Component

```javascript
/**
 * Display tag input and existing tags for a video
 * @param {string} containerId - Container element ID
 * @param {string} videoEventId - Video event ID
 */
async function displayVideoTags(containerId, videoEventId) {
    const container = document.getElementById(containerId);
    
    // Fetch existing tags
    const tags = await fetchVideoTags(videoEventId);
    
    // Display existing tags
    const tagsHtml = Object.entries(tags)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([tag, data]) => `
            <span class="badge bg-secondary tag-badge" data-tag="${tag}">
                ${tag} <small>(${data.count})</small>
                ${data.taggers.includes(window.userPubkey) ? 
                    '<button class="btn-close btn-close-white btn-sm ms-1" onclick="removeTag(\'' + data.events[0] + '\')"></button>' : 
                    ''}
            </span>
        `).join('');
    
    // Tag input
    const inputHtml = `
        <div class="input-group mb-2">
            <input type="text" id="tag-input-${videoEventId}" 
                   class="form-control" 
                   placeholder="Add tag (lowercase, alphanumeric)"
                   pattern="[a-z0-9_-]+">
            <button class="btn btn-primary" onclick="addTag('${videoEventId}')">
                Add Tag
            </button>
        </div>
    `;
    
    container.innerHTML = inputHtml + '<div class="tags-container">' + tagsHtml + '</div>';
}

async function addTag(videoEventId) {
    const input = document.getElementById(`tag-input-${videoEventId}`);
    const tagValue = input.value.trim().toLowerCase();
    
    if (!tagValue || !/^[a-z0-9_-]+$/.test(tagValue)) {
        showNotification({
            message: 'Invalid tag format. Use lowercase alphanumeric with hyphens/underscores.',
            type: 'error'
        });
        return;
    }
    
    try {
        const result = await addVideoTag(videoEventId, tagValue);
        if (result.success) {
            showNotification({
                message: `Tag "${tagValue}" added successfully!`,
                type: 'success'
            });
            input.value = '';
            // Refresh tags display
            await displayVideoTags(`tags-${videoEventId}`, videoEventId);
        }
    } catch (error) {
        showNotification({
            message: 'Error adding tag: ' + error.message,
            type: 'error'
        });
    }
}

async function removeTag(tagEventId) {
    try {
        const result = await removeVideoTag(tagEventId);
        if (result.success) {
            showNotification({
                message: 'Tag removed successfully!',
                type: 'success'
            });
            // Refresh tags display
            const videoEventId = /* extract from context */;
            await displayVideoTags(`tags-${videoEventId}`, videoEventId);
        }
    } catch (error) {
        showNotification({
            message: 'Error removing tag: ' + error.message,
            type: 'error'
        });
    }
}
```

#### Tag Cloud Component

```javascript
/**
 * Display tag cloud
 * @param {string} containerId - Container element ID
 * @param {number} limit - Number of tags to display (default: 50)
 */
async function displayTagCloud(containerId, limit = 50) {
    const container = document.getElementById(containerId);
    
    const tagCloud = await fetchTagCloud(limit, 1);
    
    // Calculate font sizes based on counts
    const maxCount = Math.max(...Object.values(tagCloud.tags));
    const minCount = Math.min(...Object.values(tagCloud.tags));
    const sizeRange = 24 - 12; // max 24px, min 12px
    
    const tagsHtml = Object.entries(tagCloud.tags)
        .map(([tag, count]) => {
            const size = 12 + (count - minCount) / (maxCount - minCount) * sizeRange;
            return `
                <a href="/youtube?tag=${tag}" 
                   class="tag-cloud-item" 
                   style="font-size: ${size}px;"
                   title="${count} videos">
                    ${tag} (${count})
                </a>
            `;
        }).join(' ');
    
    container.innerHTML = `
        <div class="tag-cloud">
            ${tagsHtml}
        </div>
        <p class="text-muted mt-2">
            ${tagCloud.totalTags} tags across ${tagCloud.uniqueVideos} videos
        </p>
    `;
}
```

## Integration with Existing System

### Backend (54321.py)

Add endpoints to `/youtube` route:

```python
# In /youtube endpoint, add tag filtering
tag_filter = request.args.get('tag')
tags_or = request.args.get('tags')  # Comma-separated OR
tags_and = request.args.get('tags_and')  # Comma-separated AND

if tag_filter or tags_or or tags_and:
    # Query kind 1985 events for tags
    # Extract video event IDs
    # Filter videos by those IDs
    pass
```

### Frontend (youtube.html)

Add tag cloud sidebar and tag display on video cards:

```html
<!-- Tag Cloud Sidebar -->
<div class="tag-cloud-sidebar">
    <h5>Popular Tags</h5>
    <div id="tag-cloud"></div>
</div>

<!-- Tag Input on Video Cards -->
<div class="video-tags" id="tags-{videoEventId}"></div>
```

## Benefits

✅ **Community-Driven**: Users collectively organize content  
✅ **Discoverability**: Tag-based search improves content discovery  
✅ **Flexibility**: Users can add any relevant tags  
✅ **Standards-Compliant**: Uses existing NIP-32 standard  
✅ **Decentralized**: No central authority controls tags  
✅ **Removable**: Users can delete their own tags  
✅ **Aggregatable**: Tag clouds show community preferences  

## Privacy Considerations

- Tag events reveal which users tagged which videos
- Users who want privacy can use different pubkeys for tagging
- Tag events are public and searchable
- Consider implementing anonymous tagging option (future enhancement)

## Future Enhancements

1. **Tag Suggestions**: Auto-suggest tags based on video content/metadata
2. **Tag Moderation**: Allow video authors to remove inappropriate tags
3. **Tag Categories**: Organize tags into categories (topic, genre, language, etc.)
4. **Weighted Tags**: Weight tags by tagger's reputation or network
5. **Tag Synonyms**: Map similar tags (e.g., "crypto" = "cryptocurrency")
6. **Tag Hierarchies**: Support parent-child tag relationships
7. **Anonymous Tagging**: Option to tag without revealing pubkey

## Compatibility

This extension is fully compatible with:
- **NIP-32**: Uses standard labeling format
- **NIP-71**: Extends video events without modifying them
- **NIP-09**: Tag removal via deletion events
- **NIP-01**: Standard event structure and tags

Standard NOSTR clients can ignore kind 1985 events if they don't support this extension.

## References

- [NIP-32: Labeling](32.md)
- [NIP-71: Video Events](71.md)
- [NIP-09: Event Deletion](09.md)
- [NIP-01: Basic Protocol](01.md)

