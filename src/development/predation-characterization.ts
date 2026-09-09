import {
  createDefaultSimulationConfig,
  parseSimulationConfig,
} from "../simulation/configuration";
import { runLabExperiment } from "./experiment-lab";

export const PREDATION_CHARACTERIZATION_SEEDS = Object.freeze([13, 59, 103]);
export const PREDATION_CHARACTERIZATION_TICKS = 300;

export interface PredationCharacterizationOutcome {
  seed: number;
  initialPredators: number;
  finalPredators: number;
  finalPrey: number;
  predationDeaths: number;
  finalPopulation: number;
}

export const runPredationCharacterization =
  (): readonly PredationCharacterizationOutcome[] =>
    Object.freeze(
      PREDATION_CHARACTERIZATION_SEEDS.map((seed) => {
        const config = createDefaultSimulationConfig();
        config.seed = seed;
        config.world.width = 32;
        config.world.height = 32;
        config.population.initialCount = 120;
        config.population.maximumCount = 300;
        config.food.initialUnits = 2_000;
        config.food.maximumUnits = 5_000;
        config.food.regrowthUnitsPerTick = 10;
        config.ecology.secondaryInitialUnits = 1_000;
        config.ecology.secondaryMaximumUnits = 3_000;
        config.ecology.secondaryRegrowthUnitsPerTick = 5;
        const report = runLabExperiment({
          config: parseSimulationConfig(config),
          ticks: PREDATION_CHARACTERIZATION_TICKS,
          checkpoints: Object.freeze([0, PREDATION_CHARACTERIZATION_TICKS]),
        });
        const initial = report.checkpoints[0];
        const final = report.checkpoints.at(-1);
        if (initial === undefined || final === undefined)
          throw new Error("Predation characterization requires checkpoints.");
        return Object.freeze({
          seed,
          initialPredators: initial.ecologicalRoles.predators,
          finalPredators: final.ecologicalRoles.predators,
          finalPrey: final.ecologicalRoles.prey,
          predationDeaths: final.cumulativeDeathCauses.predation,
          finalPopulation: final.population,
        });
      }),
    );
