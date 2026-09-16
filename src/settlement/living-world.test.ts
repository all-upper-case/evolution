import { describe, expect, it } from "vitest";
import { SettlementWorld, DAY_TICKS, isNight } from "./settlement";
import { parseSettlement } from "./persistence";
import { mapPoint } from "./settlement-renderer";

describe("a persistent lived-in village", () => {
  it.each([7, 19, 42, 99])(
    "builds homes, wears paths, and remembers neighbors with seed %s",
    (seed) => {
      const world = new SettlementWorld(seed);
      const initialTrees = world.snapshot.terrainByCell.filter(
        (t) => t === "woods",
      ).length;
      world.advanceTicks(6000);
      const s = world.snapshot;
      expect(s.inhabitants).toHaveLength(14);
      expect(
        s.shelters.filter((h) => h.progress === 100).length,
      ).toBeGreaterThan(0);
      const felled =
        initialTrees - s.terrainByCell.filter((t) => t === "woods").length;
      expect(felled * 4).toBe(
        s.shelters.reduce((n, h) => n + h.timber, 0) +
          s.inhabitants.reduce((n, p) => n + p.carriedWood, 0),
      );
      expect(s.pathsByCell.filter((wear) => wear >= 20).length).toBeGreaterThan(
        10,
      );
      expect(
        s.inhabitants.some((p) => Object.keys(p.relationships).length > 0),
      ).toBe(true);
      expect(
        s.inhabitants.every(
          (p) => p.memories.length > 0 && p.memories.length <= 24,
        ),
      ).toBe(true);
      const restored = SettlementWorld.fromSnapshot(
        parseSettlement(JSON.stringify(s)),
      );
      world.advanceTicks(700);
      restored.advanceTicks(700);
      expect(restored.snapshot).toEqual(world.snapshot);
    },
  );
  it("keeps rest sustained and uses the assigned bed", () => {
    const world = new SettlementWorld(42);
    let consecutive = 0,
      longest = 0;
    for (let i = 0; i < DAY_TICKS * 2; i++) {
      world.step();
      const s = world.snapshot,
        p = s.inhabitants[0];
      if (!p) throw new Error("Missing resident");
      if (p.activity === "resting") {
        consecutive++;
        const h = s.shelters.find((h) => h.id === p.homeId);
        if (!h) throw new Error("Missing home");
        expect(p.x).toBe(h.x - 1);
        expect(p.y).toBe(h.y);
      } else consecutive = 0;
      longest = Math.max(longest, consecutive);
    }
    expect(longest).toBeGreaterThan(15);
    expect(isNight(0)).toBe(false);
    expect(isNight(400)).toBe(true);
  });
  it("rejects corrupt external states and future formats", () => {
    const s = new SettlementWorld().snapshot;
    for (const bad of [
      { ...s, schemaVersion: 2 },
      { ...s, totalFood: 0 },
      { ...s, pathsByCell: [] },
      { ...s, inhabitants: [s.inhabitants[0], s.inhabitants[0]] },
      { ...s, inhabitants: [{ ...s.inhabitants[0], homeId: 88 }] },
      { ...s, inhabitants: [{ ...s.inhabitants[0], health: null }] },
      {
        ...s,
        shelters: s.shelters.map((h) => ({ ...h, progress: 100, timber: 0 })),
      },
    ])
      expect(() => parseSettlement(JSON.stringify(bad))).toThrow();
  });
  it("maps pointer positions through a bounded camera without influencing simulation", () => {
    expect(mapPoint({ x: 32, y: 32, zoom: 2 }, 0.5, 0.5)).toEqual({
      x: 32,
      y: 32,
    });
    expect(mapPoint({ x: -10, y: -10, zoom: 4 }, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(mapPoint({ x: 80, y: 80, zoom: 4 }, 1, 1)).toEqual({ x: 64, y: 64 });
  });
});
