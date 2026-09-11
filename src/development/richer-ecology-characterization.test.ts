import { describe, expect, it } from "vitest";
import {
  RICHER_ECOLOGY_REGIMES,
  RICHER_ECOLOGY_SEEDS,
  runRicherEcologyCharacterization,
} from "./richer-ecology-characterization";

describe("combined richer-ecology characterization", () => {
  it("runs the bounded refuge counterfactual with consistent accounting", () => {
    const report = runRicherEcologyCharacterization();
    expect(report.outcomes).toHaveLength(
      RICHER_ECOLOGY_REGIMES.length * RICHER_ECOLOGY_SEEDS.length,
    );
    expect(report.summaries.map(({ regime }) => regime)).toEqual([
      "refuge-free",
      "default",
      "refuge-rich",
    ]);
    expect(report.assessment).toEqual({
      populationPersistence: true,
      predationObserved: true,
      predatorPersistence: false,
      refugeProtection: true,
      populationHeadroom: true,
    });
    expect(report.recommendedNextGene.gene).toBe("huntingDrive");
    for (const outcome of report.outcomes) {
      expect(
        outcome.initialPopulation +
          outcome.cumulativeBirths -
          outcome.cumulativeDeaths,
      ).toBe(outcome.finalPopulation);
      expect(
        outcome.starvationDeaths + outcome.ageDeaths + outcome.predationDeaths,
      ).toBe(outcome.cumulativeDeaths);
      expect(outcome.finalPredators + outcome.finalPrey).toBe(
        outcome.finalPopulation,
      );
      expect(outcome.sampledPopulationCapFraction).toBeGreaterThanOrEqual(0);
      expect(outcome.sampledPopulationCapFraction).toBeLessThanOrEqual(1);
      expect(outcome.sampledRefugeOccupancyFraction).toBeGreaterThanOrEqual(0);
      expect(outcome.sampledRefugeOccupancyFraction).toBeLessThanOrEqual(1);
    }
    expect(
      report.outcomes
        .filter(({ regime }) => regime === "default")
        .every(({ predatorAbsentAtOrBeforeTick }) =>
          predatorAbsentAtOrBeforeTick === null
            ? false
            : predatorAbsentAtOrBeforeTick <= 1_000,
        ),
    ).toBe(true);
  }, 90_000);
});
