import type { Genome } from "../simulation/organism";
import type { WorldSnapshot, WorldTickEvents } from "../simulation/world";

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
  #lastObservedTick: number | null = null;
  #lastSampleTick: number | null = null;
  #pendingBirths = 0;
  #pendingDeaths = 0;

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

  public observe(snapshot: WorldSnapshot, events?: WorldTickEvents): boolean {
    if (this.#lastObservedTick === null) {
      this.#lastObservedTick = snapshot.tick;
      this.#lastSampleTick = snapshot.tick;
      this.#record(snapshot, 0, 0);
      return true;
    }
    if (snapshot.tick === this.#lastObservedTick) return false;
    if (events === undefined)
      throw new Error(
        "Lifecycle events are required after the first observation.",
      );
    if (
      events.tick !== snapshot.tick ||
      snapshot.tick !== this.#lastObservedTick + 1
    )
      throw new Error("History observations must be consecutive and aligned.");
    if (
      !Number.isSafeInteger(events.births) ||
      events.births < 0 ||
      !Number.isSafeInteger(events.deaths) ||
      events.deaths < 0
    )
      throw new Error("Lifecycle event counts must be non-negative integers.");

    this.#lastObservedTick = snapshot.tick;
    this.#pendingBirths += events.births;
    this.#pendingDeaths += events.deaths;
    if (
      this.#lastSampleTick !== null &&
      snapshot.tick - this.#lastSampleTick < this.#sampleEveryTicks
    )
      return false;

    this.#record(snapshot, this.#pendingBirths, this.#pendingDeaths);
    this.#lastSampleTick = snapshot.tick;
    this.#pendingBirths = 0;
    this.#pendingDeaths = 0;
    return true;
  }

  #record(snapshot: WorldSnapshot, births: number, deaths: number): void {
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
