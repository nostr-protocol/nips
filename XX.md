NIP-XX
======

External Content IDs
-------------------------

`draft` `optional`

There are certain established global content identifiers that would be useful to reference in nostr events so that clients can query all events assosiated with these ids.

- Book [ISBNs](https://en.wikipedia.org/wiki/ISBN)
- Podcast [GUIDs](https://podcastnamespace.org/tag/guid)
- Movie [EIDRs](https://www.eidr.org)

Since the `i` tag is already used for similar references in kind-0 metadata events it makes sense to use it for these content ids as well.


## Supported IDs

### Books:

- Book ISBN: `["i", "book:isbn:123"]`

### Podcasts:

- Podcast Feed GUID: `["i", "podcast:guid:123"]`
- Podcast Item GUID: `["i", "podcast:item:guid:123"]`

### Movies:

- Movie EIDR: `["i", "movie:eidr:123"]`