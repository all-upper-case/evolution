import {
  createDefaultSimulationConfig,
  parseSimulationConfig,
  type SimulationConfig,
} from "../simulation/configuration";
import { GENOME_TRAIT_RANGES, type Genome } from "../simulation/organism";
import { SimulationWorld, type WorldSnapshot } from "../simulation/world";

export const MAX_LAB_TICKS = 50_000;

type ConfigNumberPath =
  | "seed"
  | "world.width"
  | "world.height"
  | "world.ticksPerSecond"
  | "population.initialCount"
  | "population.maximumCount"
  | "food.initialUnits"
  | "food.maximumUnits"
  | "food.regrowthUnitsPerTick"
  | "food.energyPerUnit"
  | "organisms.initialEnergy"
  | "organisms.maximumEnergy"
  | "organisms.reproductionThreshold"
  | "organisms.offspringEnergy"
  | "organisms.metabolismPerTick"
  | "organisms.maximumAgeTicks"
  | "evolution.mutationProbability"
  | "evolution.mutationMagnitude"
  | "history.sampleEveryTicks"
  | "history.maximumSamples";

export const LAB_CONFIG_PATHS: readonly ConfigNumberPath[] = Object.freeze([
  "seed",
  "world.width",
  "world.height",
  "world.ticksPerSecond",
  "population.initialCount",
  "population.maximumCount",
  "food.initialUnits",
  "food.maximumUnits",
  "food.regrowthUnitsPerTick",
  "food.energyPerUnit",
  "organisms.initialEnergy",
  "organisms.maximumEnergy",
  "organisms.reproductionThreshold",
  "organisms.offspringEnergy",
  "organisms.metabolismPerTick",
  "organisms.maximumAgeTicks",
  "evolution.mutationProbability",
  "evolution.mutationMagnitude",
  "history.sampleEveryTicks",
  "history.maximumSamples",
]);

export interface LabRequest {
  config: SimulationConfig;
  ticks: number;
  checkpoints: readonly number[];
}

const readInteger = (
  value: string,
  name: string,
  minimum: number,
  maximum: number,
): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum)
    throw new RangeError(
      `${name} must be a whole number from ${String(minimum)} to ${String(maximum)}.`,
    );
  return number;
};

const assignPath = (
  config: SimulationConfig,
  path: ConfigNumberPath,
  value: number,
): void => {
  const parts = path.split(".");
  if (parts.length === 1) {
    config.seed = value;
    return;
  }
  const [section, key] = parts;
  const record = config[
    section as Exclude<keyof SimulationConfig, "schemaVersion" | "seed">
  ] as unknown as Record<string, number>;
  record[key ?? ""] = value;
};

export const parseLabRequest = (search: string): LabRequest => {
  const parameters = new URLSearchParams(search);
  const allowed = new Set<string>([
    "ticks",
    "checkpoints",
    ...LAB_CONFIG_PATHS,
  ]);
  const seen = new Set<string>();
  for (const key of parameters.keys()) {
    if (!allowed.has(key)) throw new Error(`Unknown lab parameter: ${key}`);
    if (seen.has(key)) throw new Error(`Duplicate lab parameter: ${key}`);
    seen.add(key);
  }
  const config = createDefaultSimulationConfig();
  for (const path of LAB_CONFIG_PATHS) {
    const raw = parameters.get(path);
    if (raw !== null) assignPath(config, path, Number(raw));
  }
  const ticks = readInteger(
    parameters.get("ticks") ?? "1000",
    "ticks",
    0,
    MAX_LAB_TICKS,
  );
  const checkpointText =
    parameters.get("checkpoints") ?? (ticks === 0 ? "0" : `0,${String(ticks)}`);
  const checkpoints = [
    ...new Set(
      checkpointText
        .split(",")
        .map((value) => readInteger(value.trim(), "checkpoint", 0, ticks)),
    ),
  ].sort((a, b) => a - b);
  if (checkpoints.length === 0)
    throw new Error("At least one checkpoint is required.");
  const parsedConfig = parseSimulationConfig(config);
  if (
    parsedConfig.world.width > 256 ||
    parsedConfig.world.height > 256 ||
    parsedConfig.population.initialCount > 1_000 ||
    parsedConfig.population.maximumCount > 1_000
  )
    throw new RangeError(
      "Lab runs support at most 256×256 cells and 1,000 organisms.",
    );
  return {
    config: parsedConfig,
    ticks,
    checkpoints: Object.freeze(checkpoints),
  };
};

interface TraitStats {
  minimum: number | null;
  mean: number | null;
  maximum: number | null;
}
export interface LabCheckpoint {
  tick: number;
  population: number;
  totalFood: number;
  occupiedFoodCells: number;
  lineages: number;
  meanAgeTicks: number | null;
  meanEnergy: number | null;
  traits: Readonly<Record<keyof Genome, TraitStats>>;
}

const round = (value: number): number => Number(value.toFixed(6));
const stats = (values: readonly number[]): TraitStats =>
  values.length === 0
    ? { minimum: null, mean: null, maximum: null }
    : {
        minimum: round(Math.min(...values)),
        mean: round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        ),
        maximum: round(Math.max(...values)),
      };

const summarize = (snapshot: WorldSnapshot): LabCheckpoint => {
  const organisms = snapshot.organisms;
  const traits = Object.fromEntries(
    Object.keys(GENOME_TRAIT_RANGES).map((trait) => [
      trait,
      stats(
        organisms.map((organism) => organism.genome[trait as keyof Genome]),
      ),
    ]),
  ) as unknown as Record<keyof Genome, TraitStats>;
  return {
    tick: snapshot.tick,
    population: snapshot.population,
    totalFood: round(snapshot.totalFood),
    occupiedFoodCells: snapshot.occupiedFoodCells,
    lineages: new Set(organisms.map((organism) => organism.lineageId)).size,
    meanAgeTicks:
      organisms.length === 0
        ? null
        : round(
            organisms.reduce((sum, organism) => sum + organism.ageTicks, 0) /
              organisms.length,
          ),
    meanEnergy:
      organisms.length === 0
        ? null
        : round(
            organisms.reduce((sum, organism) => sum + organism.energy, 0) /
              organisms.length,
          ),
    traits,
  };
};

export interface LabReport {
  schemaVersion: 1;
  request: LabRequest;
  checkpoints: readonly LabCheckpoint[];
  finalRandomState: number;
  nextOrganismId: number;
}

export const runLabExperiment = (request: LabRequest): LabReport => {
  const world = new SimulationWorld(request.config);
  const checkpoints: LabCheckpoint[] = [];
  let currentTick = 0;
  for (const checkpoint of request.checkpoints) {
    world.advanceTicks(checkpoint - currentTick);
    checkpoints.push(summarize(world.snapshot));
    currentTick = checkpoint;
  }
  world.advanceTicks(request.ticks - currentTick);
  const final = world.snapshot;
  if (request.checkpoints.at(-1) !== request.ticks)
    checkpoints.push(summarize(final));
  return {
    schemaVersion: 1,
    request,
    checkpoints: Object.freeze(checkpoints),
    finalRandomState: final.randomState,
    nextOrganismId: final.nextOrganismId,
  };
};
