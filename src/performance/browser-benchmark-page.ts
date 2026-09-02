import {
  BROWSER_BENCHMARK_SCENARIOS,
  runBrowserBenchmarkScenario,
  type BenchmarkResult,
} from "./browser-benchmark";

const element = (id: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`#${id}`);
  if (found === null)
    throw new Error(`Benchmark element #${id} was not found.`);
  return found;
};

const formatMs = (value: number): string => value.toFixed(1);
const formatHeap = (bytes: number | null): string =>
  bytes === null ? "Unavailable" : `${(bytes / 1_048_576).toFixed(1)} MiB`;

const renderResults = (results: readonly BenchmarkResult[]): void => {
  element("results").innerHTML = `<table>
    <thead><tr><th>Scenario</th><th>World</th><th>Population</th><th>Tick median</th><th>Frame p95</th><th>Estimated FPS</th><th>30 FPS budget</th><th>Heap change</th></tr></thead>
    <tbody>${results
      .map(
        (result) =>
          `<tr data-scenario="${result.name}"><td>${result.name}</td><td>${String(result.width)}×${String(result.height)}</td><td>${result.population.toLocaleString()}</td><td>${formatMs(result.tickMedianMs)} ms</td><td>${formatMs(result.frameP95Ms)} ms</td><td>${result.estimatedFramesPerSecond.toFixed(0)}</td><td class="${result.meetsThirtyFpsBudget ? "pass" : "fail"}">${result.meetsThirtyFpsBudget ? "Pass" : "Fail"}</td><td>${formatHeap(result.heapDeltaBytes)}</td></tr>`,
      )
      .join("")}</tbody>
  </table>`;
};

const run = async (): Promise<void> => {
  const canvas = element("benchmark-canvas") as HTMLCanvasElement;
  const results: BenchmarkResult[] = [];
  for (const scenario of BROWSER_BENCHMARK_SCENARIOS) {
    element("status").textContent =
      `Running ${scenario.name.toLowerCase()} scenario…`;
    results.push(await runBrowserBenchmarkScenario(canvas, scenario));
    renderResults(results);
  }
  element("status").textContent =
    "Benchmark complete. Results describe this browser and device, not every supported device.";
  document.documentElement.dataset.benchmark = "complete";
};

void run();
