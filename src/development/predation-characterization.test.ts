import { describe, expect, it } from "vitest";

import { runPredationCharacterization } from "./predation-characterization";

describe("predator/prey characterization", () => {
  it("retains both roles with successful attacks across the fixed seed matrix", () => {
    const outcomes = runPredationCharacterization();
    expect(outcomes).toHaveLength(3);
    for (const outcome of outcomes) {
      expect(outcome.initialPredators).toBeGreaterThan(0);
      expect(outcome.finalPredators).toBeGreaterThan(0);
      expect(outcome.finalPrey).toBeGreaterThan(0);
      expect(outcome.predationDeaths).toBeGreaterThan(0);
      expect(outcome.finalPopulation).toBeLessThanOrEqual(300);
    }
  });
});
