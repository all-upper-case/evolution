import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSimulationConfig } from "./simulation/configuration";
import { SimulationWorld } from "./simulation/world";

const renderWorld = vi.hoisted(() => vi.fn());
vi.mock("./rendering/world-renderer", () => ({ renderWorld }));

class FakeElement {
  public textContent = "";
  public value = "";
  public disabled = false;
  public hidden = false;
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

  public setAttribute(): void {
    return;
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
  readonly root = {
    set innerHTML(markup: string) {
      fakeDocument.mount(markup);
    },
  };

  public mount(markup: string): void {
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
});
