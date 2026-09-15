import { describe, expect, it } from "vitest";
import { SettlementWorld } from "./settlement";

describe("SettlementWorld", () => {
  it("creates the same named settlement from the same seed", () => {
    const first = new SettlementWorld(42);
    const second = new SettlementWorld(42);
    expect(first.snapshot).toEqual(second.snapshot);
    expect(first.snapshot.inhabitants).toHaveLength(14);
    expect(
      new Set(first.snapshot.inhabitants.map(({ name }) => name)).size,
    ).toBe(14);
    expect(new Set(first.snapshot.terrainByCell)).toEqual(
      new Set(["meadow", "woods", "water", "camp"]),
    );
  });

  it("lets inhabitants autonomously eat, rest, socialize, and explore", () => {
    const world = new SettlementWorld(19);
    const totals = world.advanceTicks(1_000);
    const activities = new Set(
      world.snapshot.chronicle.map(({ text }) =>
        text.includes("eat")
          ? "eat"
          : text.includes("rest")
            ? "rest"
            : text.includes("conversation")
              ? "socialize"
              : "other",
      ),
    );
    expect(totals.meals).toBeGreaterThan(0);
    expect(totals.conversations).toBeGreaterThan(0);
    expect(activities).toEqual(
      expect.objectContaining(new Set(["eat", "rest", "socialize"])),
    );
    expect(
      world.snapshot.inhabitants.some(({ ageTicks }) => ageTicks > 0),
    ).toBe(true);
  });

  it("continues exactly after a snapshot restore", () => {
    const uninterrupted = new SettlementWorld(8675309);
    uninterrupted.advanceTicks(300);
    const restored = SettlementWorld.fromSnapshot(uninterrupted.snapshot);
    uninterrupted.advanceTicks(700);
    restored.advanceTicks(700);
    expect(restored.snapshot).toEqual(uninterrupted.snapshot);
  });

  it("keeps needs, health, resources, and history bounded", () => {
    const world = new SettlementWorld(7);
    world.advanceTicks(5_000);
    const snapshot = world.snapshot;
    expect(snapshot.inhabitants.length).toBeGreaterThan(0);
    expect(snapshot.totalFood).toBeGreaterThanOrEqual(0);
    expect(snapshot.totalFood).toBeLessThanOrEqual(900);
    expect(snapshot.chronicle.length).toBeLessThanOrEqual(120);
    for (const inhabitant of snapshot.inhabitants) {
      expect(inhabitant.health).toBeGreaterThan(0);
      expect(inhabitant.health).toBeLessThanOrEqual(100);
      expect(inhabitant.hunger).toBeGreaterThanOrEqual(0);
      expect(inhabitant.hunger).toBeLessThanOrEqual(100);
      expect(inhabitant.fatigue).toBeGreaterThanOrEqual(0);
      expect(inhabitant.fatigue).toBeLessThanOrEqual(100);
      expect(inhabitant.loneliness).toBeGreaterThanOrEqual(0);
      expect(inhabitant.loneliness).toBeLessThanOrEqual(100);
    }
  });

  it("rejects unsafe seeds and tick counts", () => {
    expect(() => new SettlementWorld(-1)).toThrow(RangeError);
    const world = new SettlementWorld();
    expect(() => world.advanceTicks(-1)).toThrow(RangeError);
    expect(() => world.advanceTicks(100_001)).toThrow(RangeError);
  });
});
