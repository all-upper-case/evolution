import { describe, expect, it } from "vitest";
import { SettlementWorld } from "./settlement";
import { createSettlementPixels } from "./settlement-renderer";

describe("settlement renderer", () => {
  it("renders a deterministic opaque pixel map without changing the world", () => {
    const world = new SettlementWorld(42);
    const before = world.snapshot;
    const pixels = createSettlementPixels(before, before.inhabitants[0]?.id);
    expect(pixels).toHaveLength(before.width * before.height * 4);
    expect(
      Array.from(pixels)
        .filter((_, index) => index % 4 === 3)
        .every((alpha) => alpha === 255),
    ).toBe(true);
    expect(world.snapshot).toEqual(before);
  });
});
