import { describe, expect, it } from "vitest";
import {
  createDefaultSimulationConfig,
  parseSimulationConfig,
} from "./configuration";
import { foodEnergyMultiplier, SimulationWorld } from "./world";

const firstOrganism = (world: SimulationWorld) => {
  const organism = world.snapshot.organisms[0];
  if (organism === undefined) throw new Error("Expected a living organism");
  return organism;
};

const legacyConfig = () => {
  const config = createDefaultSimulationConfig();
  const {
    metabolismFoodEnergyInfluence: _metabolismInfluence,
    movementCostPerTick: _movement,
    perceptionCostPerTick: _perception,
    ...organisms
  } = config.organisms;
  void _movement;
  void _perception;
  void _metabolismInfluence;
  const { ecology: _ecology, ...withoutEcology } = config;
  void _ecology;
  return { ...withoutEcology, schemaVersion: 1, organisms };
};

const versionTwoConfig = () => {
  const config = createDefaultSimulationConfig();
  config.food.regrowthUnitsPerTick = 20;
  config.organisms.perceptionCostPerTick = 0.001;
  const { metabolismFoodEnergyInfluence: _influence, ...organisms } =
    config.organisms;
  void _influence;
  const { ecology: _ecology, ...withoutEcology } = config;
  void _ecology;
  return { ...withoutEcology, schemaVersion: 2, organisms };
};

const controlledWorld = (
  speed: number,
  perception: number,
  movementCost: number,
  perceptionCost: number,
  energy = 40,
) => {
  const config = createDefaultSimulationConfig();
  config.ecology.enabled = false;
  config.ecology.secondaryInitialUnits = 0;
  config.ecology.secondaryMaximumUnits = 0;
  config.population.initialCount = 1;
  config.population.maximumCount = 1;
  config.food.initialUnits = 0;
  config.food.regrowthUnitsPerTick = 0;
  config.organisms.movementCostPerTick = movementCost;
  config.organisms.perceptionCostPerTick = perceptionCost;
  const snapshot = new SimulationWorld(config).snapshot;
  const founder = snapshot.organisms[0];
  if (founder === undefined) throw new Error("Expected founder");
  return SimulationWorld.fromSnapshot({
    ...snapshot,
    organisms: [
      {
        ...founder,
        energy,
        genome: {
          ...founder.genome,
          movementSpeed: speed,
          perceptionRange: perception,
          metabolismScale: 1,
        },
      },
    ],
  });
};

describe("energetic trait costs", () => {
  it("gives faster metabolisms greater food yield while retaining higher base cost", () => {
    expect(foodEnergyMultiplier(0.5, 0.4)).toBeCloseTo(0.8, 10);
    expect(foodEnergyMultiplier(1, 0.4)).toBe(1);
    expect(foodEnergyMultiplier(1.5, 0.4)).toBeCloseTo(1.2, 10);
    expect(foodEnergyMultiplier(0.5, 0)).toBe(1);

    const fedWorld = (metabolismScale: number) => {
      const config = createDefaultSimulationConfig();
      config.ecology.enabled = false;
      config.ecology.secondaryInitialUnits = 0;
      config.ecology.secondaryMaximumUnits = 0;
      config.population.initialCount = 1;
      config.population.maximumCount = 1;
      config.food.initialUnits = 0;
      config.food.regrowthUnitsPerTick = 0;
      config.organisms.movementCostPerTick = 0;
      config.organisms.perceptionCostPerTick = 0;
      const snapshot = new SimulationWorld(config).snapshot;
      const founder = snapshot.organisms[0];
      if (founder === undefined) throw new Error("Expected founder");
      const cell = founder.y * snapshot.width + founder.x;
      const foodByCell = [...snapshot.foodByCell];
      foodByCell[cell] = 1;
      return SimulationWorld.fromSnapshot({
        ...snapshot,
        totalFood: 1,
        occupiedFoodCells: 1,
        foodTotals: { meadow: 1, grove: 0 },
        foodByCell,
        organisms: [
          {
            ...founder,
            genome: { ...founder.genome, metabolismScale },
          },
        ],
      });
    };
    const slow = fedWorld(0.5);
    const fast = fedWorld(1.5);
    slow.step();
    fast.step();
    expect(firstOrganism(slow).energy).toBeCloseTo(43.15, 10);
    expect(firstOrganism(fast).energy).toBeCloseTo(44.65, 10);
  });

  it("charges squared speed and perception capacity even when stationary", () => {
    const slow = controlledWorld(1, 2, 0.1, 0.01);
    const fast = controlledWorld(2, 2, 0.1, 0.01);
    const far = controlledWorld(1, 4, 0.1, 0.01);
    const position = firstOrganism(slow);
    slow.step();
    fast.step();
    far.step();
    expect(slow.snapshot.organisms[0]).toMatchObject({
      x: position.x,
      y: position.y,
    });
    expect(firstOrganism(slow).energy).toBeCloseTo(39.76, 10);
    expect(firstOrganism(slow).energy - firstOrganism(fast).energy).toBeCloseTo(
      0.3,
      10,
    );
    expect(firstOrganism(slow).energy - firstOrganism(far).energy).toBeCloseTo(
      0.12,
      10,
    );
  });

  it("allows independent zero-cost controls and counts cost-driven starvation", () => {
    const free = controlledWorld(2, 12, 0, 0);
    free.step();
    expect(firstOrganism(free).energy).toBeCloseTo(39.9, 10);
    const starving = controlledWorld(2, 12, 0.1, 0.01, 0.2);
    expect(starving.step()).toEqual({ tick: 1, births: 0, deaths: 1 });
    expect(starving.summary.population).toBe(0);
  });

  it("migrates strict version-one files with zero costs and preserves continuation", () => {
    const legacy = legacyConfig();
    expect(parseSimulationConfig(legacy).organisms).toMatchObject({
      movementCostPerTick: 0,
      perceptionCostPerTick: 0,
      metabolismFoodEnergyInfluence: 0,
    });
    const world = new SimulationWorld(legacy);
    world.advanceTicks(100);
    const saved = world.snapshot;
    const restored = SimulationWorld.fromSnapshot({ ...saved, config: legacy });
    world.advanceTicks(300);
    restored.advanceTicks(300);
    expect(restored.snapshot).toEqual(world.snapshot);
    expect(() =>
      parseSimulationConfig({
        ...legacy,
        organisms: { ...legacy.organisms, movementCostPerTick: 1 },
      }),
    ).toThrow();
  });

  it("migrates version-two files with neutral food yield", () => {
    const migrated = parseSimulationConfig(versionTwoConfig());
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.ecology.enabled).toBe(false);
    expect(migrated.ecology.dietSpecializationEnabled).toBe(false);
    expect(migrated.organisms.metabolismFoodEnergyInfluence).toBe(0);
    expect(migrated.organisms.movementCostPerTick).toBe(0.1);
    expect(migrated.organisms.perceptionCostPerTick).toBe(0.001);
  });

  it("rejects missing, negative, non-finite, and excessive costs in version three", () => {
    for (const field of [
      "movementCostPerTick",
      "perceptionCostPerTick",
    ] as const) {
      for (const value of [undefined, -1, NaN, Infinity, 1001]) {
        const config = createDefaultSimulationConfig();
        expect(() =>
          parseSimulationConfig({
            ...config,
            organisms: { ...config.organisms, [field]: value },
          }),
        ).toThrow();
      }
    }
  });

  it("rejects invalid metabolism food influence in version three", () => {
    for (const value of [undefined, -0.01, 1.01, NaN, Infinity]) {
      const config = createDefaultSimulationConfig();
      expect(() =>
        parseSimulationConfig({
          ...config,
          organisms: {
            ...config.organisms,
            metabolismFoodEnergyInfluence: value,
          },
        }),
      ).toThrow();
    }
  });
});
