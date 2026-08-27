import { parseSimulationConfig, type SimulationConfig } from "./configuration";
import {
  cloneOrganism,
  createFounderPopulation,
  inheritGenome,
  type Organism,
} from "./organism";
import { SeededRandom } from "./random";

export interface WorldSummary {
  tick: number;
  width: number;
  height: number;
  totalFood: number;
  occupiedFoodCells: number;
  population: number;
}

export interface WorldSnapshot extends WorldSummary {
  foodByCell: readonly number[];
  organisms: readonly Organism[];
  randomState: number;
}

/** A deterministic bounded environment, independent of UI and wall time. */
export class SimulationWorld {
  readonly #config: SimulationConfig;
  readonly #random: SeededRandom;
  readonly #foodByCell: Float64Array;
  readonly #organisms: Organism[];
  #tick = 0;
  #totalFood = 0;
  #occupiedFoodCells = 0;
  #nextOrganismId: number;

  public constructor(config: unknown) {
    this.#config = parseSimulationConfig(config);
    this.#random = new SeededRandom(this.#config.seed);
    this.#foodByCell = new Float64Array(
      this.#config.world.width * this.#config.world.height,
    );
    this.#depositFood(this.#config.food.initialUnits);
    this.#organisms = [...createFounderPopulation(this.#config, this.#random)];
    this.#nextOrganismId = this.#organisms.length + 1;
  }

  public get summary(): WorldSummary {
    return {
      tick: this.#tick,
      width: this.#config.world.width,
      height: this.#config.world.height,
      totalFood: this.#totalFood,
      occupiedFoodCells: this.#occupiedFoodCells,
      population: this.#organisms.length,
    };
  }

  public get snapshot(): WorldSnapshot {
    return {
      ...this.summary,
      foodByCell: Object.freeze(Array.from(this.#foodByCell)),
      organisms: Object.freeze(this.#organisms.map(cloneOrganism)),
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
    this.#advanceOrganisms();
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

  #advanceOrganisms(): void {
    const survivors: Organism[] = [];
    const offspring: Organism[] = [];

    // The current array is always in identity order. Newborns are appended only
    // after every organism that existed at tick start has taken its turn.
    for (const organism of this.#organisms) {
      const position = this.#moveTowardFood(organism);
      const eaten = this.#consumeFood(position.x, position.y, 1);
      const energy = Math.min(
        this.#config.organisms.maximumEnergy,
        organism.energy + eaten * this.#config.food.energyPerUnit,
      );
      const afterMetabolism =
        energy -
        this.#config.organisms.metabolismPerTick *
          organism.genome.metabolismScale;
      const ageTicks = organism.ageTicks + 1;

      if (
        afterMetabolism <= 0 ||
        ageTicks >= this.#config.organisms.maximumAgeTicks
      ) {
        continue;
      }

      const reproductionThreshold =
        this.#config.organisms.reproductionThreshold *
        organism.genome.reproductionThresholdScale;
      const hasCapacity =
        this.#organisms.length + offspring.length <
        this.#config.population.maximumCount;
      const reproduces =
        afterMetabolism >= reproductionThreshold && hasCapacity;

      survivors.push(
        Object.freeze({
          ...organism,
          ...position,
          ageTicks,
          energy: reproduces
            ? afterMetabolism - this.#config.organisms.offspringEnergy
            : afterMetabolism,
        }),
      );

      if (reproduces) {
        offspring.push(
          Object.freeze({
            id: this.#nextOrganismId,
            lineageId: organism.lineageId,
            parentId: organism.id,
            ...position,
            ageTicks: 0,
            energy: this.#config.organisms.offspringEnergy,
            genome: inheritGenome(organism.genome, this.#config, this.#random),
          }),
        );
        this.#nextOrganismId += 1;
      }
    }

    this.#organisms.splice(
      0,
      this.#organisms.length,
      ...survivors,
      ...offspring,
    );
  }

  #moveTowardFood(organism: Organism): { x: number; y: number } {
    const steps =
      Math.floor(organism.genome.movementSpeed) +
      (this.#random.chance(organism.genome.movementSpeed % 1) ? 1 : 0);
    let x = organism.x;
    let y = organism.y;

    for (let step = 0; step < steps; step += 1) {
      const target = this.#bestFoodPosition(
        x,
        y,
        Math.floor(organism.genome.perceptionRange),
      );
      if (target.x !== x) x += Math.sign(target.x - x);
      else if (target.y !== y) y += Math.sign(target.y - y);
    }

    return { x, y };
  }

  #bestFoodPosition(
    originX: number,
    originY: number,
    range: number,
  ): { x: number; y: number } {
    let bestX = originX;
    let bestY = originY;
    let bestFood =
      this.#foodByCell[originY * this.#config.world.width + originX] ?? 0;
    let bestDistance = 0;

    const minimumY = Math.max(0, originY - range);
    const maximumY = Math.min(this.#config.world.height - 1, originY + range);
    const minimumX = Math.max(0, originX - range);
    const maximumX = Math.min(this.#config.world.width - 1, originX + range);

    // Row-major scanning is the documented deterministic tie-breaker.
    for (let y = minimumY; y <= maximumY; y += 1) {
      for (let x = minimumX; x <= maximumX; x += 1) {
        const distance = Math.abs(x - originX) + Math.abs(y - originY);
        if (distance > range) continue;
        const food = this.#foodByCell[y * this.#config.world.width + x] ?? 0;
        if (
          food > bestFood ||
          (food === bestFood && food > 0 && distance < bestDistance)
        ) {
          bestX = x;
          bestY = y;
          bestFood = food;
          bestDistance = distance;
        }
      }
    }

    return { x: bestX, y: bestY };
  }

  #consumeFood(x: number, y: number, maximum: number): number {
    const cell = y * this.#config.world.width + x;
    const available = this.#foodByCell[cell] ?? 0;
    const consumed = Math.min(maximum, available);
    if (consumed === 0) return 0;

    const remaining = available - consumed;
    this.#foodByCell[cell] = remaining;
    this.#totalFood -= consumed;
    if (remaining === 0) this.#occupiedFoodCells -= 1;
    return consumed;
  }
}
