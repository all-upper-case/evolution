import type { SettlementSnapshot } from "./settlement";

const COLORS = {
  meadow: [44, 84, 55, 255],
  woods: [20, 48, 37, 255],
  water: [30, 71, 92, 255],
  camp: [126, 87, 49, 255],
  food: [142, 205, 91, 255],
  inhabitant: [255, 199, 93, 255],
  selected: [103, 232, 255, 255],
} as const;

const writePixel = (
  pixels: Uint8ClampedArray,
  cell: number,
  color: readonly [number, number, number, number],
): void => {
  const offset = cell * 4;
  pixels.set(color, offset);
};

export const createSettlementPixels = (
  snapshot: SettlementSnapshot,
  selectedId?: number,
): Uint8ClampedArray => {
  const pixels = new Uint8ClampedArray(snapshot.width * snapshot.height * 4);
  for (let cell = 0; cell < snapshot.terrainByCell.length; cell += 1) {
    const terrain = snapshot.terrainByCell[cell] ?? "meadow";
    writePixel(pixels, cell, COLORS[terrain]);
    if ((snapshot.foodByCell[cell] ?? 0) >= 1)
      writePixel(pixels, cell, COLORS.food);
  }
  for (const inhabitant of snapshot.inhabitants)
    writePixel(
      pixels,
      inhabitant.y * snapshot.width + inhabitant.x,
      inhabitant.id === selectedId ? COLORS.selected : COLORS.inhabitant,
    );
  return pixels;
};

export const renderSettlement = (
  canvas: HTMLCanvasElement,
  snapshot: SettlementSnapshot,
  selectedId?: number,
): void => {
  if (canvas.width !== snapshot.width) canvas.width = snapshot.width;
  if (canvas.height !== snapshot.height) canvas.height = snapshot.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (context === null) throw new Error("Canvas 2D rendering is unavailable.");
  const image = context.createImageData(snapshot.width, snapshot.height);
  image.data.set(createSettlementPixels(snapshot, selectedId));
  context.putImageData(image, 0, 0);
};
