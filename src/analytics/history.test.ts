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
    let events = world.step();
    expect(history.observe(world.snapshot, events)).toBe(false);
    events = world.step();
    expect(history.observe(world.snapshot, events)).toBe(true);
    events = world.step();
    expect(history.observe(world.snapshot, events)).toBe(false);
    events = world.step();
    expect(history.observe(world.snapshot, events)).toBe(true);
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
    history.observe(
      {
        ...initial,
        tick: 1,
        population: initial.population,
        organisms: Object.freeze([...initial.organisms.slice(1), replacement]),
        nextOrganismId: initial.nextOrganismId + 1,
      },
      { tick: 1, births: 1, deaths: 1 },
    );
    expect(history.samples[1]).toMatchObject({ births: 1, deaths: 1 });
  });

  it("retains short-lived organisms in exact interval totals", () => {
    const world = new SimulationWorld(createDefaultSimulationConfig());
    const history = new EcosystemHistory(2, 10);
    const initial = world.snapshot;
    const founder = initial.organisms[0];
    if (founder === undefined) throw new Error("Expected a founder.");
    const transient = {
      ...founder,
      id: initial.nextOrganismId,
      parentId: founder.id,
    };
    history.observe(initial);
    history.observe(
      {
        ...initial,
        tick: 1,
        population: initial.population + 1,
        organisms: Object.freeze([...initial.organisms, transient]),
        nextOrganismId: initial.nextOrganismId + 1,
      },
      { tick: 1, births: 1, deaths: 0 },
    );
    history.observe(
      { ...initial, tick: 2, nextOrganismId: initial.nextOrganismId + 1 },
      { tick: 2, births: 0, deaths: 1 },
    );

    expect(history.samples[1]).toMatchObject({ births: 1, deaths: 1 });
  });

  it("starts restored history at a non-aligned tick", () => {
    const world = new SimulationWorld(createDefaultSimulationConfig());
    world.advanceTicks(75);
    const history = new EcosystemHistory(30, 10);

    expect(history.observe(world.snapshot)).toBe(true);
    expect(history.samples[0]?.tick).toBe(75);
  });

  it("rejects missing or misaligned lifecycle events", () => {
    const world = new SimulationWorld(createDefaultSimulationConfig());
    const history = new EcosystemHistory(2, 10);
    history.observe(world.snapshot);
    world.step();

    expect(() => history.observe(world.snapshot)).toThrow(
      "Lifecycle events are required",
    );
    expect(() =>
      history.observe(world.snapshot, { tick: 2, births: 0, deaths: 0 }),
    ).toThrow("consecutive and aligned");
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
