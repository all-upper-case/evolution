import { describe, expect, it } from "vitest";

import { createDefaultSimulationConfig } from "./configuration";
import { GENOME_TRAIT_RANGES, inheritGenome } from "./organism";
import { SeededRandom } from "./random";
import { dietEfficiency } from "./world";

describe("inherited diet specialization", () => {
  it("gives specialists a preferred-food advantage and an opposite-food cost", () => {
    expect(dietEfficiency(0, 0, 1.25, 0.25)).toBe(1.25);
    expect(dietEfficiency(0, 1, 1.25, 0.25)).toBe(0.25);
    expect(dietEfficiency(0.5, 0, 1.25, 0.25)).toBe(0.75);
    expect(dietEfficiency(0.5, 1, 1.25, 0.25)).toBe(0.75);
    expect(dietEfficiency(1, 0, 1.25, 0.25)).toBe(0.25);
    expect(dietEfficiency(1, 1, 1.25, 0.25)).toBe(1.25);
  });

  it("inherits and mutates diet preference within explicit bounds", () => {
    const config = createDefaultSimulationConfig();
    config.evolution.mutationProbability = 1;
    config.evolution.mutationMagnitude = 1;
    const random = new SeededRandom(17);
    const parent = {
      movementSpeed: 1,
      perceptionRange: 5,
      metabolismScale: 1,
      reproductionThresholdScale: 1,
      mutationRateScale: 1,
      dietPreference: 0.5,
    };

    for (let index = 0; index < 100; index += 1) {
      const inherited = inheritGenome(parent, config, random);
      expect(inherited.dietPreference).toBeGreaterThanOrEqual(
        GENOME_TRAIT_RANGES.dietPreference.minimum,
      );
      expect(inherited.dietPreference).toBeLessThanOrEqual(
        GENOME_TRAIT_RANGES.dietPreference.maximum,
      );
    }
  });

  it("keeps the legacy neutral diet without consuming random draws", () => {
    const config = createDefaultSimulationConfig();
    config.ecology.dietSpecializationEnabled = false;
    const random = new SeededRandom(17);
    const before = random.state;
    const inherited = inheritGenome(
      {
        movementSpeed: 1,
        perceptionRange: 5,
        metabolismScale: 1,
        reproductionThresholdScale: 1,
        mutationRateScale: 1,
        dietPreference: 0.5,
      },
      { ...config, evolution: { ...config.evolution, mutationProbability: 0 } },
      random,
    );

    // Five established traits still make chance draws; the disabled diet does not.
    const expected = new SeededRandom(17);
    for (let index = 0; index < 5; index += 1) expected.chance(0);
    expect(before).not.toBe(random.state);
    expect(random.state).toBe(expected.state);
    expect(inherited.dietPreference).toBe(0.5);
  });
});
