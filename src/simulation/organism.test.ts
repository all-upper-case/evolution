import { describe, expect, it } from "vitest";

import { createDefaultSimulationConfig } from "./configuration";
import {
  createFounderPopulation,
  GENOME_TRAIT_RANGES,
  type Genome,
} from "./organism";
import { SeededRandom } from "./random";

describe("founder organisms", () => {
  it("creates the configured population in stable identity order", () => {
    const config = createDefaultSimulationConfig();
    config.population.initialCount = 3;
    const founders = createFounderPopulation(config, new SeededRandom(42));

    expect(founders).toHaveLength(3);
    expect(founders.map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(founders).toEqual(
      founders.map((organism) => ({
        ...organism,
        lineageId: organism.id,
        parentId: null,
        ageTicks: 0,
        energy: config.organisms.initialEnergy,
      })),
    );
  });

  it("is reproducible for a seed and changes with a different seed", () => {
    const config = createDefaultSimulationConfig();
    config.population.initialCount = 4;
    const first = createFounderPopulation(config, new SeededRandom(8675309));
    const repeated = createFounderPopulation(config, new SeededRandom(8675309));
    const different = createFounderPopulation(config, new SeededRandom(7));

    expect(first).toEqual(repeated);
    expect(first).not.toEqual(different);
  });

  it("keeps positions and every genome trait within explicit bounds", () => {
    const config = createDefaultSimulationConfig();
    config.world.width = 16;
    config.world.height = 20;
    config.population.initialCount = 100;
    const founders = createFounderPopulation(config, new SeededRandom(123));

    for (const organism of founders) {
      expect(organism.x).toBeGreaterThanOrEqual(0);
      expect(organism.x).toBeLessThan(config.world.width);
      expect(organism.y).toBeGreaterThanOrEqual(0);
      expect(organism.y).toBeLessThan(config.world.height);

      for (const trait of Object.keys(
        GENOME_TRAIT_RANGES,
      ) as (keyof Genome)[]) {
        const range = GENOME_TRAIT_RANGES[trait];
        expect(organism.genome[trait]).toBeGreaterThanOrEqual(range.minimum);
        expect(organism.genome[trait]).toBeLessThan(range.maximum);
      }
    }
  });

  it("returns immutable population, organism, and genome records", () => {
    const config = createDefaultSimulationConfig();
    config.population.initialCount = 1;
    const founders = createFounderPopulation(config, new SeededRandom(42));
    const founder = founders[0];

    expect(Object.isFrozen(founders)).toBe(true);
    expect(Object.isFrozen(founder)).toBe(true);
    expect(Object.isFrozen(founder?.genome)).toBe(true);
  });
});
