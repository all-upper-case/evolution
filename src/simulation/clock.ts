export const CLOCK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export interface ClockSnapshot {
  tick: number;
  elapsedSimulationSeconds: number;
  running: boolean;
  speed: number;
}

/** Converts irregular frame durations into stable discrete simulation ticks. */
export class SimulationClock {
  readonly #ticksPerSecond: number;
  #accumulatedTicks = 0;
  #tick = 0;
  #running = false;
  #speed = 1;

  public constructor(ticksPerSecond: number, initialTick = 0) {
    if (!Number.isSafeInteger(ticksPerSecond) || ticksPerSecond <= 0) {
      throw new RangeError("Ticks per second must be a positive safe integer.");
    }
    if (!Number.isSafeInteger(initialTick) || initialTick < 0) {
      throw new RangeError("Initial tick must be a non-negative safe integer.");
    }
    this.#ticksPerSecond = ticksPerSecond;
    this.#tick = initialTick;
  }

  public get snapshot(): ClockSnapshot {
    return {
      tick: this.#tick,
      elapsedSimulationSeconds: this.#tick / this.#ticksPerSecond,
      running: this.#running,
      speed: this.#speed,
    };
  }

  public play(): void {
    this.#running = true;
  }
  public pause(): void {
    this.#running = false;
  }

  public setSpeed(speed: number): void {
    if (!(CLOCK_SPEEDS as readonly number[]).includes(speed))
      throw new RangeError("Speed must be one of the supported clock speeds.");
    this.#speed = speed;
  }

  public step(): number {
    if (this.#running) return 0;
    this.#tick += 1;
    return 1;
  }

  /** Returns the number of simulation ticks that should be processed. */
  public advance(realSeconds: number): number {
    if (!Number.isFinite(realSeconds) || realSeconds < 0)
      throw new RangeError(
        "Elapsed time must be a finite non-negative number.",
      );
    if (!this.#running) return 0;
    this.#accumulatedTicks += realSeconds * this.#speed * this.#ticksPerSecond;
    const ticks = Math.floor(this.#accumulatedTicks + 1e-9);
    this.#accumulatedTicks -= ticks;
    this.#tick += ticks;
    return ticks;
  }

  public reset(): void {
    this.#accumulatedTicks = 0;
    this.#tick = 0;
    this.#running = false;
    this.#speed = 1;
  }
}
