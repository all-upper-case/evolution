import type { Organism } from "../simulation/organism";
import type { WorldSnapshot } from "../simulation/world";

export interface ViewportRectangle {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WorldCell {
  x: number;
  y: number;
}

/** Maps a screen point on a scaled canvas back to a bounded world cell. */
export const worldCellAtPoint = (
  clientX: number,
  clientY: number,
  rectangle: ViewportRectangle,
  worldWidth: number,
  worldHeight: number,
): WorldCell | null => {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(clientY) ||
    rectangle.width <= 0 ||
    rectangle.height <= 0 ||
    clientX < rectangle.left ||
    clientY < rectangle.top ||
    clientX >= rectangle.left + rectangle.width ||
    clientY >= rectangle.top + rectangle.height
  ) {
    return null;
  }

  return {
    x: Math.floor(((clientX - rectangle.left) / rectangle.width) * worldWidth),
    y: Math.floor(((clientY - rectangle.top) / rectangle.height) * worldHeight),
  };
};

/** Returns the oldest identity at a cell when organisms overlap. */
export const organismAtCell = (
  snapshot: WorldSnapshot,
  cell: WorldCell,
): Organism | null =>
  snapshot.organisms.find(
    (organism) => organism.x === cell.x && organism.y === cell.y,
  ) ?? null;
