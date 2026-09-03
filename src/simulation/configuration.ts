export const CONFIG_SCHEMA_VERSION = 1 as const;

export interface SimulationConfig {
  schemaVersion: typeof CONFIG_SCHEMA_VERSION;
  seed: number;
  world: {
    width: number;
    height: number;
    ticksPerSecond: number;
  };
  population: {
    initialCount: number;
    maximumCount: number;
  };
  food: {
    initialUnits: number;
    maximumUnits: number;
    regrowthUnitsPerTick: number;
    energyPerUnit: number;
  };
  organisms: {
    initialEnergy: number;
    maximumEnergy: number;
    reproductionThreshold: number;
    offspringEnergy: number;
    metabolismPerTick: number;
    maximumAgeTicks: number;
  };
  evolution: {
    mutationProbability: number;
    mutationMagnitude: number;
  };
  history: {
    sampleEveryTicks: number;
    maximumSamples: number;
  };
}

export interface ConfigIssue {
  path: string;
  message: string;
}

interface NumericLimit {
  minimum: number;
  maximum: number;
  integer: boolean;
}

const numericLimit = (
  minimum: number,
  maximum: number,
  integer: boolean,
): Readonly<NumericLimit> => Object.freeze({ minimum, maximum, integer });

export const SIMULATION_LIMITS = Object.freeze({
  seed: numericLimit(0, 0xffff_ffff, true),
  worldWidth: numericLimit(16, 512, true),
  worldHeight: numericLimit(16, 512, true),
  maximumWorldCells: 65_536,
  ticksPerSecond: numericLimit(1, 240, true),
  populationCount: numericLimit(1, 10_000, true),
  foodUnits: numericLimit(0, 1_000_000, true),
  foodRegrowth: numericLimit(0, 10_000, false),
  foodEnergy: numericLimit(0.001, 10_000, false),
  organismEnergy: numericLimit(0.001, 10_000, false),
  metabolism: numericLimit(0.000_001, 1_000, false),
  maximumAgeTicks: numericLimit(1, 10_000_000, true),
  probability: numericLimit(0, 1, false),
  mutationMagnitude: numericLimit(0, 1, false),
  historyInterval: numericLimit(1, 1_000_000, true),
  historySamples: numericLimit(1, 100_000, true),
} satisfies Readonly<Record<string, NumericLimit | number>>);

export class SimulationConfigError extends Error {
  public readonly issues: readonly ConfigIssue[];

  public constructor(issues: readonly ConfigIssue[]) {
    const summary = issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ");
    super(`Invalid simulation configuration: ${summary}`);
    this.name = "SimulationConfigError";
    this.issues = Object.freeze(
      issues.map((issue) => Object.freeze({ ...issue })),
    );
  }
}

const DEFAULT_CONFIG: SimulationConfig = {
  schemaVersion: CONFIG_SCHEMA_VERSION,
  seed: 42,
  world: {
    width: 128,
    height: 128,
    ticksPerSecond: 30,
  },
  population: {
    initialCount: 250,
    maximumCount: 1_000,
  },
  food: {
    initialUnits: 12_000,
    maximumUnits: 50_000,
    regrowthUnitsPerTick: 20,
    energyPerUnit: 4,
  },
  organisms: {
    initialEnergy: 40,
    maximumEnergy: 120,
    reproductionThreshold: 80,
    offspringEnergy: 30,
    metabolismPerTick: 0.1,
    maximumAgeTicks: 30_000,
  },
  evolution: {
    mutationProbability: 0.08,
    mutationMagnitude: 0.12,
  },
  history: {
    sampleEveryTicks: 30,
    maximumSamples: 10_000,
  },
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRecord = (
  value: unknown,
  path: string,
  keys: readonly string[],
  issues: ConfigIssue[],
): UnknownRecord => {
  if (!isRecord(value)) {
    issues.push({ path, message: "must be an object" });
    return {};
  }

  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      issues.push({
        path: `${path}.${key}`,
        message: "is not a recognized field",
      });
    }
  }

  for (const key of keys) {
    if (!(key in value)) {
      issues.push({ path: `${path}.${key}`, message: "is required" });
    }
  }

  return value;
};

const readNumber = (
  record: UnknownRecord,
  key: string,
  path: string,
  limit: NumericLimit,
  issues: ConfigIssue[],
): number => {
  const value = record[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ path, message: "must be a finite number" });
    return 0;
  }
  if (limit.integer && !Number.isSafeInteger(value)) {
    issues.push({ path, message: "must be a safe integer" });
    return 0;
  }
  if (value < limit.minimum || value > limit.maximum) {
    issues.push({
      path,
      message: `must be between ${String(limit.minimum)} and ${String(limit.maximum)} inclusive`,
    });
  }

  return value;
};

const addRelationalIssue = (
  condition: boolean,
  path: string,
  message: string,
  issues: ConfigIssue[],
): void => {
  if (condition) {
    issues.push({ path, message });
  }
};

/**
 * Validates unknown input and returns a normalized, independently owned config.
 * Unknown fields are rejected so typos never silently change an experiment.
 */
export const parseSimulationConfig = (input: unknown): SimulationConfig => {
  const issues: ConfigIssue[] = [];
  const root = readRecord(
    input,
    "$",
    [
      "schemaVersion",
      "seed",
      "world",
      "population",
      "food",
      "organisms",
      "evolution",
      "history",
    ],
    issues,
  );
  const world = readRecord(
    root.world,
    "$.world",
    ["width", "height", "ticksPerSecond"],
    issues,
  );
  const population = readRecord(
    root.population,
    "$.population",
    ["initialCount", "maximumCount"],
    issues,
  );
  const food = readRecord(
    root.food,
    "$.food",
    ["initialUnits", "maximumUnits", "regrowthUnitsPerTick", "energyPerUnit"],
    issues,
  );
  const organisms = readRecord(
    root.organisms,
    "$.organisms",
    [
      "initialEnergy",
      "maximumEnergy",
      "reproductionThreshold",
      "offspringEnergy",
      "metabolismPerTick",
      "maximumAgeTicks",
    ],
    issues,
  );
  const evolution = readRecord(
    root.evolution,
    "$.evolution",
    ["mutationProbability", "mutationMagnitude"],
    issues,
  );
  const history = readRecord(
    root.history,
    "$.history",
    ["sampleEveryTicks", "maximumSamples"],
    issues,
  );

  const schemaVersion = readNumber(
    root,
    "schemaVersion",
    "$.schemaVersion",
    {
      minimum: CONFIG_SCHEMA_VERSION,
      maximum: CONFIG_SCHEMA_VERSION,
      integer: true,
    },
    issues,
  );
  const seed = readNumber(
    root,
    "seed",
    "$.seed",
    SIMULATION_LIMITS.seed,
    issues,
  );
  const width = readNumber(
    world,
    "width",
    "$.world.width",
    SIMULATION_LIMITS.worldWidth,
    issues,
  );
  const height = readNumber(
    world,
    "height",
    "$.world.height",
    SIMULATION_LIMITS.worldHeight,
    issues,
  );
  const ticksPerSecond = readNumber(
    world,
    "ticksPerSecond",
    "$.world.ticksPerSecond",
    SIMULATION_LIMITS.ticksPerSecond,
    issues,
  );
  const initialCount = readNumber(
    population,
    "initialCount",
    "$.population.initialCount",
    SIMULATION_LIMITS.populationCount,
    issues,
  );
  const maximumCount = readNumber(
    population,
    "maximumCount",
    "$.population.maximumCount",
    SIMULATION_LIMITS.populationCount,
    issues,
  );
  const initialUnits = readNumber(
    food,
    "initialUnits",
    "$.food.initialUnits",
    SIMULATION_LIMITS.foodUnits,
    issues,
  );
  const maximumUnits = readNumber(
    food,
    "maximumUnits",
    "$.food.maximumUnits",
    { ...SIMULATION_LIMITS.foodUnits, minimum: 1 },
    issues,
  );
  const regrowthUnitsPerTick = readNumber(
    food,
    "regrowthUnitsPerTick",
    "$.food.regrowthUnitsPerTick",
    SIMULATION_LIMITS.foodRegrowth,
    issues,
  );
  const energyPerUnit = readNumber(
    food,
    "energyPerUnit",
    "$.food.energyPerUnit",
    SIMULATION_LIMITS.foodEnergy,
    issues,
  );
  const initialEnergy = readNumber(
    organisms,
    "initialEnergy",
    "$.organisms.initialEnergy",
    SIMULATION_LIMITS.organismEnergy,
    issues,
  );
  const maximumEnergy = readNumber(
    organisms,
    "maximumEnergy",
    "$.organisms.maximumEnergy",
    SIMULATION_LIMITS.organismEnergy,
    issues,
  );
  const reproductionThreshold = readNumber(
    organisms,
    "reproductionThreshold",
    "$.organisms.reproductionThreshold",
    SIMULATION_LIMITS.organismEnergy,
    issues,
  );
  const offspringEnergy = readNumber(
    organisms,
    "offspringEnergy",
    "$.organisms.offspringEnergy",
    SIMULATION_LIMITS.organismEnergy,
    issues,
  );
  const metabolismPerTick = readNumber(
    organisms,
    "metabolismPerTick",
    "$.organisms.metabolismPerTick",
    SIMULATION_LIMITS.metabolism,
    issues,
  );
  const maximumAgeTicks = readNumber(
    organisms,
    "maximumAgeTicks",
    "$.organisms.maximumAgeTicks",
    SIMULATION_LIMITS.maximumAgeTicks,
    issues,
  );
  const mutationProbability = readNumber(
    evolution,
    "mutationProbability",
    "$.evolution.mutationProbability",
    SIMULATION_LIMITS.probability,
    issues,
  );
  const mutationMagnitude = readNumber(
    evolution,
    "mutationMagnitude",
    "$.evolution.mutationMagnitude",
    SIMULATION_LIMITS.mutationMagnitude,
    issues,
  );
  const sampleEveryTicks = readNumber(
    history,
    "sampleEveryTicks",
    "$.history.sampleEveryTicks",
    SIMULATION_LIMITS.historyInterval,
    issues,
  );
  const maximumSamples = readNumber(
    history,
    "maximumSamples",
    "$.history.maximumSamples",
    SIMULATION_LIMITS.historySamples,
    issues,
  );

  addRelationalIssue(
    width * height > SIMULATION_LIMITS.maximumWorldCells,
    "$.world",
    `area must not exceed ${String(SIMULATION_LIMITS.maximumWorldCells)} cells`,
    issues,
  );
  addRelationalIssue(
    initialCount > maximumCount,
    "$.population.initialCount",
    "must not exceed maximumCount",
    issues,
  );
  addRelationalIssue(
    initialUnits > maximumUnits,
    "$.food.initialUnits",
    "must not exceed maximumUnits",
    issues,
  );
  addRelationalIssue(
    initialEnergy > maximumEnergy,
    "$.organisms.initialEnergy",
    "must not exceed maximumEnergy",
    issues,
  );
  addRelationalIssue(
    reproductionThreshold > maximumEnergy,
    "$.organisms.reproductionThreshold",
    "must not exceed maximumEnergy",
    issues,
  );
  addRelationalIssue(
    offspringEnergy > reproductionThreshold,
    "$.organisms.offspringEnergy",
    "must not exceed reproductionThreshold",
    issues,
  );

  if (issues.length > 0) {
    throw new SimulationConfigError(issues);
  }

  return {
    schemaVersion: schemaVersion as typeof CONFIG_SCHEMA_VERSION,
    seed,
    world: { width, height, ticksPerSecond },
    population: { initialCount, maximumCount },
    food: { initialUnits, maximumUnits, regrowthUnitsPerTick, energyPerUnit },
    organisms: {
      initialEnergy,
      maximumEnergy,
      reproductionThreshold,
      offspringEnergy,
      metabolismPerTick,
      maximumAgeTicks,
    },
    evolution: { mutationProbability, mutationMagnitude },
    history: { sampleEveryTicks, maximumSamples },
  };
};

export const createDefaultSimulationConfig = (): SimulationConfig =>
  parseSimulationConfig(DEFAULT_CONFIG);

/** Produces compact canonical JSON with normalized key order. */
export const serializeSimulationConfig = (input: unknown): string =>
  JSON.stringify(parseSimulationConfig(input));

export const deserializeSimulationConfig = (
  serialized: string,
): SimulationConfig => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new SimulationConfigError([
      { path: "$", message: "must be valid JSON" },
    ]);
  }

  return parseSimulationConfig(parsed);
};
