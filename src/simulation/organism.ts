import type { SimulationConfig } from "./configuration";
import type { SeededRandom } from "./random";

export interface Genome {
  movementSpeed: number;
  perceptionRange: number;
  metabolismScale: number;
  reproductionThresholdScale: number;
  mutationRateScale: number;
}

export interface Organism {
  id: number;
  lineageId: number;
  parentId: number | null;
  x: number;
  y: number;
  ageTicks: number;
  energy: number;
  genome: Genome;
}

interface TraitRange {
  minimum: number;
  maximum: number;
}

const traitRange = (minimum: number, maximum: number): Readonly<TraitRange> =>
  Object.freeze({ minimum, maximum });

/** Explicit numerical bounds for every heritable trait. */
export const GENOME_TRAIT_RANGES = Object.freeze({
  movementSpeed: traitRange(0.5, 2),
  perceptionRange: traitRange(1, 12),
  metabolismScale: traitRange(0.5, 1.5),
  reproductionThresholdScale: traitRange(0.75, 1.25),
  mutationRateScale: traitRange(0.5, 1.5),
});

const sampleTrait = (random: SeededRandom, range: TraitRange): number =>
  range.minimum + random.next() * (range.maximum - range.minimum);

const createFounderGenome = (random: SeededRandom): Genome =>
  Object.freeze({
    movementSpeed: sampleTrait(random, GENOME_TRAIT_RANGES.movementSpeed),
    perceptionRange: sampleTrait(random, GENOME_TRAIT_RANGES.perceptionRange),
    metabolismScale: sampleTrait(random, GENOME_TRAIT_RANGES.metabolismScale),
    reproductionThresholdScale: sampleTrait(
      random,
      GENOME_TRAIT_RANGES.reproductionThresholdScale,
    ),
    mutationRateScale: sampleTrait(
      random,
      GENOME_TRAIT_RANGES.mutationRateScale,
    ),
  });

const clamp = (value: number, range: TraitRange): number =>
  Math.min(range.maximum, Math.max(range.minimum, value));

/** Creates an independently owned descendant genome with bounded mutations. */
export const inheritGenome = (
  parent: Genome,
  config: SimulationConfig,
  random: SeededRandom,
): Genome => {
  const inherited = {} as Genome;

  for (const trait of Object.keys(GENOME_TRAIT_RANGES) as (keyof Genome)[]) {
    const parentValue = parent[trait];
    const probability = Math.min(
      1,
      config.evolution.mutationProbability * parent.mutationRateScale,
    );
    const mutation = random.chance(probability)
      ? 1 + (random.next() * 2 - 1) * config.evolution.mutationMagnitude
      : 1;
    inherited[trait] = clamp(
      parentValue * mutation,
      GENOME_TRAIT_RANGES[trait],
    );
  }

  return Object.freeze(inherited);
};

/**
 * Creates the deterministic founder population in stable ascending identity
 * order. Founders begin separate lineages; descendants will retain lineageId.
 */
export const createFounderPopulation = (
  config: SimulationConfig,
  random: SeededRandom,
): readonly Organism[] => {
  const organisms: Organism[] = [];

  for (let index = 0; index < config.population.initialCount; index += 1) {
    const id = index + 1;
    organisms.push(
      Object.freeze({
        id,
        lineageId: id,
        parentId: null,
        x: random.integer(0, config.world.width),
        y: random.integer(0, config.world.height),
        ageTicks: 0,
        energy: config.organisms.initialEnergy,
        genome: createFounderGenome(random),
      }),
    );
  }

  return Object.freeze(organisms);
};

export const cloneOrganism = (organism: Organism): Organism =>
  Object.freeze({
    ...organism,
    genome: Object.freeze({ ...organism.genome }),
  });
