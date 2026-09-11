import {
  createDefaultSimulationConfig,
  parseSimulationConfig,
  type SimulationConfig,
} from "../simulation/configuration";
import type { Genome } from "../simulation/organism";
import { runLabExperiment, type LabCheckpoint } from "./experiment-lab";

export const RICHER_ECOLOGY_SEEDS = Object.freeze([17, 53, 97]);
export const RICHER_ECOLOGY_TICKS = 1_000;
export const RICHER_ECOLOGY_CHECKPOINTS = Object.freeze([
  0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1_000,
]);

export interface RicherEcologyRegime {
  id: "refuge-free" | "default" | "refuge-rich";
  description: string;
  configure: (config: SimulationConfig) => void;
}

export const RICHER_ECOLOGY_REGIMES: readonly RicherEcologyRegime[] =
  Object.freeze([
    Object.freeze({
      id: "refuge-free" as const,
      description:
        "All richer-ecology mechanics except refuges; obstacles remain enabled as a terrain control.",
      configure: (config: SimulationConfig): void => {
        config.ecology.refugeFraction = 0;
      },
    }),
    Object.freeze({
      id: "default" as const,
      description: "The complete unmodified richer-ecology configuration.",
      configure: (): void => undefined,
    }),
    Object.freeze({
      id: "refuge-rich" as const,
      description:
        "The complete richer ecology with refuge coverage increased from 2.5% to 10%.",
      configure: (config: SimulationConfig): void => {
        config.ecology.refugeFraction = 0.1;
      },
    }),
  ]);

export interface RicherEcologyOutcome {
  regime: RicherEcologyRegime["id"];
  seed: number;
  initialPopulation: number;
  finalPopulation: number;
  finalPredators: number;
  finalPrey: number;
  predatorAbsentAtOrBeforeTick: number | null;
  cumulativeBirths: number;
  cumulativeDeaths: number;
  starvationDeaths: number;
  ageDeaths: number;
  predationDeaths: number;
  sampledPopulationCapFraction: number;
  sampledRefugeOccupancyFraction: number;
  initialDietPreference: number;
  finalDietPreference: number;
  initialPredationTendency: number;
  finalPredationTendency: number;
  initialDefense: number;
  finalDefense: number;
}

export interface RicherEcologySummary {
  regime: RicherEcologyRegime["id"];
  finalPopulationMedian: number;
  finalPredatorsMedian: number;
  finalPreyMedian: number;
  predationDeathsMedian: number;
  predationDeathFractionMedian: number;
  sampledPopulationCapFractionMedian: number;
  sampledRefugeOccupancyFractionMedian: number;
}

export interface RicherEcologyReport {
  schemaVersion: 1;
  ticks: number;
  checkpoints: readonly number[];
  seeds: readonly number[];
  regimes: readonly Pick<RicherEcologyRegime, "id" | "description">[];
  outcomes: readonly RicherEcologyOutcome[];
  summaries: readonly RicherEcologySummary[];
  assessment: RicherEcologyAssessment;
  recommendedNextGene: RicherEcologyRecommendation;
}

export interface RicherEcologyAssessment {
  populationPersistence: boolean;
  predationObserved: boolean;
  predatorPersistence: boolean;
  refugeProtection: boolean;
  populationHeadroom: boolean;
}

export interface RicherEcologyRecommendation {
  gene: "huntingDrive";
  behavior: string;
  evidence: string;
  acceptance: readonly string[];
}

const round = (value: number): number => Number(value.toFixed(6));

const median = (values: readonly number[]): number => {
  if (values.length === 0) throw new Error("Cannot summarize no values.");
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? (ordered[middle] ?? 0)
    : ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2;
};

const requiredTraitMean = (
  checkpoint: LabCheckpoint,
  trait: keyof Genome,
): number => {
  const mean = checkpoint.traits[trait].mean;
  if (mean === null)
    throw new Error(`Richer-ecology characterization lost trait ${trait}.`);
  return mean;
};

const runOne = (
  regime: RicherEcologyRegime,
  seed: number,
): RicherEcologyOutcome => {
  const config = createDefaultSimulationConfig();
  config.seed = seed;
  regime.configure(config);
  const report = runLabExperiment({
    config: parseSimulationConfig(config),
    ticks: RICHER_ECOLOGY_TICKS,
    checkpoints: RICHER_ECOLOGY_CHECKPOINTS,
  });
  const initial = report.checkpoints[0];
  const final = report.checkpoints.at(-1);
  if (initial === undefined || final === undefined)
    throw new Error("Richer-ecology characterization requires checkpoints.");
  const sampled = report.checkpoints.slice(1);
  const maximumPopulation = report.request.config.population.maximumCount;
  return Object.freeze({
    regime: regime.id,
    seed,
    initialPopulation: initial.population,
    finalPopulation: final.population,
    finalPredators: final.ecologicalRoles.predators,
    finalPrey: final.ecologicalRoles.prey,
    predatorAbsentAtOrBeforeTick:
      sampled.find(({ ecologicalRoles }) => ecologicalRoles.predators === 0)
        ?.tick ?? null,
    cumulativeBirths: final.cumulativeBirths,
    cumulativeDeaths: final.cumulativeDeaths,
    starvationDeaths: final.cumulativeDeathCauses.starvation,
    ageDeaths: final.cumulativeDeathCauses.age,
    predationDeaths: final.cumulativeDeathCauses.predation,
    sampledPopulationCapFraction: round(
      sampled.filter(({ population }) => population === maximumPopulation)
        .length / sampled.length,
    ),
    sampledRefugeOccupancyFraction: round(
      sampled.reduce(
        (sum, checkpoint) =>
          sum +
          (checkpoint.ecologicalRoles.prey === 0
            ? 0
            : checkpoint.refugeOccupants / checkpoint.ecologicalRoles.prey),
        0,
      ) / sampled.length,
    ),
    initialDietPreference: requiredTraitMean(initial, "dietPreference"),
    finalDietPreference: requiredTraitMean(final, "dietPreference"),
    initialPredationTendency: requiredTraitMean(initial, "predationTendency"),
    finalPredationTendency: requiredTraitMean(final, "predationTendency"),
    initialDefense: requiredTraitMean(initial, "defense"),
    finalDefense: requiredTraitMean(final, "defense"),
  });
};

const summarize = (
  regime: RicherEcologyRegime["id"],
  outcomes: readonly RicherEcologyOutcome[],
): RicherEcologySummary => {
  const matching = outcomes.filter((outcome) => outcome.regime === regime);
  return Object.freeze({
    regime,
    finalPopulationMedian: round(
      median(matching.map(({ finalPopulation }) => finalPopulation)),
    ),
    finalPredatorsMedian: round(
      median(matching.map(({ finalPredators }) => finalPredators)),
    ),
    finalPreyMedian: round(median(matching.map(({ finalPrey }) => finalPrey))),
    predationDeathsMedian: round(
      median(matching.map(({ predationDeaths }) => predationDeaths)),
    ),
    predationDeathFractionMedian: round(
      median(
        matching.map(({ cumulativeDeaths, predationDeaths }) =>
          cumulativeDeaths === 0 ? 0 : predationDeaths / cumulativeDeaths,
        ),
      ),
    ),
    sampledPopulationCapFractionMedian: round(
      median(
        matching.map(
          ({ sampledPopulationCapFraction }) => sampledPopulationCapFraction,
        ),
      ),
    ),
    sampledRefugeOccupancyFractionMedian: round(
      median(
        matching.map(
          ({ sampledRefugeOccupancyFraction }) =>
            sampledRefugeOccupancyFraction,
        ),
      ),
    ),
  });
};

export const runRicherEcologyCharacterization = (): RicherEcologyReport => {
  const outcomes = RICHER_ECOLOGY_REGIMES.flatMap((regime) =>
    RICHER_ECOLOGY_SEEDS.map((seed) => runOne(regime, seed)),
  );
  const summaries = RICHER_ECOLOGY_REGIMES.map(({ id }) =>
    summarize(id, outcomes),
  );
  const summary = (regime: RicherEcologyRegime["id"]): RicherEcologySummary => {
    const found = summaries.find((candidate) => candidate.regime === regime);
    if (found === undefined) throw new Error(`Missing regime ${regime}.`);
    return found;
  };
  const defaultOutcomes = outcomes.filter(({ regime }) => regime === "default");
  const assessment = Object.freeze({
    populationPersistence: outcomes.every(
      ({ finalPopulation }) => finalPopulation > 0,
    ),
    predationObserved: outcomes.every(
      ({ predationDeaths }) => predationDeaths > 0,
    ),
    predatorPersistence: defaultOutcomes.every(
      ({ finalPredators }) => finalPredators > 0,
    ),
    refugeProtection:
      summary("refuge-rich").predationDeathFractionMedian <
      summary("refuge-free").predationDeathFractionMedian,
    populationHeadroom: outcomes.every(
      ({ sampledPopulationCapFraction }) =>
        sampledPopulationCapFraction <= 0.25,
    ),
  });
  return Object.freeze({
    schemaVersion: 1,
    ticks: RICHER_ECOLOGY_TICKS,
    checkpoints: RICHER_ECOLOGY_CHECKPOINTS,
    seeds: RICHER_ECOLOGY_SEEDS,
    regimes: Object.freeze(
      RICHER_ECOLOGY_REGIMES.map(({ id, description }) =>
        Object.freeze({ id, description }),
      ),
    ),
    outcomes: Object.freeze(outcomes),
    summaries: Object.freeze(summaries),
    assessment,
    recommendedNextGene: Object.freeze({
      gene: "huntingDrive" as const,
      behavior:
        "Set the predator's own-energy threshold for pursuing visible prey, allowing costly hunting to compete with fallback plant foraging.",
      evidence:
        "Predation occurred in every run, yet all three default-regime predator populations were gone by tick 1,000 while prey populations persisted; richer refuges further reduced the median share of deaths caused by predation.",
      acceptance: Object.freeze([
        "The bounded inherited gene changes prey-pursuit decisions without changing role classification.",
        "Low and high drive each have an explicit opportunity or energy tradeoff and remain inspectable.",
        "A fixed multi-seed comparison retains both predators and prey through 1,000 ticks more often than the current zero-of-three baseline without population-cap pressure.",
        "Seeded replay, save/load continuation, legacy migration, and bounded target selection remain deterministic.",
      ]),
    }),
  });
};
