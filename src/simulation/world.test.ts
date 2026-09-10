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
  config.ecology.enabled = false;
  config.ecology.secondaryInitialUnits = 0;
  config.ecology.secondaryMaximumUnits = 0;
  config.ecology.secondaryRegrowthUnitsPerTick = 0;
  config.seed = seed;
  config.world.width = 16;
  config.world.height = 16;
  config.food.initialUnits = 20;
  config.food.maximumUnits = 30;
  config.food.regrowthUnitsPerTick = 2.5;
  return config;
};

describe("SimulationWorld", () => {
  it("creates deterministic habitat patches with two habitat-bound foods", () => {
    const config = createDefaultSimulationConfig();
    config.world.width = 32;
    config.world.height = 32;
    config.population.initialCount = 10;
    config.population.maximumCount = 20;
    config.food.initialUnits = 100;
    config.food.maximumUnits = 200;
    config.food.regrowthUnitsPerTick = 2;
    config.ecology.secondaryInitialUnits = 60;
    config.ecology.secondaryMaximumUnits = 120;
    config.ecology.secondaryRegrowthUnitsPerTick = 1;
    const first = new SimulationWorld(config);
    const second = new SimulationWorld(config);
    const snapshot = first.snapshot;

    expect(snapshot).toEqual(second.snapshot);
    expect(snapshot.schemaVersion).toBe(5);
    expect(new Set(snapshot.habitatByCell)).toEqual(new Set([0, 1]));
    expect(snapshot.foodTotals).toEqual({ meadow: 100, grove: 60 });
    expect(
      snapshot.foodByCell.every(
        (food, cell) => food === 0 || snapshot.habitatByCell?.[cell] === 0,
      ),
    ).toBe(true);
    expect(
      snapshot.secondaryFoodByCell?.every(
        (food, cell) => food === 0 || snapshot.habitatByCell?.[cell] === 1,
      ),
    ).toBe(true);

    first.advanceTicks(100);
    const restored = SimulationWorld.fromSnapshot(
      deserializeWorldSnapshot(serializeWorldSnapshot(first.snapshot)),
    );
    first.advanceTicks(200);
    restored.advanceTicks(200);
    expect(restored.snapshot).toEqual(first.snapshot);
  });

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

    const events = world.step();

    expect(world.summary.population).toBe(5);
    expect(events).toEqual({
      tick: 1,
      births: 2,
      deaths: 0,
      deathCauses: { starvation: 0, age: 0, predation: 0 },
    });
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

    const events = world.step();

    expect(world.summary.population).toBe(0);
    expect(events).toEqual({
      tick: 1,
      births: 0,
      deaths: 4,
      deathCauses: { starvation: 4, age: 0, predation: 0 },
    });
    expect(world.snapshot.organisms).toEqual([]);
  });

  it("aggregates exact lifecycle events without changing replay", () => {
    const config = smallConfig(8675309);
    config.population.initialCount = 20;
    config.population.maximumCount = 100;
    config.food.initialUnits = 100;
    config.food.maximumUnits = 200;
    config.food.regrowthUnitsPerTick = 4;
    const aggregateWorld = new SimulationWorld(config);
    const steppedWorld = new SimulationWorld(config);
    const aggregate = aggregateWorld.advanceTicks(500);
    let births = 0;
    let deaths = 0;
    for (let tick = 0; tick < 500; tick += 1) {
      const events = steppedWorld.step();
      births += events.births;
      deaths += events.deaths;
    }

    expect(aggregate).toMatchObject({ ticks: 500, births, deaths });
    expect(aggregate.births).toBeGreaterThan(0);
    expect(aggregateWorld.snapshot).toEqual(steppedWorld.snapshot);
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

  it("migrates schema-two worlds to a neutral diet without changing continuation", () => {
    const config = smallConfig(20260908);
    config.population.initialCount = 24;
    config.population.maximumCount = 120;
    config.food.initialUnits = 120;
    config.food.maximumUnits = 240;
    config.food.regrowthUnitsPerTick = 4.5;
    config.ecology.dietSpecializationEnabled = false;
    const uninterrupted = new SimulationWorld(config);
    uninterrupted.advanceTicks(200);
    const current = JSON.parse(
      serializeWorldSnapshot(uninterrupted.snapshot),
    ) as Record<string, unknown>;
    const legacyConfig = current.config as Record<string, unknown>;
    const legacyEcology = legacyConfig.ecology as Record<string, unknown>;
    delete legacyEcology.dietSpecializationEnabled;
    delete legacyEcology.specialistFoodEfficiency;
    delete legacyEcology.oppositeFoodEfficiency;
    delete legacyEcology.predationEnabled;
    delete legacyEcology.predatorThreshold;
    delete legacyEcology.predationEnergyFraction;
    delete legacyEcology.maximumPredationEnergyGain;
    delete legacyEcology.terrainEnabled;
    delete legacyEcology.obstacleFraction;
    delete legacyEcology.refugeFraction;
    const legacyOrganisms = legacyConfig.organisms as Record<string, unknown>;
    delete legacyOrganisms.predationCostPerTick;
    delete legacyOrganisms.defenseCostPerTick;
    delete legacyOrganisms.attackCost;
    delete legacyOrganisms.refugeCostPerTick;
    legacyConfig.schemaVersion = 4;
    for (const organism of current.organisms as Record<string, unknown>[]) {
      delete (organism.genome as Record<string, unknown>).dietPreference;
      delete (organism.genome as Record<string, unknown>).predationTendency;
      delete (organism.genome as Record<string, unknown>).defense;
    }
    current.schemaVersion = 2;
    delete current.terrainByCell;
    delete current.terrainTotals;

    const restored = SimulationWorld.fromSnapshot(current);
    expect(
      restored.snapshot.organisms.every(
        ({ genome }) => genome.dietPreference === 0.5,
      ),
    ).toBe(true);
    expect(restored.snapshot.config.ecology.dietSpecializationEnabled).toBe(
      false,
    );

    uninterrupted.advanceTicks(800);
    restored.advanceTicks(800);
    const expected = uninterrupted.snapshot;
    const actual = restored.snapshot;
    expect(actual.organisms).toEqual(expected.organisms);
    expect(actual.foodByCell).toEqual(expected.foodByCell);
    expect(actual.secondaryFoodByCell).toEqual(expected.secondaryFoodByCell);
    expect(actual.randomState).toBe(expected.randomState);
    expect(actual.nextOrganismId).toBe(expected.nextOrganismId);
  });

  it("rejects malformed, inconsistent, and unsafe snapshots", () => {
    const world = new SimulationWorld(smallConfig(17));
    world.advanceTicks(10);
    const valid = world.snapshot;

    expect(() => deserializeWorldSnapshot("not-json")).toThrow(
      WorldSnapshotError,
    );
    expect(() =>
      SimulationWorld.fromSnapshot({ ...valid, schemaVersion: 6 }),
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
    expect(() =>
      SimulationWorld.fromSnapshot({
        ...valid,
        terrainTotals: {
          ...valid.terrainTotals,
          obstacles: valid.terrainTotals.obstacles + 1,
        },
      }),
    ).toThrow(WorldSnapshotError);
    expect(() =>
      SimulationWorld.fromSnapshot({
        ...valid,
        terrainByCell: valid.terrainByCell?.slice(1),
      }),
    ).toThrow(WorldSnapshotError);
    expect(() =>
      SimulationWorld.fromSnapshot({
        ...valid,
        habitatByCell: valid.habitatByCell?.map((habitat, index) =>
          index === 0 ? 1 : habitat,
        ),
      }),
    ).toThrow(WorldSnapshotError);
  });
});
