import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultSimulationConfig,
  serializeSimulationConfig,
} from "./simulation/configuration";
import {
  deserializeWorldSnapshot,
  serializeWorldSnapshot,
  SimulationWorld,
} from "./simulation/world";

const renderWorld = vi.hoisted(() => vi.fn());
vi.mock("./rendering/world-renderer", () => ({ renderWorld }));
const fileTransfer = vi.hoisted(() => ({
  downloadJsonFile: vi.fn(),
  readExperimentFile: vi.fn(),
}));
vi.mock("./experiment/file-transfer", () => fileTransfer);

class FakeElement {
  public textContent = "";
  public innerHTML = "";
  public value = "";
  public disabled = false;
  public hidden = false;
  public files: FileList | null = null;
  readonly attributes = new Map<string, string>();
  readonly #listeners = new Map<string, EventListener>();

  public addEventListener(type: string, listener: EventListener): void {
    this.#listeners.set(type, listener);
  }

  public click(): void {
    this.dispatchEvent(new Event("click"));
  }

  public dispatchEvent(event: Event): boolean {
    this.#listeners
      .get(event.type)
      ?.call(this as unknown as EventTarget, event);
    return true;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getBoundingClientRect(): DOMRect {
    return {
      bottom: 128,
      height: 128,
      left: 0,
      right: 128,
      top: 0,
      width: 128,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  }
}

class FakeDocument {
  readonly #elements = new Map<string, FakeElement>();
  public markup = "";
  readonly root = {
    set innerHTML(markup: string) {
      fakeDocument.mount(markup);
    },
  };

  public mount(markup: string): void {
    this.markup = markup;
    for (const match of markup.matchAll(/id="([^"]+)"/g)) {
      this.#elements.set(match[1] ?? "", new FakeElement());
    }
    this.get("seed").value = "42";
    this.get("speed").value = "1";
  }

  public querySelector(
    selector: string,
  ): FakeElement | typeof this.root | null {
    if (selector === "#app") return this.root;
    return this.#elements.get(selector.slice(1)) ?? null;
  }

  public get(id: string): FakeElement {
    const found = this.#elements.get(id);
    if (found === undefined) throw new Error(`Expected #${id} to exist.`);
    return found;
  }
}

let fakeDocument: FakeDocument;
const find = (id: string): FakeElement => fakeDocument.get(id);

describe("simulation controls", () => {
  let frames: FrameRequestCallback[];

  beforeEach(async () => {
    vi.resetModules();
    renderWorld.mockReset();
    fileTransfer.downloadJsonFile.mockReset();
    fileTransfer.readExperimentFile.mockReset();
    fileTransfer.readExperimentFile.mockImplementation(
      (file: { text(): Promise<string> }) => file.text(),
    );
    fakeDocument = new FakeDocument();
    vi.stubGlobal("document", fakeDocument);
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    await import("./main");
  });

  const runFrame = (timestamp: number): void => {
    const callback = frames.shift();
    if (callback === undefined) throw new Error("Expected a scheduled frame.");
    callback(timestamp);
  };

  it("connects playback, stepping, speed, reset, and seed validation", () => {
    expect(find("state").textContent).toBe("Paused");
    expect(find("tick").value).toBe("0");
    expect(find("step").disabled).toBe(false);

    find("play").click();
    expect(find("play").textContent).toBe("Pause");
    expect(find("state").textContent).toBe("Running");
    expect(find("step").disabled).toBe(true);

    runFrame(1_000);
    runFrame(1_100);
    expect(find("tick").value).toBe("3");

    find("play").click();
    find("step").click();
    expect(find("tick").value).toBe("4");

    find("speed").value = "4";
    find("speed").dispatchEvent(new Event("change"));
    find("play").click();
    runFrame(2_000);
    runFrame(2_100);
    expect(find("tick").value).toBe("16");

    find("seed").value = "-1";
    find("reset").click();
    expect(find("message").textContent).toContain("whole number");
    expect(find("tick").value).toBe("16");

    find("seed").value = "77";
    find("reset").click();
    expect(find("tick").value).toBe("0");
    expect(find("seed-display").textContent).toBe("77");
    expect(find("state").textContent).toBe("Paused");
    expect(find("play").textContent).toBe("Play");
    expect(find("step").disabled).toBe(false);
    expect(find("speed").value).toBe("1");
    expect(find("message").textContent).toBe("Reset with seed 77.");
    expect(renderWorld).toHaveBeenCalled();
  });

  it("selects a founder from the habitat and reveals its inspection data", () => {
    const founder = new SimulationWorld(createDefaultSimulationConfig())
      .snapshot.organisms[0];
    if (founder === undefined) throw new Error("Expected a founder organism.");
    const pointer = new Event("pointerdown");
    Object.defineProperties(pointer, {
      clientX: { value: founder.x + 0.5 },
      clientY: { value: founder.y + 0.5 },
    });

    find("world").dispatchEvent(pointer);

    expect(find("inspector-title").textContent).toBe(
      `Organism #${founder.id.toLocaleString()}`,
    );
    expect(find("inspect-parent").textContent).toBe("Founder");
    expect(find("inspect-position").textContent).toBe(
      `${founder.x.toLocaleString()}, ${founder.y.toLocaleString()}`,
    );
    expect(find("inspector-details").hidden).toBe(false);
    expect(find("message").textContent).toContain("Selected organism");
    expect(renderWorld).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      founder.id,
    );
  });

  it("supports complete keyboard organism selection without pointer input", () => {
    const organisms = new SimulationWorld(createDefaultSimulationConfig())
      .snapshot.organisms;
    const first = organisms[0];
    const second = organisms[1];
    const last = organisms.at(-1);
    if (first === undefined || second === undefined || last === undefined)
      throw new Error("Expected multiple founder organisms.");
    const keydown = (key: string): Event => {
      const event = new Event("keydown", { cancelable: true });
      Object.defineProperty(event, "key", { value: key });
      find("world").dispatchEvent(event);
      return event;
    };

    expect(keydown("ArrowRight").defaultPrevented).toBe(true);
    expect(find("inspector-title").textContent).toBe(
      `Organism #${first.id.toLocaleString()}`,
    );
    keydown("ArrowRight");
    expect(find("inspector-title").textContent).toBe(
      `Organism #${second.id.toLocaleString()}`,
    );
    keydown("ArrowLeft");
    expect(find("inspector-title").textContent).toBe(
      `Organism #${first.id.toLocaleString()}`,
    );
    keydown("End");
    expect(find("inspector-title").textContent).toBe(
      `Organism #${last.id.toLocaleString()}`,
    );
    keydown("Escape");
    expect(find("inspector-title").textContent).toBe("None selected");
    expect(find("message").textContent).toBe("Organism selection cleared.");
  });

  it("exposes concise accessible descriptions without continuously live metrics", () => {
    expect(fakeDocument.markup).toContain(
      'aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Escape"',
    );
    expect(fakeDocument.markup).toContain("Deaths — dashed");
    expect(fakeDocument.markup).not.toContain(
      'class="metrics" aria-live="polite"',
    );
    expect(fakeDocument.markup).not.toContain(
      'class="inspector" aria-labelledby="inspector-title" aria-live',
    );
  });

  it("samples ecological trends and refreshes trait distributions", () => {
    expect(find("chart-window").textContent).toBe("Showing tick 0");
    expect(find("histogram-movement").innerHTML).toContain("<rect");

    find("play").click();
    runFrame(1_000);
    runFrame(2_000);

    expect(find("tick").value).toBe("30");
    expect(find("chart-window").textContent).toBe("Ticks 0–30");
    expect(find("population-line").attributes.get("points")).toContain(
      "300.00",
    );
    expect(find("chart-events-value").textContent).toMatch(/^\d[\d,]* \/ \d/);
    expect(find("trait-sample-size").textContent).toContain("living organisms");
    expect(find("population-chart-label").textContent).toContain(
      "ticks 0 to 30",
    );
    expect(find("events-chart-label").textContent).toContain("solid line");
    expect(find("events-chart-label").textContent).toContain("dashed line");
  });

  it("downloads strict configuration and complete world files", () => {
    find("step").click();
    find("export-config").click();
    expect(fileTransfer.downloadJsonFile).toHaveBeenCalledWith(
      expect.stringContaining('"seed":42'),
      "evolution-config-seed-42.json",
    );
    expect(find("message").textContent).toBe(
      "Saved configuration for seed 42.",
    );

    find("export-snapshot").click();
    const [contents, filename] = fileTransfer.downloadJsonFile.mock
      .calls[1] as [string, string];
    expect(filename).toBe("evolution-world-seed-42-tick-1.json");
    const downloaded = deserializeWorldSnapshot(contents);
    expect(downloaded.tick).toBe(1);
    expect(typeof downloaded.randomState).toBe("number");
    expect(find("message").textContent).toBe("Saved world at tick 1.");
  });

  it("loads a configuration into a new paused world", async () => {
    const imported = createDefaultSimulationConfig();
    imported.seed = 8675309;
    const input = find("import-config-file");
    input.files = [
      {
        text: () => Promise.resolve(serializeSimulationConfig(imported)),
      },
    ] as unknown as FileList;

    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() =>
      expect(find("message").textContent).toContain("Loaded configuration"),
    );

    expect(find("tick").value).toBe("0");
    expect(find("seed").value).toBe("8675309");
    expect(find("seed-display").textContent).toBe("8,675,309");
    expect(find("state").textContent).toBe("Paused");
    expect(find("setting-width").value).toBe(String(imported.world.width));
    expect(find("setting-mutation-magnitude").value).toBe(
      String(imported.evolution.mutationMagnitude),
    );
    expect(input.value).toBe("");
  });

  it("applies bounded experiment settings to a fresh paused world", () => {
    find("step").click();
    find("setting-width").value = "64";
    find("setting-height").value = "96";
    find("setting-initial-population").value = "120";
    find("setting-maximum-population").value = "600";
    find("setting-initial-food").value = "5000";
    find("setting-maximum-food").value = "20000";
    find("setting-food-regrowth").value = "12.5";
    find("setting-food-energy").value = "6";
    find("setting-metabolism").value = "0.2";
    find("setting-reproduction").value = "70";
    find("setting-offspring").value = "25";
    find("setting-mutation-probability").value = "0.25";
    find("setting-mutation-magnitude").value = "0.3";

    find("apply-settings").click();

    expect(find("tick").value).toBe("0");
    expect(find("population").textContent).toBe("120");
    expect(find("state").textContent).toBe("Paused");
    expect(find("message").textContent).toContain(
      "Applied experiment settings",
    );
    find("export-config").click();
    const [contents] = fileTransfer.downloadJsonFile.mock.calls[0] as [string];
    expect(JSON.parse(contents)).toMatchObject({
      world: { width: 64, height: 96 },
      population: { initialCount: 120, maximumCount: 600 },
      food: { regrowthUnitsPerTick: 12.5, energyPerUnit: 6 },
      organisms: { metabolismPerTick: 0.2 },
      evolution: { mutationProbability: 0.25, mutationMagnitude: 0.3 },
    });
  });

  it("rejects unsafe or inconsistent settings without replacing the world", () => {
    find("step").click();
    find("setting-width").value = "257";
    find("apply-settings").click();
    expect(find("message").textContent).toContain("at most 256×256");
    expect(find("tick").value).toBe("1");

    find("setting-width").value = "128";
    find("setting-initial-population").value = "900";
    find("setting-maximum-population").value = "200";
    find("apply-settings").click();
    expect(find("message").textContent).toContain("must not exceed");
    expect(find("tick").value).toBe("1");
  });

  it("restores a complete world and continues from its exact tick", async () => {
    const source = new SimulationWorld(createDefaultSimulationConfig());
    source.advanceTicks(75);
    const input = find("import-snapshot-file");
    input.files = [
      {
        text: () => Promise.resolve(serializeWorldSnapshot(source.snapshot)),
      },
    ] as unknown as FileList;

    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() =>
      expect(find("message").textContent).toContain("tick 75"),
    );
    expect(find("tick").value).toBe("75");
    expect(find("population").textContent).toBe(
      source.summary.population.toLocaleString(),
    );
    expect(renderWorld).toHaveBeenLastCalledWith(
      expect.anything(),
      source.snapshot,
      undefined,
    );

    source.step();
    find("step").click();
    expect(find("tick").value).toBe("76");
    expect(renderWorld).toHaveBeenLastCalledWith(
      expect.anything(),
      source.snapshot,
      undefined,
    );
  });

  it("reports invalid imports without replacing the current world", async () => {
    find("step").click();
    const input = find("import-snapshot-file");
    input.files = [
      {
        text: () => Promise.resolve('{"schemaVersion":99}'),
      },
    ] as unknown as FileList;

    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() =>
      expect(find("message").textContent).toContain("Could not load world"),
    );
    expect(find("tick").value).toBe("1");
  });
});
