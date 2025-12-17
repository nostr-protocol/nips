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
    ["sensor", "temp"],
    ["sensor", "humidity"],
    ["sensor", "pm25"]
  ],
  "content": "{\"name\":\"Backyard Station\",\"location\":[37.7749,-122.4194],\"elevation\":52,\"sensors\":{\"temp\":{\"model\":\"DS18B20\"},\"pm25\":{\"model\":\"SDS011\"}}}"
}
```

Tags:
- `sensor` (repeatable): Sensor types available. Used for filtering/discovery (relays can index these).

Content: JSON object with optional fields. Not indexed by relays, but flexible for structured data:
- `name`: Human-readable station name
- `location`: Array `[latitude, longitude]` in decimal degrees
- `elevation`: Elevation in meters above sea level
- `sensors`: Object with detailed sensor information (model, calibration, etc.)
- Other fields as needed

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

Ephemeral events containing sensor readings. Since `kind:23415` is in the ephemeral range (20000-29999), relays are not expected to store these events (though they may choose to). For persistent storage of readings, use a regular kind (1000-9999). Tags are used for relationships/filtering, content contains the actual sensor data.

```jsonc
{
  "kind": 23415,
  "tags": [
    ["s", "<station-id>"],
    ["a", "16428:<pubkey>", "<relay-url>"]
  ],
  "content": "{\"temp\":22.5,\"humidity\":65.2,\"pm25\":12.3}"
}
```

Tags:
- `s` (optional): Station identifier for filtering readings by station
- `a` (optional): Reference to the metadata event (`16428:<pubkey>`)

Content: JSON object with sensor readings. Fields are optional and depend on available sensors. Common fields:
- `temp`: Temperature in Celsius
- `humidity`: Relative humidity (0-100)
- `pm25`, `pm10`: Air quality in µg/m³

## Open Questions

### Event Kind Range for Readings

Currently `kind:23415` is ephemeral (20000-29999), meaning relays are not expected to store readings. Should readings use regular events (1000-9999) instead to enable historical data queries and trend analysis? Tradeoff: storage burden vs. historical value.
