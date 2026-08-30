import { describe, expect, it } from "vitest";

import { createDefaultSimulationConfig } from "../simulation/configuration";
import { SimulationWorld } from "../simulation/world";
import { createWorldPixels } from "./world-renderer";

describe("world renderer", () => {
  it("creates exactly one opaque pixel per world cell", () => {
    const config = createDefaultSimulationConfig();
    config.world.width = 16;
    config.world.height = 16;
    config.population.initialCount = 1;
    config.population.maximumCount = 1;
    config.food.initialUnits = 0;
    const snapshot = new SimulationWorld(config).snapshot;

    const pixels = createWorldPixels(snapshot);

    expect(pixels).toHaveLength(16 * 16 * 4);
    const transparentCells: number[] = [];
    for (let alpha = 3; alpha < pixels.length; alpha += 4) {
      if (pixels[alpha] !== 255) transparentCells.push((alpha - 3) / 4);
    }
    expect(transparentCells).toEqual([]);
  });

  it("draws organisms over resources without changing snapshot state", () => {
    const config = createDefaultSimulationConfig();
    config.world.width = 16;
    config.world.height = 16;
    config.population.initialCount = 1;
    config.population.maximumCount = 1;
    config.food.initialUnits = 256;
    config.food.maximumUnits = 256;
    const world = new SimulationWorld(config);
    const snapshot = world.snapshot;
    const organism = snapshot.organisms[0];
    expect(organism).toBeDefined();
    if (organism === undefined) throw new Error("Expected one organism.");

    const before = JSON.stringify(snapshot);
    const pixels = createWorldPixels(snapshot);
    const offset = (organism.y * snapshot.width + organism.x) * 4;

    expect(Array.from(pixels.slice(offset, offset + 3))).toEqual([
      255, 194, 99,
    ]);
    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it("maps higher food quantities to brighter green pixels", () => {
    const config = createDefaultSimulationConfig();
    config.world.width = 16;
    config.world.height = 16;
    config.population.initialCount = 1;
    config.population.maximumCount = 1;
    config.food.initialUnits = 256;
    config.food.maximumUnits = 256;
    const snapshot = new SimulationWorld(config).snapshot;
    const pixels = createWorldPixels(snapshot);
    const greens = snapshot.foodByCell
      .map((food, cell) => ({ food, green: pixels[cell * 4 + 1] ?? 0 }))
      .filter(({ food }) => food > 0)
      .sort((first, second) => first.food - second.food);

    expect(greens.length).toBeGreaterThan(1);
    expect(greens.at(-1)?.green).toBeGreaterThanOrEqual(greens[0]?.green ?? 0);
  });
});
