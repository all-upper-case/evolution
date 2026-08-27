import { describe, expect, it } from "vitest";

import {
  createDefaultSimulationConfig,
  type SimulationConfig,
} from "./configuration";
import { SimulationWorld } from "./world";

const smallConfig = (seed = 42): SimulationConfig => {
  const config = createDefaultSimulationConfig();
  config.seed = seed;
  config.world.width = 16;
  config.world.height = 16;
  config.food.initialUnits = 20;
  config.food.maximumUnits = 30;
  config.food.regrowthUnitsPerTick = 2.5;
  return config;
};

describe("SimulationWorld", () => {
  it("creates a bounded two-dimensional seeded food field", () => {
    const first = new SimulationWorld(smallConfig());
    const second = new SimulationWorld(smallConfig());

    expect(first.summary).toMatchObject({
      tick: 0,
      width: 16,
      height: 16,
      totalFood: 20,
      population: 250,
    });
    expect(first.snapshot).toEqual(second.snapshot);
    expect(first.summary.occupiedFoodCells).toBeLessThanOrEqual(20);
  });

  it("uses the configured seed for spatial placement", () => {
    expect(new SimulationWorld(smallConfig(1)).snapshot.foodByCell).not.toEqual(
      new SimulationWorld(smallConfig(2)).snapshot.foodByCell,
    );
  });

  it("renews food each tick without exceeding the resource cap", () => {
    const world = new SimulationWorld(smallConfig());
    world.step();
    expect(world.summary).toMatchObject({ tick: 1, totalFood: 22.5 });
    world.advanceTicks(10);
    expect(world.summary).toMatchObject({ tick: 11, totalFood: 30 });
  });

  it("remains identical across long seeded headless runs", () => {
    const first = new SimulationWorld(smallConfig(8675309));
    const second = new SimulationWorld(smallConfig(8675309));
    first.advanceTicks(1_000);
    second.advanceTicks(400);
    second.advanceTicks(600);
    expect(first.snapshot).toEqual(second.snapshot);
  });

  it("rejects invalid coordinates and tick counts", () => {
    const world = new SimulationWorld(smallConfig());
    expect(() => world.foodAt(-1, 0)).toThrow(RangeError);
    expect(() => world.foodAt(16, 0)).toThrow(RangeError);
    expect(() => world.foodAt(0.5, 0)).toThrow(TypeError);
    expect(() => world.advanceTicks(-1)).toThrow(RangeError);
  });

  it("returns independently owned snapshots", () => {
    const world = new SimulationWorld(smallConfig());
    const before = world.snapshot;
    world.step();
    expect(before.tick).toBe(0);
    expect(before.totalFood).toBe(20);
    expect(before.foodByCell).not.toBe(world.snapshot.foodByCell);
    expect(before.organisms).not.toBe(world.snapshot.organisms);
    expect(before.organisms[0]).not.toBe(world.snapshot.organisms[0]);
    expect(before.organisms[0]?.genome).not.toBe(
      world.snapshot.organisms[0]?.genome,
    );
  });

  it("includes deterministic bounded founders in world snapshots", () => {
    const config = smallConfig(12);
    config.population.initialCount = 5;
    const first = new SimulationWorld(config);
    const second = new SimulationWorld(config);

    expect(first.snapshot.organisms).toEqual(second.snapshot.organisms);
    expect(first.snapshot.organisms).toHaveLength(5);
    expect(first.snapshot.organisms[0]).toMatchObject({
      id: 1,
      lineageId: 1,
      parentId: null,
      ageTicks: 0,
      energy: config.organisms.initialEnergy,
    });
  });
});
