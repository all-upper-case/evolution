import { describe, expect, it } from "vitest";

import { createDefaultSimulationConfig } from "./configuration";
import { SimulationWorld } from "./world";

const interactionWorld = (predatorCount = 1): SimulationWorld => {
  const config = createDefaultSimulationConfig();
  config.world.width = 16;
  config.world.height = 16;
  config.population.initialCount = predatorCount + 1;
  config.population.maximumCount = predatorCount + 1;
  config.food.initialUnits = 0;
  config.food.regrowthUnitsPerTick = 0;
  config.ecology.secondaryInitialUnits = 0;
  config.ecology.secondaryRegrowthUnitsPerTick = 0;
  config.organisms.metabolismPerTick = 0.001;
  config.organisms.movementCostPerTick = 0;
  config.organisms.perceptionCostPerTick = 0;
  config.organisms.predationCostPerTick = 0;
  config.organisms.defenseCostPerTick = 0;
  const snapshot = new SimulationWorld(config).snapshot;
  return SimulationWorld.fromSnapshot({
    ...snapshot,
    randomState: 1,
    organisms: snapshot.organisms.map((organism, index) => ({
      ...organism,
      x: 4,
      y: 4,
      energy: 40,
      genome: {
        ...organism.genome,
        movementSpeed: 0.5,
        perceptionRange: 1,
        predationTendency: index < predatorCount ? 1 : 0,
        defense: 0,
      },
    })),
  });
};

describe("predation and defense", () => {
  it("gives bounded prey energy to a successful attacker and skips killed prey", () => {
    const world = interactionWorld();
    const events = world.step();

    expect(events.deathCauses).toEqual({
      starvation: 0,
      age: 0,
      predation: 1,
    });
    expect(world.snapshot.organisms.map(({ id }) => id)).toEqual([1]);
    expect(world.snapshot.organisms[0]?.energy).toBeGreaterThan(40);
    expect(world.snapshot.organisms[0]?.energy).toBeLessThanOrEqual(54);
  });

  it("prevents two predators from consuming the same prey", () => {
    const world = interactionWorld(2);
    const events = world.step();

    expect(events.deaths).toBe(1);
    expect(events.deathCauses.predation).toBe(1);
    expect(world.summary.population).toBe(2);
  });

  it("counts age deaths separately from starvation and predation", () => {
    const config = createDefaultSimulationConfig();
    config.ecology.enabled = false;
    config.population.initialCount = 3;
    config.population.maximumCount = 3;
    config.food.initialUnits = 0;
    config.food.regrowthUnitsPerTick = 0;
    config.organisms.maximumAgeTicks = 1;
    config.organisms.metabolismPerTick = 0.001;
    config.organisms.movementCostPerTick = 0;
    config.organisms.perceptionCostPerTick = 0;
    const events = new SimulationWorld(config).step();
    expect(events.deathCauses).toEqual({
      starvation: 0,
      age: 3,
      predation: 0,
    });
  });
});
