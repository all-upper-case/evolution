import "./styles.css";

import { SimulationClock } from "./simulation/clock";
import { createDefaultSimulationConfig } from "./simulation/configuration";
import { SimulationWorld } from "./simulation/world";

const app = document.querySelector<HTMLElement>("#app");
if (app === null) throw new Error("Application root was not found.");

app.innerHTML = `
  <main class="shell" aria-labelledby="page-title">
    <header class="hero"><p class="eyebrow">Deterministic ecosystem laboratory</p><h1 id="page-title">Evolution</h1><p class="summary">A reproducible living sandbox with renewable resources and seeded founder organisms carrying explicit inheritable traits.</p></header>
    <section class="panel" aria-labelledby="clock-title">
      <div class="panel-heading"><div><p class="status"><span aria-hidden="true"></span><b id="state">Paused</b></p><h2 id="clock-title">Simulation clock</h2></div><div class="tick-readout"><small>Current tick</small><output id="tick">0</output></div></div>
      <div class="metrics" aria-live="polite"><div><small>Simulated time</small><strong id="elapsed">0.00 s</strong></div><div><small>Population</small><strong id="population">250</strong></div><div><small>Food units</small><strong id="food">12,000</strong></div><div><small>Occupied cells</small><strong id="food-cells">0</strong></div><div><small>Seed</small><strong id="seed-display">42</strong></div></div>
      <div class="controls" aria-label="Simulation controls">
        <button id="play" type="button">Play</button><button id="step" class="secondary" type="button">Step</button>
        <label>Speed<select id="speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
        <label>Seed<input id="seed" type="number" min="0" max="4294967295" step="1" value="42"></label><button id="reset" class="secondary" type="button">Reset</button>
      </div><p id="message" class="message" role="status"></p>
    </section><footer><span>Milestone 1</span><span>Seeded founder organisms</span></footer>
  </main>`;

const config = createDefaultSimulationConfig();
let clock = new SimulationClock(config.world.ticksPerSecond);
let world = new SimulationWorld(config);
let previousFrame: number | undefined;
const element = (id: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`#${id}`);
  if (found === null) throw new Error(`Control #${id} was not found.`);
  return found;
};
const play = element("play") as HTMLButtonElement;
const step = element("step") as HTMLButtonElement;
const speed = element("speed") as HTMLSelectElement;
const seed = element("seed") as HTMLInputElement;
const message = element("message") as HTMLParagraphElement;

const render = (): void => {
  const snapshot = clock.snapshot;
  (element("tick") as HTMLOutputElement).value = snapshot.tick.toLocaleString();
  element("elapsed").textContent =
    `${snapshot.elapsedSimulationSeconds.toFixed(2)} s`;
  element("state").textContent = snapshot.running ? "Running" : "Paused";
  element("food").textContent = world.summary.totalFood.toLocaleString(
    undefined,
    { maximumFractionDigits: 2 },
  );
  element("food-cells").textContent =
    world.summary.occupiedFoodCells.toLocaleString();
  element("population").textContent = world.summary.population.toLocaleString();
  play.textContent = snapshot.running ? "Pause" : "Play";
  step.disabled = snapshot.running;
};

play.addEventListener("click", () => {
  if (clock.snapshot.running) clock.pause();
  else clock.play();
  previousFrame = undefined;
  render();
});
step.addEventListener("click", () => {
  world.advanceTicks(clock.step());
  render();
});
speed.addEventListener("change", () => {
  clock.setSpeed(Number(speed.value));
  render();
});
(element("reset") as HTMLButtonElement).addEventListener("click", () => {
  const value = Number(seed.value);
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    message.textContent =
      "Seed must be a whole number from 0 to 4,294,967,295.";
    return;
  }
  config.seed = value;
  clock = new SimulationClock(config.world.ticksPerSecond);
  world = new SimulationWorld(config);
  speed.value = "1";
  element("seed-display").textContent = value.toLocaleString();
  message.textContent = `Reset with seed ${value.toLocaleString()}.`;
  previousFrame = undefined;
  render();
});

const frame = (timestamp: number): void => {
  if (previousFrame !== undefined) {
    const ticks = clock.advance((timestamp - previousFrame) / 1000);
    world.advanceTicks(ticks);
  }
  previousFrame = timestamp;
  render();
  requestAnimationFrame(frame);
};
render();
requestAnimationFrame(frame);
