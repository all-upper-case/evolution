import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  new URL("../styles.css", import.meta.url),
  "utf8",
);

const channel = (hex: string, offset: number): number =>
  Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;

const luminance = (hex: string): number => {
  const linear = [0, 2, 4].map((offset) => {
    const value = channel(hex, offset);
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (
    0.2126 * (linear[0] ?? 0) +
    0.7152 * (linear[1] ?? 0) +
    0.0722 * (linear[2] ?? 0)
  );
};

const contrastRatio = (foreground: string, background: string): number => {
  const values = [luminance(foreground), luminance(background)].sort(
    (first, second) => second - first,
  );
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
};

describe("accessible presentation", () => {
  it("keeps every small-text palette color above WCAG AA contrast", () => {
    const background = "07120e";
    const foregrounds = [
      "eaf4ed",
      "b9c9be",
      "82d69f",
      "789484",
      "9eb2a4",
      "668a72",
    ];
    for (const foreground of foregrounds) {
      expect(stylesheet).toContain(`#${foreground}`);
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("provides focus, non-color chart, reduced-motion, and mobile rules", () => {
    expect(stylesheet).toContain("#world:focus-visible");
    expect(stylesheet).toContain("stroke-dasharray");
    expect(stylesheet).toContain("@media (max-width: 58rem)");
    expect(stylesheet).toContain("@media (max-width: 40rem)");
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
