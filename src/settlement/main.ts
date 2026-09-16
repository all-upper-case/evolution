import "./styles.css";
import { SimulationClock } from "../simulation/clock";
import {
  activityLabel,
  SettlementWorld,
  type Inhabitant,
  settlementTime,
} from "./settlement";
import { parseSettlement, SAVE_KEY } from "./persistence";
import { mapPoint, type Camera, renderSettlement } from "./settlement-renderer";

const root = document.querySelector<HTMLElement>("#app");
if (root === null) throw new Error("Application root was not found.");

root.innerHTML = `<div class="settlement-shell">
  <header class="settlement-hero"><div><p class="settlement-eyebrow">An observational settlement simulation</p><h1>Hearthwatch</h1><p>There are no orders to issue here. Follow a small band of inhabitants as they forage, rest, seek company, and gradually make lives in a seeded little world.</p></div><a href="./">Visit the original evolution lab</a></header>
  <section class="settlement-grid" aria-label="Living settlement">
    <div class="map-card">
      <div class="section-heading"><div><p class="settlement-eyebrow">The valley</p><h2>A world going about its business</h2></div><div class="legend"><span class="key inhabitant-key">Inhabitants</span><span class="key food-key">Wild food</span><span class="key camp-key">Camp</span><span class="key water-key">Water</span></div></div>
      <div class="settlement-controls map-controls"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="overview">Whole valley</button><button id="follow" aria-pressed="false">Follow selected</button><span id="daytime"></span></div><canvas id="settlement-map" tabindex="0" aria-label="Map of Hearthwatch" aria-describedby="map-help"></canvas>
      <p id="map-help" class="map-help">Tap a person to inspect them. Drag to pan; use +/− to zoom. Arrow keys pan the focused map. Select Follow to travel with someone.</p>
    </div>
    <aside class="cast-card" aria-labelledby="cast-title"><p class="settlement-eyebrow">The cast</p><h2 id="cast-title">Who lives here</h2><div id="cast" class="cast-list"></div></aside>
    <aside class="detail-card" aria-labelledby="detail-name"><p class="settlement-eyebrow">Following</p><h2 id="detail-name">The settlement</h2><p id="detail-summary">Choose someone from the cast to see what they are doing and how they feel.</p><div id="detail" hidden>
      <p class="activity" id="detail-activity"></p><dl class="needs"><div><dt>Health</dt><dd id="need-health"></dd></div><div><dt>Hunger</dt><dd id="need-hunger"></dd></div><div><dt>Fatigue</dt><dd id="need-fatigue"></dd></div><div><dt>Loneliness</dt><dd id="need-loneliness"></dd></div><div><dt>Carrying</dt><dd id="carried-food"></dd></div></dl>
      <h3>Disposition</h3><dl class="traits"><div><dt>Curiosity</dt><dd id="trait-curiosity"></dd></div><div><dt>Sociability</dt><dd id="trait-sociability"></dd></div><div><dt>Resilience</dt><dd id="trait-resilience"></dd></div></dl>
      <h3>Home & connections</h3><p id="home-summary"></p><p id="connections"></p><h3>Recent memories</h3><ol id="memories"></ol><h3>Practiced work</h3><p id="skill-summary" class="skill-summary"></p>
    </div></aside>
    <section class="chronicle-card" aria-labelledby="chronicle-title"><div class="section-heading"><div><p class="settlement-eyebrow">The chronicle</p><h2 id="chronicle-title">Things worth noticing</h2></div><span id="chronicle-count"></span></div><ol id="chronicle"></ol></section>
  </section>
  <section class="clock-card" aria-labelledby="clock-title"><div><p class="settlement-eyebrow">Time and provisions</p><h2 id="clock-title">Let it unfold</h2></div><div class="settlement-metrics"><div><small>Moment</small><strong id="tick">0</strong></div><div><small>Population</small><strong id="population">14</strong></div><div><small>Wild food</small><strong id="food">520</strong></div><div><small>Raw stores</small><strong id="raw-food">12</strong></div><div><small>Prepared meals</small><strong id="prepared-meals">8</strong></div><div><small>Seed</small><strong id="seed-value">42</strong></div></div><div class="settlement-controls"><button id="play" type="button">Watch</button><button id="step" type="button" class="quiet">One moment</button><label>Tempo<select id="speed"><option value="0.5">½×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label><label>World seed<input id="seed" type="number" min="0" max="4294967295" value="42"></label><button id="reset" type="button" class="quiet">New world</button><button id="undo-reset" type="button" class="quiet" disabled>Undo new world</button></div><div class="settlement-controls"><button id="save-world">Download world</button><label>Restore world<input id="load-world" type="file" accept=".json,application/json"></label><span id="save-status">Saved automatically on this browser.</span></div><p id="message" role="status"></p></section>
  <footer>Observation only · needs, skilled work, communal provisions, and a causal chronicle</footer>
</div>`;

const element = (id: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`#${id}`);
  if (found === null) throw new Error(`#${id} was not found.`);
  return found;
};

const canvas = element("settlement-map") as HTMLCanvasElement;
const play = element("play") as HTMLButtonElement;
const step = element("step") as HTMLButtonElement;
const speed = element("speed") as HTMLSelectElement;
const seedInput = element("seed") as HTMLInputElement;
const cast = element("cast") as HTMLDivElement;
const mapControls = document.querySelector(".map-controls");
if (mapControls && speed.parentElement)
  mapControls.prepend(play, step, speed.parentElement);
let world = new SettlementWorld(42);
let clock = new SimulationClock(3);
let selectedId: number | null = null;
let previousFrame: number | undefined;
let camera: Camera = { x: 32, y: 32, zoom: 2 };
let following = false;
let lastSaveTick = -1;
let storageBlocked = false;
let previousWorld: ReturnType<typeof parseSettlement> | null = null;
try {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    world = SettlementWorld.fromSnapshot(parseSettlement(saved));
    clock = new SimulationClock(3, world.snapshot.tick);
    seedInput.value = String(world.snapshot.seed);
    element("message").textContent =
      "Your village has been restored, paused where you left it.";
  }
} catch {
  storageBlocked = true;
  element("save-status").textContent =
    "Previous save could not be restored. Download a backup before starting a new world.";
}
const save = (): void => {
  if (storageBlocked || lastSaveTick === world.snapshot.tick) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(world.snapshot));
    lastSaveTick = world.snapshot.tick;
    element("save-status").textContent =
      `Saved · ${settlementTime(lastSaveTick)}`;
  } catch {
    element("save-status").textContent =
      "Automatic saving unavailable; download your world to keep it.";
  }
};
const escape = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] ?? c,
  );

const formatNeed = (value: number): string =>
  `${Math.round(value).toString()}%`;
const disposition = (value: number): string =>
  value < 0.9 ? "Low" : value > 1.1 ? "High" : "Moderate";

const renderInhabitant = (inhabitant: Inhabitant | undefined): void => {
  const details = element("detail") as HTMLDivElement;
  if (inhabitant === undefined) {
    element("detail-name").textContent = "The settlement";
    element("detail-summary").textContent =
      "Choose someone from the cast to see what they are doing and how they feel.";
    details.hidden = true;
    return;
  }
  details.hidden = false;
  element("detail-name").textContent = inhabitant.name;
  element("detail-summary").textContent =
    `${inhabitant.name} is the settlement's ${inhabitant.role}. They have lived here for ${String(Math.floor(inhabitant.ageTicks / 600))} full days.`;
  element("detail-activity").textContent = activityLabel(inhabitant.activity);
  element("need-health").textContent = formatNeed(inhabitant.health);
  element("need-hunger").textContent = formatNeed(inhabitant.hunger);
  element("need-fatigue").textContent = formatNeed(inhabitant.fatigue);
  element("need-loneliness").textContent = formatNeed(inhabitant.loneliness);
  element("carried-food").textContent =
    `${inhabitant.carriedFood.toFixed(1)} food · ${String(inhabitant.carriedWood)} timber`;
  element("trait-curiosity").textContent = disposition(
    inhabitant.personality.curiosity,
  );
  element("trait-sociability").textContent = disposition(
    inhabitant.personality.sociability,
  );
  element("trait-resilience").textContent = disposition(
    inhabitant.personality.resilience,
  );
  const snapshot = world.snapshot;
  const home = snapshot.shelters.find((h) => h.id === inhabitant.homeId);
  if (!home) throw new Error("Missing home.");
  element("home-summary").textContent =
    `Home ${String(home.id)}: ${home.progress >= 100 ? "sheltered bed, improved rest" : `${String(home.timber)}/8 timber · ${String(home.progress)}% built`}.`;
  const connections = Object.entries(inhabitant.relationships)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  element("connections").textContent = connections.length
    ? connections
        .map(
          ([id, affinity]) =>
            `${snapshot.inhabitants.find((p) => p.id === Number(id))?.name ?? "A departed neighbor"} · ${affinity >= 40 ? "familiar friend" : "getting acquainted"}`,
        )
        .join("; ")
    : "Still getting to know their neighbors.";
  element("memories").innerHTML = inhabitant.memories
    .slice(-5)
    .reverse()
    .map((e) => `<li>${escape(settlementTime(e.tick))}: ${escape(e.text)}</li>`)
    .join("");
  const strongestSkill = Object.entries(inhabitant.skills).sort(
    ([, first], [, second]) => second - first,
  )[0];
  element("skill-summary").textContent = strongestSkill
    ? `${inhabitant.name} is especially practiced at ${strongestSkill[0]}. Their role changes how quickly that work meets the settlement's needs.`
    : "Their practical strengths are still emerging.";
};

const render = (): void => {
  const snapshot = world.snapshot;
  if (
    selectedId !== null &&
    !snapshot.inhabitants.some(({ id }) => id === selectedId)
  )
    selectedId = null;
  const selected = snapshot.inhabitants.find((p) => p.id === selectedId);
  if (following && selected) {
    camera.x = selected.x;
    camera.y = selected.y;
  }
  renderSettlement(canvas, snapshot, selectedId ?? undefined, camera);
  element("daytime").textContent = settlementTime(snapshot.tick);
  element("follow").setAttribute("aria-pressed", String(following));
  element("tick").textContent = snapshot.tick.toLocaleString();
  element("population").textContent =
    snapshot.inhabitants.length.toLocaleString();
  element("food").textContent = Math.floor(snapshot.totalFood).toLocaleString();
  element("raw-food").textContent = snapshot.stockpile.rawFood.toFixed(1);
  element("prepared-meals").textContent =
    snapshot.stockpile.preparedMeals.toLocaleString();
  element("seed-value").textContent = snapshot.seed.toLocaleString();
  canvas.setAttribute(
    "aria-label",
    `Hearthwatch at tick ${snapshot.tick.toLocaleString()} with ${snapshot.inhabitants.length.toLocaleString()} inhabitants`,
  );
  const liveIds = new Set(snapshot.inhabitants.map((p) => String(p.id)));
  for (const button of cast.querySelectorAll<HTMLButtonElement>(
    "[data-inhabitant]",
  )) {
    if (!liveIds.has(button.dataset.inhabitant ?? "")) button.remove();
  }
  for (const inhabitant of snapshot.inhabitants) {
    let button = cast.querySelector<HTMLButtonElement>(
      `[data-inhabitant="${String(inhabitant.id)}"]`,
    );
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.inhabitant = String(inhabitant.id);
      button.append(
        document.createElement("strong"),
        document.createElement("span"),
      );
      cast.append(button);
    }
    button.className = `cast-member${inhabitant.id === selectedId ? " selected" : ""}`;
    button.setAttribute("aria-pressed", String(inhabitant.id === selectedId));
    const name = button.querySelector("strong"),
      activity = button.querySelector("span");
    if (name) name.textContent = inhabitant.name;
    if (activity) activity.textContent = activityLabel(inhabitant.activity);
  }
  renderInhabitant(snapshot.inhabitants.find(({ id }) => id === selectedId));
  const recent = snapshot.chronicle.slice(-18).reverse();
  element("chronicle-count").textContent =
    `${snapshot.chronicle.length.toLocaleString()} remembered`;
  element("chronicle").innerHTML = recent
    .map(
      (entry) =>
        `<li><time>${settlementTime(entry.tick)}</time><span>${escape(entry.text)}</span></li>`,
    )
    .join("");
};

cast.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>("[data-inhabitant]");
  if (button === null) return;
  selectedId = Number(button.dataset.inhabitant);
  element("message").textContent =
    `Selected ${world.snapshot.inhabitants.find(({ id }) => id === selectedId)?.name ?? "inhabitant"}.`;
  const person = world.snapshot.inhabitants.find((p) => p.id === selectedId);
  if (person) {
    camera.x = person.x;
    camera.y = person.y;
  }
  render();
});

play.addEventListener("click", () => {
  if (clock.snapshot.running) {
    clock.pause();
    play.textContent = "Watch";
    step.disabled = false;
  } else {
    clock.play();
    play.textContent = "Pause";
    step.disabled = true;
    previousFrame = undefined;
  }
});

step.addEventListener("click", () => {
  clock.step();
  world.step();
  render();
});

speed.addEventListener("change", () => {
  clock.setSpeed(Number(speed.value));
});

const reset = (): void => {
  const seed = Number(seedInput.value);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
    element("message").textContent =
      "The seed must be a whole number from 0 through 4,294,967,295.";
    return;
  }
  save();
  previousWorld = world.snapshot;
  (element("undo-reset") as HTMLButtonElement).disabled = false;
  world = new SettlementWorld(seed);
  clock = new SimulationClock(3);
  clock.setSpeed(Number(speed.value));
  lastSaveTick = -1;
  storageBlocked = false;
  following = false;
  camera = { x: 32, y: 32, zoom: 2 };
  selectedId = null;
  play.textContent = "Watch";
  step.disabled = false;
  previousFrame = undefined;
  element("message").textContent =
    `A new Hearthwatch began from seed ${seed.toLocaleString()}.`;
  render();
  save();
};

(element("reset") as HTMLButtonElement).addEventListener("click", reset);

element("zoom-in").addEventListener("click", () => {
  camera.zoom = Math.min(4, camera.zoom * 1.5);
  render();
});
element("zoom-out").addEventListener("click", () => {
  camera.zoom = Math.max(1, camera.zoom / 1.5);
  render();
});
element("overview").addEventListener("click", () => {
  following = false;
  camera = { x: 32, y: 32, zoom: 1 };
  render();
});
element("follow").addEventListener("click", () => {
  selectedId ??= world.snapshot.inhabitants[0]?.id ?? null;
  following = !following;
  render();
});
let drag: {
  x: number;
  y: number;
  cx: number;
  cy: number;
  moved: boolean;
} | null = null;
canvas.addEventListener("pointerdown", (e) => {
  drag = {
    x: e.clientX,
    y: e.clientY,
    cx: camera.x,
    cy: camera.y,
    moved: false,
  };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) < 5 && !drag.moved) return;
  drag.moved = true;
  following = false;
  const factor = 64 / camera.zoom / canvas.getBoundingClientRect().width;
  camera.x = Math.max(
    32 / camera.zoom,
    Math.min(64 - 32 / camera.zoom, drag.cx - dx * factor),
  );
  camera.y = Math.max(
    32 / camera.zoom,
    Math.min(64 - 32 / camera.zoom, drag.cy - dy * factor),
  );
  render();
});
canvas.addEventListener("pointerup", (e) => {
  if (drag && !drag.moved) {
    const rect = canvas.getBoundingClientRect();
    const point = mapPoint(
      camera,
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height,
    );
    const person = [...world.snapshot.inhabitants].sort(
      (a, b) =>
        Math.hypot(a.x + 0.5 - point.x, a.y + 0.5 - point.y) -
        Math.hypot(b.x + 0.5 - point.x, b.y + 0.5 - point.y),
    )[0];
    if (
      person &&
      Math.hypot(person.x + 0.5 - point.x, person.y + 0.5 - point.y) < 1.5
    )
      selectedId = person.id;
    render();
  }
  drag = null;
});
canvas.addEventListener("pointercancel", () => {
  drag = null;
});
canvas.addEventListener("keydown", (e) => {
  const directions: Record<string, [number, number]> = {
    ArrowLeft: [-2, 0],
    ArrowRight: [2, 0],
    ArrowUp: [0, -2],
    ArrowDown: [0, 2],
  };
  const delta = directions[e.key];
  if (delta) {
    e.preventDefault();
    following = false;
    camera.x = Math.max(0, Math.min(64, camera.x + delta[0]));
    camera.y = Math.max(0, Math.min(64, camera.y + delta[1]));
    render();
  }
});
element("save-world").addEventListener("click", () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(world.snapshot)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `hearthwatch-${String(world.snapshot.seed)}-${String(world.snapshot.tick)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
element("load-world").addEventListener("change", () => {
  const input = element("load-world") as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  void (async () => {
    try {
      if (file.size > 2_000_000)
        throw new Error("World files must be smaller than 2 MB.");
      const loaded = SettlementWorld.fromSnapshot(
        parseSettlement(await file.text()),
      );
      world = loaded;
      clock = new SimulationClock(3, world.snapshot.tick);
      clock.setSpeed(Number(speed.value));
      play.textContent = "Watch";
      step.disabled = false;
      previousFrame = undefined;
      selectedId = null;
      following = false;
      seedInput.value = String(world.snapshot.seed);
      lastSaveTick = -1;
      storageBlocked = false;
      render();
      save();
      element("message").textContent = "World restored and paused.";
    } catch (error) {
      element("message").textContent =
        error instanceof Error ? error.message : "Could not load this world.";
    }
    input.value = "";
  })();
});
document.addEventListener("visibilitychange", () => {
  previousFrame = undefined;
  if (document.hidden) save();
});
window.addEventListener("pagehide", save);

element("undo-reset").addEventListener("click", () => {
  if (!previousWorld) return;
  world = SettlementWorld.fromSnapshot(previousWorld);
  previousWorld = null;
  clock = new SimulationClock(3, world.snapshot.tick);
  clock.setSpeed(Number(speed.value));
  previousFrame = undefined;
  selectedId = null;
  following = false;
  play.textContent = "Watch";
  step.disabled = false;
  seedInput.value = String(world.snapshot.seed);
  (element("undo-reset") as HTMLButtonElement).disabled = true;
  lastSaveTick = -1;
  render();
  save();
  element("message").textContent = "Previous world restored.";
});

const frame = (timestamp: number): void => {
  if (clock.snapshot.running) {
    if (previousFrame === undefined) previousFrame = timestamp;
    else {
      const ticks = clock.advance(
        Math.min(0.25, (timestamp - previousFrame) / 1_000),
      );
      previousFrame = timestamp;
      for (let index = 0; index < ticks; index += 1) world.step();
      if (ticks > 0) {
        render();
        if (world.snapshot.tick - lastSaveTick >= 15) save();
      }
    }
  }
  requestAnimationFrame(frame);
};

render();
requestAnimationFrame(frame);
