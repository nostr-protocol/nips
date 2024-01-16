# NIP-XYZ: Yet Another Geo Tag (YAGT)

`draft` `optional`

This NIP extends an existing indexable tag `g` and a new indexable tag `G`. 

## Motivation
The core aim of this NIP is to establish a unified and efficient method for geotagging within events. During the development of the [nostr-geotags](https://github.com/sandwichfarm/nostr-geotags) library which utilizes NIP-32, it became evident that more specific guidelines were needed for geotagging. This NIP is designed to provide a clear and standardized format for geotagging, promoting uniformity and effectiveness of geodata across nostr.

## Rationale
Developing a dedicated geotagging NIP offers several advantages over the general application of NIP-32 for geographical data:

- **Simplicity and Clarity:** Using NIP-32 for geodata can lead to verbose and complex labels, making them challenging to understand. This NIP simplifies expression.
- **Handling ISO Standards:** The complexity added by ISO-3166-3 country code changes when using NIP-32 is streamlined in this NIP by simply labeling the change as countryCode, thus making both publishing and filtering more straightforward.
- **Significance of Geodata:** Given its ubiquity, importance and diversity, geodata warrants its own specific letter designations and detailed specifications within nostr.
- **Extends Existing GeoTag** `NIP-52` defined the `g` geotag, which this NIP extends and is compatible with.

## Schema 
This NIP uses a similar pattern as `NIP-32` (`G` and `g` instead of `L` and `l`) but with an additional key as position `3` and catered geographical data.

```
["G", label] //optional
["g", value, label, format]
```

## Keys
Standards are assigned to human readable labels instead of labeling content with standards, which complicates both publishing and filtering. 

- `geohash` - A geohash of any precision.
- `countryCode` - `ISO-3166-1/3` country code. 
- `countryName` - `ISO-3166-1/3` compatible country name. 
- `regionCode` - `ISO-3166-2` region code. 
- `regionName` - `ISO-3166-2` compatible region name.
- `cityName` - The the internationally recognized name of the city, formally cased. Use multiple `cityName` tags if a city has multiple spellings. 
- `cityCode` - _Placeholder, there is no city code standard_ 

## Defaults
When `g` tag has no `tag[2]` it is assumed to be of type (key) `geohash` 

```json
{ tags:
  [
    [ "g", "u2mwdd8q4" ]
  ]
}
```

## Examples

### Minimal Example 
```json
{ tags:
  [
    [ "g", "u2mwdd8q4" ]
  ]
}
```

### Robust Example
```json
{ tags:
  [
    [ "G", "geohash" ],
    [ "g", "u2mwdd8q4", "geohash"  ],
    [ "g", "u2mwdd8q", "geohash"  ],
    [ "g", "u2mwdd8", "geohash"  ],
    [ "g", "u2mwdd", "geohash"  ],
    [ "g", "u2mwd", "geohash"  ],
    [ "g", "u2mw", "geohash"  ],
    [ "g", "u2m", "geohash"  ],
    [ "g", "u2", "geohash"  ],
    [ "g", "u", "geohash"  ],
    [ "G", "countryCode" ],
    [ "g", "AI", "countryCode", "alpha-2" ],
    [ "g", "AIA", "countryCode", "alpha-3" ],
    [ "g", "660", "countryCode", "numeric" ],
    [ "g", "DJ", "countryCode", "alpha-2" ], //ISO-3166-3 "change"
    [ "G", "countryName" ],
    [ "g", "Anguilla", "countryName" ],
    [ "G", "cityName" ],
    [ "g", "Mount Fortune", "cityName" ],
  ] 
}
```

### Filter
_Effective for events with **countryCode** `G` tag where `g` is either `AI` or `DJ`_

```
{ "#G": ["countryCode"], "#g": ["AI", "DJ"] }
```