import "./styles.css";

import {
  EcosystemHistory,
  traitHistogram,
  type GenomeTrait,
} from "./analytics/history";
import { histogramBars, lineChartPoints } from "./rendering/chart-data";
import { renderWorld } from "./rendering/world-renderer";
import { organismAtCell, worldCellAtPoint } from "./rendering/world-selection";
import {
  downloadJsonFile,
  readExperimentFile,
} from "./experiment/file-transfer";
import { SimulationClock } from "./simulation/clock";
import {
  createDefaultSimulationConfig,
  deserializeSimulationConfig,
  parseSimulationConfig,
  serializeSimulationConfig,
  type SimulationConfig,
} from "./simulation/configuration";
import { GENOME_TRAIT_RANGES, type Organism } from "./simulation/organism";
import {
  deserializeWorldSnapshot,
  serializeWorldSnapshot,
  SimulationWorld,
} from "./simulation/world";

const app = document.querySelector<HTMLElement>("#app");
if (app === null) throw new Error("Application root was not found.");

app.innerHTML = `
  <main class="shell" aria-labelledby="page-title">
    <header class="hero"><p class="eyebrow">Deterministic ecosystem laboratory</p><h1 id="page-title">Evolution</h1><p class="summary">A reproducible living sandbox with renewable resources and seeded founder organisms carrying explicit inheritable traits.</p></header>
    <section class="world-panel" aria-labelledby="world-title">
      <div class="world-heading"><div><p class="eyebrow">Live world</p><h2 id="world-title">The habitat</h2></div><div class="legend" aria-label="Map legend"><span class="food-key">Food</span><span class="organism-key">Organisms</span></div></div>
      <div class="world-layout">
        <div><div class="world-frame"><canvas id="world" role="img" tabindex="0" aria-describedby="world-help" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Escape" aria-label="World at tick 0 with 250 organisms and 12,000 food units">Your browser does not support the ecosystem canvas.</canvas></div><p id="world-help" class="world-help">Tap or click an organism to inspect it. With the map focused, use the arrow keys to move through organisms, Home or End to jump, and Escape to clear selection. Cyan marks the selected organism.</p></div>
        <aside class="inspector" aria-labelledby="inspector-title">
          <p class="eyebrow">Selected organism</p><h3 id="inspector-title">None selected</h3>
          <p id="inspector-empty">Choose an amber organism in the habitat to inspect its life and inherited traits.</p>
          <div id="inspector-details" hidden>
            <dl class="identity-grid"><div><dt>Lineage</dt><dd id="inspect-lineage">—</dd></div><div><dt>Parent</dt><dd id="inspect-parent">—</dd></div><div><dt>Age</dt><dd id="inspect-age">—</dd></div><div><dt>Energy</dt><dd id="inspect-energy">—</dd></div><div><dt>Position</dt><dd id="inspect-position">—</dd></div></dl>
            <h4>Inherited traits</h4><dl class="trait-list"><div><dt>Movement speed</dt><dd id="inspect-movement">—</dd></div><div><dt>Perception range</dt><dd id="inspect-perception">—</dd></div><div><dt>Metabolism</dt><dd id="inspect-metabolism">—</dd></div><div><dt>Reproduction threshold</dt><dd id="inspect-reproduction">—</dd></div><div><dt>Mutation tendency</dt><dd id="inspect-mutation">—</dd></div></dl>
          </div>
        </aside>
      </div>
    </section>
    <section class="analytics" aria-labelledby="analytics-title">
      <div class="world-heading"><div><p class="eyebrow">Ecosystem history</p><h2 id="analytics-title">Live trends</h2></div><p class="chart-window" id="chart-window">Showing tick 0</p></div>
      <div class="trend-grid">
        <article class="chart-card"><div><h3>Population</h3><strong id="chart-population-value">250</strong></div><svg viewBox="0 0 300 100" role="img" aria-labelledby="population-chart-label"><title id="population-chart-label">Population history at tick 0: 250 organisms</title><polyline id="population-line" class="population-line" points="" /></svg></article>
        <article class="chart-card"><div><h3>Births and deaths</h3><strong id="chart-events-value">0 / 0</strong></div><svg viewBox="0 0 300 100" role="img" aria-labelledby="events-chart-label"><title id="events-chart-label">Life events at tick 0: 0 births on a solid line and 0 deaths on a dashed line</title><polyline id="birth-line" class="birth-line" points="" /><polyline id="death-line" class="death-line" points="" /></svg><p class="chart-legend"><span class="birth-key">Births — solid</span><span class="death-key">Deaths — dashed</span></p></article>
        <article class="chart-card"><div><h3>Food resources</h3><strong id="chart-food-value">12,000</strong></div><svg viewBox="0 0 300 100" role="img" aria-labelledby="food-chart-label"><title id="food-chart-label">Food resource history at tick 0: 12,000 units</title><polyline id="food-line" class="food-line" points="" /></svg></article>
      </div>
      <div class="trait-heading"><div><h3>Inherited trait distributions</h3><p>Each chart shows how the living population is spread from the trait's minimum to maximum.</p></div><span id="trait-sample-size">250 living organisms</span></div>
      <div class="trait-charts">
        <article><h4>Movement speed</h4><svg viewBox="0 0 120 54" role="img" aria-label="Movement speed distribution"><g id="histogram-movement"></g></svg><p><span>Slow</span><span>Fast</span></p></article>
        <article><h4>Perception</h4><svg viewBox="0 0 120 54" role="img" aria-label="Perception range distribution"><g id="histogram-perception"></g></svg><p><span>Near</span><span>Far</span></p></article>
        <article><h4>Metabolism</h4><svg viewBox="0 0 120 54" role="img" aria-label="Metabolism distribution"><g id="histogram-metabolism"></g></svg><p><span>Low</span><span>High</span></p></article>
        <article><h4>Reproduction threshold</h4><svg viewBox="0 0 120 54" role="img" aria-label="Reproduction threshold distribution"><g id="histogram-reproduction"></g></svg><p><span>Low</span><span>High</span></p></article>
        <article><h4>Mutation tendency</h4><svg viewBox="0 0 120 54" role="img" aria-label="Mutation tendency distribution"><g id="histogram-mutation"></g></svg><p><span>Low</span><span>High</span></p></article>
      </div>
    </section>
    <section class="panel" aria-labelledby="clock-title">
      <div class="panel-heading"><div><p class="status"><span aria-hidden="true"></span><b id="state">Paused</b></p><h2 id="clock-title">Simulation clock</h2></div><div class="tick-readout"><small>Current tick</small><output id="tick">0</output></div></div>
      <div class="metrics"><div><small>Simulated time</small><strong id="elapsed">0.00 s</strong></div><div><small>Population</small><strong id="population">250</strong></div><div><small>Food units</small><strong id="food">12,000</strong></div><div><small>Occupied cells</small><strong id="food-cells">0</strong></div><div><small>Seed</small><strong id="seed-display">42</strong></div></div>
      <div class="controls" aria-label="Simulation controls">
        <button id="play" type="button">Play</button><button id="step" class="secondary" type="button">Step</button>
        <label>Speed<select id="speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
        <label>Seed<input id="seed" type="number" min="0" max="4294967295" step="1" value="42"></label><button id="reset" class="secondary" type="button">Reset</button>
      </div>
      <details class="experiment-settings">
        <summary><span>Experiment settings</span><small>Changing these starts a new world</small></summary>
        <div class="settings-groups">
          <fieldset><legend>Environment</legend><label>Width <input id="setting-width" type="number" min="16" max="256" step="1"></label><label>Height <input id="setting-height" type="number" min="16" max="256" step="1"></label></fieldset>
          <fieldset><legend>Population</legend><label>Starting organisms <input id="setting-initial-population" type="number" min="1" max="1000" step="1"></label><label>Population ceiling <input id="setting-maximum-population" type="number" min="1" max="1000" step="1"></label></fieldset>
          <fieldset><legend>Food</legend><label>Starting units <input id="setting-initial-food" type="number" min="0" max="1000000" step="1"></label><label>Maximum units <input id="setting-maximum-food" type="number" min="1" max="1000000" step="1"></label><label>Regrowth per tick <input id="setting-food-regrowth" type="number" min="0" max="10000" step="0.1"></label><label>Energy per unit <input id="setting-food-energy" type="number" min="0.001" max="10000" step="0.1"></label></fieldset>
          <fieldset><legend>Life cycle</legend><label>Metabolism per tick <input id="setting-metabolism" type="number" min="0.000001" max="1000" step="0.01"></label><label>Reproduction energy <input id="setting-reproduction" type="number" min="0.001" max="10000" step="1"></label><label>Offspring energy <input id="setting-offspring" type="number" min="0.001" max="10000" step="1"></label></fieldset>
          <fieldset><legend>Evolution</legend><label>Mutation chance <span><input id="setting-mutation-probability" type="number" min="0" max="1" step="0.01"><small>0–1</small></span></label><label>Mutation size <span><input id="setting-mutation-magnitude" type="number" min="0" max="1" step="0.01"><small>0–1</small></span></label></fieldset>
        </div>
        <div class="settings-action"><p>For responsive experiments, this editor limits worlds to 256×256 cells and populations to 1,000. Imported files may use the larger safety bounds.</p><button id="apply-settings" type="button">Apply and restart</button></div>
      </details>
      <div class="experiment-files" aria-labelledby="experiment-files-title">
        <div><h3 id="experiment-files-title">Experiment files</h3><p>Save a complete living world or transfer its strict, versioned starting configuration. Files stay on this device unless you share them.</p></div>
        <div class="file-actions"><button id="export-snapshot" class="secondary" type="button">Save world</button><button id="import-snapshot" class="secondary" type="button">Load world</button><button id="export-config" class="secondary" type="button">Save config</button><button id="import-config" class="secondary" type="button">Load config</button></div>
        <input id="import-snapshot-file" class="visually-hidden" type="file" accept="application/json,.json"><input id="import-config-file" class="visually-hidden" type="file" accept="application/json,.json">
      </div>
      <p id="message" class="message" role="status"></p>
    </section><footer><span>Milestone 3</span><span>Experiment tools</span></footer>
  </main>`;

let config = createDefaultSimulationConfig();
let clock = new SimulationClock(config.world.ticksPerSecond);
let world = new SimulationWorld(config);
let history = new EcosystemHistory(
  config.history.sampleEveryTicks,
  config.history.maximumSamples,
);
history.observe(world.snapshot);
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
const worldCanvas = element("world") as HTMLCanvasElement;
let renderedWorldTick = -1;
let renderedSelectionId: number | null = null;
let selectedOrganismId: number | null = null;
let renderedHistoryTick = -1;

const setting = (id: string): HTMLInputElement =>
  element(`setting-${id}`) as HTMLInputElement;

const syncSettings = (): void => {
  setting("width").value = String(config.world.width);
  setting("height").value = String(config.world.height);
  setting("initial-population").value = String(config.population.initialCount);
  setting("maximum-population").value = String(config.population.maximumCount);
  setting("initial-food").value = String(config.food.initialUnits);
  setting("maximum-food").value = String(config.food.maximumUnits);
  setting("food-regrowth").value = String(config.food.regrowthUnitsPerTick);
  setting("food-energy").value = String(config.food.energyPerUnit);
  setting("metabolism").value = String(config.organisms.metabolismPerTick);
  setting("reproduction").value = String(
    config.organisms.reproductionThreshold,
  );
  setting("offspring").value = String(config.organisms.offspringEnergy);
  setting("mutation-probability").value = String(
    config.evolution.mutationProbability,
  );
  setting("mutation-magnitude").value = String(
    config.evolution.mutationMagnitude,
  );
};

const replaceExperiment = (
  nextConfig: SimulationConfig,
  nextWorld: SimulationWorld,
  initialTick: number,
): void => {
  config = nextConfig;
  world = nextWorld;
  clock = new SimulationClock(config.world.ticksPerSecond, initialTick);
  history = new EcosystemHistory(
    config.history.sampleEveryTicks,
    config.history.maximumSamples,
  );
  history.observe(world.snapshot);
  selectedOrganismId = null;
  speed.value = "1";
  seed.value = String(config.seed);
  element("seed-display").textContent = config.seed.toLocaleString();
  syncSettings();
  previousFrame = undefined;
  renderedWorldTick = -1;
  renderedSelectionId = null;
  renderedHistoryTick = -1;
};

const importFile = async (
  input: HTMLInputElement,
  kind: "configuration" | "world",
): Promise<void> => {
  const file = input.files?.[0];
  if (file === undefined) return;
  try {
    const contents = await readExperimentFile(file);
    if (kind === "configuration") {
      const importedConfig = deserializeSimulationConfig(contents);
      replaceExperiment(importedConfig, new SimulationWorld(importedConfig), 0);
      message.textContent = `Loaded configuration with seed ${importedConfig.seed.toLocaleString()} and started a new world.`;
    } else {
      const snapshot = deserializeWorldSnapshot(contents);
      replaceExperiment(
        snapshot.config,
        SimulationWorld.fromSnapshot(snapshot),
        snapshot.tick,
      );
      message.textContent = `Loaded world at tick ${snapshot.tick.toLocaleString()}; chart history starts from this point.`;
    }
    render();
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    message.textContent = `Could not load ${kind}: ${reason}`;
  } finally {
    input.value = "";
  }
};

const setPoints = (id: string, points: string): void =>
  element(id).setAttribute("points", points);
const traitCharts: readonly [GenomeTrait, string][] = [
  ["movementSpeed", "histogram-movement"],
  ["perceptionRange", "histogram-perception"],
  ["metabolismScale", "histogram-metabolism"],
  ["reproductionThresholdScale", "histogram-reproduction"],
  ["mutationRateScale", "histogram-mutation"],
];

const renderAnalytics = (): void => {
  const samples = history.samples;
  const latest = samples.at(-1);
  if (latest === undefined) return;
  const first = samples[0] ?? latest;
  element("chart-window").textContent =
    first.tick === latest.tick
      ? `Showing tick ${latest.tick.toLocaleString()}`
      : `Ticks ${first.tick.toLocaleString()}–${latest.tick.toLocaleString()}`;
  element("chart-population-value").textContent =
    latest.population.toLocaleString();
  element("chart-events-value").textContent =
    `${latest.births.toLocaleString()} / ${latest.deaths.toLocaleString()}`;
  element("chart-food-value").textContent = latest.totalFood.toLocaleString(
    undefined,
    { maximumFractionDigits: 1 },
  );
  const tickRange =
    first.tick === latest.tick
      ? `tick ${latest.tick.toLocaleString()}`
      : `ticks ${first.tick.toLocaleString()} to ${latest.tick.toLocaleString()}`;
  element("population-chart-label").textContent =
    `Population history for ${tickRange}: latest ${latest.population.toLocaleString()} organisms`;
  element("events-chart-label").textContent =
    `Life events for ${tickRange}: latest ${latest.births.toLocaleString()} births on a solid line and ${latest.deaths.toLocaleString()} deaths on a dashed line`;
  element("food-chart-label").textContent =
    `Food resource history for ${tickRange}: latest ${latest.totalFood.toLocaleString(undefined, { maximumFractionDigits: 1 })} units`;
  setPoints(
    "population-line",
    lineChartPoints(
      samples.map((sample) => sample.population),
      300,
      100,
    ),
  );
  const births = samples.map((sample) => sample.births);
  const deaths = samples.map((sample) => sample.deaths);
  const eventMaximum = Math.max(...births, ...deaths, 1);
  setPoints("birth-line", lineChartPoints(births, 300, 100, eventMaximum));
  setPoints("death-line", lineChartPoints(deaths, 300, 100, eventMaximum));
  setPoints(
    "food-line",
    lineChartPoints(
      samples.map((sample) => sample.totalFood),
      300,
      100,
    ),
  );

  const snapshot = world.snapshot;
  element("trait-sample-size").textContent =
    `${snapshot.population.toLocaleString()} living organisms`;
  for (const [trait, id] of traitCharts) {
    const range = GENOME_TRAIT_RANGES[trait];
    element(id).innerHTML = histogramBars(
      traitHistogram(snapshot, trait, range.minimum, range.maximum),
      120,
      54,
    );
  }
  renderedHistoryTick = latest.tick;
};

const advanceWorld = (ticks: number): void => {
  for (let index = 0; index < ticks; index += 1) {
    const events = world.step();
    history.observe(world.snapshot, events);
  }
};

const formatTrait = (value: number): string => value.toFixed(2);
const renderInspector = (organism: Organism | null): void => {
  const details = element("inspector-details");
  const empty = element("inspector-empty");
  if (organism === null) {
    element("inspector-title").textContent = "None selected";
    details.hidden = true;
    empty.hidden = false;
    return;
  }
  element("inspector-title").textContent =
    `Organism #${organism.id.toLocaleString()}`;
  empty.hidden = true;
  details.hidden = false;
  element("inspect-lineage").textContent =
    `#${organism.lineageId.toLocaleString()}`;
  element("inspect-parent").textContent =
    organism.parentId === null
      ? "Founder"
      : `#${organism.parentId.toLocaleString()}`;
  element("inspect-age").textContent =
    `${organism.ageTicks.toLocaleString()} ticks`;
  element("inspect-energy").textContent = organism.energy.toFixed(1);
  element("inspect-position").textContent =
    `${organism.x.toLocaleString()}, ${organism.y.toLocaleString()}`;
  element("inspect-movement").textContent = formatTrait(
    organism.genome.movementSpeed,
  );
  element("inspect-perception").textContent = formatTrait(
    organism.genome.perceptionRange,
  );
  element("inspect-metabolism").textContent = formatTrait(
    organism.genome.metabolismScale,
  );
  element("inspect-reproduction").textContent = formatTrait(
    organism.genome.reproductionThresholdScale,
  );
  element("inspect-mutation").textContent = formatTrait(
    organism.genome.mutationRateScale,
  );
};

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
  if (
    renderedWorldTick !== world.summary.tick ||
    renderedSelectionId !== selectedOrganismId
  ) {
    const worldSnapshot = world.snapshot;
    const selectedOrganism =
      selectedOrganismId === null
        ? null
        : (worldSnapshot.organisms.find(
            (organism) => organism.id === selectedOrganismId,
          ) ?? null);
    if (selectedOrganismId !== null && selectedOrganism === null) {
      message.textContent = `Organism #${selectedOrganismId.toLocaleString()} is no longer alive.`;
      selectedOrganismId = null;
    }
    renderWorld(worldCanvas, worldSnapshot, selectedOrganismId ?? undefined);
    renderInspector(selectedOrganism);
    worldCanvas.setAttribute(
      "aria-label",
      `World at tick ${worldSnapshot.tick.toLocaleString()} with ${worldSnapshot.population.toLocaleString()} organisms and ${worldSnapshot.totalFood.toLocaleString(undefined, { maximumFractionDigits: 2 })} food units`,
    );
    renderedWorldTick = worldSnapshot.tick;
    renderedSelectionId = selectedOrganismId;
  }
  play.textContent = snapshot.running ? "Pause" : "Play";
  step.disabled = snapshot.running;
  if ((history.samples.at(-1)?.tick ?? -1) !== renderedHistoryTick)
    renderAnalytics();
};

play.addEventListener("click", () => {
  if (clock.snapshot.running) clock.pause();
  else clock.play();
  previousFrame = undefined;
  render();
});
worldCanvas.addEventListener("pointerdown", (event) => {
  const snapshot = world.snapshot;
  const rectangle = worldCanvas.getBoundingClientRect();
  const cell = worldCellAtPoint(
    event.clientX,
    event.clientY,
    rectangle,
    snapshot.width,
    snapshot.height,
  );
  const organism = cell === null ? null : organismAtCell(snapshot, cell);
  selectedOrganismId = organism?.id ?? null;
  message.textContent =
    organism === null
      ? "No organism occupies that cell."
      : `Selected organism #${organism.id.toLocaleString()}.`;
  render();
});
worldCanvas.addEventListener("keydown", (event) => {
  const organisms = world.snapshot.organisms;
  if (organisms.length === 0) {
    message.textContent = "No living organisms are available to inspect.";
    return;
  }

  const currentIndex = organisms.findIndex(
    (organism) => organism.id === selectedOrganismId,
  );
  let nextIndex: number;
  if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = organisms.length - 1;
  else if (event.key === "ArrowRight" || event.key === "ArrowDown")
    nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % organisms.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
    nextIndex =
      currentIndex < 0
        ? organisms.length - 1
        : (currentIndex - 1 + organisms.length) % organisms.length;
  else if (event.key === "Escape") {
    event.preventDefault();
    selectedOrganismId = null;
    message.textContent = "Organism selection cleared.";
    render();
    return;
  } else return;

  event.preventDefault();
  const organism = organisms[nextIndex];
  if (organism === undefined) return;
  selectedOrganismId = organism.id;
  message.textContent = `Selected organism #${organism.id.toLocaleString()} with the keyboard.`;
  render();
});
step.addEventListener("click", () => {
  advanceWorld(clock.step());
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
  replaceExperiment(config, new SimulationWorld(config), 0);
  message.textContent = `Reset with seed ${value.toLocaleString()}.`;
  render();
});

(element("apply-settings") as HTMLButtonElement).addEventListener(
  "click",
  () => {
    try {
      const width = Number(setting("width").value);
      const height = Number(setting("height").value);
      const initialCount = Number(setting("initial-population").value);
      const maximumCount = Number(setting("maximum-population").value);
      if (
        width > 256 ||
        height > 256 ||
        initialCount > 1_000 ||
        maximumCount > 1_000
      ) {
        throw new Error(
          "The settings editor supports at most 256×256 cells and 1,000 organisms.",
        );
      }
      const nextConfig = parseSimulationConfig({
        ...config,
        world: { ...config.world, width, height },
        population: { ...config.population, initialCount, maximumCount },
        food: {
          ...config.food,
          initialUnits: Number(setting("initial-food").value),
          maximumUnits: Number(setting("maximum-food").value),
          regrowthUnitsPerTick: Number(setting("food-regrowth").value),
          energyPerUnit: Number(setting("food-energy").value),
        },
        organisms: {
          ...config.organisms,
          metabolismPerTick: Number(setting("metabolism").value),
          reproductionThreshold: Number(setting("reproduction").value),
          offspringEnergy: Number(setting("offspring").value),
        },
        evolution: {
          mutationProbability: Number(setting("mutation-probability").value),
          mutationMagnitude: Number(setting("mutation-magnitude").value),
        },
      });
      replaceExperiment(nextConfig, new SimulationWorld(nextConfig), 0);
      message.textContent =
        "Applied experiment settings and started a new world.";
      render();
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      message.textContent = `Could not apply settings: ${reason}`;
    }
  },
);

const snapshotInput = element("import-snapshot-file") as HTMLInputElement;
const configInput = element("import-config-file") as HTMLInputElement;
(element("export-snapshot") as HTMLButtonElement).addEventListener(
  "click",
  () => {
    const snapshot = world.snapshot;
    downloadJsonFile(
      serializeWorldSnapshot(snapshot),
      `evolution-world-seed-${String(snapshot.config.seed)}-tick-${String(snapshot.tick)}.json`,
    );
    message.textContent = `Saved world at tick ${snapshot.tick.toLocaleString()}.`;
  },
);
(element("export-config") as HTMLButtonElement).addEventListener(
  "click",
  () => {
    downloadJsonFile(
      serializeSimulationConfig(config),
      `evolution-config-seed-${String(config.seed)}.json`,
    );
    message.textContent = `Saved configuration for seed ${config.seed.toLocaleString()}.`;
  },
);
(element("import-snapshot") as HTMLButtonElement).addEventListener(
  "click",
  () => snapshotInput.click(),
);
(element("import-config") as HTMLButtonElement).addEventListener("click", () =>
  configInput.click(),
);
snapshotInput.addEventListener("change", () => {
  void importFile(snapshotInput, "world");
});
configInput.addEventListener("change", () => {
  void importFile(configInput, "configuration");
});

const frame = (timestamp: number): void => {
  if (previousFrame !== undefined) {
    const ticks = clock.advance((timestamp - previousFrame) / 1000);
    advanceWorld(ticks);
  }
  previousFrame = timestamp;
  render();
  requestAnimationFrame(frame);
};
syncSettings();
render();
requestAnimationFrame(frame);
