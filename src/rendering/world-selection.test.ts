import { describe, expect, it } from "vitest";
import { createDefaultSimulationConfig } from "../simulation/configuration";
import { SimulationWorld } from "../simulation/world";
import { organismAtCell, worldCellAtPoint } from "./world-selection";

describe("world selection", () => {
  it("maps scaled screen coordinates to bounded world cells", () => {
    const rectangle = { left: 10, top: 20, width: 256, height: 128 };
    expect(worldCellAtPoint(10, 20, rectangle, 128, 128)).toEqual({
      x: 0,
      y: 0,
    });
    expect(worldCellAtPoint(265.9, 147.9, rectangle, 128, 128)).toEqual({
      x: 127,
      y: 127,
    });
    expect(worldCellAtPoint(266, 40, rectangle, 128, 128)).toBeNull();
    expect(
      worldCellAtPoint(20, 40, { ...rectangle, width: 0 }, 128, 128),
    ).toBeNull();
  });

  it("selects the oldest identity when organisms share a cell", () => {
    const snapshot = new SimulationWorld(createDefaultSimulationConfig())
      .snapshot;
    const first = snapshot.organisms[0];
    if (first === undefined) throw new Error("Expected a founder organism.");
    const selected = organismAtCell(snapshot, { x: first.x, y: first.y });
    const expected = snapshot.organisms.find(
      (organism) => organism.x === first.x && organism.y === first.y,
    );
    expect(selected).toEqual(expected);
    expect(organismAtCell(snapshot, { x: -1, y: -1 })).toBeNull();
  });
});
