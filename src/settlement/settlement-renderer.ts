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

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
export const cameraBounds = (
  camera: Camera,
): { left: number; top: number; span: number } => {
  const span = 64 / Math.max(1, Math.min(4, camera.zoom));
  return {
    left: Math.max(0, Math.min(64 - span, camera.x - span / 2)),
    top: Math.max(0, Math.min(64 - span, camera.y - span / 2)),
    span,
  };
};
export const mapPoint = (
  camera: Camera,
  u: number,
  v: number,
): { x: number; y: number } => {
  const { left, top, span } = cameraBounds(camera);
  return { x: left + u * span, y: top + v * span };
};

export const renderSettlement = (
  canvas: HTMLCanvasElement,
  snapshot: SettlementSnapshot,
  selectedId?: number,
  camera: Camera = { x: 32, y: 32, zoom: 1 },
): void => {
  const size = 960;
  if (canvas.width !== size) canvas.width = size;
  if (canvas.height !== size) canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D rendering is unavailable.");
  const { left, top, span } = cameraBounds(camera);
  const scale = size / span;
  ctx.fillStyle = "#527052";
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-left, -top);
  for (let y = Math.floor(top); y < Math.min(64, top + span + 1); y++) {
    for (let x = Math.floor(left); x < Math.min(64, left + span + 1); x++) {
      const cell = y * 64 + x;
      const terrain = snapshot.terrainByCell[cell];
      ctx.fillStyle =
        terrain === "water"
          ? "#547e8e"
          : terrain === "camp"
            ? "#b19a73"
            : (x * 13 + y * 7) % 5 === 0
              ? "#617d57"
              : "#587651";
      ctx.fillRect(x, y, 1.01, 1.01);
      if ((snapshot.pathsByCell[cell] ?? 0) > 3) {
        ctx.globalAlpha = Math.min(
          0.85,
          (snapshot.pathsByCell[cell] ?? 0) / 35,
        );
        ctx.fillStyle = "#b5a081";
        ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 1;
      }
      if (terrain === "woods") {
        ctx.fillStyle = "#334f39";
        ctx.beginPath();
        ctx.ellipse(x + 0.65, y + 0.7, 0.48, 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#70533d";
        ctx.fillRect(x + 0.43, y + 0.45, 0.15, 0.5);
        ctx.fillStyle = (x + y) % 2 ? "#244e3c" : "#2e5b40";
        ctx.beginPath();
        ctx.ellipse(x + 0.5, y + 0.32, 0.42, 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if ((snapshot.foodByCell[cell] ?? 0) >= 0.25) {
        ctx.fillStyle = "#dcc272";
        ctx.fillRect(x + 0.12, y + 0.65, 0.15, 0.13);
        ctx.fillRect(x + 0.28, y + 0.72, 0.12, 0.12);
      }
    }
  }
  ctx.font = "0.55px system-ui";
  ctx.textAlign = "center";
  for (const home of snapshot.shelters) {
    ctx.fillStyle = home.progress >= 100 ? "#a18560" : "#9c9574";
    ctx.fillRect(home.x - 1.8, home.y - 1.2, 3.6, 2.8);
    ctx.strokeStyle = home.progress >= 100 ? "#654631" : "#bcab82";
    ctx.lineWidth = home.progress >= 100 ? 0.22 : 0.08;
    ctx.strokeRect(home.x - 1.8, home.y - 1.2, 3.6, 2.8);
    for (const offset of [-1, 1]) {
      ctx.fillStyle = home.progress >= 100 ? "#70878c" : "#84756b";
      ctx.fillRect(home.x + offset - 0.3, home.y - 0.4, 0.65, 1.2);
      ctx.fillStyle = "#e4d9ba";
      ctx.fillRect(home.x + offset - 0.3, home.y - 0.4, 0.65, 0.25);
    }
    ctx.fillStyle = "#fff0cb";
    ctx.fillText(
      home.progress >= 100
        ? `Home ${String(home.id)}`
        : `Shelter ${String(home.id)} · ${String(home.progress)}%`,
      home.x,
      home.y + 2.2,
    );
  }
  ctx.fillStyle = "#645440";
  ctx.fillRect(31.4, 31.4, 1.2, 1.2);
  ctx.fillStyle = "#efaa50";
  ctx.beginPath();
  ctx.arc(32, 32, 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dacba5";
  ctx.fillText("Hearth & provisions", 32, 34);
  const shirts = ["#e4ac63", "#a4bdc5", "#d08b7a", "#c4b1d2", "#dbd49c"];
  for (const person of [...snapshot.inhabitants].sort(
    (a, b) => a.y - b.y || a.id - b.id,
  )) {
    // Stable offsets keep people sharing a tile distinguishable without changing positions.
    const x = person.x + 0.3 + (person.id % 3) * 0.15;
    const y = person.y + 0.5;
    ctx.fillStyle = "#263b36";
    ctx.beginPath();
    ctx.ellipse(x, y + 0.32, 0.32, 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shirts[person.id % shirts.length] ?? "#e4ac63";
    ctx.fillRect(
      x - 0.2,
      y - 0.12,
      0.4,
      person.activity === "resting" ? 0.16 : 0.45,
    );
    ctx.fillStyle = person.id % 3 === 0 ? "#a87655" : "#e5bd95";
    ctx.beginPath();
    ctx.arc(x, y - 0.22, 0.18, 0, Math.PI * 2);
    ctx.fill();
    if (person.carriedFood > 0 || person.carriedWood > 0) {
      ctx.fillStyle = "#976435";
      ctx.fillRect(x + 0.18, y, 0.2, 0.28);
    }
    if (person.id === selectedId) {
      ctx.strokeStyle = "#fff0a4";
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.arc(x, y, 0.62, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (camera.zoom >= 2 || person.id === selectedId) {
      ctx.font = "0.42px system-ui";
      const label = person.name.split(" ")[0] ?? "";
      ctx.fillStyle = "#203029";
      ctx.fillRect(x - 1, y - 1.12, 2, 0.5);
      ctx.fillStyle = "#fff4dd";
      ctx.fillText(label, x, y - 0.74);
      if (person.activity === "resting") ctx.fillText("z z", x + 0.6, y - 0.2);
    }
  }
  ctx.restore();
  const hour = (6 + ((snapshot.tick % 600) * 24) / 600) % 24;
  if (hour >= 20 || hour < 6) {
    ctx.fillStyle = "rgba(12, 22, 53, 0.28)";
    ctx.fillRect(0, 0, size, size);
  }
};
