NIP-XXX
======

Internationalization & Localization
-----------------------------------

`draft` `optional`

## Abstract

Internationalization and Localization enhances Nostr's adaptability across varied linguistic and cultural landscapes.
By incorporating a `language` tag specifically designed for internationalization & localization within each note, 
Nostr improves its functionality in terms of `search` or `translation` capabilities and even beyond.

## `language` tag field 

A new language tag field is optional, but if not specified it will categorized as `en` (Using two letter ISO 639-1 language code).

```json
{
  "tags": [
    ["language", 'en']
  ]
}
```
This addition not only facilitates the categorization of notes by language but also enables users to subscribe to content exclusively in their preferred language. 
This broadens Nostr's accessibility and relevance to a global audience, ensuring that Nostr users can engage with content that resonates with their linguistic and cultural preferences.


## Possible Extensions

A Nostr Profile MAY support these extensions:
- `allowed_language: ['en', 'jp']` - This tells a clients which language they prefer.
- `language: 'fr'` - This tells this profile "speaks" in which language.
