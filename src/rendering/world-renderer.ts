import type { WorldSnapshot } from "../simulation/world";

const BACKGROUND = [7, 18, 14, 255] as const;
const ORGANISM_LOW_ENERGY = [255, 171, 64] as const;
const ORGANISM_HIGH_ENERGY = [255, 241, 168] as const;
const SELECTED_ORGANISM = [86, 224, 255, 255] as const;

const writePixel = (
  pixels: Uint8ClampedArray,
  cell: number,
  color: readonly [number, number, number, number],
): void => {
  const offset = cell * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
};

/** Converts an immutable world snapshot into one RGBA pixel per world cell. */
export const createWorldPixels = (
  snapshot: WorldSnapshot,
  selectedOrganismId?: number,
): Uint8ClampedArray => {
  const pixels = new Uint8ClampedArray(snapshot.width * snapshot.height * 4);

  for (let cell = 0; cell < snapshot.foodByCell.length; cell += 1) {
    const food = snapshot.foodByCell[cell] ?? 0;
    if (food <= 0) {
      writePixel(pixels, cell, BACKGROUND);
      continue;
    }
    const intensity = Math.round(80 + 175 * Math.min(1, food / 4));
    writePixel(pixels, cell, [20, intensity, 92, 255]);
  }

  for (const organism of snapshot.organisms) {
    if (organism.id === selectedOrganismId) {
      writePixel(
        pixels,
        organism.y * snapshot.width + organism.x,
        SELECTED_ORGANISM,
      );
      continue;
    }
    const energyRatio = Math.min(
      1,
      organism.energy / snapshot.config.organisms.maximumEnergy,
    );
    const color: [number, number, number, number] = [
      255,
      Math.round(
        ORGANISM_LOW_ENERGY[1] +
          (ORGANISM_HIGH_ENERGY[1] - ORGANISM_LOW_ENERGY[1]) * energyRatio,
      ),
      Math.round(
        ORGANISM_LOW_ENERGY[2] +
          (ORGANISM_HIGH_ENERGY[2] - ORGANISM_LOW_ENERGY[2]) * energyRatio,
      ),
      255,
    ];
    writePixel(pixels, organism.y * snapshot.width + organism.x, color);
  }

  return pixels;
};

/** Paints a world without advancing or otherwise mutating the simulation. */
export const renderWorld = (
  canvas: HTMLCanvasElement,
  snapshot: WorldSnapshot,
  selectedOrganismId?: number,
): void => {
  if (canvas.width !== snapshot.width) canvas.width = snapshot.width;
  if (canvas.height !== snapshot.height) canvas.height = snapshot.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (context === null) throw new Error("Canvas 2D rendering is unavailable.");
  const image = context.createImageData(snapshot.width, snapshot.height);
  image.data.set(createWorldPixels(snapshot, selectedOrganismId));
  context.putImageData(image, 0, 0);
};
