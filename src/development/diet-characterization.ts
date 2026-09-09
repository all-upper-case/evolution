import {
  createDefaultSimulationConfig,
  parseSimulationConfig,
  type SimulationConfig,
} from "../simulation/configuration";
import { runLabExperiment, type LabRequest } from "./experiment-lab";

export const DIET_CHARACTERIZATION_SEEDS = Object.freeze([11, 47, 101]);
export const DIET_CHARACTERIZATION_TICKS = 2_000;

export interface DietCharacterizationOutcome {
  regime: "meadow-rich" | "grove-rich";
  seed: number;
  initialMeanPreference: number;
  finalMeanPreference: number;
  preferenceShift: number;
  finalPopulation: number;
}

const configureBase = (config: SimulationConfig): void => {
  config.ecology.predationEnabled = false;
  config.world.width = 32;
  config.world.height = 32;
  config.population.initialCount = 100;
  config.population.maximumCount = 300;
  config.food.energyPerUnit = 5;
  config.ecology.secondaryEnergyPerUnit = 5;
  config.ecology.groveFraction = 0.5;
  config.organisms.maximumAgeTicks = 1_500;
};

const requestFor = (
  regime: DietCharacterizationOutcome["regime"],
  seed: number,
): LabRequest => {
  const config = createDefaultSimulationConfig();
  configureBase(config);
  config.seed = seed;
  if (regime === "meadow-rich") {
    config.food.initialUnits = 2_400;
    config.food.maximumUnits = 5_000;
    config.food.regrowthUnitsPerTick = 12;
    config.ecology.secondaryInitialUnits = 300;
    config.ecology.secondaryMaximumUnits = 900;
    config.ecology.secondaryRegrowthUnitsPerTick = 1.5;
  } else {
    config.food.initialUnits = 300;
    config.food.maximumUnits = 900;
    config.food.regrowthUnitsPerTick = 1.5;
    config.ecology.secondaryInitialUnits = 2_400;
    config.ecology.secondaryMaximumUnits = 5_000;
    config.ecology.secondaryRegrowthUnitsPerTick = 12;
  }
  return {
    config: parseSimulationConfig(config),
    ticks: DIET_CHARACTERIZATION_TICKS,
    checkpoints: Object.freeze([0, DIET_CHARACTERIZATION_TICKS]),
  };
};

export const runDietCharacterization =
  (): readonly DietCharacterizationOutcome[] =>
    Object.freeze(
      (["meadow-rich", "grove-rich"] as const).flatMap((regime) =>
        DIET_CHARACTERIZATION_SEEDS.map((seed) => {
          const report = runLabExperiment(requestFor(regime, seed));
          const initial = report.checkpoints[0];
          const final = report.checkpoints.at(-1);
          const initialMeanPreference = initial?.traits.dietPreference.mean;
          const finalMeanPreference = final?.traits.dietPreference.mean;
          if (
            initialMeanPreference === null ||
            initialMeanPreference === undefined ||
            finalMeanPreference === null ||
            finalMeanPreference === undefined ||
            final === undefined
          )
            throw new Error(
              "Diet characterization requires living populations.",
            );
          return Object.freeze({
            regime,
            seed,
            initialMeanPreference,
            finalMeanPreference,
            preferenceShift: Number(
              (finalMeanPreference - initialMeanPreference).toFixed(6),
            ),
            finalPopulation: final.population,
          });
        }),
      ),
    );
