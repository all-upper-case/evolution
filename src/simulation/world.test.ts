import { describe, expect, it } from "vitest";

import {
  createDefaultSimulationConfig,
  type SimulationConfig,
} from "./configuration";
import {
  SimulationWorld,
  WorldSnapshotError,
  deserializeWorldSnapshot,
  serializeWorldSnapshot,
} from "./world";

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
    const config = smallConfig();
    config.organisms.maximumAgeTicks = 1;
    const world = new SimulationWorld(config);
    world.step();
    expect(world.summary.tick).toBe(1);
    expect(world.summary.totalFood).toBeLessThanOrEqual(22.5);
    world.advanceTicks(20);
    expect(world.summary).toMatchObject({ tick: 21, totalFood: 30 });
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

  it("moves, feeds, ages, and spends metabolism in a stable order", () => {
    const config = smallConfig(99);
    config.population.initialCount = 1;
    config.population.maximumCount = 1;
    config.food.initialUnits = 256;
    config.food.maximumUnits = 256;
    config.food.regrowthUnitsPerTick = 0;
    config.organisms.initialEnergy = 10;
    config.organisms.reproductionThreshold = 100;
    const world = new SimulationWorld(config);
    const before = world.snapshot.organisms[0];
    expect(before).toBeDefined();
    if (before === undefined) throw new Error("Expected a founder organism.");

    world.step();

    const after = world.snapshot.organisms[0];
    expect(after).toBeDefined();
    if (after === undefined) throw new Error("Expected a surviving organism.");
    expect(after.ageTicks).toBe(1);
    expect(after.energy).toBeGreaterThan(before.energy);
    expect(world.summary.totalFood).toBeLessThan(256);
    expect(after.x === before.x && after.y === before.y).toBe(false);
  });

  it("reproduces with lineage continuity and enforces the population cap", () => {
    const config = smallConfig(123);
    config.population.initialCount = 3;
    config.population.maximumCount = 5;
    config.food.initialUnits = 0;
    config.food.regrowthUnitsPerTick = 0;
    config.organisms.initialEnergy = 40;
    config.organisms.maximumEnergy = 100;
    config.organisms.reproductionThreshold = 10;
    config.organisms.offspringEnergy = 5;
    const world = new SimulationWorld(config);

    world.step();

    expect(world.summary.population).toBe(5);
    const children = world.snapshot.organisms.filter(
      ({ parentId }) => parentId !== null,
    );
    expect(children.map(({ id }) => id)).toEqual([4, 5]);
    expect(children[0]).toMatchObject({ parentId: 1, lineageId: 1 });
    expect(children[1]).toMatchObject({ parentId: 2, lineageId: 2 });
  });

  it("keeps survivors in identity order and delays newborn turns", () => {
    const config = smallConfig(456);
    config.population.initialCount = 3;
    config.population.maximumCount = 6;
    config.food.initialUnits = 0;
    config.food.regrowthUnitsPerTick = 0;
    config.organisms.initialEnergy = 40;
    config.organisms.maximumEnergy = 100;
    config.organisms.reproductionThreshold = 10;
    config.organisms.offspringEnergy = 5;
    const world = new SimulationWorld(config);

    world.step();

    const afterBirth = world.snapshot.organisms;
    expect(afterBirth.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(afterBirth.slice(3).map(({ ageTicks }) => ageTicks)).toEqual([
      0, 0, 0,
    ]);
    expect(afterBirth.slice(3).map(({ parentId }) => parentId)).toEqual([
      1, 2, 3,
    ]);

    world.step();

    const afterNextTick = world.snapshot.organisms;
    expect(afterNextTick.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(afterNextTick.slice(3).map(({ ageTicks }) => ageTicks)).toEqual([
      1, 1, 1,
    ]);
  });

  it("preserves every resource accounting invariant under consumption", () => {
    const config = smallConfig(789);
    config.population.initialCount = 40;
    config.population.maximumCount = 80;
    config.food.initialUnits = 29;
    config.food.maximumUnits = 30;
    config.food.regrowthUnitsPerTick = 2.5;
    const world = new SimulationWorld(config);

    for (let tick = 0; tick < 250; tick += 1) {
      world.step();
      const snapshot = world.snapshot;
      const total = snapshot.foodByCell.reduce((sum, food) => sum + food, 0);
      const occupied = snapshot.foodByCell.filter((food) => food > 0).length;

      expect(snapshot.totalFood).toBeCloseTo(total, 10);
      expect(snapshot.occupiedFoodCells).toBe(occupied);
      expect(snapshot.totalFood).toBeGreaterThanOrEqual(0);
      expect(snapshot.totalFood).toBeLessThanOrEqual(config.food.maximumUnits);
      expect(snapshot.foodByCell.every((food) => food >= 0)).toBe(true);
      expect(snapshot.population).toBeLessThanOrEqual(
        config.population.maximumCount,
      );
    }
  });

  it("removes organisms that exhaust their energy or reach maximum age", () => {
    const config = smallConfig();
    config.population.initialCount = 4;
    config.food.initialUnits = 0;
    config.food.regrowthUnitsPerTick = 0;
    config.organisms.initialEnergy = 0.01;
    config.organisms.metabolismPerTick = 1;
    config.organisms.maximumAgeTicks = 1;
    const world = new SimulationWorld(config);

    world.step();

    expect(world.summary.population).toBe(0);
    expect(world.snapshot.organisms).toEqual([]);
  });

  it("replays the complete ecological lifecycle deterministically", () => {
    const config = smallConfig(8675309);
    config.population.initialCount = 20;
    config.population.maximumCount = 100;
    config.food.initialUnits = 100;
    config.food.maximumUnits = 200;
    config.food.regrowthUnitsPerTick = 4;
    const first = new SimulationWorld(config);
    const second = new SimulationWorld(config);

    first.advanceTicks(500);
    second.advanceTicks(200);
    second.advanceTicks(300);

    expect(first.snapshot).toEqual(second.snapshot);
    expect(first.summary.population).toBeLessThanOrEqual(100);
    expect(first.summary.totalFood).toBeLessThanOrEqual(200);
  });

  it("serializes, restores, and continues a multi-thousand-tick run exactly", () => {
    const config = smallConfig(20260829);
    config.population.initialCount = 24;
    config.population.maximumCount = 120;
    config.food.initialUnits = 120;
    config.food.maximumUnits = 240;
    config.food.regrowthUnitsPerTick = 4.5;
    const uninterrupted = new SimulationWorld(config);
    uninterrupted.advanceTicks(750);

    const serialized = serializeWorldSnapshot(uninterrupted.snapshot);
    const restored = SimulationWorld.fromSnapshot(
      deserializeWorldSnapshot(serialized),
    );

    expect(restored.snapshot).toEqual(uninterrupted.snapshot);
    uninterrupted.advanceTicks(2_250);
    restored.advanceTicks(2_250);
    expect(restored.snapshot).toEqual(uninterrupted.snapshot);
    expect(serializeWorldSnapshot(restored.snapshot)).toBe(
      serializeWorldSnapshot(uninterrupted.snapshot),
    );
  });

  it("rejects malformed, inconsistent, and unsafe snapshots", () => {
    const world = new SimulationWorld(smallConfig(17));
    world.advanceTicks(10);
    const valid = world.snapshot;

    expect(() => deserializeWorldSnapshot("not-json")).toThrow(
      WorldSnapshotError,
    );
    expect(() =>
      SimulationWorld.fromSnapshot({ ...valid, schemaVersion: 2 }),
    ).toThrow(WorldSnapshotError);
    expect(() =>
      SimulationWorld.fromSnapshot({
        ...valid,
        totalFood: valid.totalFood + 1,
      }),
    ).toThrow(WorldSnapshotError);
    expect(() =>
      SimulationWorld.fromSnapshot({
        ...valid,
        nextOrganismId: valid.organisms.at(-1)?.id ?? 1,
      }),
    ).toThrow(WorldSnapshotError);
    expect(() =>
      SimulationWorld.fromSnapshot({ ...valid, unexpected: true }),
    ).toThrow(WorldSnapshotError);
  });
});
