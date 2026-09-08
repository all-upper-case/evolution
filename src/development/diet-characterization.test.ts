import { describe, expect, it } from "vitest";
import {
  DIET_CHARACTERIZATION_SEEDS,
  runDietCharacterization,
} from "./diet-characterization";

describe("diet specialization characterization", () => {
  it("selects meadow and grove preferences in opposing resource environments", () => {
    const outcomes = runDietCharacterization();
    const meadow = outcomes.filter(({ regime }) => regime === "meadow-rich");
    const grove = outcomes.filter(({ regime }) => regime === "grove-rich");

    expect(outcomes).toHaveLength(DIET_CHARACTERIZATION_SEEDS.length * 2);
    expect(meadow.every(({ preferenceShift }) => preferenceShift < 0)).toBe(
      true,
    );
    expect(grove.every(({ preferenceShift }) => preferenceShift > 0)).toBe(
      true,
    );
    expect(outcomes.every(({ finalPopulation }) => finalPopulation > 0)).toBe(
      true,
    );
  }, 30_000);
});
