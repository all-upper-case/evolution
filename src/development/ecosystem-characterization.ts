import {
  createDefaultSimulationConfig,
  parseSimulationConfig,
  type SimulationConfig,
} from "../simulation/configuration";
import { GENOME_TRAIT_RANGES, type Genome } from "../simulation/organism";
import {
  runLabExperiment,
  type LabCheckpoint,
  type LabRequest,
} from "./experiment-lab";

export const CHARACTERIZATION_SEEDS = Object.freeze([11, 47, 101]);
export const CHARACTERIZATION_TICKS = 2_000;
export const CHARACTERIZATION_CHECKPOINTS = Object.freeze([
  0, 250, 500, 750, 1_000, 1_250, 1_500, 1_750, 2_000,
]);

export interface CharacterizationRegime {
  id: "resource-poor" | "default" | "resource-rich";
  description: string;
  configure: (config: SimulationConfig) => void;
}

export const CHARACTERIZATION_REGIMES: readonly CharacterizationRegime[] =
  Object.freeze([
    Object.freeze({
      id: "resource-poor" as const,
      description:
        "Half the default starting food, food capacity, and food regrowth.",
      configure: (config: SimulationConfig): void => {
        config.food.initialUnits /= 2;
        config.food.maximumUnits /= 2;
        config.food.regrowthUnitsPerTick /= 2;
      },
    }),
    Object.freeze({
      id: "default" as const,
      description: "The unmodified default configuration.",
      configure: (): void => undefined,
    }),
    Object.freeze({
      id: "resource-rich" as const,
      description:
        "Twice the default starting food, food capacity, and food regrowth.",
      configure: (config: SimulationConfig): void => {
        config.food.initialUnits *= 2;
        config.food.maximumUnits *= 2;
        config.food.regrowthUnitsPerTick *= 2;
      },
    }),
  ]);

type TraitMeans = Readonly<Record<keyof Genome, number | null>>;

export interface CharacterizationRun {
  regime: CharacterizationRegime["id"];
  seed: number;
  initialPopulation: number;
  finalPopulation: number;
  finalPopulationFraction: number;
  finalFood: number;
  cumulativeBirths: number;
  cumulativeDeaths: number;
  finalLineages: number;
  lineageRetentionFraction: number;
  sampledCapFraction: number;
  extinctAtOrBeforeTick: number | null;
  initialTraitMeans: TraitMeans;
  finalTraitMeans: TraitMeans;
  normalizedTraitShifts: TraitMeans;
}

export interface NumberSummary {
  minimum: number;
  median: number;
  maximum: number;
}

export interface CharacterizationRegimeSummary {
  regime: CharacterizationRegime["id"];
  runs: number;
  extinctions: number;
  finalPopulation: NumberSummary;
  finalPopulationFraction: NumberSummary;
  finalFood: NumberSummary;
  cumulativeBirths: NumberSummary;
  cumulativeDeaths: NumberSummary;
  lineageRetentionFraction: NumberSummary;
  sampledCapFraction: NumberSummary;
  medianNormalizedTraitShifts: TraitMeans;
}

export interface CharacterizationReport {
  schemaVersion: 1;
  ticks: number;
  checkpoints: readonly number[];
  seeds: readonly number[];
  regimes: readonly Pick<CharacterizationRegime, "id" | "description">[];
  runs: readonly CharacterizationRun[];
  summaries: readonly CharacterizationRegimeSummary[];
  assessment: CharacterizationAssessment;
}

export interface CharacterizationAssessment {
  persistence: boolean;
  headroom: boolean;
  turnover: boolean;
  diversity: boolean;
  balancedSelection: boolean;
  environmentalSensitivity: boolean;
  allPassed: boolean;
}

const round = (value: number): number => Number(value.toFixed(6));

const median = (values: readonly number[]): number => {
  if (values.length === 0) throw new Error("Cannot summarize no values.");
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle] ?? 0;
  return ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2;
};

const summarizeNumbers = (values: readonly number[]): NumberSummary => ({
  minimum: round(Math.min(...values)),
  median: round(median(values)),
  maximum: round(Math.max(...values)),
});

const traitMeans = (checkpoint: LabCheckpoint): TraitMeans =>
  Object.fromEntries(
    (Object.keys(GENOME_TRAIT_RANGES) as (keyof Genome)[]).map((trait) => [
      trait,
      checkpoint.traits[trait].mean,
    ]),
  ) as unknown as TraitMeans;

const normalizedTraitShifts = (
  initial: TraitMeans,
  final: TraitMeans,
): TraitMeans =>
  Object.fromEntries(
    (Object.keys(GENOME_TRAIT_RANGES) as (keyof Genome)[]).map((trait) => {
      const start = initial[trait];
      const end = final[trait];
      const range = GENOME_TRAIT_RANGES[trait];
      return [
        trait,
        start === null || end === null
          ? null
          : round((end - start) / (range.maximum - range.minimum)),
      ];
    }),
  ) as unknown as TraitMeans;

const createRequest = (
  regime: CharacterizationRegime,
  seed: number,
): LabRequest => {
  const config = createDefaultSimulationConfig();
  config.seed = seed;
  // Preserve the calibrated pre-diet matrix as a compatibility baseline.
  // Richer mechanics receive their own opposing-environment experiments.
  config.ecology.dietSpecializationEnabled = false;
  config.ecology.predationEnabled = false;
  regime.configure(config);
  return {
    config: parseSimulationConfig(config),
    ticks: CHARACTERIZATION_TICKS,
    checkpoints: CHARACTERIZATION_CHECKPOINTS,
  };
};

const runOne = (
  regime: CharacterizationRegime,
  seed: number,
): CharacterizationRun => {
  const report = runLabExperiment(createRequest(regime, seed));
  const initial = report.checkpoints[0];
  const final = report.checkpoints.at(-1);
  if (initial === undefined || final === undefined)
    throw new Error("Characterization requires initial and final checkpoints.");
  const postInitial = report.checkpoints.slice(1);
  const maximumPopulation = report.request.config.population.maximumCount;
  const initialLineages = initial.lineages;
  const initialMeans = traitMeans(initial);
  const finalMeans = traitMeans(final);
  return Object.freeze({
    regime: regime.id,
    seed,
    initialPopulation: initial.population,
    finalPopulation: final.population,
    finalPopulationFraction: round(final.population / maximumPopulation),
    finalFood: final.totalFood,
    cumulativeBirths: final.cumulativeBirths,
    cumulativeDeaths: final.cumulativeDeaths,
    finalLineages: final.lineages,
    lineageRetentionFraction: round(
      initialLineages === 0 ? 0 : final.lineages / initialLineages,
    ),
    sampledCapFraction: round(
      postInitial.filter(
        (checkpoint) => checkpoint.population === maximumPopulation,
      ).length / postInitial.length,
    ),
    extinctAtOrBeforeTick:
      report.checkpoints.find((checkpoint) => checkpoint.population === 0)
        ?.tick ?? null,
    initialTraitMeans: initialMeans,
    finalTraitMeans: finalMeans,
    normalizedTraitShifts: normalizedTraitShifts(initialMeans, finalMeans),
  });
};

const summarizeRegime = (
  regime: CharacterizationRegime["id"],
  runs: readonly CharacterizationRun[],
): CharacterizationRegimeSummary => {
  const matching = runs.filter((run) => run.regime === regime);
  const medianShifts = Object.fromEntries(
    (Object.keys(GENOME_TRAIT_RANGES) as (keyof Genome)[]).map((trait) => {
      const values = matching
        .map((run) => run.normalizedTraitShifts[trait])
        .filter((value): value is number => value !== null);
      return [trait, values.length === 0 ? null : round(median(values))];
    }),
  ) as unknown as TraitMeans;
  return Object.freeze({
    regime,
    runs: matching.length,
    extinctions: matching.filter((run) => run.extinctAtOrBeforeTick !== null)
      .length,
    finalPopulation: summarizeNumbers(
      matching.map((run) => run.finalPopulation),
    ),
    finalPopulationFraction: summarizeNumbers(
      matching.map((run) => run.finalPopulationFraction),
    ),
    finalFood: summarizeNumbers(matching.map((run) => run.finalFood)),
    cumulativeBirths: summarizeNumbers(
      matching.map((run) => run.cumulativeBirths),
    ),
    cumulativeDeaths: summarizeNumbers(
      matching.map((run) => run.cumulativeDeaths),
    ),
    lineageRetentionFraction: summarizeNumbers(
      matching.map((run) => run.lineageRetentionFraction),
    ),
    sampledCapFraction: summarizeNumbers(
      matching.map((run) => run.sampledCapFraction),
    ),
    medianNormalizedTraitShifts: medianShifts,
  });
};

const assess = (
  runs: readonly CharacterizationRun[],
  summaries: readonly CharacterizationRegimeSummary[],
): CharacterizationAssessment => {
  const summary = (regime: CharacterizationRegime["id"]) => {
    const found = summaries.find((candidate) => candidate.regime === regime);
    if (found === undefined)
      throw new Error(`Missing characterization summary: ${regime}`);
    return found;
  };
  const defaultRuns = runs.filter((run) => run.regime === "default");
  const richRuns = runs.filter((run) => run.regime === "resource-rich");
  const defaultSummary = summary("default");
  const initialPopulation = defaultRuns[0]?.initialPopulation;
  if (initialPopulation === undefined)
    throw new Error("Characterization requires default runs.");
  const traitShifts = Object.values(
    defaultSummary.medianNormalizedTraitShifts,
  ).filter((value): value is number => value !== null);
  const results = {
    persistence: defaultRuns.every(
      (run) => run.extinctAtOrBeforeTick === null && run.finalPopulation > 0,
    ),
    headroom:
      defaultSummary.sampledCapFraction.median <= 0.25 &&
      richRuns.every((run) => run.sampledCapFraction < 1),
    turnover:
      defaultSummary.cumulativeBirths.median > initialPopulation &&
      defaultSummary.cumulativeDeaths.median > initialPopulation,
    diversity: defaultSummary.lineageRetentionFraction.median >= 0.2,
    balancedSelection: traitShifts.every((shift) => Math.abs(shift) <= 0.2),
    environmentalSensitivity:
      summary("resource-poor").finalPopulation.median <
        defaultSummary.finalPopulation.median &&
      defaultSummary.finalPopulation.median <
        summary("resource-rich").finalPopulation.median,
  };
  return Object.freeze({
    ...results,
    allPassed: Object.values(results).every(Boolean),
  });
};

export const runEcosystemCharacterization = (): CharacterizationReport => {
  const runs = CHARACTERIZATION_REGIMES.flatMap((regime) =>
    CHARACTERIZATION_SEEDS.map((seed) => runOne(regime, seed)),
  );
  const summaries = CHARACTERIZATION_REGIMES.map((regime) =>
    summarizeRegime(regime.id, runs),
  );
  return Object.freeze({
    schemaVersion: 1,
    ticks: CHARACTERIZATION_TICKS,
    checkpoints: CHARACTERIZATION_CHECKPOINTS,
    seeds: CHARACTERIZATION_SEEDS,
    regimes: Object.freeze(
      CHARACTERIZATION_REGIMES.map(({ id, description }) =>
        Object.freeze({ id, description }),
      ),
    ),
    runs: Object.freeze(runs),
    summaries: Object.freeze(summaries),
    assessment: assess(runs, summaries),
  });
};
