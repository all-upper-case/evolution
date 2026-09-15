import "./styles.css";
import { SimulationClock } from "../simulation/clock";
import { activityLabel, SettlementWorld, type Inhabitant } from "./settlement";
import { renderSettlement } from "./settlement-renderer";

const root = document.querySelector<HTMLElement>("#app");
if (root === null) throw new Error("Application root was not found.");

root.innerHTML = `<div class="settlement-shell">
  <header class="settlement-hero"><div><p class="settlement-eyebrow">An observational settlement simulation</p><h1>Hearthwatch</h1><p>There are no orders to issue here. Follow a small band of inhabitants as they forage, rest, seek company, and gradually make lives in a seeded little world.</p></div><a href="./">Visit the original evolution lab</a></header>
  <section class="settlement-grid" aria-label="Living settlement">
    <div class="map-card">
      <div class="section-heading"><div><p class="settlement-eyebrow">The valley</p><h2>A world going about its business</h2></div><div class="legend"><span class="key inhabitant-key">Inhabitants</span><span class="key food-key">Wild food</span><span class="key camp-key">Camp</span><span class="key water-key">Water</span></div></div>
      <canvas id="settlement-map" tabindex="0" aria-label="Map of Hearthwatch" aria-describedby="map-help"></canvas>
      <p id="map-help" class="map-help">Select an inhabitant from the cast to follow them. Watching never changes what happens.</p>
    </div>
    <aside class="cast-card" aria-labelledby="cast-title"><p class="settlement-eyebrow">The cast</p><h2 id="cast-title">Who lives here</h2><div id="cast" class="cast-list"></div></aside>
    <aside class="detail-card" aria-labelledby="detail-name"><p class="settlement-eyebrow">Following</p><h2 id="detail-name">The settlement</h2><p id="detail-summary">Choose someone from the cast to see what they are doing and how they feel.</p><div id="detail" hidden>
      <p class="activity" id="detail-activity"></p><dl class="needs"><div><dt>Health</dt><dd id="need-health"></dd></div><div><dt>Hunger</dt><dd id="need-hunger"></dd></div><div><dt>Fatigue</dt><dd id="need-fatigue"></dd></div><div><dt>Loneliness</dt><dd id="need-loneliness"></dd></div><div><dt>Carrying</dt><dd id="carried-food"></dd></div></dl>
      <h3>Disposition</h3><dl class="traits"><div><dt>Curiosity</dt><dd id="trait-curiosity"></dd></div><div><dt>Sociability</dt><dd id="trait-sociability"></dd></div><div><dt>Resilience</dt><dd id="trait-resilience"></dd></div></dl>
      <h3>Practiced work</h3><p id="skill-summary" class="skill-summary"></p>
    </div></aside>
    <section class="chronicle-card" aria-labelledby="chronicle-title"><div class="section-heading"><div><p class="settlement-eyebrow">The chronicle</p><h2 id="chronicle-title">Things worth noticing</h2></div><span id="chronicle-count"></span></div><ol id="chronicle"></ol></section>
  </section>
  <section class="clock-card" aria-labelledby="clock-title"><div><p class="settlement-eyebrow">Time and provisions</p><h2 id="clock-title">Let it unfold</h2></div><div class="settlement-metrics"><div><small>Tick</small><strong id="tick">0</strong></div><div><small>Population</small><strong id="population">14</strong></div><div><small>Wild food</small><strong id="food">520</strong></div><div><small>Raw stores</small><strong id="raw-food">12</strong></div><div><small>Prepared meals</small><strong id="prepared-meals">8</strong></div><div><small>Seed</small><strong id="seed-value">42</strong></div></div><div class="settlement-controls"><button id="play" type="button">Watch</button><button id="step" type="button" class="quiet">One moment</button><label>Tempo<select id="speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><label>World seed<input id="seed" type="number" min="0" max="4294967295" value="42"></label><button id="reset" type="button" class="quiet">New world</button></div><p id="message" role="status"></p></section>
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
let world = new SettlementWorld(42);
let clock = new SimulationClock(12);
let selectedId: number | null = null;
let previousFrame: number | undefined;

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
    `${inhabitant.name} is the settlement's ${inhabitant.role}. They have lived here for ${inhabitant.ageTicks.toLocaleString()} ticks.`;
  element("detail-activity").textContent = activityLabel(inhabitant.activity);
  element("need-health").textContent = formatNeed(inhabitant.health);
  element("need-hunger").textContent = formatNeed(inhabitant.hunger);
  element("need-fatigue").textContent = formatNeed(inhabitant.fatigue);
  element("need-loneliness").textContent = formatNeed(inhabitant.loneliness);
  element("carried-food").textContent =
    `${inhabitant.carriedFood.toFixed(1)} measures`;
  element("trait-curiosity").textContent = disposition(
    inhabitant.personality.curiosity,
  );
  element("trait-sociability").textContent = disposition(
    inhabitant.personality.sociability,
  );
  element("trait-resilience").textContent = disposition(
    inhabitant.personality.resilience,
  );
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
  renderSettlement(canvas, snapshot, selectedId ?? undefined);
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
  cast.innerHTML = snapshot.inhabitants
    .map(
      (inhabitant) =>
        `<button type="button" data-inhabitant="${inhabitant.id.toString()}" class="cast-member${inhabitant.id === selectedId ? " selected" : ""}"><strong>${inhabitant.name}</strong><span>${activityLabel(inhabitant.activity)}</span></button>`,
    )
    .join("");
  renderInhabitant(snapshot.inhabitants.find(({ id }) => id === selectedId));
  const recent = snapshot.chronicle.slice(-18).reverse();
  element("chronicle-count").textContent =
    `${snapshot.chronicle.length.toLocaleString()} remembered`;
  element("chronicle").innerHTML = recent
    .map(
      (entry) =>
        `<li><time>Tick ${entry.tick.toLocaleString()}</time><span>${entry.text}</span></li>`,
    )
    .join("");
};

cast.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>("[data-inhabitant]");
  if (button === null) return;
  selectedId = Number(button.dataset.inhabitant);
  element("message").textContent =
    `Following ${world.snapshot.inhabitants.find(({ id }) => id === selectedId)?.name ?? "inhabitant"}.`;
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
  world = new SettlementWorld(seed);
  clock = new SimulationClock(12);
  selectedId = null;
  play.textContent = "Watch";
  step.disabled = false;
  previousFrame = undefined;
  element("message").textContent =
    `A new Hearthwatch began from seed ${seed.toLocaleString()}.`;
  render();
};

(element("reset") as HTMLButtonElement).addEventListener("click", reset);

const frame = (timestamp: number): void => {
  if (clock.snapshot.running) {
    if (previousFrame === undefined) previousFrame = timestamp;
    else {
      const ticks = clock.advance((timestamp - previousFrame) / 1_000);
      previousFrame = timestamp;
      for (let index = 0; index < ticks; index += 1) world.step();
      if (ticks > 0) render();
    }
  }
  requestAnimationFrame(frame);
};

render();
requestAnimationFrame(frame);
