import type { SettlementSnapshot } from "./settlement";

export const SAVE_KEY = "hearthwatch-world-v3";
const fail = (): never => {
  throw new Error("This is not a valid Hearthwatch version 3 world.");
};
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail();
  return value as Record<string, unknown>;
};
const number = (
  value: unknown,
  min: number,
  max: number,
  integer = false,
): number => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isSafeInteger(value))
  )
    return fail();
  return value;
};
const array = (value: unknown, max: number, exact = false): unknown[] => {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    (exact && value.length !== max)
  )
    return fail();
  return value as unknown[];
};
const string = (value: unknown, max: number): void => {
  if (typeof value !== "string" || value.length > max) fail();
};
const choices = (value: unknown, allowed: readonly unknown[]): void => {
  if (!allowed.includes(value)) fail();
};

/** Validate external state before it can replace a world or enter simulation loops. */
export function validateSettlement(
  value: unknown,
): asserts value is SettlementSnapshot {
  const s = object(value);
  choices(s.schemaVersion, [3]);
  choices(s.width, [64]);
  choices(s.height, [64]);
  number(s.seed, 0, 0xffff_ffff, true);
  number(s.randomState, 0, 0xffff_ffff, true);
  const tick = number(s.tick, 0, 1e12, true);
  const camp = object(s.camp);
  choices(camp.x, [32]);
  choices(camp.y, [32]);
  const terrain = array(s.terrainByCell, 4096, true);
  terrain.forEach((t) => choices(t, ["meadow", "woods", "water", "camp"]));
  let sum = 0;
  array(s.foodByCell, 4096, true).forEach((v, i) => {
    sum += number(v, 0, 4);
    if ((terrain[i] === "water" || terrain[i] === "camp") && v !== 0) fail();
  });
  if (Math.abs(sum - number(s.totalFood, 0, 900.000001)) > 1e-6) fail();
  array(s.pathsByCell, 4096, true).forEach((v) => number(v, 0, 100, true));
  const stores = object(s.stockpile);
  number(stores.rawFood, 0, 10000);
  number(stores.preparedMeals, 0, 10000, true);
  array(s.shelters, 7, true).forEach((v, i) => {
    const h = object(v);
    choices(h.id, [i + 1]);
    choices(h.x, [25 + (i % 4) * 5]);
    choices(h.y, [i < 4 ? 26 : 38]);
    number(h.timber, 0, 8, true);
    number(h.progress, 0, 100, true);
    if (Number(h.progress) > 0 && h.timber !== 8) fail();
  });
  const entry = (value: unknown): void => {
    const e = object(value);
    number(e.tick, 0, tick, true);
    string(e.text, 500);
    if (e.inhabitantId !== null) number(e.inhabitantId, 1, 14, true);
  };
  const ids = new Set<number>();
  array(s.inhabitants, 14).forEach((v) => {
    const p = object(v);
    const id = number(p.id, 1, 14, true);
    if (ids.has(id)) fail();
    ids.add(id);
    string(p.name, 100);
    choices(p.role, [
      "forager",
      "cook",
      "caretaker",
      "storykeeper",
      "naturalist",
    ]);
    const x = number(p.x, 0, 63, true),
      y = number(p.y, 0, 63, true);
    if (terrain[y * 64 + x] === "water") fail();
    number(p.ageTicks, 0, tick, true);
    for (const key of ["health", "hunger", "fatigue", "loneliness"])
      number(p[key], 0, 100);
    choices(p.activity, [
      "building",
      "woodcutting",
      "relaxing",
      "exploring",
      "foraging",
      "gathering",
      "hauling",
      "cooking",
      "eating",
      "returning",
      "resting",
      "seeking-company",
      "socializing",
    ]);
    if (p.targetId !== null) number(p.targetId, 1, 14, true);
    number(p.carriedFood, 0, 6);
    number(p.carriedWood, 0, 4, true);
    number(p.workProgress, 0, 20);
    number(p.actionTicks, 0, tick + 1, true);
    choices(p.homeId, [Math.floor((id - 1) / 2) + 1]);
    const personality = object(p.personality),
      skills = object(p.skills);
    for (const key of ["curiosity", "sociability", "resilience"])
      number(personality[key], 0.75, 1.25);
    for (const key of ["gathering", "cooking", "care", "fellowship"])
      number(skills[key], 0.5, 2);
    const relationships = object(p.relationships);
    if (Object.keys(relationships).length > 13) fail();
    for (const [key, affinity] of Object.entries(relationships)) {
      const other = number(Number(key), 1, 14, true);
      if (String(other) !== key || other === id) fail();
      number(affinity, 0, 100);
    }
    array(p.memories, 24).forEach(entry);
  });
  array(s.chronicle, 120).forEach(entry);
}
export const parseSettlement = (text: string): SettlementSnapshot => {
  if (text.length > 2_000_000)
    throw new Error("World files must be smaller than 2 MB.");
  const value: unknown = JSON.parse(text);
  validateSettlement(value);
  return value;
};
