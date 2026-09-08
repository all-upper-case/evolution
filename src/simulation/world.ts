import { parseSimulationConfig, type SimulationConfig } from "./configuration";
import {
  cloneOrganism,
  createFounderPopulation,
  GENOME_TRAIT_RANGES,
  inheritGenome,
  type Genome,
  type Organism,
} from "./organism";
import { SeededRandom } from "./random";

export const foodEnergyMultiplier = (
  metabolismScale: number,
  influence: number,
): number => 1 + (metabolismScale - 1) * influence;

export interface WorldSummary {
  tick: number;
  width: number;
  height: number;
  totalFood: number;
  occupiedFoodCells: number;
  population: number;
  foodTotals: {
    meadow: number;
    grove: number;
  };
}

export interface WorldSnapshot extends WorldSummary {
  schemaVersion: 1 | 2;
  config: SimulationConfig;
  foodByCell: readonly number[];
  habitatByCell?: readonly number[];
  secondaryFoodByCell?: readonly number[];
  organisms: readonly Organism[];
  randomState: number;
  nextOrganismId: number;
}

export interface WorldTickEvents {
  tick: number;
  births: number;
  deaths: number;
}

export interface WorldAdvanceEvents {
  ticks: number;
  births: number;
  deaths: number;
}

type UnknownRecord = Record<string, unknown>;

export class WorldSnapshotError extends Error {
  public constructor(message: string) {
    super(`Invalid world snapshot: ${message}`);
    this.name = "WorldSnapshotError";
  }
}

const asRecord = (value: unknown, path: string): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new WorldSnapshotError(`${path} must be an object`);
  }
  return value as UnknownRecord;
};

const requireKeys = (
  record: UnknownRecord,
  expected: readonly string[],
  path: string,
): void => {
  const actual = Object.keys(record);
  const unexpected = actual.find((key) => !expected.includes(key));
  const missing = expected.find((key) => !(key in record));
  if (unexpected !== undefined)
    throw new WorldSnapshotError(`${path}.${unexpected} is not recognized`);
  if (missing !== undefined)
    throw new WorldSnapshotError(`${path}.${missing} is required`);
};

const finiteNumber = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new WorldSnapshotError(`${path} must be a finite number`);
  }
  return value;
};

const safeInteger = (value: unknown, path: string, minimum = 0): number => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new WorldSnapshotError(
      `${path} must be a safe integer of at least ${String(minimum)}`,
    );
  }
  return value as number;
};

const parseOrganism = (
  value: unknown,
  index: number,
  config: SimulationConfig,
): Organism => {
  const path = `$.organisms[${String(index)}]`;
  const record = asRecord(value, path);
  requireKeys(
    record,
    ["id", "lineageId", "parentId", "x", "y", "ageTicks", "energy", "genome"],
    path,
  );
  const id = safeInteger(record.id, `${path}.id`, 1);
  const lineageId = safeInteger(record.lineageId, `${path}.lineageId`, 1);
  const parentId =
    record.parentId === null
      ? null
      : safeInteger(record.parentId, `${path}.parentId`, 1);
  const x = safeInteger(record.x, `${path}.x`);
  const y = safeInteger(record.y, `${path}.y`);
  const ageTicks = safeInteger(record.ageTicks, `${path}.ageTicks`);
  const energy = finiteNumber(record.energy, `${path}.energy`);
  if (x >= config.world.width || y >= config.world.height)
    throw new WorldSnapshotError(`${path} position is outside the world`);
  if (ageTicks >= config.organisms.maximumAgeTicks)
    throw new WorldSnapshotError(
      `${path}.ageTicks exceeds the living-age limit`,
    );
  if (energy <= 0 || energy > config.organisms.maximumEnergy)
    throw new WorldSnapshotError(`${path}.energy is outside living bounds`);
  if (lineageId > id || (parentId !== null && parentId >= id))
    throw new WorldSnapshotError(`${path} has impossible ancestry identifiers`);

  const genomeRecord = asRecord(record.genome, `${path}.genome`);
  const traits = Object.keys(GENOME_TRAIT_RANGES) as (keyof Genome)[];
  requireKeys(genomeRecord, traits, `${path}.genome`);
  const genome = {} as Genome;
  for (const trait of traits) {
    const traitValue = finiteNumber(
      genomeRecord[trait],
      `${path}.genome.${trait}`,
    );
    const range = GENOME_TRAIT_RANGES[trait];
    if (traitValue < range.minimum || traitValue > range.maximum)
      throw new WorldSnapshotError(`${path}.genome.${trait} is out of bounds`);
    genome[trait] = traitValue;
  }

  return Object.freeze({
    id,
    lineageId,
    parentId,
    x,
    y,
    ageTicks,
    energy,
    genome: Object.freeze(genome),
  });
};

const parseWorldSnapshot = (value: unknown): WorldSnapshot => {
  const root = asRecord(value, "$");
  const snapshotVersion = safeInteger(root.schemaVersion, "$.schemaVersion", 1);
  if (snapshotVersion !== 1 && snapshotVersion !== 2)
    throw new WorldSnapshotError("$.schemaVersion must equal 1 or 2");
  requireKeys(
    root,
    [
      "schemaVersion",
      "config",
      "tick",
      "width",
      "height",
      "totalFood",
      "occupiedFoodCells",
      "population",
      "foodByCell",
      "organisms",
      "randomState",
      "nextOrganismId",
      ...(snapshotVersion === 2
        ? ["habitatByCell", "secondaryFoodByCell", "foodTotals"]
        : []),
    ],
    "$",
  );
  const config = parseSimulationConfig(root.config);
  const tick = safeInteger(root.tick, "$.tick");
  const width = safeInteger(root.width, "$.width", 1);
  const height = safeInteger(root.height, "$.height", 1);
  const totalFood = finiteNumber(root.totalFood, "$.totalFood");
  const occupiedFoodCells = safeInteger(
    root.occupiedFoodCells,
    "$.occupiedFoodCells",
  );
  const population = safeInteger(root.population, "$.population");
  const randomState = safeInteger(root.randomState, "$.randomState");
  const nextOrganismId = safeInteger(
    root.nextOrganismId,
    "$.nextOrganismId",
    1,
  );
  if (randomState > 0xffff_ffff)
    throw new WorldSnapshotError("$.randomState must be unsigned 32-bit");
  if (width !== config.world.width || height !== config.world.height)
    throw new WorldSnapshotError("world dimensions do not match configuration");
  if (!Array.isArray(root.foodByCell))
    throw new WorldSnapshotError("$.foodByCell must be an array");
  if (root.foodByCell.length !== width * height)
    throw new WorldSnapshotError(
      "$.foodByCell length does not match the world",
    );
  const foodByCell = root.foodByCell.map((food, index) => {
    const amount = finiteNumber(food, `$.foodByCell[${String(index)}]`);
    if (amount < 0)
      throw new WorldSnapshotError(
        `$.foodByCell[${String(index)}] must be non-negative`,
      );
    return amount;
  });
  const computedTotal = foodByCell.reduce((sum, food) => sum + food, 0);
  let habitatByCell: readonly number[] | undefined;
  let secondaryFoodByCell: readonly number[] | undefined;
  let foodTotals = { meadow: computedTotal, grove: 0 };
  if (snapshotVersion === 2) {
    if (!Array.isArray(root.habitatByCell))
      throw new WorldSnapshotError("$.habitatByCell must be an array");
    if (!Array.isArray(root.secondaryFoodByCell))
      throw new WorldSnapshotError("$.secondaryFoodByCell must be an array");
    if (
      root.habitatByCell.length !== width * height ||
      root.secondaryFoodByCell.length !== width * height
    )
      throw new WorldSnapshotError("ecology grids must match the world");
    habitatByCell = Object.freeze(
      root.habitatByCell.map((value, index) => {
        if (value !== 0 && value !== 1)
          throw new WorldSnapshotError(
            `$.habitatByCell[${String(index)}] must equal 0 or 1`,
          );
        return Number(value);
      }),
    );
    secondaryFoodByCell = Object.freeze(
      root.secondaryFoodByCell.map((value, index) => {
        const amount = finiteNumber(
          value,
          `$.secondaryFoodByCell[${String(index)}]`,
        );
        if (amount < 0)
          throw new WorldSnapshotError("secondary food must be non-negative");
        if (amount > 0 && habitatByCell?.[index] !== 1)
          throw new WorldSnapshotError("secondary food must occur in groves");
        return amount;
      }),
    );
    if (
      !config.ecology.enabled &&
      (habitatByCell.some((habitat) => habitat !== 0) ||
        secondaryFoodByCell.some((food) => food !== 0))
    )
      throw new WorldSnapshotError(
        "disabled ecology cannot contain groves or grove food",
      );
    if (
      foodByCell.some(
        (amount, index) => amount > 0 && habitatByCell?.[index] !== 0,
      )
    )
      throw new WorldSnapshotError("meadow food must occur in meadows");
    const totals = asRecord(root.foodTotals, "$.foodTotals");
    requireKeys(totals, ["meadow", "grove"], "$.foodTotals");
    const meadow = finiteNumber(totals.meadow, "$.foodTotals.meadow");
    const grove = finiteNumber(totals.grove, "$.foodTotals.grove");
    const computedGrove = secondaryFoodByCell.reduce(
      (sum, food) => sum + food,
      0,
    );
    if (meadow !== computedTotal || grove !== computedGrove)
      throw new WorldSnapshotError("$.foodTotals is inconsistent");
    foodTotals = { meadow, grove };
  }
  const combinedTotal = foodTotals.meadow + foodTotals.grove;
  const combinedOccupied = foodByCell.filter(
    (food, index) => food > 0 || (secondaryFoodByCell?.[index] ?? 0) > 0,
  ).length;
  if (
    totalFood !== combinedTotal ||
    foodTotals.meadow > config.food.maximumUnits ||
    foodTotals.grove > config.ecology.secondaryMaximumUnits
  )
    throw new WorldSnapshotError(
      "$.totalFood is inconsistent or above its cap",
    );
  if (occupiedFoodCells !== combinedOccupied)
    throw new WorldSnapshotError("$.occupiedFoodCells is inconsistent");
  if (!Array.isArray(root.organisms))
    throw new WorldSnapshotError("$.organisms must be an array");
  if (root.organisms.length > config.population.maximumCount)
    throw new WorldSnapshotError("$.organisms exceeds the population cap");
  const organisms = root.organisms.map((organism, index) =>
    parseOrganism(organism, index, config),
  );
  for (let index = 1; index < organisms.length; index += 1) {
    if ((organisms[index - 1]?.id ?? 0) >= (organisms[index]?.id ?? 0))
      throw new WorldSnapshotError(
        "$.organisms must be in ascending identity order",
      );
  }
  if (population !== organisms.length)
    throw new WorldSnapshotError("$.population is inconsistent");
  const maximumId = organisms.at(-1)?.id ?? 0;
  if (nextOrganismId <= maximumId)
    throw new WorldSnapshotError(
      "$.nextOrganismId must exceed every organism id",
    );

  return {
    schemaVersion: snapshotVersion,
    config,
    tick,
    width,
    height,
    totalFood,
    occupiedFoodCells,
    population,
    foodByCell: Object.freeze(foodByCell),
    ...(habitatByCell === undefined ? {} : { habitatByCell }),
    ...(secondaryFoodByCell === undefined ? {} : { secondaryFoodByCell }),
    foodTotals: Object.freeze(foodTotals),
    organisms: Object.freeze(organisms),
    randomState,
    nextOrganismId,
  };
};

export const serializeWorldSnapshot = (snapshot: unknown): string =>
  JSON.stringify(parseWorldSnapshot(snapshot));

export const deserializeWorldSnapshot = (serialized: string): WorldSnapshot => {
  try {
    return parseWorldSnapshot(JSON.parse(serialized) as unknown);
  } catch (error: unknown) {
    if (error instanceof WorldSnapshotError) throw error;
    throw new WorldSnapshotError("$ must be valid JSON");
  }
};

/** A deterministic bounded environment, independent of UI and wall time. */
export class SimulationWorld {
  readonly #config: SimulationConfig;
  readonly #random: SeededRandom;
  readonly #foodByCell: Float64Array;
  readonly #habitatByCell: Uint8Array;
  readonly #secondaryFoodByCell: Float64Array;
  readonly #habitatCells: [number[], number[]] = [[], []];
  readonly #organisms: Organism[];
  #tick = 0;
  #totalFood = 0;
  #occupiedFoodCells = 0;
  #primaryFood = 0;
  #secondaryFood = 0;
  #nextOrganismId: number;

  public constructor(config: unknown) {
    this.#config = parseSimulationConfig(config);
    this.#random = new SeededRandom(this.#config.seed);
    this.#foodByCell = new Float64Array(
      this.#config.world.width * this.#config.world.height,
    );
    this.#habitatByCell = new Uint8Array(this.#foodByCell.length);
    this.#secondaryFoodByCell = new Float64Array(this.#foodByCell.length);
    if (this.#config.ecology.enabled) this.#generateHabitats();
    else
      for (let cell = 0; cell < this.#foodByCell.length; cell += 1)
        this.#habitatCells[0].push(cell);
    this.#depositFood(this.#config.food.initialUnits, 0);
    if (this.#config.ecology.enabled)
      this.#depositFood(this.#config.ecology.secondaryInitialUnits, 1);
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
      foodTotals: Object.freeze({
        meadow: this.#primaryFood,
        grove: this.#secondaryFood,
      }),
    };
  }

  public get snapshot(): WorldSnapshot {
    return {
      schemaVersion: 2,
      config: parseSimulationConfig(this.#config),
      ...this.summary,
      foodByCell: Object.freeze(Array.from(this.#foodByCell)),
      habitatByCell: Object.freeze(Array.from(this.#habitatByCell)),
      secondaryFoodByCell: Object.freeze(Array.from(this.#secondaryFoodByCell)),
      organisms: Object.freeze(this.#organisms.map(cloneOrganism)),
      randomState: this.#random.state,
      nextOrganismId: this.#nextOrganismId,
    };
  }

  public static fromSnapshot(snapshot: unknown): SimulationWorld {
    const restored = parseWorldSnapshot(snapshot);
    const world = new SimulationWorld(restored.config);
    world.#tick = restored.tick;
    world.#foodByCell.set(restored.foodByCell);
    if (restored.habitatByCell !== undefined)
      world.#habitatByCell.set(restored.habitatByCell);
    if (restored.secondaryFoodByCell !== undefined)
      world.#secondaryFoodByCell.set(restored.secondaryFoodByCell);
    world.#totalFood = restored.totalFood;
    world.#primaryFood = restored.foodTotals.meadow;
    world.#secondaryFood = restored.foodTotals.grove;
    world.#habitatCells[0].length = 0;
    world.#habitatCells[1].length = 0;
    for (let cell = 0; cell < world.#habitatByCell.length; cell += 1)
      world.#habitatCells[world.#habitatByCell[cell] === 1 ? 1 : 0].push(cell);
    world.#occupiedFoodCells = restored.occupiedFoodCells;
    world.#organisms.splice(
      0,
      world.#organisms.length,
      ...restored.organisms.map(cloneOrganism),
    );
    world.#random.restore(restored.randomState);
    world.#nextOrganismId = restored.nextOrganismId;
    return world;
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
    const cell = y * this.#config.world.width + x;
    return (
      (this.#foodByCell[cell] ?? 0) + (this.#secondaryFoodByCell[cell] ?? 0)
    );
  }

  public step(): WorldTickEvents {
    this.#depositFood(this.#config.food.regrowthUnitsPerTick, 0);
    if (this.#config.ecology.enabled)
      this.#depositFood(this.#config.ecology.secondaryRegrowthUnitsPerTick, 1);
    const events = this.#advanceOrganisms();
    this.#tick += 1;
    return Object.freeze({ tick: this.#tick, ...events });
  }

  public advanceTicks(count: number): WorldAdvanceEvents {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError("Tick count must be a non-negative safe integer.");
    }
    let births = 0;
    let deaths = 0;
    for (let index = 0; index < count; index += 1) {
      const events = this.step();
      births += events.births;
      deaths += events.deaths;
    }
    return Object.freeze({ ticks: count, births, deaths });
  }

  #generateHabitats(): void {
    const patches = Array.from(
      { length: this.#config.ecology.habitatPatchCount },
      (_, index) => ({
        x: this.#random.integer(0, this.#config.world.width),
        y: this.#random.integer(0, this.#config.world.height),
        habitat:
          index <
          Math.round(
            this.#config.ecology.habitatPatchCount *
              this.#config.ecology.groveFraction,
          )
            ? 1
            : 0,
      }),
    );
    for (let cell = 0; cell < this.#habitatByCell.length; cell += 1) {
      const x = cell % this.#config.world.width;
      const y = Math.floor(cell / this.#config.world.width);
      let nearest = patches[0];
      let distance = Number.POSITIVE_INFINITY;
      for (const patch of patches) {
        const candidate = (patch.x - x) ** 2 + (patch.y - y) ** 2;
        if (candidate < distance) {
          nearest = patch;
          distance = candidate;
        }
      }
      this.#habitatByCell[cell] = nearest?.habitat ?? 0;
      this.#habitatCells[this.#habitatByCell[cell] === 1 ? 1 : 0].push(cell);
    }
    for (const habitat of [0, 1] as const) {
      if (this.#habitatCells[habitat].length > 0) continue;
      const cell = habitat === 0 ? 0 : this.#habitatByCell.length - 1;
      const previous = this.#habitatByCell[cell] === 1 ? 1 : 0;
      this.#habitatCells[previous] = this.#habitatCells[previous].filter(
        (candidate) => candidate !== cell,
      );
      this.#habitatByCell[cell] = habitat;
      this.#habitatCells[habitat].push(cell);
    }
  }

  #depositFood(requestedUnits: number, habitat: 0 | 1): void {
    const maximum =
      habitat === 0
        ? this.#config.food.maximumUnits
        : this.#config.ecology.secondaryMaximumUnits;
    const current = habitat === 0 ? this.#primaryFood : this.#secondaryFood;
    let remaining = Math.min(requestedUnits, maximum - current);

    while (remaining > 0) {
      const amount = Math.min(1, remaining);
      const eligible = this.#habitatCells[habitat];
      if (eligible.length === 0) return;
      const cell = eligible[this.#random.integer(0, eligible.length)] ?? 0;
      const grid = habitat === 0 ? this.#foodByCell : this.#secondaryFoodByCell;
      if ((grid[cell] ?? 0) === 0) this.#occupiedFoodCells += 1;
      grid[cell] = (grid[cell] ?? 0) + amount;
      this.#totalFood += amount;
      if (habitat === 0) this.#primaryFood += amount;
      else this.#secondaryFood += amount;
      remaining -= amount;
    }
  }

  #advanceOrganisms(): Pick<WorldTickEvents, "births" | "deaths"> {
    const survivors: Organism[] = [];
    const offspring: Organism[] = [];
    let deaths = 0;

    // The current array is always in identity order. Newborns are appended only
    // after every organism that existed at tick start has taken its turn.
    for (const organism of this.#organisms) {
      const position = this.#moveTowardFood(organism);
      const foodEnergy = this.#consumeFood(position.x, position.y, 1);
      const energy = Math.min(
        this.#config.organisms.maximumEnergy,
        organism.energy +
          foodEnergy *
            foodEnergyMultiplier(
              organism.genome.metabolismScale,
              this.#config.organisms.metabolismFoodEnergyInfluence,
            ),
      );
      const afterMetabolism =
        energy -
        this.#config.organisms.metabolismPerTick *
          organism.genome.metabolismScale -
        this.#config.organisms.movementCostPerTick *
          organism.genome.movementSpeed ** 2 -
        this.#config.organisms.perceptionCostPerTick *
          organism.genome.perceptionRange ** 2;
      const ageTicks = organism.ageTicks + 1;

      if (
        afterMetabolism <= 0 ||
        ageTicks >= this.#config.organisms.maximumAgeTicks
      ) {
        deaths += 1;
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
    return { births: offspring.length, deaths };
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
    let bestFood = this.#foodValueAt(
      originY * this.#config.world.width + originX,
    );
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
        const food = this.#foodValueAt(y * this.#config.world.width + x);
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
    const habitat = this.#habitatByCell[cell] ?? 0;
    const grid = habitat === 1 ? this.#secondaryFoodByCell : this.#foodByCell;
    const available = grid[cell] ?? 0;
    const consumed = Math.min(maximum, available);
    if (consumed === 0) return 0;

    const remaining = available - consumed;
    grid[cell] = remaining;
    this.#totalFood -= consumed;
    if (habitat === 1) this.#secondaryFood -= consumed;
    else this.#primaryFood -= consumed;
    if (remaining === 0) this.#occupiedFoodCells -= 1;
    return (
      consumed *
      (habitat === 1
        ? this.#config.ecology.secondaryEnergyPerUnit
        : this.#config.food.energyPerUnit)
    );
  }

  #foodValueAt(cell: number): number {
    return (
      (this.#foodByCell[cell] ?? 0) * this.#config.food.energyPerUnit +
      (this.#secondaryFoodByCell[cell] ?? 0) *
        this.#config.ecology.secondaryEnergyPerUnit
    );
  }
}
