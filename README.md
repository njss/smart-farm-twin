# 🌐 Smart Farm Digital Twin

Part of the **Smart Farm workshop kit** for the Africa-UniNet project *Developing AI Competency for Sustainability in Ethiopia and Tanzania* (smart agriculture).

A 3D digital twin of a small farm plot, built with [Three.js](https://threejs.org), that **mirrors live sensor data** from MQTT (see [TOPICS.md](TOPICS.md)):

| Sensor value | What you see |
|---|---|
| Soil moisture | soil colour from dry sand to dark wet earth; plants turn yellow and droop when dry |
| Air temperature | plants droop in heat; label turns red |
| Light + farm time | sun position, sky colour, day and night |
| Rainfall | falling rain, grey sky |
| Pump | drip lines run, pump light turns green |

You can also **switch the pump** and **change the weather scenario** from the twin (commands go back to the simulator or the ESP32), open **VR mode** on a WebXR headset (e.g. Meta Quest browser), and **drop your own `.glb` 3D models** (for example from the Beestoon 3D generator) onto the farm.

If no sensor data arrives within 15 seconds, the twin switches to built-in **demo data**, so it can always be shown, even offline. Force it with `?demo=1`.

## Run locally

It is a static site, so any web server works:

```bash
python -m http.server 8000      # then open http://localhost:8000/?farm=team-1
```

Start `simulator.py` from `smart-farm-sensors` with the same farm id to see live data.

## Deploy

Import the repo in Vercel (no build step, no framework). Change the broker and the chatbot link in [`config.js`](config.js).

Three.js and MQTT.js are bundled in `vendor/`, so the page does not depend on external CDNs (useful on slow or filtered connections).

## 🧑🏾‍🎓 Student tasks

1. **Read the twin.** Run the simulator in the drought scenario. Describe what the twin shows after 10 farm hours, and which action a farmer should take.
2. **Close the loop.** Switch the pump on from the twin. How long until the plants recover? Is the automatic irrigation threshold in the simulator sensible?
3. **Add your object.** Create a 3D model of a sensor, a water tank or your team's device (Beestoon, Blender…), export as `.glb` and drop it into the twin.
4. **Add a visual rule.** In `main.js` → `updateTwin()`, add one new rule, for example a warning sign when humidity is above 90 % (disease risk).
5. **Twin or not?** Discuss: what makes this a *digital twin* and not just a 3D picture? What would be needed for a real farm (accuracy, update rate, two-way control, safety)?

## License

MIT. See [LICENSE](LICENSE). Bundles Three.js (MIT) and MQTT.js (MIT) in `vendor/` with their licences.
