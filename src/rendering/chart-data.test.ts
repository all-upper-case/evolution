import { describe, expect, it } from "vitest";
import { histogramBars, lineChartPoints } from "./chart-data";

describe("chart data", () => {
  it("maps a series into a bounded shared coordinate system", () => {
    expect(lineChartPoints([0, 5, 10], 100, 50, 10)).toBe(
      "0.00,50.00 50.00,25.00 100.00,0.00",
    );
    expect(lineChartPoints([], 100, 50)).toBe("");
  });

  it("renders one histogram rectangle per bin", () => {
    const markup = histogramBars([0, 2, 4], 30, 20);
    expect(markup.match(/<rect/g)).toHaveLength(3);
    expect(markup).toContain('x="20.00"');
    expect(markup).toContain('height="20.00"');
  });
});
