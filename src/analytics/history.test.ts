import { describe, expect, it } from "vitest";
import { createDefaultSimulationConfig } from "../simulation/configuration";
import { GENOME_TRAIT_RANGES } from "../simulation/organism";
import { SimulationWorld } from "../simulation/world";
import { EcosystemHistory, traitHistogram } from "./history";

describe("ecosystem history", () => {
  it("samples only at its interval and remains bounded", () => {
    const world = new SimulationWorld(createDefaultSimulationConfig());
    const history = new EcosystemHistory(2, 2);
    expect(history.observe(world.snapshot)).toBe(true);
    expect(history.observe(world.snapshot)).toBe(false);
    world.step();
    expect(history.observe(world.snapshot)).toBe(false);
    world.step();
    expect(history.observe(world.snapshot)).toBe(true);
    world.advanceTicks(2);
    expect(history.observe(world.snapshot)).toBe(true);
    expect(history.samples.map((sample) => sample.tick)).toEqual([2, 4]);
  });

  it("accounts for births and deaths between observations", () => {
    const world = new SimulationWorld(createDefaultSimulationConfig());
    const history = new EcosystemHistory(1, 10);
    const initial = world.snapshot;
    history.observe(initial);
    const survivor = initial.organisms[0];
    if (survivor === undefined) throw new Error("Expected a founder.");
    const replacement = {
      ...survivor,
      id: initial.nextOrganismId,
      parentId: survivor.id,
    };
    history.observe({
      ...initial,
      tick: 1,
      population: initial.population,
      organisms: Object.freeze([...initial.organisms.slice(1), replacement]),
      nextOrganismId: initial.nextOrganismId + 1,
    });
    expect(history.samples[1]).toMatchObject({ births: 1, deaths: 1 });
  });
});

describe("trait histograms", () => {
  it("places every living organism in exactly one bounded bin", () => {
    const snapshot = new SimulationWorld(createDefaultSimulationConfig())
      .snapshot;
    const range = GENOME_TRAIT_RANGES.movementSpeed;
    const bins = traitHistogram(
      snapshot,
      "movementSpeed",
      range.minimum,
      range.maximum,
      8,
    );
    expect(bins).toHaveLength(8);
    expect(bins.reduce((sum, count) => sum + count, 0)).toBe(
      snapshot.population,
    );
  });

  it("validates explicit histogram limits", () => {
    const snapshot = new SimulationWorld(createDefaultSimulationConfig())
      .snapshot;
    expect(() => traitHistogram(snapshot, "movementSpeed", 1, 1)).toThrow(
      RangeError,
    );
    expect(() => traitHistogram(snapshot, "movementSpeed", 0, 1, 0)).toThrow(
      RangeError,
    );
  });
});
