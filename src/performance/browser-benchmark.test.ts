import { describe, expect, it } from "vitest";

import {
  BROWSER_BENCHMARK_SCENARIOS,
  benchmarkConfig,
  summarizeDurations,
} from "./browser-benchmark";

describe("browser benchmark", () => {
  it("uses bounded representative scenarios", () => {
    expect(BROWSER_BENCHMARK_SCENARIOS.map(benchmarkConfig)).toHaveLength(3);
    expect(
      BROWSER_BENCHMARK_SCENARIOS.map((scenario) => scenario.population),
    ).toEqual([250, 1_000, 5_000]);
  });

  it("reports medians and conservative p95 durations", () => {
    expect(summarizeDurations([9, 1, 5, 3, 7])).toEqual({ median: 5, p95: 9 });
  });

  it("rejects an empty sample set", () => {
    expect(() => summarizeDurations([])).toThrow("At least one sample");
  });
});
