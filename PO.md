NIP-XX
======

Podcasts
--------------

`draft` `optional`

This NIP defines `kind:30025` for podcast episodes and content. Podcast events represent audio content with associated metadata, transcripts, chapters, and show notes.

## Event Kind

This NIP defines `kind:30025` as a podcast event.

The `.content` field may contain markdown-formatted show notes, or episode description.

## Required Tags

- `d` - Episode identifier (slug or unique identifier for this episode)
- `title` - Episode title
- `audio` - URL to the audio file
- `duration` - Episode duration in seconds

## Optional Tags

- `summary` - Episode summary or description
- `image` - URL to episode artwork/image
- `episode` - Episode number
- `transcript` - URL to transcript file (VTT, or SRT)
- `chapters` - URL to chapters file (JSON format following [Podcast Namespace specification](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/chapters/example.json))
- `rss` - URL to the podcast RSS feed
- `ai_generated` - Boolean indicator if content is AI-generated ("true" or "false")
- `published_at` - Unix timestamp of when episode was first published
- `i` - External content identifier following [NIP-73](73.md) format for podcast episodes
- `t` - Topic tags

## Example Event

```json
{
  "kind": 30025,
  "created_at": 1757442746,
  "content": "Sleep is essential for our physical and mental health. In this episode, we explore the latest research on how sleep affects memory, mood, and overall well-being.\n\nExperts share tips on improving sleep quality and discuss common myths about rest...",
  "tags": [
    ["d", "the-science-of-sleep"],
    ["title", "The Science of Sleep: Why We Need Rest"],
    ["audio", "https://my-podcast.com/the-science-of-sleep/audio.mp3"],
    ["duration", "635"], // duration in seconds (tags have to be string)
    ["summary", "Discover the science behind why sleep is essential for our health. This episode explores how sleep impacts memory, mood, and well-being, and shares expert tips for improving sleep quality."],
    ["image", "https://my-podcast.com/the-science-of-sleep/image.png"],
    ["episode", "1"], // episode number (tags have to be string)
    ["transcript", "https://my-podcast.com/the-science-of-sleep/transcript.vtt"],
    ["chapters", "https://my-podcast.com/the-science-of-sleep/chapters.json"],
    ["rss", "https://my-podcast.com/podcast.rss"],
    ["ai_generated", "false"],
    ["published_at", "1757442746"],
    ["i", "podcast:item:guid:https://my-podcast.com/the-science-of-sleep"],
    ["t", "podcast"],
    ["t", "sleep"],
    ["t", "health"]
  ],
  "pubkey": ".....",
  "id": "....",
  "sig": "...."
}
```
