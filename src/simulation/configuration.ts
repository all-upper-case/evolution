export const CONFIG_SCHEMA_VERSION = 6 as const;

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
  ecology: {
    enabled: boolean;
    dietSpecializationEnabled: boolean;
    predationEnabled: boolean;
    habitatPatchCount: number;
    groveFraction: number;
    secondaryInitialUnits: number;
    secondaryMaximumUnits: number;
    secondaryRegrowthUnitsPerTick: number;
    secondaryEnergyPerUnit: number;
    specialistFoodEfficiency: number;
    oppositeFoodEfficiency: number;
    predatorThreshold: number;
    predationEnergyFraction: number;
    maximumPredationEnergyGain: number;
  };
  organisms: {
    initialEnergy: number;
    maximumEnergy: number;
    reproductionThreshold: number;
    offspringEnergy: number;
    metabolismPerTick: number;
    metabolismFoodEnergyInfluence: number;
    movementCostPerTick: number;
    perceptionCostPerTick: number;
    predationCostPerTick: number;
    defenseCostPerTick: number;
    attackCost: number;
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
  traitCost: numericLimit(0, 1_000, false),
  maximumAgeTicks: numericLimit(1, 10_000_000, true),
  probability: numericLimit(0, 1, false),
  mutationMagnitude: numericLimit(0, 1, false),
  historyInterval: numericLimit(1, 1_000_000, true),
  historySamples: numericLimit(1, 100_000, true),
  habitatPatchCount: numericLimit(2, 64, true),
  foodEfficiency: numericLimit(0.01, 2, false),
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
    regrowthUnitsPerTick: 23,
    energyPerUnit: 4,
  },
  ecology: {
    enabled: true,
    dietSpecializationEnabled: true,
    predationEnabled: true,
    habitatPatchCount: 12,
    groveFraction: 0.38,
    secondaryInitialUnits: 4_000,
    secondaryMaximumUnits: 18_000,
    secondaryRegrowthUnitsPerTick: 7,
    secondaryEnergyPerUnit: 7,
    specialistFoodEfficiency: 1.25,
    oppositeFoodEfficiency: 0.25,
    predatorThreshold: 0.8,
    predationEnergyFraction: 0.35,
    maximumPredationEnergyGain: 18,
  },
  organisms: {
    initialEnergy: 40,
    maximumEnergy: 120,
    reproductionThreshold: 80,
    offspringEnergy: 30,
    metabolismPerTick: 0.1,
    metabolismFoodEnergyInfluence: 0.4,
    movementCostPerTick: 0.1,
    perceptionCostPerTick: 0.0018,
    predationCostPerTick: 0.08,
    defenseCostPerTick: 0.04,
    attackCost: 0.35,
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

const readBoolean = (
  record: UnknownRecord,
  key: string,
  path: string,
  issues: ConfigIssue[],
): boolean => {
  const value = record[key];
  if (typeof value !== "boolean") {
    issues.push({ path, message: "must be a boolean" });
    return false;
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
  const inputSchemaVersion = isRecord(input) ? input.schemaVersion : undefined;
  const root = readRecord(
    input,
    "$",
    [
      "schemaVersion",
      "seed",
      "world",
      "population",
      "food",
      ...(inputSchemaVersion === 4 ||
      inputSchemaVersion === 5 ||
      inputSchemaVersion === 6
        ? ["ecology"]
        : []),
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
  const ecology =
    root.schemaVersion === 4 ||
    root.schemaVersion === 5 ||
    root.schemaVersion === 6
      ? readRecord(
          root.ecology,
          "$.ecology",
          [
            "enabled",
            ...(root.schemaVersion >= 5 ? ["dietSpecializationEnabled"] : []),
            ...(root.schemaVersion === 6 ? ["predationEnabled"] : []),
            "habitatPatchCount",
            "groveFraction",
            "secondaryInitialUnits",
            "secondaryMaximumUnits",
            "secondaryRegrowthUnitsPerTick",
            "secondaryEnergyPerUnit",
            ...(root.schemaVersion >= 5
              ? ["specialistFoodEfficiency", "oppositeFoodEfficiency"]
              : []),
            ...(root.schemaVersion === 6
              ? [
                  "predatorThreshold",
                  "predationEnergyFraction",
                  "maximumPredationEnergyGain",
                ]
              : []),
          ],
          issues,
        )
      : {};
  const organisms = readRecord(
    root.organisms,
    "$.organisms",
    [
      "initialEnergy",
      "maximumEnergy",
      "reproductionThreshold",
      "offspringEnergy",
      "metabolismPerTick",
      ...(root.schemaVersion === 3 ||
      root.schemaVersion === 4 ||
      root.schemaVersion === 5 ||
      root.schemaVersion === 6
        ? ["metabolismFoodEnergyInfluence"]
        : []),
      ...(root.schemaVersion === 1
        ? []
        : ["movementCostPerTick", "perceptionCostPerTick"]),
      ...(root.schemaVersion === 6
        ? ["predationCostPerTick", "defenseCostPerTick", "attackCost"]
        : []),
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
      minimum: 1,
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
  const ecologyEnabled =
    schemaVersion < 4
      ? false
      : readBoolean(ecology, "enabled", "$.ecology.enabled", issues);
  const dietSpecializationEnabled =
    schemaVersion < 5
      ? false
      : readBoolean(
          ecology,
          "dietSpecializationEnabled",
          "$.ecology.dietSpecializationEnabled",
          issues,
        );
  const predationEnabled =
    schemaVersion < 6
      ? false
      : readBoolean(
          ecology,
          "predationEnabled",
          "$.ecology.predationEnabled",
          issues,
        );
  const habitatPatchCount =
    schemaVersion < 4
      ? DEFAULT_CONFIG.ecology.habitatPatchCount
      : readNumber(
          ecology,
          "habitatPatchCount",
          "$.ecology.habitatPatchCount",
          SIMULATION_LIMITS.habitatPatchCount,
          issues,
        );
  const groveFraction =
    schemaVersion < 4
      ? DEFAULT_CONFIG.ecology.groveFraction
      : readNumber(
          ecology,
          "groveFraction",
          "$.ecology.groveFraction",
          SIMULATION_LIMITS.probability,
          issues,
        );
  const secondaryInitialUnits =
    schemaVersion < 4
      ? DEFAULT_CONFIG.ecology.secondaryInitialUnits
      : readNumber(
          ecology,
          "secondaryInitialUnits",
          "$.ecology.secondaryInitialUnits",
          SIMULATION_LIMITS.foodUnits,
          issues,
        );
  const secondaryMaximumUnits =
    schemaVersion < 4
      ? DEFAULT_CONFIG.ecology.secondaryMaximumUnits
      : readNumber(
          ecology,
          "secondaryMaximumUnits",
          "$.ecology.secondaryMaximumUnits",
          SIMULATION_LIMITS.foodUnits,
          issues,
        );
  const secondaryRegrowthUnitsPerTick =
    schemaVersion < 4
      ? DEFAULT_CONFIG.ecology.secondaryRegrowthUnitsPerTick
      : readNumber(
          ecology,
          "secondaryRegrowthUnitsPerTick",
          "$.ecology.secondaryRegrowthUnitsPerTick",
          SIMULATION_LIMITS.foodRegrowth,
          issues,
        );
  const secondaryEnergyPerUnit =
    schemaVersion < 4
      ? DEFAULT_CONFIG.ecology.secondaryEnergyPerUnit
      : readNumber(
          ecology,
          "secondaryEnergyPerUnit",
          "$.ecology.secondaryEnergyPerUnit",
          SIMULATION_LIMITS.foodEnergy,
          issues,
        );
  const specialistFoodEfficiency =
    schemaVersion < 5
      ? 1
      : readNumber(
          ecology,
          "specialistFoodEfficiency",
          "$.ecology.specialistFoodEfficiency",
          SIMULATION_LIMITS.foodEfficiency,
          issues,
        );
  const oppositeFoodEfficiency =
    schemaVersion < 5
      ? 1
      : readNumber(
          ecology,
          "oppositeFoodEfficiency",
          "$.ecology.oppositeFoodEfficiency",
          SIMULATION_LIMITS.foodEfficiency,
          issues,
        );
  const predatorThreshold =
    schemaVersion < 6
      ? DEFAULT_CONFIG.ecology.predatorThreshold
      : readNumber(
          ecology,
          "predatorThreshold",
          "$.ecology.predatorThreshold",
          SIMULATION_LIMITS.probability,
          issues,
        );
  const predationEnergyFraction =
    schemaVersion < 6
      ? DEFAULT_CONFIG.ecology.predationEnergyFraction
      : readNumber(
          ecology,
          "predationEnergyFraction",
          "$.ecology.predationEnergyFraction",
          SIMULATION_LIMITS.probability,
          issues,
        );
  const maximumPredationEnergyGain =
    schemaVersion < 6
      ? DEFAULT_CONFIG.ecology.maximumPredationEnergyGain
      : readNumber(
          ecology,
          "maximumPredationEnergyGain",
          "$.ecology.maximumPredationEnergyGain",
          SIMULATION_LIMITS.organismEnergy,
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
  const metabolismFoodEnergyInfluence =
    schemaVersion <= 2
      ? 0
      : readNumber(
          organisms,
          "metabolismFoodEnergyInfluence",
          "$.organisms.metabolismFoodEnergyInfluence",
          SIMULATION_LIMITS.probability,
          issues,
        );
  const maximumAgeTicks = readNumber(
    organisms,
    "maximumAgeTicks",
    "$.organisms.maximumAgeTicks",
    SIMULATION_LIMITS.maximumAgeTicks,
    issues,
  );
  const movementCostPerTick =
    schemaVersion === 1
      ? 0
      : readNumber(
          organisms,
          "movementCostPerTick",
          "$.organisms.movementCostPerTick",
          SIMULATION_LIMITS.traitCost,
          issues,
        );
  const perceptionCostPerTick =
    schemaVersion === 1
      ? 0
      : readNumber(
          organisms,
          "perceptionCostPerTick",
          "$.organisms.perceptionCostPerTick",
          SIMULATION_LIMITS.traitCost,
          issues,
        );
  const predationCostPerTick =
    schemaVersion < 6
      ? 0
      : readNumber(
          organisms,
          "predationCostPerTick",
          "$.organisms.predationCostPerTick",
          SIMULATION_LIMITS.traitCost,
          issues,
        );
  const defenseCostPerTick =
    schemaVersion < 6
      ? 0
      : readNumber(
          organisms,
          "defenseCostPerTick",
          "$.organisms.defenseCostPerTick",
          SIMULATION_LIMITS.traitCost,
          issues,
        );
  const attackCost =
    schemaVersion < 6
      ? 0
      : readNumber(
          organisms,
          "attackCost",
          "$.organisms.attackCost",
          SIMULATION_LIMITS.traitCost,
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
    secondaryInitialUnits > secondaryMaximumUnits,
    "$.ecology.secondaryInitialUnits",
    "must not exceed secondaryMaximumUnits",
    issues,
  );
  addRelationalIssue(
    ecologyEnabled && (groveFraction <= 0 || groveFraction >= 1),
    "$.ecology.groveFraction",
    "must be greater than 0 and less than 1 when ecology is enabled",
    issues,
  );
  addRelationalIssue(
    dietSpecializationEnabled &&
      oppositeFoodEfficiency >= specialistFoodEfficiency,
    "$.ecology.oppositeFoodEfficiency",
    "must be less than specialistFoodEfficiency when diet specialization is enabled",
    issues,
  );
  addRelationalIssue(
    predationEnabled && (predatorThreshold <= 0 || predatorThreshold >= 1),
    "$.ecology.predatorThreshold",
    "must be greater than 0 and less than 1 when predation is enabled",
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
    schemaVersion: CONFIG_SCHEMA_VERSION,
    seed,
    world: { width, height, ticksPerSecond },
    population: { initialCount, maximumCount },
    food: { initialUnits, maximumUnits, regrowthUnitsPerTick, energyPerUnit },
    ecology: {
      enabled: ecologyEnabled,
      dietSpecializationEnabled,
      predationEnabled,
      habitatPatchCount,
      groveFraction,
      secondaryInitialUnits,
      secondaryMaximumUnits,
      secondaryRegrowthUnitsPerTick,
      secondaryEnergyPerUnit,
      specialistFoodEfficiency,
      oppositeFoodEfficiency,
      predatorThreshold,
      predationEnergyFraction,
      maximumPredationEnergyGain,
    },
    organisms: {
      initialEnergy,
      maximumEnergy,
      reproductionThreshold,
      offspringEnergy,
      metabolismPerTick,
      metabolismFoodEnergyInfluence,
      movementCostPerTick,
      perceptionCostPerTick,
      predationCostPerTick,
      defenseCostPerTick,
      attackCost,
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
