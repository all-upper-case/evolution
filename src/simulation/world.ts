import { parseSimulationConfig, type SimulationConfig } from "./configuration";
import { SeededRandom } from "./random";

export interface WorldSummary {
  tick: number;
  width: number;
  height: number;
  totalFood: number;
  occupiedFoodCells: number;
}

export interface WorldSnapshot extends WorldSummary {
  foodByCell: readonly number[];
  randomState: number;
}

/** A deterministic bounded environment, independent of UI and wall time. */
export class SimulationWorld {
  readonly #config: SimulationConfig;
  readonly #random: SeededRandom;
  readonly #foodByCell: Float64Array;
  #tick = 0;
  #totalFood = 0;
  #occupiedFoodCells = 0;

  public constructor(config: unknown) {
    this.#config = parseSimulationConfig(config);
    this.#random = new SeededRandom(this.#config.seed);
    this.#foodByCell = new Float64Array(
      this.#config.world.width * this.#config.world.height,
    );
    this.#depositFood(this.#config.food.initialUnits);
  }

  public get summary(): WorldSummary {
    return {
      tick: this.#tick,
      width: this.#config.world.width,
      height: this.#config.world.height,
      totalFood: this.#totalFood,
      occupiedFoodCells: this.#occupiedFoodCells,
    };
  }

  public get snapshot(): WorldSnapshot {
    return {
      ...this.summary,
      foodByCell: Object.freeze(Array.from(this.#foodByCell)),
      randomState: this.#random.state,
    };
  }

  public foodAt(x: number, y: number): number {
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
      throw new TypeError("World coordinates must be safe integers.");
    }
    if (
      x < 0 ||
      x >= this.#config.world.width ||
      y < 0 ||
      y >= this.#config.world.height
    ) {
      throw new RangeError("World coordinates are outside the bounded world.");
    }
    return this.#foodByCell[y * this.#config.world.width + x] ?? 0;
  }

  public step(): void {
    this.#depositFood(this.#config.food.regrowthUnitsPerTick);
    this.#tick += 1;
  }

  public advanceTicks(count: number): void {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError("Tick count must be a non-negative safe integer.");
    }
    for (let index = 0; index < count; index += 1) this.step();
  }

  #depositFood(requestedUnits: number): void {
    let remaining = Math.min(
      requestedUnits,
      this.#config.food.maximumUnits - this.#totalFood,
    );

    while (remaining > 0) {
      const amount = Math.min(1, remaining);
      const cell = this.#random.integer(0, this.#foodByCell.length);
      if (this.#foodByCell[cell] === 0) this.#occupiedFoodCells += 1;
      this.#foodByCell[cell] = (this.#foodByCell[cell] ?? 0) + amount;
      this.#totalFood += amount;
      remaining -= amount;
    }
  }
}
