# NIP-XX Places

`draft` `optional`

A kind `37515` Place event represents a place on Earth.

## Rationale

This NIP provides a decentralized mechanism for people to publish places that matter to them on a map without any governing intermediaries such as Google Maps or OpenStreetMaps.

A Place event is cryptographically owned by its creator who has the sole ability to edit it (replaceable event).

Places can be zapped, reviewed, labeled, commented on, reacted to, or shared like any other nostr event.

High quality places can be found by following pubkeys who publish them, reviews, [NIP-51 lists called Worlds](/51.md), or even attached [NIP-13 proof-of-work](/13.md).

This NIP defines standardized properties that may be applied to Places as tags. These properties may also be crowdsourced as discussed below, enabling a balance between ownership and open-source contribution.

> [!TIP]
> The 7515 in 37515 is alphanumeric code for GEO

### Good Use Cases

- If you own a business, you can truly own your place on the map by publishing a Place.
- Large facilities and campuses with many points of interest can group and share their Places by using a NIP-51 list called a [World](/51.md). Clients can use World lists to filter the Places on the map for focused experiences.
- Publish temporary points of interest like a speed trap or meetup location.
- Create a Place for each of your favorite camping spots or hiking paths.
- Create a list of your favorite bars for a pub crawl to share with others.
- Copy useful geo data from other sources to make it available on nostr.

### Bad Use Cases

- Replicating OpenStreetMaps data for every tree, river, road and municipality. This is background noise and should be handled in your client by tile services like Mapbox or OpenMapTiles.
- Publicizing your house. Don't publish places that put anyone's privacy at risk.

## Place Event Structure

A Place is comprised of two main parts: GeoJSON defines the geospatial structure of the Place in a standard format that can be displayed on a map, and tags containing properties for the Place.

```javascript
{
  kind: 37515,
  content: '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"coordinates":[14.425692, 50.095986],"type":"Point"}}]}' // stringified JSON. Use https://geojson.io to easily create GeoJSON objects for testing.
  tags: [
    ["d", "zahradní-restaurace-letenský-zámeček-u2fkbr"], // unique identifier for replaceable event
    ["name", "Zahradní Restaurace Letenský Zámeček"], // name property
    ["opening_hours", "Mo-Fr_6:00-20:00,Sa-Su_6:00-17:00"], // opening_hours property
    ["logo_url", "https://nostr.build/logo.png"], // logo_url property
    ["r", "R4469371", "osm_ref"], // osm_ref is a combination of the OSM type (the letter at the front of the string) and OSM ID (which is the numerical value following the letter
    ["amenity", "biergarten"], // OSM amenity tag
    ["country", "Czech"], // country property
    ["contributor", "5c83da77af1dec6d7289834998ad7aafbd9e2191396d75ec3cc27f5a77226f36"]
    ["contributor", "f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca"]
    ["g", "u2fkbr"], // geohash of place; should be as accurate as possible
    ["g", "u2fkb"], // all less-precise geohashes must be defined to allow for searching -- see https://github.com/nostr-protocol/nips/pull/136#issuecomment-1788549584
    ["g", "u2fk"],
    ["g", "u2f"],
    ["g", "u2"],
    ["g", "u"],
  ],
  pubkey: ...
  created_at: ...
}
```

### Content

GeoJSON is used to define the Place's geospatial structure. This GeoJSON is stringified and stored in the `content` field of the event.

[geojson.io](https://geojson.io) is a great tool to play around with GeoJSON data structures on a map. It also validates them.

The `coordinates` property of the GeoJSON object will provide the [longitude, latitude] coordinate(s) to position the Place on a map.

> [!IMPORTANT]
> GeoJSON can contain multiple features, which means your Place may be a feature collection made up of multiple points or lines or polygons. Each feature can have its own `properties` object which may not be empty if the data is copied from somewhere else. However, the `properties` of a feature don't necessarily apply to the overall Place. Therefore, clients SHOULD NOT use the `properties` object as properties for the Place. See below for how to define properties that apply to the Place.
> If you have multiple features rich in properties, consider splitting them into separate Places.

### Property Tags

A subset of OpenStreeMaps tags have been seleceted to create a standard list of properties that kind 37515 clients can expect to handle.

#### Required Properties

| Tag Key  | Tag Value                        | Example    | Other Values |
| -------- | -------------------------------- | ---------- | ------------ |
| `"name"` | The name for the Place           |            |              |
| `"r"`    | OSM Type and OSM ID concatenated | "R4469371" | "osm_ref"    |

#### Optional Properties

| Tag Key              | Tag Value                                                           | Example                                       |
| -------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `"phone"`            | +CC XXX XXX XXX format, where CC is a country code.                 |                                               |
| `"website"`          | URL beginning with https://                                         |                                               |
| `"logo_url"`         | URL beginning with https://                                         |                                               |
| `"addr:state"`       |                                                                     |                                               |
| `"addr:province"`    |                                                                     |                                               |
| `"addr:street"`      |                                                                     |                                               |
| `"addr:housenumber"` |                                                                     |                                               |
| `"addr:city"`        |                                                                     |                                               |
| `"addr:postcode"`    |                                                                     |                                               |
| `"addr:country"`     |                                                                     |                                               |
| `"opening_hours"`    | https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification | "Mo-Fr 06:00-20:00,Sa 08:00-16:00"            |
| `"amenity"`          | https://wiki.openstreetmap.org/wiki/Key:amenity                     |                                               |
| `"wheelchair"`       | https://wiki.openstreetmap.org/wiki/Key:wheelchair                  | "yes" for accessible, "no" for non-accessible |

|

#### Example

A Place creator can describe the properties of their Place using these tags like this:

```json
"tags": [
  ["name", "Jitter's Coffee Shop"],
  ["website", "https://example.com"],
  ["opening_hours", "Mo-Fr 06:00-20:00, Sa 08:00-16:00"]
]
```

#### Requirements

- Only one of each Property tag MAY be used in a single event.
- The 0th element of a Property tag, such as `"name"`, is the key. The next element is the value, such as `"Jitter's Coffee Shop"`. The value should not be an empty string in a kind 37515. However, in a kind 1754, if the value is an empty string it denotes the complete removal of the property from the Place. This is NOT the same as using something like `"false"` as the value.

Property tags are **not** indexed by relays. They can be used for client-side filtering and interpretation of Places after they are queried from the relays; the `g` tag is the preferred method to query for Places in an area.

### Contributor Tags

The Place creator can designate other pubkeys via `"contributor"` tags. If these `"contributor"` pubkeys publish kind `1754` events to apply properties to the Place, clients SHOULD give their properties higher consideration than properties applied by non-contributor pubkeys.

### Other Tags

- `"d"` tag is necessary for a replaceable event if you desire to make more than one of them.
- `"g"` tag MUST be present and as accurate to the GeoJSON geometry as possible. This allows for indexed relay queries to retrieve Places in an area. Retrieving Places based on the geohash closest to the screen's viewport will be the primary method of retrieving Places from relays.
- `"r"` tab may be present and is used to include the OSM ID and OSM Type which are concatenated like this: `"R4469371"`. The second value should be "`osm_ref`".
- `"expiration"` may be used for temporary Places such as marking a speed trap.

## Property Application Kind 1754

A kind `1754` event MAY be used to apply properties to other Places. This enables crowdsourcing of useful Place information, but clients ultimately decide how this information is used. A client may request kind `1754` and filter by `a` tag to get all of the Property Application events for a particular Place.

### Content

The `content` field MAY include a human-readable explanation or note for the event.

### Property Target

The Property Application event MUST include one or more `"a"` tags indicating the target Place(s) the props should be applied to.

### Property Interpretation

The properties applied to the target Place by publishing a kind 1754 are to be interpreted at the client's discretion. The following is a recommendation for how the precedence of properties can be determined:

1. A Place's own property tags take precedence in absence of applicable kind 1754 events.
2. Properties applied by a pubkey who is listed in a `"contributor"` tag on the Place should take precedence over the Place's original properties.
3. Properties applied by any other pubkey should only take precedence over the original Place and `"contributor"` properties if that pubkey has a high Web of Trust score to the current user.

Kind 37515 clients could provide a convenient UI for Place owners to copy-in kind 1754 properties they agree with; this would enable kind 1754 events to function as recommendations even if they are outside of the Place owner's Web of Trust.

### Kind 1754 Examples

Crowdsourcing a property for wheelchair accessibility to an existing Place:

```json
{
  "kind": 1754,
  "content": "Adding local observations regarding wheelchair accessibility at Jitter's Coffee Shop.",
  "tags": [
    ["wheelchair", "yes"]
    ["a", "37515:0af3b...:something unique"]
  ],
}
```

## Implementations

- https://go.yondar.me (work in progress)
- https://satlantis.io

## Resources

- https://geojson.io - useful playground for creating GeoJSON
- https://taginfo.openstreetmap.org - find info about properties used in OpenStreetMaps

## References

- [NIP-32](/32.md)
- [NIP-51](/51.md)
- "NIP-85" https://github.com/nostr-protocol/nips/pull/879
