import { validateSettlement } from "./persistence";
import { SeededRandom } from "../simulation/random";

export type Terrain = "meadow" | "woods" | "water" | "camp";
export type Role =
  "forager" | "cook" | "caretaker" | "storykeeper" | "naturalist";
export type Activity =
  | "building"
  | "woodcutting"
  | "relaxing"
  | "exploring"
  | "foraging"
  | "gathering"
  | "hauling"
  | "cooking"
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

export interface Skills {
  gathering: number;
  cooking: number;
  care: number;
  fellowship: number;
}

export interface Inhabitant {
  id: number;
  name: string;
  role: Role;
  x: number;
  y: number;
  ageTicks: number;
  health: number;
  hunger: number;
  fatigue: number;
  loneliness: number;
  activity: Activity;
  targetId: number | null;
  carriedFood: number;
  workProgress: number;
  personality: Personality;
  skills: Skills;
  homeId: number;
  carriedWood: number;
  actionTicks: number;
  relationships: Record<string, number>;
  memories: ChronicleEntry[];
}

export interface ChronicleEntry {
  tick: number;
  inhabitantId: number | null;
  text: string;
}

export interface Shelter {
  id: number;
  x: number;
  y: number;
  timber: number;
  progress: number;
}
export const DAY_TICKS = 600;
export const settlementTime = (tick: number): string => {
  const hour = (6 + Math.floor(((tick % DAY_TICKS) * 24) / DAY_TICKS)) % 24;
  return `Day ${String(Math.floor(tick / DAY_TICKS) + 1)} · ${String(hour).padStart(2, "0")}:00`;
};
export const isNight = (tick: number): boolean => {
  const hour = (6 + ((tick % DAY_TICKS) * 24) / DAY_TICKS) % 24;
  return hour >= 21 || hour < 6;
};
export interface SettlementSnapshot {
  schemaVersion: 3;
  pathsByCell: readonly number[];
  shelters: readonly Shelter[];
  seed: number;
  tick: number;
  width: number;
  height: number;
  camp: { x: number; y: number };
  terrainByCell: readonly Terrain[];
  foodByCell: readonly number[];
  totalFood: number;
  stockpile: { rawFood: number; preparedMeals: number };
  inhabitants: readonly Inhabitant[];
  chronicle: readonly ChronicleEntry[];
  randomState: number;
}

export interface SettlementTickEvents {
  tick: number;
  meals: number;
  conversations: number;
  deaths: number;
  gathered: number;
  deposited: number;
  prepared: number;
}

const WIDTH = 64;
const HEIGHT = 64;
const CAMP = Object.freeze({ x: 32, y: 32 });
const INITIAL_INHABITANTS = 14;
const INITIAL_FOOD = 520;
const MAXIMUM_FOOD = 900;
const MAXIMUM_CHRONICLE = 120;
const FOOD_PER_CELL = 4;
const INITIAL_RAW_FOOD = 12;
const INITIAL_PREPARED_MEALS = 8;

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
  "caretaker",
  "storykeeper",
  "naturalist",
] as const;
const ROLE_SKILLS: Record<Role, Skills> = {
  forager: { gathering: 1.45, cooking: 0.65, care: 0.8, fellowship: 0.85 },
  cook: { gathering: 0.75, cooking: 1.6, care: 0.9, fellowship: 1 },
  caretaker: { gathering: 0.8, cooking: 0.85, care: 1.55, fellowship: 1.15 },
  storykeeper: { gathering: 0.7, cooking: 0.75, care: 0.9, fellowship: 1.6 },
  naturalist: { gathering: 1.2, cooking: 0.7, care: 0.85, fellowship: 0.9 },
};

const clampNeed = (value: number): number => Math.max(0, Math.min(100, value));
const cellOf = (x: number, y: number, width = WIDTH): number => y * width + x;
const distance = (
  first: { x: number; y: number },
  second: { x: number; y: number },
): number => Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
const cloneInhabitant = (inhabitant: Inhabitant): Inhabitant =>
  Object.freeze({
    ...inhabitant,
    personality: Object.freeze({ ...inhabitant.personality }),
    skills: Object.freeze({ ...inhabitant.skills }),
    relationships: Object.freeze({ ...inhabitant.relationships }),
    memories: inhabitant.memories.map((entry) => Object.freeze({ ...entry })),
  });

/** A deterministic, bounded observational settlement with a causal subsistence economy. */
export class SettlementWorld {
  readonly #seed: number;
  readonly #random: SeededRandom;
  readonly #terrainByCell: Terrain[];
  readonly #foodByCell: Float64Array;
  readonly #inhabitants: Inhabitant[];
  readonly #chronicle: ChronicleEntry[];
  readonly #pathsByCell = new Uint16Array(WIDTH * HEIGHT);
  readonly #shelters: Shelter[] = Array.from({ length: 7 }, (_, index) => ({
    id: index + 1,
    x: 25 + (index % 4) * 5,
    y: index < 4 ? 26 : 38,
    timber: 0,
    progress: 0,
  }));
  #tick = 0;
  #totalFood = 0;
  #rawFood = INITIAL_RAW_FOOD;
  #preparedMeals = INITIAL_PREPARED_MEALS;

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
        text: `${String(INITIAL_INHABITANTS)} travelers made camp at Hearthwatch with a modest store of food.`,
      }),
    ];
  }

  public get snapshot(): SettlementSnapshot {
    return Object.freeze({
      schemaVersion: 3,
      pathsByCell: Object.freeze(Array.from(this.#pathsByCell)),
      shelters: Object.freeze(
        this.#shelters.map((shelter) => Object.freeze({ ...shelter })),
      ),
      seed: this.#seed,
      tick: this.#tick,
      width: WIDTH,
      height: HEIGHT,
      camp: CAMP,
      terrainByCell: Object.freeze([...this.#terrainByCell]),
      foodByCell: Object.freeze(Array.from(this.#foodByCell)),
      totalFood: this.#totalFood,
      stockpile: Object.freeze({
        rawFood: this.#rawFood,
        preparedMeals: this.#preparedMeals,
      }),
      inhabitants: Object.freeze(this.#inhabitants.map(cloneInhabitant)),
      chronicle: Object.freeze(
        this.#chronicle.map((entry) => Object.freeze({ ...entry })),
      ),
      randomState: this.#random.state,
    });
  }

  public static fromSnapshot(snapshot: SettlementSnapshot): SettlementWorld {
    validateSettlement(snapshot);
    if (
      snapshot.width !== WIDTH ||
      snapshot.height !== HEIGHT ||
      snapshot.terrainByCell.length !== WIDTH * HEIGHT ||
      snapshot.foodByCell.length !== WIDTH * HEIGHT
    )
      throw new Error("Unsupported or malformed settlement snapshot.");
    const world = new SettlementWorld(snapshot.seed);
    world.#tick = snapshot.tick;
    world.#pathsByCell.set(snapshot.pathsByCell);
    world.#shelters.splice(
      0,
      world.#shelters.length,
      ...snapshot.shelters.map((shelter) => ({ ...shelter })),
    );
    world.#terrainByCell.splice(
      0,
      world.#terrainByCell.length,
      ...snapshot.terrainByCell,
    );
    world.#foodByCell.set(snapshot.foodByCell);
    world.#totalFood = snapshot.totalFood;
    world.#rawFood = snapshot.stockpile.rawFood;
    world.#preparedMeals = snapshot.stockpile.preparedMeals;
    world.#inhabitants.splice(
      0,
      world.#inhabitants.length,
      ...snapshot.inhabitants.map((inhabitant) => ({
        ...inhabitant,
        personality: { ...inhabitant.personality },
        skills: { ...inhabitant.skills },
        relationships: { ...inhabitant.relationships },
        memories: inhabitant.memories.map((entry) => ({ ...entry })),
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
    const aggregate = {
      tick: this.#tick,
      meals: 0,
      conversations: 0,
      deaths: 0,
      gathered: 0,
      deposited: 0,
      prepared: 0,
    };
    const survivors: Inhabitant[] = [];
    for (const inhabitant of this.#inhabitants) {
      const next = this.#advanceInhabitant(inhabitant);
      aggregate.meals += next.meal ? 1 : 0;
      aggregate.conversations += next.conversation ? 1 : 0;
      aggregate.gathered += next.gathered;
      aggregate.deposited += next.deposited;
      aggregate.prepared += next.prepared;
      if (next.inhabitant.health <= 0) {
        aggregate.deaths += 1;
        this.#record(
          next.inhabitant.id,
          `${next.inhabitant.name} died after their needs went unmet.`,
        );
      } else survivors.push(next.inhabitant);
    }
    this.#inhabitants.splice(0, this.#inhabitants.length, ...survivors);
    return Object.freeze(aggregate);
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
      gathered: 0,
      deposited: 0,
      prepared: 0,
    };
    for (let index = 0; index < ticks; index += 1) {
      const events = this.step();
      aggregate.tick = events.tick;
      aggregate.meals += events.meals;
      aggregate.conversations += events.conversations;
      aggregate.deaths += events.deaths;
      aggregate.gathered += events.gathered;
      aggregate.deposited += events.deposited;
      aggregate.prepared += events.prepared;
    }
    return Object.freeze(aggregate);
  }

  #createTerrain(): Terrain[] {
    const terrain: Terrain[] = [];
    for (let y = 0; y < HEIGHT; y += 1)
      for (let x = 0; x < WIDTH; x += 1) {
        const edge = Math.min(x, y, WIDTH - 1 - x, HEIGHT - 1 - y);
        const roll = this.#random.next();
        terrain.push(
          edge < 2 && roll < 0.7 ? "water" : roll < 0.31 ? "woods" : "meadow",
        );
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
      const role = ROLES[index % ROLES.length] ?? "forager";
      const angle = (index / INITIAL_INHABITANTS) * Math.PI * 2;
      inhabitants.push({
        id: index + 1,
        name: `${GIVEN_NAMES[(index + this.#random.integer(0, GIVEN_NAMES.length)) % GIVEN_NAMES.length] ?? "Ada"} ${BYNAMES[(index * 7 + this.#random.integer(0, BYNAMES.length)) % BYNAMES.length] ?? "Amberfield"}`,
        role,
        x: CAMP.x + Math.round(Math.cos(angle) * 2),
        y: CAMP.y + Math.round(Math.sin(angle) * 2),
        ageTicks: 0,
        health: 100,
        hunger: 15 + this.#random.next() * 25,
        fatigue: 10 + this.#random.next() * 30,
        loneliness: 5 + this.#random.next() * 30,
        activity: "exploring",
        targetId: null,
        carriedFood: 0,
        workProgress: 0,
        homeId: Math.floor(index / 2) + 1,
        carriedWood: 0,
        actionTicks: 0,
        relationships: {},
        memories: [],
        personality: {
          curiosity: 0.75 + this.#random.next() * 0.5,
          sociability: 0.75 + this.#random.next() * 0.5,
          resilience: 0.75 + this.#random.next() * 0.5,
        },
        skills: { ...ROLE_SKILLS[role] },
      });
    }
    return inhabitants;
  }

  #advanceInhabitant(source: Inhabitant): {
    inhabitant: Inhabitant;
    meal: boolean;
    conversation: boolean;
    gathered: number;
    deposited: number;
    prepared: number;
  } {
    const inhabitant: Inhabitant = {
      ...source,
      personality: { ...source.personality },
      skills: { ...source.skills },
      relationships: { ...source.relationships },
      memories: source.memories.map((entry) => ({ ...entry })),
      actionTicks: source.actionTicks + 1,
      ageTicks: source.ageTicks + 1,
      hunger: clampNeed(source.hunger + 0.12),
      fatigue: clampNeed(source.fatigue + 0.18),
      loneliness: clampNeed(
        source.loneliness + 0.12 * source.personality.sociability,
      ),
      targetId: null,
    };
    let meal = false;
    let conversation = false;
    let gathered = 0;
    let deposited = 0;
    let prepared = 0;
    let nextActivity: Activity;

    const home = this.#shelters.find(({ id }) => id === inhabitant.homeId);
    if (!home) throw new Error("Missing home.");
    const bed = { x: home.x + (inhabitant.id % 2 === 0 ? 1 : -1), y: home.y };
    if (
      inhabitant.hunger >= 52 ||
      (source.activity === "eating" && source.actionTicks < 8)
    ) {
      if (distance(inhabitant, CAMP) <= 2 && inhabitant.carriedFood > 0) {
        deposited = inhabitant.carriedFood;
        this.#rawFood += deposited;
        inhabitant.carriedFood = 0;
        this.#record(
          inhabitant.id,
          `${inhabitant.name} brought ${deposited.toFixed(1)} measures of wild food home before eating.`,
        );
      }
      if (source.activity === "eating" && source.actionTicks < 8) {
        nextActivity = "eating";
      } else if (
        distance(inhabitant, CAMP) > 2 &&
        (this.#preparedMeals >= 1 || this.#rawFood >= 1)
      ) {
        this.#moveToward(inhabitant, CAMP);
        nextActivity = "returning";
      } else if (distance(inhabitant, CAMP) <= 2 && this.#preparedMeals >= 1) {
        this.#preparedMeals -= 1;
        inhabitant.hunger = clampNeed(inhabitant.hunger - 44);
        nextActivity = "eating";
        meal = true;
      } else if (distance(inhabitant, CAMP) <= 2 && this.#rawFood >= 1) {
        this.#rawFood -= 1;
        inhabitant.hunger = clampNeed(inhabitant.hunger - 27);
        nextActivity = "eating";
        meal = true;
      } else if (inhabitant.carriedFood >= 1 && inhabitant.hunger >= 75) {
        inhabitant.carriedFood -= 1;
        inhabitant.hunger = clampNeed(inhabitant.hunger - 27);
        nextActivity = "eating";
        meal = true;
      } else if (inhabitant.carriedFood >= 1) {
        this.#moveToward(inhabitant, CAMP);
        nextActivity = "hauling";
      } else {
        ({ activity: nextActivity, gathered } = this.#gather(inhabitant));
      }
    } else if (
      inhabitant.fatigue >= 68 ||
      (source.activity === "resting" && inhabitant.fatigue > 15) ||
      isNight(this.#tick)
    ) {
      if (distance(inhabitant, bed) === 0) {
        inhabitant.fatigue = clampNeed(
          inhabitant.fatigue -
            (home.progress >= 100 ? 1.5 : 0.85) *
              inhabitant.personality.resilience,
        );
        nextActivity = "resting";
      } else {
        this.#moveToward(inhabitant, bed);
        nextActivity = "returning";
      }
    } else if (
      inhabitant.loneliness >= 58 / inhabitant.personality.sociability ||
      (source.activity === "socializing" && source.actionTicks < 12)
    ) {
      const companion = this.#nearestCompanion(inhabitant);
      if (companion !== null && distance(inhabitant, companion) <= 1) {
        inhabitant.loneliness = clampNeed(
          inhabitant.loneliness - 6 * inhabitant.skills.fellowship,
        );
        inhabitant.targetId = companion.id;
        nextActivity = "socializing";
        conversation = true;
        if (source.activity !== "socializing") {
          inhabitant.relationships[String(companion.id)] = Math.min(
            100,
            (inhabitant.relationships[String(companion.id)] ?? 0) + 4,
          );
        }
      } else if (companion !== null) {
        inhabitant.targetId = companion.id;
        this.#moveToward(inhabitant, companion);
        nextActivity = "seeking-company";
      } else {
        this.#moveToward(inhabitant, CAMP);
        nextActivity = "seeking-company";
      }
    } else if (
      inhabitant.carriedFood >= (inhabitant.role === "forager" ? 5 : 3)
    ) {
      if (distance(inhabitant, CAMP) <= 2) {
        deposited = inhabitant.carriedFood;
        this.#rawFood += deposited;
        inhabitant.carriedFood = 0;
        nextActivity = "hauling";
        this.#record(
          inhabitant.id,
          `${inhabitant.name} delivered ${deposited.toFixed(1)} measures of wild food to the communal store.`,
        );
      } else {
        this.#moveToward(inhabitant, CAMP);
        nextActivity = "hauling";
      }
    } else if (
      inhabitant.role === "cook" &&
      this.#rawFood >= 2 &&
      this.#preparedMeals < 28
    ) {
      if (distance(inhabitant, CAMP) === 0) {
        inhabitant.workProgress += inhabitant.skills.cooking;
        nextActivity = "cooking";
        if (inhabitant.workProgress >= 4) {
          inhabitant.workProgress -= 4;
          this.#rawFood -= 2;
          this.#preparedMeals += 1;
          prepared = 1;
          this.#record(
            inhabitant.id,
            `${inhabitant.name} prepared a nourishing communal meal.`,
          );
        }
      } else {
        this.#moveToward(inhabitant, CAMP);
        nextActivity = "returning";
      }
    } else if (this.#rawFood + this.#preparedMeals > 8 && home.progress < 100) {
      nextActivity = this.#buildHome(inhabitant, home);
    } else if (this.#rawFood + this.#preparedMeals > 45) {
      if (distance(inhabitant, CAMP) > 4) this.#moveToward(inhabitant, CAMP);
      nextActivity = "relaxing";
    } else {
      ({ activity: nextActivity, gathered } = this.#gather(inhabitant));
    }

    if (nextActivity !== source.activity) {
      if (nextActivity === "eating")
        this.#record(
          inhabitant.id,
          `${inhabitant.name} ate ${distance(inhabitant, CAMP) <= 2 ? "from the communal store" : "from their carried provisions"}.`,
        );
      else if (nextActivity === "resting")
        this.#record(
          inhabitant.id,
          `${inhabitant.name} settled into their ${home.progress >= 100 ? "sheltered bed" : "bedroll"} to rest.`,
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
    if (nextActivity !== source.activity) inhabitant.actionTicks = 0;
    inhabitant.activity = nextActivity;
    // Personal memories persist independently of the village's rolling chronicle.
    const memory = this.#chronicle.at(-1);
    if (
      memory?.tick === this.#tick &&
      memory.inhabitantId === inhabitant.id &&
      !inhabitant.memories.some(
        (entry) => entry.tick === memory.tick && entry.text === memory.text,
      )
    ) {
      inhabitant.memories.push({ ...memory });
      inhabitant.memories = inhabitant.memories.slice(-24);
    }
    if (inhabitant.hunger >= 100)
      inhabitant.health -= 1.2 / inhabitant.personality.resilience;
    if (inhabitant.fatigue >= 100)
      inhabitant.health -= 0.45 / inhabitant.personality.resilience;
    if (inhabitant.hunger < 75 && inhabitant.fatigue < 85)
      inhabitant.health = Math.min(
        100,
        inhabitant.health + 0.04 * inhabitant.skills.care,
      );
    return { inhabitant, meal, conversation, gathered, deposited, prepared };
  }

  #buildHome(inhabitant: Inhabitant, home: Shelter): Activity {
    if (inhabitant.carriedWood > 0 || home.timber >= 8) {
      if (distance(inhabitant, home) > 1) {
        this.#moveToward(inhabitant, home);
        return "building";
      }
      if (inhabitant.carriedWood > 0) {
        const used = Math.min(8 - home.timber, inhabitant.carriedWood);
        home.timber += used;
        inhabitant.carriedWood -= used;
      }
      if (home.timber >= 8) {
        home.progress = Math.min(100, home.progress + 1);
        if (home.progress === 100)
          this.#record(
            inhabitant.id,
            `${inhabitant.name} finished shelter ${String(home.id)}. Its two beds now offer better rest.`,
          );
      }
      return "building";
    }
    let tree: { x: number; y: number } | undefined;
    for (let cell = 0; cell < this.#terrainByCell.length; cell++) {
      if (this.#terrainByCell[cell] !== "woods") continue;
      const candidate = { x: cell % WIDTH, y: Math.floor(cell / WIDTH) };
      if (!tree || distance(inhabitant, candidate) < distance(inhabitant, tree))
        tree = candidate;
    }
    if (tree) {
      if (distance(inhabitant, tree) > 0) this.#moveToward(inhabitant, tree);
      else {
        inhabitant.workProgress += 1;
        if (inhabitant.workProgress >= 12) {
          inhabitant.workProgress = 0;
          this.#terrainByCell[cellOf(tree.x, tree.y)] = "meadow";
          inhabitant.carriedWood += 4;
          this.#record(
            inhabitant.id,
            `${inhabitant.name} felled a tree and carried its timber for their shelter.`,
          );
        }
      }
    }
    return "woodcutting";
  }

  #gather(inhabitant: Inhabitant): {
    activity: Activity;
    gathered: number;
  } {
    const cell = cellOf(inhabitant.x, inhabitant.y);
    const available = this.#foodByCell[cell] ?? 0;
    const capacity = inhabitant.role === "forager" ? 6 : 4;
    if (available >= 0.25 && inhabitant.carriedFood < capacity) {
      const amount = Math.min(
        available,
        capacity - inhabitant.carriedFood,
        0.55 * inhabitant.skills.gathering,
      );
      this.#foodByCell[cell] = available - amount;
      this.#totalFood -= amount;
      inhabitant.carriedFood += amount;
      return { activity: "gathering", gathered: amount };
    }
    const target = this.#nearestFood(inhabitant);
    if (target === null) this.#wander(inhabitant);
    else this.#moveToward(inhabitant, target);
    return { activity: "foraging", gathered: 0 };
  }

  #nearestFood(inhabitant: Inhabitant): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let cell = 0; cell < this.#foodByCell.length; cell += 1) {
      if ((this.#foodByCell[cell] ?? 0) < 0.25) continue;
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
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of this.#inhabitants) {
      if (
        candidate.id === inhabitant.id ||
        candidate.health <= 0 ||
        candidate.activity === "resting"
      )
        continue;
      const score =
        distance(inhabitant, candidate) -
        (inhabitant.relationships[String(candidate.id)] ?? 0) / 10;
      if (
        score < bestScore ||
        (score === bestScore && (best === null || candidate.id < best.id))
      ) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  #moveToward(inhabitant: Inhabitant, target: { x: number; y: number }): void {
    if (distance(inhabitant, target) === 0) return;
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
      const cell = cellOf(next.x, next.y);
      this.#pathsByCell[cell] = Math.min(
        100,
        (this.#pathsByCell[cell] ?? 0) + 1,
      );
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
    building: "Building their shelter",
    woodcutting: "Harvesting timber for home",
    relaxing: "Taking some quiet time",
    exploring: "Exploring",
    foraging: "Searching for wild food",
    gathering: "Gathering wild food",
    hauling: "Carrying food to camp",
    cooking: "Preparing a communal meal",
    eating: "Taking time to eat",
    returning: "Heading home",
    resting: "Resting in their bed",
    "seeking-company": "Looking for company",
    socializing: "Talking with a neighbor",
  })[activity];
