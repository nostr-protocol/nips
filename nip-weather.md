NIP-Weather
===========

Weather Data
------------

`draft` `optional`

This NIP defines event types for publishing weather station metadata and sensor readings on Nostr.

## Event Kinds

- `kind:10xxx` (replaceable, 10000-19999): Weather station metadata
- `kind:xxxx` (regular, 1000-9999): Weather station readings

## Weather Station Metadata (`kind:10xxx`)

A replaceable event describing a weather station's configuration and capabilities. Since `kind:10xxx` is in the replaceable range (10000-19999), there is one metadata event per pubkey. Each station should have its own pubkey/identity.

```jsonc
{
  "kind": 10xxx,
  "tags": [
    ["name", "Backyard Station"],
    ["location", "37.7749,-122.4194"],
    ["elevation", "52"],
    ["sensor", "temp"],
    ["sensor", "humidity"],
    ["sensor", "pm25"]
  ],
  "content": ""
}
```

Tags:
- `name` (optional): Human-readable station name
- `location` (optional): Comma-separated `latitude,longitude` in decimal degrees
- `elevation` (optional): Elevation in meters above sea level
- `sensor` (repeatable): Sensor types available. Used for filtering/discovery (relays can index these).
- Other tags as needed

To group multiple stations together, use [NIP-51](51.md) lists. `kind:30001` (generic lists) can be used with `p` tags referencing station pubkeys. Example:

```jsonc
{
  "kind": 30001,
  "tags": [
    ["d", "my-stations"],
    ["title", "My Weather Stations"],
    ["p", "<station1-pubkey>"],
    ["p", "<station2-pubkey>"]
  ]
}
```

## Weather Station Readings (`kind:xxxx`)

Regular events containing sensor readings. In the regular range (1000-9999), all readings are stored by relays, enabling historical queries (e.g., last hour, last day). All sensor data is stored in tags.

```jsonc
{
  "kind": xxxx,
  "tags": [
    ["s", "<station-id>"],
    ["a", "10xxx:<pubkey>:", "<relay-url>"],
    ["temp", "22.5"],
    ["humidity", "65.2"],
    ["pm25", "12.3"]
  ],
  "content": ""
}
```

Tags:
- `s` (optional): Station identifier for filtering readings by station
- `a` (optional): Reference to the metadata event (`10xxx:<pubkey>:` - note trailing colon for replaceable events)
- `temp` (optional): Temperature in Celsius
- `humidity` (optional): Relative humidity (0-100)
- `pm25`, `pm10` (optional): Air quality in µg/m³
- Other sensor tags as needed

Relays can implement retention policies (e.g., keep last 30 days) to manage storage burden while preserving recent historical data.
