const UINT32_RANGE = 0x1_0000_0000;

/**
 * A small deterministic pseudorandom-number generator based on Mulberry32.
 *
 * This class is the only approved source of randomness for simulation code.
 * It is reproducible across JavaScript runtimes because every operation is
 * explicitly reduced to 32 bits.
 */
export class SeededRandom {
  readonly #initialSeed: number;
  #state: number;

  public constructor(seed: number) {
    if (!Number.isSafeInteger(seed)) {
      throw new TypeError("Seed must be a safe integer.");
    }

    this.#initialSeed = seed >>> 0;
    this.#state = this.#initialSeed;
  }

  public get initialSeed(): number {
    return this.#initialSeed;
  }

  public get state(): number {
    return this.#state;
  }

  /** Returns a floating-point value in the half-open interval [0, 1). */
  public next(): number {
    this.#state = (this.#state + 0x6d2b_79f5) >>> 0;
    let value = this.#state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  }

  /** Returns an integer in the half-open interval [minimum, maximum). */
  public integer(minimum: number, maximum: number): number {
    if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum)) {
      throw new TypeError("Integer bounds must be safe integers.");
    }
    if (maximum <= minimum) {
      throw new RangeError("Maximum must be greater than minimum.");
    }

    return minimum + Math.floor(this.next() * (maximum - minimum));
  }

  /** Returns true with the supplied probability. */
  public chance(probability: number): boolean {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new RangeError("Probability must be between 0 and 1 inclusive.");
    }

    return this.next() < probability;
  }

  /** Restores the generator to its initial state. */
  public reset(): void {
    this.#state = this.#initialSeed;
  }

  /** Restores a previously captured unsigned 32-bit generator state. */
  public restore(state: number): void {
    if (!Number.isSafeInteger(state) || state < 0 || state >= UINT32_RANGE) {
      throw new RangeError("Random state must be an unsigned 32-bit integer.");
    }
    this.#state = state;
  }
}
