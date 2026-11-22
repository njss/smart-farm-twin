# Shared MQTT contract

Every workshop app speaks the same "language" over MQTT, so a team can swap the
simulator for a real ESP32 kit, or the demo chatbot for their own, without
changing anything else.

| | Default |
|---|---|
| Broker (Python, ESP32) | `broker.emqx.io`, TCP port `1883` |
| Broker (browsers) | `wss://broker.emqx.io:8084/mqtt` |
| Topic root | `ecocomp/smartfarm/<farm_id>` |
| Demo farm id | `iringa-demo` (each team picks its own, e.g. `team-3`) |

> The default broker is a free public one: anyone can read and write these topics.
> That is fine for a workshop with simulated data. For a real farm, use your own
> broker with a username and password (for example a free HiveMQ Cloud or EMQX
> Serverless instance) and change the broker in each app's config.

## Topics

| Topic | Direction | Payload | Retained |
|---|---|---|---|
| `…/<farm_id>/telemetry` | kit → apps | JSON reading (below) | yes |
| `…/<farm_id>/status` | kit → apps | `online` / `offline` (Last Will) | yes |
| `…/<farm_id>/cmd/pump` | apps → kit | `{"state": "on"}` or `{"state": "off"}` | no |
| `…/<farm_id>/cmd/scenario` | apps → simulator | `{"scenario": "normal" \| "drought" \| "heatwave" \| "heavy_rain"}` | no |

## Telemetry payload

```json
{
  "farm_id": "iringa-demo",
  "ts": "2026-12-02T08:15:00Z",
  "soil_moisture": 31.4,
  "soil_temperature": 19.8,
  "air_temperature": 24.6,
  "air_humidity": 58.0,
  "light": 64000,
  "rainfall": 0.0,
  "pump": "off",
  "scenario": "normal",
  "sim_time": "10:40",
  "source": "simulator"
}
```

| Field | Unit | Notes |
|---|---|---|
| `soil_moisture` | % volumetric water content | about 10 (very dry) to 50 (saturated) |
| `soil_temperature`, `air_temperature` | °C | |
| `air_humidity` | % relative humidity | |
| `light` | lux | full sun ≈ 100 000 |
| `rainfall` | mm per hour | rate during the last reading |
| `pump` | `on` / `off` | irrigation pump relay state |
| `scenario` | text | simulator scenario, or `real` from hardware |
| `sim_time` | `HH:MM` | simulated time of day (simulator only) |
| `source` | text | `simulator`, `esp32`, `manual`, … |
