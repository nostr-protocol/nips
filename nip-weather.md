NIP-Weather
===========

Weather Data
------------

`draft` `optional`

This NIP defines event types for publishing weather station metadata and sensor readings on Nostr.

## Event Kinds

- `kind:16158` (replaceable, 10000-19999): Weather station metadata
- `kind:4223` (regular, 1000-9999): Weather station readings

Note: These are temporary draft numbers. Final numbers will be assigned by maintainers upon acceptance.

## Weather Station Metadata (`kind:10xxx`)

A replaceable event describing a weather station's configuration and capabilities. Since `kind:10xxx` is in the replaceable range (10000-19999), there is one metadata event per pubkey. Each station should have its own pubkey/identity.

```jsonc
{
  "kind": 10xxx,
  "tags": [
    ["name", "Backyard Station"],
    ["location", "37.7749,-122.4194"],
    ["g", "9q5h"],
    ["elevation", "52"],
    ["power", "mains"],
    ["connectivity", "wifi"],
    ["sensor", "temp", "DHT11"],
    ["sensor", "humidity", "DHT11"],
    ["sensor", "pm25", "PMS5003"]
  ],
  "content": ""
}
```

Tags:
- `name` (optional): Human-readable station name
- `location` (optional): Comma-separated `latitude,longitude` in decimal degrees
- `g` (optional): Geohash for location indexing (see [NIP-52](52.md))
- `elevation` (optional): Elevation in meters above sea level
- `power` (optional): Power source type. Common values: `mains`, `solar`, `battery`, `solar_battery`, `usb`
- `connectivity` (optional): Connectivity type. Common values: `wifi`, `cellular`, `ethernet`, `lora`, `satellite`
- `sensor` (repeatable): Sensor types available with model identifier. Format: `["sensor", "<type>", "<model>"]`. Used for filtering/discovery (relays can index these).
- `t` (optional): Hashtag for discovery. SHOULD include `["t", "weather"]` for relay indexing.
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

Sensor readings use 3-parameter tags: `[sensor_type, value, model]`. The third parameter identifies the sensor model, enabling cross-station comparison and supporting multi-sensor setups where the same sensor type may use different models.

```jsonc
{
  "kind": xxxx,
  "tags": [
    ["t", "weather"],
    ["a", "10xxx:<pubkey>:", "<relay-url>"],
    ["temp", "22.5", "DHT11"],
    ["humidity", "65.2", "DHT11"],
    ["pm1", "8", "PMS5003"],
    ["pm25", "12", "PMS5003"],
    ["pm10", "15", "PMS5003"],
    ["air_quality", "627", "MQ-135"]
  ],
  "content": ""
}
```

Tags:
- `t` (optional): Hashtag for discovery. SHOULD include `["t", "weather"]` for relay indexing.
- `a` (optional): Reference to the metadata event (`10xxx:<pubkey>:` - note trailing colon for replaceable events)
- Sensor reading tags (repeatable, 3-parameter format `[sensor_type, value, model]`):
  - `temp`: Temperature in Celsius (°C)
  - `humidity`: Relative humidity (0-100%)
  - `pm1`, `pm25`, `pm10`: Particulate matter concentration in µg/m³
  - `air_quality`: Raw analog sensor value (0-1023, uncalibrated)
  - Other sensor tags as needed

The third parameter (model) identifies the sensor model (e.g., "DHT11", "PMS5003", "MQ-135"), enabling:
- Cross-station comparison of readings from the same sensor model
- Multi-sensor setups where different models measure the same parameter
- Quality control and calibration tracking

Relays can implement retention policies (e.g., keep last 30 days) to manage storage burden while preserving recent historical data.

## Discovery

The `["t", "weather"]` hashtag is optional but recommended in reading events to enable relay indexing and discovery of weather stations. Clients can discover weather data by querying for `{"#t": ["weather"]}`.

## Reference Implementation

- A working ESP8266-based weather station implementation is available at: https://github.com/samthomson/weather-station
- A simple client for viewing weather data is deployed here: https://weather.shakespeare.wtf/

This WIP (changing frequently) implementation demonstrates:
- Posting sensor readings to Nostr relays
- Multi-sensor support (temperature, humidity, PM sensors, air quality)

