import { SeededRandom } from "../simulation/random";

export type Terrain = "meadow" | "woods" | "water" | "camp";
export type Activity =
  | "exploring"
  | "foraging"
  | "eating"
  | "returning"
  | "resting"
  | "seeking-company"
  | "socializing";

export interface Personality {
  curiosity: number;
  sociability: number;
  resilience: number;
}

export interface Inhabitant {
  id: number;
  name: string;
  role: string;
  x: number;
  y: number;
  ageTicks: number;
  health: number;
  hunger: number;
  fatigue: number;
  loneliness: number;
  activity: Activity;
  targetId: number | null;
  personality: Personality;
}

export interface ChronicleEntry {
  tick: number;
  inhabitantId: number | null;
  text: string;
}

export interface SettlementSnapshot {
  schemaVersion: 1;
  seed: number;
  tick: number;
  width: number;
  height: number;
  camp: { x: number; y: number };
  terrainByCell: readonly Terrain[];
  foodByCell: readonly number[];
  totalFood: number;
  inhabitants: readonly Inhabitant[];
  chronicle: readonly ChronicleEntry[];
  randomState: number;
}

export interface SettlementTickEvents {
  tick: number;
  meals: number;
  conversations: number;
  deaths: number;
}

const WIDTH = 64;
const HEIGHT = 64;
const CAMP = Object.freeze({ x: 32, y: 32 });
const INITIAL_INHABITANTS = 14;
const INITIAL_FOOD = 520;
const MAXIMUM_FOOD = 900;
const MAXIMUM_CHRONICLE = 120;
const FOOD_PER_CELL = 4;

const GIVEN_NAMES = [
  "Ada",
  "Bram",
  "Cora",
  "Della",
  "Edda",
  "Fen",
  "Gilda",
  "Hollis",
  "Ivo",
  "Juniper",
  "Kestrel",
  "Linnet",
  "Mara",
  "Nim",
  "Orla",
  "Perrin",
  "Quill",
  "Rook",
  "Sable",
  "Tansy",
] as const;

const BYNAMES = [
  "Amberfield",
  "Bramble",
  "Candlewick",
  "Dewfoot",
  "Emberpot",
  "Fern",
  "Goodmoss",
  "Hearth",
  "Ivythatch",
  "Junebug",
  "Kindroot",
  "Loam",
  "Merryweather",
  "Nutkin",
  "Oaken",
  "Pebble",
  "Quickettle",
  "Rainbarrel",
  "Softstep",
  "Thimble",
] as const;

const ROLES = [
  "forager",
  "cook",
  "tinkerer",
  "caretaker",
  "storykeeper",
  "naturalist",
  "mender",
] as const;

const clampNeed = (value: number): number => Math.max(0, Math.min(100, value));

const cloneInhabitant = (inhabitant: Inhabitant): Inhabitant =>
  Object.freeze({
    ...inhabitant,
    personality: Object.freeze({ ...inhabitant.personality }),
  });

const cellOf = (x: number, y: number, width = WIDTH): number => y * width + x;

const distance = (
  first: { x: number; y: number },
  second: { x: number; y: number },
): number => Math.abs(first.x - second.x) + Math.abs(first.y - second.y);

/** A deterministic, bounded first foundation for an observational settlement. */
export class SettlementWorld {
  readonly #seed: number;
  readonly #random: SeededRandom;
  readonly #terrainByCell: Terrain[];
  readonly #foodByCell: Float64Array;
  readonly #inhabitants: Inhabitant[];
  readonly #chronicle: ChronicleEntry[];
  #tick = 0;
  #totalFood = 0;

  public constructor(seed = 42) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff)
      throw new RangeError("Seed must be an unsigned 32-bit integer.");
    this.#seed = seed;
    this.#random = new SeededRandom(seed);
    this.#terrainByCell = this.#createTerrain();
    this.#foodByCell = new Float64Array(WIDTH * HEIGHT);
    this.#depositFood(INITIAL_FOOD);
    this.#inhabitants = this.#createFounders();
    this.#chronicle = [
      Object.freeze({
        tick: 0,
        inhabitantId: null,
        text: `${String(INITIAL_INHABITANTS)} travelers made camp at Hearthwatch.`,
      }),
    ];
  }

  public get snapshot(): SettlementSnapshot {
    return Object.freeze({
      schemaVersion: 1,
      seed: this.#seed,
      tick: this.#tick,
      width: WIDTH,
      height: HEIGHT,
      camp: CAMP,
      terrainByCell: Object.freeze([...this.#terrainByCell]),
      foodByCell: Object.freeze(Array.from(this.#foodByCell)),
      totalFood: this.#totalFood,
      inhabitants: Object.freeze(this.#inhabitants.map(cloneInhabitant)),
      chronicle: Object.freeze(
        this.#chronicle.map((entry) => Object.freeze({ ...entry })),
      ),
      randomState: this.#random.state,
    });
  }

  public static fromSnapshot(snapshot: SettlementSnapshot): SettlementWorld {
    if (
      snapshot.width !== WIDTH ||
      snapshot.height !== HEIGHT ||
      snapshot.terrainByCell.length !== WIDTH * HEIGHT ||
      snapshot.foodByCell.length !== WIDTH * HEIGHT
    )
      throw new Error("Unsupported or malformed settlement snapshot.");
    const world = new SettlementWorld(snapshot.seed);
    world.#tick = snapshot.tick;
    world.#terrainByCell.splice(
      0,
      world.#terrainByCell.length,
      ...snapshot.terrainByCell,
    );
    world.#foodByCell.set(snapshot.foodByCell);
    world.#totalFood = snapshot.totalFood;
    world.#inhabitants.splice(
      0,
      world.#inhabitants.length,
      ...snapshot.inhabitants.map((inhabitant) => ({
        ...inhabitant,
        personality: { ...inhabitant.personality },
      })),
    );
    world.#chronicle.splice(
      0,
      world.#chronicle.length,
      ...snapshot.chronicle.map((entry) => ({ ...entry })),
    );
    world.#random.restore(snapshot.randomState);
    return world;
  }

  public step(): SettlementTickEvents {
    this.#tick += 1;
    this.#depositFood(1.5);
    let meals = 0;
    let conversations = 0;
    let deaths = 0;
    const survivors: Inhabitant[] = [];

    for (const inhabitant of this.#inhabitants) {
      const next = this.#advanceInhabitant(inhabitant);
      meals += next.meal ? 1 : 0;
      conversations += next.conversation ? 1 : 0;
      if (next.inhabitant.health <= 0) {
        deaths += 1;
        this.#record(
          next.inhabitant.id,
          `${next.inhabitant.name} died after their needs went unmet.`,
        );
      } else {
        survivors.push(next.inhabitant);
      }
    }

    this.#inhabitants.splice(0, this.#inhabitants.length, ...survivors);
    return Object.freeze({ tick: this.#tick, meals, conversations, deaths });
  }

  public advanceTicks(ticks: number): SettlementTickEvents {
    if (!Number.isSafeInteger(ticks) || ticks < 0 || ticks > 100_000)
      throw new RangeError(
        "Tick count must be an integer from 0 through 100,000.",
      );
    const aggregate = {
      tick: this.#tick,
      meals: 0,
      conversations: 0,
      deaths: 0,
    };
    for (let index = 0; index < ticks; index += 1) {
      const events = this.step();
      aggregate.tick = events.tick;
      aggregate.meals += events.meals;
      aggregate.conversations += events.conversations;
      aggregate.deaths += events.deaths;
    }
    return Object.freeze(aggregate);
  }

  #createTerrain(): Terrain[] {
    const terrain: Terrain[] = [];
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const edge = Math.min(x, y, WIDTH - 1 - x, HEIGHT - 1 - y);
        const roll = this.#random.next();
        terrain.push(
          edge < 2 && roll < 0.7 ? "water" : roll < 0.31 ? "woods" : "meadow",
        );
      }
    }
    for (let y = CAMP.y - 3; y <= CAMP.y + 3; y += 1)
      for (let x = CAMP.x - 3; x <= CAMP.x + 3; x += 1)
        terrain[cellOf(x, y)] =
          distance({ x, y }, CAMP) <= 2 ? "camp" : "meadow";
    return terrain;
  }

  #createFounders(): Inhabitant[] {
    const inhabitants: Inhabitant[] = [];
    for (let index = 0; index < INITIAL_INHABITANTS; index += 1) {
      const id = index + 1;
      const angle = (index / INITIAL_INHABITANTS) * Math.PI * 2;
      inhabitants.push({
        id,
        name: `${GIVEN_NAMES[(index + this.#random.integer(0, GIVEN_NAMES.length)) % GIVEN_NAMES.length] ?? "Ada"} ${BYNAMES[(index * 7 + this.#random.integer(0, BYNAMES.length)) % BYNAMES.length] ?? "Amberfield"}`,
        role: ROLES[index % ROLES.length] ?? "forager",
        x: CAMP.x + Math.round(Math.cos(angle) * 2),
        y: CAMP.y + Math.round(Math.sin(angle) * 2),
        ageTicks: 0,
        health: 100,
        hunger: 15 + this.#random.next() * 25,
        fatigue: 10 + this.#random.next() * 30,
        loneliness: 5 + this.#random.next() * 30,
        activity: "exploring",
        targetId: null,
        personality: {
          curiosity: 0.75 + this.#random.next() * 0.5,
          sociability: 0.75 + this.#random.next() * 0.5,
          resilience: 0.75 + this.#random.next() * 0.5,
        },
      });
    }
    return inhabitants;
  }

  #advanceInhabitant(source: Inhabitant): {
    inhabitant: Inhabitant;
    meal: boolean;
    conversation: boolean;
  } {
    const inhabitant: Inhabitant = {
      ...source,
      personality: { ...source.personality },
      ageTicks: source.ageTicks + 1,
      hunger: clampNeed(source.hunger + 0.3),
      fatigue: clampNeed(source.fatigue + 0.18),
      loneliness: clampNeed(
        source.loneliness + 0.12 * source.personality.sociability,
      ),
      targetId: null,
    };
    let meal = false;
    let conversation = false;
    let nextActivity: Activity;

    if (inhabitant.hunger >= 52) {
      const food = this.#foodByCell[cellOf(inhabitant.x, inhabitant.y)] ?? 0;
      if (food >= 1) {
        this.#foodByCell[cellOf(inhabitant.x, inhabitant.y)] = food - 1;
        this.#totalFood -= 1;
        inhabitant.hunger = clampNeed(inhabitant.hunger - 34);
        nextActivity = "eating";
        meal = true;
      } else {
        const target = this.#nearestFood(inhabitant);
        if (target === null) this.#wander(inhabitant);
        else this.#moveToward(inhabitant, target);
        nextActivity = "foraging";
      }
    } else if (inhabitant.fatigue >= 68) {
      if (distance(inhabitant, CAMP) <= 2) {
        inhabitant.fatigue = clampNeed(
          inhabitant.fatigue - 4.5 * inhabitant.personality.resilience,
        );
        nextActivity = "resting";
      } else {
        this.#moveToward(inhabitant, CAMP);
        nextActivity = "returning";
      }
    } else if (
      inhabitant.loneliness >=
      58 / inhabitant.personality.sociability
    ) {
      const companion = this.#nearestCompanion(inhabitant);
      if (companion !== null && distance(inhabitant, companion) <= 1) {
        inhabitant.loneliness = clampNeed(inhabitant.loneliness - 6);
        inhabitant.targetId = companion.id;
        nextActivity = "socializing";
        conversation = true;
      } else if (companion !== null) {
        inhabitant.targetId = companion.id;
        this.#moveToward(inhabitant, companion);
        nextActivity = "seeking-company";
      } else {
        this.#moveToward(inhabitant, CAMP);
        nextActivity = "seeking-company";
      }
    } else {
      this.#wander(inhabitant);
      nextActivity = "exploring";
    }

    if (nextActivity !== source.activity) {
      if (nextActivity === "eating")
        this.#record(inhabitant.id, `${inhabitant.name} stopped to eat.`);
      else if (nextActivity === "resting")
        this.#record(
          inhabitant.id,
          `${inhabitant.name} curled up at camp to rest.`,
        );
      else if (nextActivity === "socializing") {
        const companion = this.#inhabitants.find(
          ({ id }) => id === inhabitant.targetId,
        );
        this.#record(
          inhabitant.id,
          `${inhabitant.name} shared a quiet conversation with ${companion?.name ?? "a neighbor"}.`,
        );
      }
    }
    inhabitant.activity = nextActivity;

    if (inhabitant.hunger >= 100)
      inhabitant.health -= 1.2 / inhabitant.personality.resilience;
    if (inhabitant.fatigue >= 100)
      inhabitant.health -= 0.45 / inhabitant.personality.resilience;
    if (inhabitant.hunger < 75 && inhabitant.fatigue < 85)
      inhabitant.health = Math.min(100, inhabitant.health + 0.04);

    return { inhabitant, meal, conversation };
  }

  #nearestFood(inhabitant: Inhabitant): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let cell = 0; cell < this.#foodByCell.length; cell += 1) {
      if ((this.#foodByCell[cell] ?? 0) < 1) continue;
      const candidate = { x: cell % WIDTH, y: Math.floor(cell / WIDTH) };
      const candidateDistance = distance(inhabitant, candidate);
      if (candidateDistance < bestDistance) {
        best = candidate;
        bestDistance = candidateDistance;
      }
    }
    return best;
  }

  #nearestCompanion(inhabitant: Inhabitant): Inhabitant | null {
    let best: Inhabitant | null = null;
    for (const candidate of this.#inhabitants) {
      if (candidate.id === inhabitant.id) continue;
      if (
        best === null ||
        distance(inhabitant, candidate) < distance(inhabitant, best) ||
        (distance(inhabitant, candidate) === distance(inhabitant, best) &&
          candidate.id < best.id)
      )
        best = candidate;
    }
    return best;
  }

  #moveToward(inhabitant: Inhabitant, target: { x: number; y: number }): void {
    const candidates = [
      { x: inhabitant.x + 1, y: inhabitant.y },
      { x: inhabitant.x, y: inhabitant.y + 1 },
      { x: inhabitant.x - 1, y: inhabitant.y },
      { x: inhabitant.x, y: inhabitant.y - 1 },
    ]
      .filter((candidate) => this.#passable(candidate.x, candidate.y))
      .sort(
        (first, second) => distance(first, target) - distance(second, target),
      );
    const next = candidates[0];
    if (next !== undefined) {
      inhabitant.x = next.x;
      inhabitant.y = next.y;
    }
  }

  #wander(inhabitant: Inhabitant): void {
    const directions = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 0 },
    ] as const;
    const start = this.#random.integer(0, directions.length);
    for (let offset = 0; offset < directions.length; offset += 1) {
      const direction = directions[(start + offset) % directions.length];
      if (direction === undefined) continue;
      const x = inhabitant.x + direction.x;
      const y = inhabitant.y + direction.y;
      if (this.#passable(x, y)) {
        inhabitant.x = x;
        inhabitant.y = y;
        return;
      }
    }
  }

  #passable(x: number, y: number): boolean {
    return (
      x >= 0 &&
      x < WIDTH &&
      y >= 0 &&
      y < HEIGHT &&
      this.#terrainByCell[cellOf(x, y)] !== "water"
    );
  }

  #depositFood(amount: number): void {
    let remaining = Math.min(amount, MAXIMUM_FOOD - this.#totalFood);
    let attempts = 0;
    while (remaining > 0 && attempts < WIDTH * HEIGHT * 4) {
      attempts += 1;
      const cell = this.#random.integer(0, this.#foodByCell.length);
      const terrain = this.#terrainByCell[cell];
      if (terrain !== "meadow" && terrain !== "woods") continue;
      const available = FOOD_PER_CELL - (this.#foodByCell[cell] ?? 0);
      if (available <= 0) continue;
      const deposited = Math.min(remaining, available);
      this.#foodByCell[cell] = (this.#foodByCell[cell] ?? 0) + deposited;
      this.#totalFood += deposited;
      remaining -= deposited;
    }
  }

  #record(inhabitantId: number | null, text: string): void {
    this.#chronicle.push(
      Object.freeze({ tick: this.#tick, inhabitantId, text }),
    );
    if (this.#chronicle.length > MAXIMUM_CHRONICLE)
      this.#chronicle.splice(0, this.#chronicle.length - MAXIMUM_CHRONICLE);
  }
}

export const activityLabel = (activity: Activity): string =>
  ({
    exploring: "Exploring",
    foraging: "Searching for food",
    eating: "Eating",
    returning: "Returning to camp",
    resting: "Resting at camp",
    "seeking-company": "Looking for company",
    socializing: "Talking with a neighbor",
  })[activity];
