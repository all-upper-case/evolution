import { traitHistogram } from "../analytics/history";
import { histogramBars, lineChartPoints } from "../rendering/chart-data";
import { renderWorld } from "../rendering/world-renderer";
import {
  createDefaultSimulationConfig,
  parseSimulationConfig,
  type SimulationConfig,
} from "../simulation/configuration";
import { GENOME_TRAIT_RANGES } from "../simulation/organism";
import { SimulationWorld } from "../simulation/world";

export interface BenchmarkScenario {
  name: string;
  width: number;
  height: number;
  population: number;
  samples: number;
}

export interface BenchmarkResult extends BenchmarkScenario {
  tickMedianMs: number;
  tickP95Ms: number;
  frameMedianMs: number;
  frameP95Ms: number;
  estimatedFramesPerSecond: number;
  meetsThirtyFpsBudget: boolean;
  heapDeltaBytes: number | null;
}

export const BROWSER_BENCHMARK_SCENARIOS: readonly BenchmarkScenario[] =
  Object.freeze([
    Object.freeze({
      name: "Default",
      width: 128,
      height: 128,
      population: 250,
      samples: 24,
    }),
    Object.freeze({
      name: "Recommended ceiling",
      width: 256,
      height: 256,
      population: 1_000,
      samples: 12,
    }),
    Object.freeze({
      name: "Population stress",
      width: 256,
      height: 256,
      population: 5_000,
      samples: 5,
    }),
  ]);

interface MemoryPerformance extends Performance {
  memory?: { usedJSHeapSize: number };
}

const percentile = (values: readonly number[], fraction: number): number => {
  if (values.length === 0)
    throw new RangeError("At least one sample is required.");
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil(ordered.length * fraction) - 1),
  );
  return ordered[index] ?? 0;
};

export const summarizeDurations = (
  values: readonly number[],
): { median: number; p95: number } => ({
  median: percentile(values, 0.5),
  p95: percentile(values, 0.95),
});

export const benchmarkConfig = (
  scenario: BenchmarkScenario,
): SimulationConfig => {
  const defaults = createDefaultSimulationConfig();
  const cells = scenario.width * scenario.height;
  return parseSimulationConfig({
    ...defaults,
    world: {
      ...defaults.world,
      width: scenario.width,
      height: scenario.height,
    },
    population: {
      initialCount: scenario.population,
      maximumCount: scenario.population,
    },
    food: {
      ...defaults.food,
      initialUnits: Math.min(defaults.food.initialUnits, cells),
      maximumUnits: Math.min(defaults.food.maximumUnits, cells * 4),
    },
  });
};

const renderRepresentativeFrame = (
  canvas: HTMLCanvasElement,
  world: SimulationWorld,
  chartValues: readonly number[],
): void => {
  const snapshot = world.snapshot;
  renderWorld(canvas, snapshot);
  lineChartPoints(chartValues, 300, 100);
  lineChartPoints(chartValues, 300, 100, 100);
  lineChartPoints(chartValues, 300, 100, 100);
  for (const trait of Object.keys(
    GENOME_TRAIT_RANGES,
  ) as (keyof typeof GENOME_TRAIT_RANGES)[]) {
    const range = GENOME_TRAIT_RANGES[trait];
    histogramBars(
      traitHistogram(snapshot, trait, range.minimum, range.maximum),
      120,
      54,
    );
  }
};

export const runBrowserBenchmarkScenario = async (
  canvas: HTMLCanvasElement,
  scenario: BenchmarkScenario,
): Promise<BenchmarkResult> => {
  const config = benchmarkConfig(scenario);
  const world = new SimulationWorld(config);
  const chartValues = Array.from({ length: 600 }, (_, index) => index % 100);
  world.step();
  renderRepresentativeFrame(canvas, world, chartValues);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const memory = performance as MemoryPerformance;
  const heapBefore = memory.memory?.usedJSHeapSize ?? null;
  const tickDurations: number[] = [];
  const frameDurations: number[] = [];

  for (let sample = 0; sample < scenario.samples; sample += 1) {
    const tickStart = performance.now();
    world.step();
    const tickEnd = performance.now();
    renderRepresentativeFrame(canvas, world, chartValues);
    const frameEnd = performance.now();
    tickDurations.push(tickEnd - tickStart);
    frameDurations.push(frameEnd - tickStart);
    if (sample % 4 === 3)
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
  }

  const heapAfter = memory.memory?.usedJSHeapSize ?? null;
  const tick = summarizeDurations(tickDurations);
  const frame = summarizeDurations(frameDurations);
  return {
    ...scenario,
    tickMedianMs: tick.median,
    tickP95Ms: tick.p95,
    frameMedianMs: frame.median,
    frameP95Ms: frame.p95,
    estimatedFramesPerSecond: 1_000 / Math.max(frame.median, 0.01),
    meetsThirtyFpsBudget: frame.p95 <= 1_000 / 30,
    heapDeltaBytes:
      heapBefore === null || heapAfter === null ? null : heapAfter - heapBefore,
  };
};
