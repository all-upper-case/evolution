import type { Genome } from "../simulation/organism";
import type { WorldSnapshot } from "../simulation/world";

export type GenomeTrait = keyof Genome;

export interface EcosystemSample {
  tick: number;
  population: number;
  births: number;
  deaths: number;
  totalFood: number;
}

/** Bounded, observational history that cannot influence simulation state. */
export class EcosystemHistory {
  readonly #sampleEveryTicks: number;
  readonly #maximumSamples: number;
  readonly #samples: EcosystemSample[] = [];
  #knownOrganismIds = new Set<number>();

  public constructor(sampleEveryTicks: number, maximumSamples: number) {
    if (!Number.isSafeInteger(sampleEveryTicks) || sampleEveryTicks < 1)
      throw new RangeError("History interval must be a positive safe integer.");
    if (!Number.isSafeInteger(maximumSamples) || maximumSamples < 1)
      throw new RangeError("History capacity must be a positive safe integer.");
    this.#sampleEveryTicks = sampleEveryTicks;
    this.#maximumSamples = maximumSamples;
  }

  public get samples(): readonly EcosystemSample[] {
    return this.#samples;
  }

  public observe(snapshot: WorldSnapshot): boolean {
    if (snapshot.tick !== 0 && snapshot.tick % this.#sampleEveryTicks !== 0)
      return false;
    if (this.#samples.at(-1)?.tick === snapshot.tick) return false;

    const currentIds = new Set(
      snapshot.organisms.map((organism) => organism.id),
    );
    let births = 0;
    let deaths = 0;
    if (this.#samples.length > 0) {
      for (const id of currentIds)
        if (!this.#knownOrganismIds.has(id)) births += 1;
      for (const id of this.#knownOrganismIds)
        if (!currentIds.has(id)) deaths += 1;
    }

    this.#samples.push(
      Object.freeze({
        tick: snapshot.tick,
        population: snapshot.population,
        births,
        deaths,
        totalFood: snapshot.totalFood,
      }),
    );
    if (this.#samples.length > this.#maximumSamples) this.#samples.shift();
    this.#knownOrganismIds = currentIds;
    return true;
  }
}

export const traitHistogram = (
  snapshot: WorldSnapshot,
  trait: GenomeTrait,
  minimum: number,
  maximum: number,
  binCount = 10,
): readonly number[] => {
  if (!Number.isSafeInteger(binCount) || binCount < 1)
    throw new RangeError(
      "Histogram bin count must be a positive safe integer.",
    );
  if (
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    maximum <= minimum
  )
    throw new RangeError("Histogram range must have finite increasing bounds.");

  const bins = Array<number>(binCount).fill(0);
  for (const organism of snapshot.organisms) {
    const normalized = (organism.genome[trait] - minimum) / (maximum - minimum);
    const index = Math.min(
      binCount - 1,
      Math.max(0, Math.floor(normalized * binCount)),
    );
    bins[index] = (bins[index] ?? 0) + 1;
  }
  return Object.freeze(bins);
};
