import { describe, expect, it } from "vitest";

import { createDefaultSimulationConfig } from "./configuration";
import {
  SimulationWorld,
  TERRAIN_OBSTACLE,
  TERRAIN_OPEN,
  TERRAIN_REFUGE,
  type WorldSnapshot,
} from "./world";

const terrainConfig = () => {
  const config = createDefaultSimulationConfig();
  config.world.width = 16;
  config.world.height = 16;
  config.population.initialCount = 8;
  config.population.maximumCount = 8;
  config.food.initialUnits = 40;
  config.ecology.secondaryInitialUnits = 20;
  config.ecology.obstacleFraction = 0.12;
  config.ecology.refugeFraction = 0.08;
  return config;
};

const controlledSnapshot = (): WorldSnapshot => {
  const config = terrainConfig();
  config.population.initialCount = 2;
  config.population.maximumCount = 2;
  config.food.initialUnits = 0;
  config.food.regrowthUnitsPerTick = 0;
  config.ecology.secondaryInitialUnits = 0;
  config.ecology.secondaryRegrowthUnitsPerTick = 0;
  config.ecology.obstacleFraction = 0;
  config.ecology.refugeFraction = 0;
  config.organisms.metabolismPerTick = 0.001;
  config.organisms.movementCostPerTick = 0;
  config.organisms.perceptionCostPerTick = 0;
  config.organisms.predationCostPerTick = 0;
  config.organisms.defenseCostPerTick = 0;
  config.organisms.attackCost = 0;
  const snapshot = new SimulationWorld(config).snapshot;
  return {
    ...snapshot,
    randomState: 5,
    organisms: snapshot.organisms.map((organism, index) => ({
      ...organism,
      x: index === 0 ? 2 : 12,
      y: 2,
      energy: 40,
      genome: {
        ...organism.genome,
        movementSpeed: index === 0 ? 1 : 0.5,
        perceptionRange: 8,
        predationTendency: 0,
        defense: 0,
      },
    })),
  };
};

const withTerrain = (
  snapshot: WorldSnapshot,
  terrainByCell: readonly number[],
): WorldSnapshot => ({
  ...snapshot,
  terrainByCell,
  terrainTotals: {
    open: terrainByCell.filter((terrain) => terrain === TERRAIN_OPEN).length,
    obstacles: terrainByCell.filter((terrain) => terrain === TERRAIN_OBSTACLE)
      .length,
    refuges: terrainByCell.filter((terrain) => terrain === TERRAIN_REFUGE)
      .length,
  },
});

describe("obstacles and refuges", () => {
  it("generates seeded bounded terrain and keeps state off obstacles", () => {
    const first = new SimulationWorld(terrainConfig());
    const second = new SimulationWorld(terrainConfig());
    const snapshot = first.snapshot;

    expect(snapshot.terrainByCell).toEqual(second.snapshot.terrainByCell);
    expect(snapshot.terrainTotals.obstacles).toBeGreaterThan(0);
    expect(snapshot.terrainTotals.refuges).toBeGreaterThan(0);
    expect(
      snapshot.terrainTotals.open +
        snapshot.terrainTotals.obstacles +
        snapshot.terrainTotals.refuges,
    ).toBe(256);
    expect(
      snapshot.foodByCell.every(
        (food, cell) =>
          food === 0 || snapshot.terrainByCell?.[cell] !== TERRAIN_OBSTACLE,
      ),
    ).toBe(true);
    expect(
      snapshot.organisms.every(
        ({ x, y }) =>
          snapshot.terrainByCell?.[y * snapshot.width + x] !== TERRAIN_OBSTACLE,
      ),
    ).toBe(true);

    first.advanceTicks(200);
    const restored = SimulationWorld.fromSnapshot(first.snapshot);
    first.advanceTicks(200);
    restored.advanceTicks(200);
    expect(restored.snapshot).toEqual(first.snapshot);
  });

  it("takes a stable detour instead of entering an obstacle", () => {
    const snapshot = controlledSnapshot();
    const terrain = [...(snapshot.terrainByCell ?? [])];
    terrain[2 * snapshot.width + 3] = TERRAIN_OBSTACLE;
    const food = [...snapshot.foodByCell];
    food[2 * snapshot.width + 4] = 1;
    const world = SimulationWorld.fromSnapshot({
      ...withTerrain(snapshot, terrain),
      foodByCell: food,
      totalFood: 1,
      occupiedFoodCells: 1,
      foodTotals: { meadow: 1, grove: 0 },
    });

    world.step();

    expect(world.snapshot.organisms[0]).toMatchObject({ x: 2, y: 1 });
  });

  it("hides sheltered prey and charges its explicit refuge cost", () => {
    const snapshot = controlledSnapshot();
    const terrain = [...(snapshot.terrainByCell ?? [])];
    const refugeCell = 2 * snapshot.width + 4;
    terrain[refugeCell] = TERRAIN_REFUGE;
    const organisms = snapshot.organisms.map((organism, index) => ({
      ...organism,
      x: index === 0 ? 3 : 4,
      y: 2,
      genome: {
        ...organism.genome,
        movementSpeed: 0.5,
        predationTendency: index === 0 ? 1 : 0,
        defense: 0,
      },
    }));
    const sheltered = SimulationWorld.fromSnapshot({
      ...withTerrain(snapshot, terrain),
      organisms,
    });
    const open = SimulationWorld.fromSnapshot({
      ...snapshot,
      organisms: organisms.map((organism) => ({
        ...organism,
        genome: { ...organism.genome, predationTendency: 0 },
      })),
    });

    const events = sheltered.step();
    open.step();

    expect(events.deathCauses.predation).toBe(0);
    expect(sheltered.summary.population).toBe(2);
    expect(sheltered.snapshot.organisms[0]).toMatchObject({ x: 3, y: 2 });
    const shelteredPrey = sheltered.snapshot.organisms[1];
    const openPeer = open.snapshot.organisms[1];
    expect(shelteredPrey?.energy).toBeCloseTo(
      (openPeer?.energy ?? 0) - snapshot.config.organisms.refugeCostPerTick,
      10,
    );
  });
});
