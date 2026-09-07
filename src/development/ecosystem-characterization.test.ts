import { describe, expect, it } from "vitest";
import {
  CHARACTERIZATION_REGIMES,
  CHARACTERIZATION_SEEDS,
  CHARACTERIZATION_TICKS,
  runEcosystemCharacterization,
} from "./ecosystem-characterization";

describe("ecosystem characterization", () => {
  it("runs a deterministic bounded matrix with internally consistent outcomes", () => {
    const report = runEcosystemCharacterization();
    expect(report.runs).toHaveLength(
      CHARACTERIZATION_REGIMES.length * CHARACTERIZATION_SEEDS.length,
    );
    expect(report.ticks).toBe(CHARACTERIZATION_TICKS);
    expect(report.summaries.map((summary) => summary.regime)).toEqual([
      "resource-poor",
      "default",
      "resource-rich",
    ]);
    expect(report.assessment).toEqual({
      persistence: true,
      headroom: true,
      turnover: true,
      diversity: true,
      balancedSelection: true,
      environmentalSensitivity: true,
      allPassed: true,
    });
    for (const run of report.runs) {
      expect(
        run.initialPopulation + run.cumulativeBirths - run.cumulativeDeaths,
      ).toBe(run.finalPopulation);
      expect(run.sampledCapFraction).toBeGreaterThanOrEqual(0);
      expect(run.sampledCapFraction).toBeLessThanOrEqual(1);
      expect(run.lineageRetentionFraction).toBeGreaterThanOrEqual(0);
      expect(run.lineageRetentionFraction).toBeLessThanOrEqual(1);
    }
  }, 30_000);
});
