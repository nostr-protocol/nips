NIP-Weather
===========

Weather Data
------------

`draft` `optional`

This NIP defines event types for publishing weather station metadata and sensor readings on Nostr.

## Weather Station Metadata (`kind:16428`)

A replaceable event describing a weather station's configuration and capabilities. Since `kind:16428` is in the replaceable range (10000-19999), there is one metadata event per pubkey. Each station should have its own pubkey/identity.

```jsonc
{
  "kind": 16428,
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

## Weather Station Readings (`kind:23415`)

Ephemeral events containing sensor readings. Since `kind:23415` is in the ephemeral range (20000-29999), relays are not expected to store these events (though they may choose to). For persistent storage of readings, use a regular kind (1000-9999). All sensor data is stored in tags to avoid JSON parsing.

```jsonc
{
  "kind": 23415,
  "tags": [
    ["s", "<station-id>"],
    ["a", "16428:<pubkey>:", "<relay-url>"],
    ["temp", "22.5"],
    ["humidity", "65.2"],
    ["pm25", "12.3"]
  ],
  "content": ""
}
```

Tags:
- `s` (optional): Station identifier for filtering readings by station
- `a` (optional): Reference to the metadata event (`16428:<pubkey>:` - note trailing colon for replaceable events)
- `temp` (optional): Temperature in Celsius
- `humidity` (optional): Relative humidity (0-100)
- `pm25`, `pm10` (optional): Air quality in µg/m³
- Other sensor tags as needed

## Open Questions

### Event Kind Range for Readings

Currently `kind:23415` is ephemeral (20000-29999), meaning relays are not expected to store readings. Should readings use regular events (1000-9999) instead to enable historical data queries and trend analysis? Tradeoff: storage burden vs. historical value.
