import { describe, expect, it } from "vitest";

import {
  CONFIG_SCHEMA_VERSION,
  SIMULATION_LIMITS,
  SimulationConfigError,
  createDefaultSimulationConfig,
  deserializeSimulationConfig,
  parseSimulationConfig,
  serializeSimulationConfig,
  type SimulationConfig,
} from "./configuration";

const alter = (
  change: (config: SimulationConfig) => void,
): SimulationConfig => {
  const config = createDefaultSimulationConfig();
  change(config);
  return config;
};

describe("simulation configuration", () => {
  it("provides a valid independently owned default", () => {
    const first = createDefaultSimulationConfig();
    const second = createDefaultSimulationConfig();

    expect(first.schemaVersion).toBe(CONFIG_SCHEMA_VERSION);
    expect(parseSimulationConfig(first)).toEqual(first);
    expect(first).not.toBe(second);
    expect(first.world).not.toBe(second.world);

    first.world.width = 64;
    expect(second.world.width).toBe(128);
  });

  it("round-trips through canonical JSON", () => {
    const config = alter((candidate) => {
      candidate.seed = 8675309;
      candidate.world.width = 64;
      candidate.world.height = 64;
    });

    const serialized = serializeSimulationConfig(config);

    expect(deserializeSimulationConfig(serialized)).toEqual(config);
    expect(
      serializeSimulationConfig(deserializeSimulationConfig(serialized)),
    ).toBe(serialized);
  });

  it("normalizes object key order when serializing", () => {
    const config = createDefaultSimulationConfig();
    const reordered = {
      history: config.history,
      evolution: config.evolution,
      organisms: config.organisms,
      food: config.food,
      population: config.population,
      world: config.world,
      seed: config.seed,
      schemaVersion: config.schemaVersion,
    };

    expect(serializeSimulationConfig(reordered)).toBe(
      serializeSimulationConfig(config),
    );
  });

  it("rejects malformed JSON with a structured issue", () => {
    try {
      deserializeSimulationConfig("{not-json}");
      expect.unreachable("Expected malformed JSON to be rejected");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(SimulationConfigError);
      expect((error as SimulationConfigError).issues).toEqual([
        { path: "$", message: "must be valid JSON" },
      ]);
    }
  });

  it("rejects missing and unknown fields", () => {
    const config = createDefaultSimulationConfig() as SimulationConfig & {
      typo?: number;
    };
    config.typo = 1;
    const withoutHistory = { ...config } as Partial<SimulationConfig> & {
      typo: number;
    };
    delete withoutHistory.history;

    try {
      parseSimulationConfig(withoutHistory);
      expect.unreachable("Expected invalid keys to be rejected");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(SimulationConfigError);
      const paths = (error as SimulationConfigError).issues.map(
        (issue) => issue.path,
      );
      expect(paths).toContain("$.typo");
      expect(paths).toContain("$.history");
    }
  });

  it.each([
    ["unsupported schema", alter((config) => (config.schemaVersion = 2 as 1))],
    ["negative seed", alter((config) => (config.seed = -1))],
    [
      "non-finite food",
      alter((config) => (config.food.energyPerUnit = Infinity)),
    ],
    [
      "fractional population",
      alter((config) => (config.population.initialCount = 2.5)),
    ],
    ["zero tick rate", alter((config) => (config.world.ticksPerSecond = 0))],
  ])("rejects %s", (_description, config) => {
    expect(() => parseSimulationConfig(config)).toThrow(SimulationConfigError);
  });

  it("enforces the maximum world area", () => {
    const config = alter((candidate) => {
      candidate.world.width = SIMULATION_LIMITS.worldWidth.maximum;
      candidate.world.height = SIMULATION_LIMITS.worldHeight.maximum;
    });

    try {
      parseSimulationConfig(config);
      expect.unreachable("Expected the world area limit to fail");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(SimulationConfigError);
      expect(
        (error as SimulationConfigError).issues.some(
          (issue) => issue.path === "$.world",
        ),
      ).toBe(true);
    }
  });

  it.each([
    [
      "initial population above its cap",
      alter((config) => {
        config.population.initialCount = 101;
        config.population.maximumCount = 100;
      }),
      "$.population.initialCount",
    ],
    [
      "initial food above its cap",
      alter((config) => {
        config.food.initialUnits = 101;
        config.food.maximumUnits = 100;
      }),
      "$.food.initialUnits",
    ],
    [
      "initial energy above its cap",
      alter((config) => {
        config.organisms.initialEnergy = 121;
        config.organisms.maximumEnergy = 120;
      }),
      "$.organisms.initialEnergy",
    ],
    [
      "reproduction threshold above the energy cap",
      alter((config) => {
        config.organisms.reproductionThreshold = 121;
        config.organisms.maximumEnergy = 120;
      }),
      "$.organisms.reproductionThreshold",
    ],
    [
      "offspring energy above the reproduction threshold",
      alter((config) => {
        config.organisms.offspringEnergy = 81;
        config.organisms.reproductionThreshold = 80;
      }),
      "$.organisms.offspringEnergy",
    ],
  ])("rejects %s", (_description, config, expectedPath) => {
    try {
      parseSimulationConfig(config);
      expect.unreachable("Expected relational constraint to fail");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(SimulationConfigError);
      expect((error as SimulationConfigError).issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: expectedPath }),
        ]),
      );
    }
  });

  it("returns a normalized copy instead of retaining caller objects", () => {
    const input = createDefaultSimulationConfig();
    const parsed = parseSimulationConfig(input);

    input.world.width = 64;
    input.organisms.initialEnergy = 1;

    expect(parsed.world.width).toBe(128);
    expect(parsed.organisms.initialEnergy).toBe(40);
  });
});
