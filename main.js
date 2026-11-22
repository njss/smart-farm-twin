// Smart Farm Digital Twin: a Three.js scene driven by live MQTT telemetry.
// Students: every visual rule (soil colour, plant stress, rain, irrigation) is in updateTwin().
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const cfg = window.SMARTFARM;
const params = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);

// ---------- renderer, camera, controls ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
$("#scene").appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(14, 10, 16);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 4;
controls.maxDistance = 60;
controls.enableDamping = true;

// In VR the player stands at the edge of the plot.
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);
renderer.xr.addEventListener("sessionstart", () => { rig.position.set(0, 0, 9); camera.position.set(0, 0, 0); });
renderer.xr.addEventListener("sessionend", () => { rig.position.set(0, 0, 0); camera.position.set(14, 10, 16); });

// ---------- lights and sky ----------
const hemi = new THREE.HemisphereLight(0xdfefff, 0x5b4a2e, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
scene.add(sun, sun.target);
const sunBall = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffe082 }));
scene.add(sunBall);
const DAY = new THREE.Color(0x8fd3ff), NIGHT = new THREE.Color(0x0b1a33), DUSK = new THREE.Color(0xf4a261);
scene.background = DAY.clone();
scene.fog = new THREE.Fog(scene.background, 60, 160);

// ---------- ground, plot, crops ----------
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
const grass = new THREE.Mesh(new THREE.CircleGeometry(120, 48), mat(0x6a9c3a));
grass.rotation.x = -Math.PI / 2;
grass.receiveShadow = true;
grass.name = "ground";
scene.add(grass);

const PLOT_W = 12, PLOT_D = 8;
const soilMat = mat(0x8d6e63);
const plot = new THREE.Mesh(new THREE.BoxGeometry(PLOT_W, 0.3, PLOT_D), soilMat);
plot.position.y = 0.15;
plot.receiveShadow = true;
plot.name = "ground";
scene.add(plot);
const SOIL_DRY = new THREE.Color(0xd2b48c), SOIL_WET = new THREE.Color(0x3e2723);

const plants = [];
const leafMat = mat(0x43a047);
const stemMat = mat(0x558b2f);
const ROWS = 5, PER_ROW = 11;
for (let r = 0; r < ROWS; r++) {
  for (let i = 0; i < PER_ROW; i++) {
    const p = new THREE.Group();
    const h = 0.9 + Math.random() * 0.4;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, h, 6), stemMat);
    stem.position.y = h / 2;
    stem.castShadow = true;
    p.add(stem);
    const leaves = [];
    for (let k = 0; k < 4; k++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 5), leafMat);
      const pivot = new THREE.Group();
      pivot.position.y = 0.25 + k * h / 5;
      pivot.rotation.y = k * 1.7 + Math.random();
      leaf.position.x = 0.32;
      leaf.rotation.z = -Math.PI / 2.6;
      leaf.castShadow = true;
      pivot.add(leaf);
      p.add(pivot);
      leaves.push(leaf);
    }
    p.position.set(-PLOT_W / 2 + 0.8 + i * ((PLOT_W - 1.6) / (PER_ROW - 1)), 0.3, -PLOT_D / 2 + 1 + r * ((PLOT_D - 2) / (ROWS - 1)));
    p.userData.leaves = leaves;
    scene.add(p);
    plants.push(p);
  }
}

// ---------- irrigation: tank, pump, pipes and drips ----------
const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 24), mat(0x1565c0, { roughness: 0.5 }));
tank.position.set(-PLOT_W / 2 - 2.5, 1.5, -PLOT_D / 2 + 1);
tank.castShadow = true;
const stand = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), mat(0x795548));
stand.position.set(tank.position.x, 0.15, tank.position.z);
const pumpBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), mat(0x9e9e9e, { metalness: 0.4 }));
pumpBox.position.set(-PLOT_W / 2 - 1.1, 0.25, -PLOT_D / 2 + 1);
pumpBox.name = "sensor:pump";
const pumpLight = new THREE.Mesh(new THREE.SphereGeometry(0.08), new THREE.MeshBasicMaterial({ color: 0x777777 }));
pumpLight.position.set(0, 0.32, 0);
pumpBox.add(pumpLight);
scene.add(tank, stand, pumpBox);
const pipeMat = mat(0x263238);
const header = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, PLOT_D, 8), pipeMat);
header.rotation.x = Math.PI / 2;
header.position.set(-PLOT_W / 2 + 0.2, 0.35, 0);
scene.add(header);
const dripPoints = [];
plants.forEach((p) => {
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, PLOT_W - 0.4, 6), pipeMat);
  if (p.position.x < -PLOT_W / 2 + 1) {
    line.rotation.z = Math.PI / 2;
    line.position.set(0, 0.33, p.position.z + 0.25);
    scene.add(line);
  }
  dripPoints.push(new THREE.Vector3(p.position.x, 0.33, p.position.z + 0.25));
});
const dripGeo = new THREE.BufferGeometry();
const dripPos = new Float32Array(dripPoints.length * 3);
dripGeo.setAttribute("position", new THREE.BufferAttribute(dripPos, 3));
const drips = new THREE.Points(dripGeo, new THREE.PointsMaterial({ color: 0x4fc3f7, size: 0.12 }));
drips.visible = false;
scene.add(drips);

// ---------- rain ----------
const RAIN_N = 4000;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 3);
for (let i = 0; i < RAIN_N; i++) {
  rainPos[i * 3] = (Math.random() - 0.5) * 50;
  rainPos[i * 3 + 1] = Math.random() * 25;
  rainPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
}
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaed6f1, size: 0.08, transparent: true, opacity: 0.8 }));
rain.visible = false;
scene.add(rain);

// ---------- sensors with floating labels ----------
function labelSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 160;
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(2.6, 0.8, 1);
  sprite.userData = { canvas, tex };
  return sprite;
}
function drawLabel(sprite, title, value, alert = false) {
  const { canvas, tex } = sprite.userData;
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = alert ? "rgba(198,40,40,.92)" : "rgba(27,94,32,.9)";
  g.beginPath(); g.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 28); g.fill();
  g.fillStyle = "#fff";
  g.font = "600 40px system-ui, sans-serif"; g.fillText(title, 28, 60);
  g.font = "700 56px system-ui, sans-serif"; g.fillText(value, 28, 128);
  tex.needsUpdate = true;
}
const sensors = {};
function addSensor(id, title, pos, height, color, keys) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, height, 8), mat(0xeceff1, { metalness: 0.6, roughness: 0.3 }));
  post.position.y = height / 2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.25), mat(color));
  head.position.y = height;
  post.castShadow = head.castShadow = true;
  post.name = head.name = "sensor:" + id;
  const label = labelSprite();
  label.position.y = height + 0.9;
  g.add(post, head, label);
  g.position.copy(pos);
  scene.add(g);
  sensors[id] = { title, label, keys };
  drawLabel(label, title, "–");
}
addSensor("soil", "Soil", new THREE.Vector3(1.2, 0.3, 0.6), 0.9, 0x6d4c41, ["soil_moisture", "soil_temperature"]);
addSensor("air", "Weather", new THREE.Vector3(PLOT_W / 2 + 1.5, 0, -PLOT_D / 2 + 1), 2.8, 0xffffff, ["air_temperature", "air_humidity", "light"]);
addSensor("rain", "Rain gauge", new THREE.Vector3(PLOT_W / 2 + 1.5, 0, PLOT_D / 2 - 1), 1.4, 0x0277bd, ["rainfall"]);

// ---------- decoration: a few trees ----------
for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2, d = 22 + Math.random() * 12;
  const tr = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 6), mat(0x5d4037));
  trunk.position.y = 1;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random(), 8, 6), mat(0x2e7d32));
  crown.position.y = 3;
  crown.scale.y = 0.6;
  trunk.castShadow = crown.castShadow = true;
  tr.add(trunk, crown);
  tr.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
  scene.add(tr);
}

// ---------- the twin logic ----------
let reading = null;
const fmt = { soil_moisture: (v) => `${v}%`, soil_temperature: (v) => `${v} °C`, air_temperature: (v) => `${v} °C`,
  air_humidity: (v) => `${v}%`, light: (v) => `${Math.round(v / 1000)}k lux`, rainfall: (v) => `${v} mm/h` };

function hourOf(r) {
  if (r.sim_time) { const [h, m] = r.sim_time.split(":").map(Number); return h + m / 60; }
  const d = r.ts ? new Date(r.ts) : new Date();
  return d.getHours() + d.getMinutes() / 60;
}

function updateTwin(r) {
  reading = r;
  // HUD
  document.querySelectorAll("#values tr").forEach((tr) => {
    const v = r[tr.dataset.key];
    tr.cells[1].textContent = v ?? "–";
  });
  const dry = r.soil_moisture < 25, wet = r.soil_moisture > 48, hot = r.air_temperature >= 33;
  $("#values tr[data-key=soil_moisture]").classList.toggle("alert", dry || wet);
  $("#values tr[data-key=air_temperature]").classList.toggle("alert", hot);
  $("#clock").textContent = r.sim_time ? `farm time ${r.sim_time}` : new Date(r.ts || Date.now()).toLocaleTimeString();
  $("#pumpBtn").disabled = false;

  // Soil colour: dry sand to dark wet earth.
  const m = THREE.MathUtils.clamp((r.soil_moisture - 10) / 40, 0, 1);
  soilMat.color.copy(SOIL_DRY).lerp(SOIL_WET, m);

  // Plant stress: yellow and drooping when dry or hot, healthy green otherwise.
  const stress = THREE.MathUtils.clamp((dry ? (25 - r.soil_moisture) / 12 : 0) + (hot ? (r.air_temperature - 33) / 6 : 0), 0, 1);
  leafMat.color.setHSL(0.33 - 0.2 * stress, 0.55, 0.38 + 0.1 * stress);
  plants.forEach((p) => p.userData.leaves.forEach((leaf) => { leaf.rotation.z = -Math.PI / 2.6 - stress * 0.8; }));

  // Sun position and sky colour follow the time of day.
  const h = hourOf(r);
  const ang = ((h - 6) / 12) * Math.PI;
  const elev = Math.sin(ang);
  sun.position.set(Math.cos(ang) * 40, Math.max(elev, -0.2) * 40, -10);
  sunBall.position.copy(sun.position);
  sunBall.visible = elev > 0;
  const lightK = THREE.MathUtils.clamp((r.light ?? elev * 100000) / 100000, 0, 1);
  sun.intensity = 0.2 + 2.6 * lightK;
  hemi.intensity = 0.25 + 0.8 * Math.max(elev, 0);
  const sky = NIGHT.clone().lerp(DAY, THREE.MathUtils.clamp(elev * 1.6, 0, 1));
  if (elev > -0.1 && elev < 0.25) sky.lerp(DUSK, 0.35);
  if (r.rainfall > 0) sky.lerp(new THREE.Color(0x78909c), 0.6);
  scene.background.copy(sky);
  scene.fog.color.copy(sky);

  rain.visible = r.rainfall > 0;
  rain.geometry.setDrawRange(0, Math.min(RAIN_N, Math.round(200 + r.rainfall * 250)));
  const pumpOn = r.pump === "on";
  drips.visible = pumpOn;
  pumpLight.material.color.set(pumpOn ? 0x00e676 : 0x777777);

  for (const s of Object.values(sensors)) {
    const text = s.keys.filter((k) => r[k] !== undefined).map((k) => fmt[k](r[k])).slice(0, 2).join("  ");
    drawLabel(s.label, s.title, text || "–", (s.keys.includes("soil_moisture") && (dry || wet)) || (s.keys.includes("air_temperature") && hot));
  }
}

// ---------- MQTT ----------
const farmInput = $("#farm");
farmInput.value = params.get("farm") || cfg.defaultFarm;
const topic = (s) => `${cfg.root}/${farmInput.value.trim() || cfg.defaultFarm}/${s}`;
let client = null, lastMsg = 0, demo = params.get("demo") === "1", demoState = { m: 30, pump: false, scenario: "normal", t0: Date.now() };

function setConn(on, text) { $("#conn").className = "dot " + (on ? "on" : "off"); $("#connText").textContent = text; }
function updateChatLink() {
  $("#chatLink").href = `${cfg.chatbotUrl}/?farm=${encodeURIComponent(farmInput.value.trim())}`;
}

function connect() {
  if (client) client.end(true);
  updateChatLink();
  if (demo) return setConn(true, "demo data (offline)");
  setConn(false, "connecting…");
  client = mqtt.connect(cfg.brokerUrl, { clientId: "twin-" + Math.random().toString(16).slice(2, 10), reconnectPeriod: 4000, connectTimeout: 8000 });
  client.on("connect", () => { setConn(true, "live"); client.subscribe([topic("telemetry"), topic("status")]); });
  client.on("close", () => setConn(false, "offline"));
  client.on("message", (t, buf) => {
    if (t.endsWith("/status")) { if (buf.toString() === "offline") setConn(false, "sensor kit offline"); return; }
    try { lastMsg = Date.now(); demo = false; updateTwin(JSON.parse(buf.toString())); setConn(true, "live"); } catch { /* ignore bad payloads */ }
  });
}

// Offline fallback so the twin can still be shown with no internet or no simulator.
// It understands the same scenarios as simulator.py, so the buttons also work in demo mode.
const DEMO = {   // base temp, temp swing, humidity offset, rain mm/h, drying factor
  normal: [17, 12, 0, 0, 1], drought: [20, 14, -15, 0, 2.5], heatwave: [24, 15, -20, 0, 3], heavy_rain: [16, 5, 12, 15, 0.2] };
function demoTick() {
  const hours = ((Date.now() - demoState.t0) / 1000) / 6 + 9;   // 6 real seconds = 1 farm hour
  const h = hours % 24, s = Math.max(0, Math.sin(Math.PI * (h - 6) / 12));
  const [bt, sw, hum, rainMm, dry] = DEMO[demoState.scenario] || DEMO.normal;
  demoState.m = THREE.MathUtils.clamp(demoState.m + (demoState.pump ? 0.8 : 0) + rainMm * 0.03 - 0.12 * dry * s, 8, 55);
  updateTwin({ ts: new Date().toISOString(), sim_time: `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`,
    soil_moisture: +demoState.m.toFixed(1), soil_temperature: +(bt + 1 + sw * 0.5 * s).toFixed(1), air_temperature: +(bt + sw * s).toFixed(1),
    air_humidity: +THREE.MathUtils.clamp(85 + hum - 45 * s, 10, 98).toFixed(1), light: Math.round((rainMm ? 25000 : 95000) * s),
    rainfall: rainMm, pump: demoState.pump ? "on" : "off", scenario: demoState.scenario, source: "demo" });
}
setInterval(() => {
  if (!demo && Date.now() - lastMsg > 15000) { demo = true; setConn(true, "demo data (no simulator running for this farm)"); }
  if (demo) demoTick();
}, 1000);

$("#pumpBtn").addEventListener("click", () => {
  const next = reading?.pump === "on" ? "off" : "on";
  if (demo) { demoState.pump = next === "on"; return demoTick(); }
  client?.publish(topic("cmd/pump"), JSON.stringify({ state: next }));
});
document.querySelectorAll("#scenarios button").forEach((b) => b.addEventListener("click", () => {
  const s = b.dataset.s;
  if (demo) { demoState.scenario = s; demoTick(); }
  else client?.publish(topic("cmd/scenario"), JSON.stringify({ scenario: s }));
  $("#scenarioHint").textContent = demo
    ? `Demo data switched to "${s}". Start simulator.py for live data.`
    : `Sent "${s}" to the simulator for farm ${farmInput.value.trim()}. Watch the scenario row change.`;
}));
farmInput.addEventListener("change", () => { demo = false; reading = null; lastMsg = 0; connect(); });
connect();

// ---------- picking: inspect sensors, place models ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let lastModel = null;
renderer.domElement.addEventListener("pointerup", (e) => {
  if (e.button !== 0) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(scene.children, true).find((h) => h.object.name);
  if (!hit) return;
  if (hit.object.name.startsWith("sensor:")) {
    const id = hit.object.name.slice(7);
    const s = sensors[id];
    const keys = s ? s.keys : ["pump"];
    $("#pick").innerHTML = `<b>${s ? s.title : "Pump"}</b>: ` + keys.map((k) => `${k.replace("_", " ")} = ${reading?.[k] ?? "–"}`).join(", ");
  } else if (hit.object.name === "ground" && lastModel) {
    lastModel.position.set(hit.point.x, 0, hit.point.z);
  }
});

// ---------- drag and drop glTF models (for example from Beestoon) ----------
const loader = new GLTFLoader();
function addModel(file) {
  const url = URL.createObjectURL(file);
  loader.load(url, (gltf) => {
    const obj = gltf.scene;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const k = 2.5 / Math.max(size.x, size.y, size.z || 1);
    obj.scale.setScalar(k);
    const b2 = new THREE.Box3().setFromObject(obj);
    obj.position.set(PLOT_W / 2 + 4, -b2.min.y, 0);
    obj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(obj);
    lastModel = obj;
    const li = document.createElement("li");
    li.textContent = file.name;
    $("#models").appendChild(li);
    URL.revokeObjectURL(url);
  }, undefined, (err) => alert("Could not load model: " + err.message));
}
const drop = $("#drop");
addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("show"); });
addEventListener("dragleave", (e) => { if (e.target === drop) drop.classList.remove("show"); });
addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("show");
  [...e.dataTransfer.files].filter((f) => /\.(glb|gltf)$/i.test(f.name)).forEach(addModel);
});
$("#modelFile").addEventListener("change", (e) => [...e.target.files].forEach(addModel));

// ---------- animation loop ----------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (rain.visible) {
    const p = rain.geometry.attributes.position;
    for (let i = 0; i < RAIN_N; i++) {
      let y = p.array[i * 3 + 1] - 18 * dt;
      p.array[i * 3 + 1] = y < 0 ? 25 : y;
    }
    p.needsUpdate = true;
  }
  if (drips.visible) {
    const t = performance.now() / 1000;
    dripPoints.forEach((v, i) => {
      const f = (t * 1.5 + i * 0.37) % 1;
      dripPos[i * 3] = v.x; dripPos[i * 3 + 1] = v.y - f * 0.3; dripPos[i * 3 + 2] = v.z;
    });
    dripGeo.attributes.position.needsUpdate = true;
  }
  controls.update();
  renderer.render(scene, camera);
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

window.__twin = { updateTwin, scene };   // handy for debugging in the browser console
