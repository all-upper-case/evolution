import { runEcosystemCharacterization } from "./ecosystem-characterization";

const report = document.querySelector<HTMLElement>("#report");
const status = document.querySelector<HTMLElement>("#status");
if (report === null || status === null)
  throw new Error("Characterization report elements were not found.");

try {
  const result = runEcosystemCharacterization();
  report.textContent = JSON.stringify(result, null, 2);
  status.textContent = `Complete: ${result.runs.length.toLocaleString()} deterministic runs through ${result.ticks.toLocaleString()} ticks.`;
  document.documentElement.dataset.characterizationStatus = "complete";
} catch (error: unknown) {
  const reason = error instanceof Error ? error.message : "Unknown error";
  report.textContent = JSON.stringify({ error: reason }, null, 2);
  status.textContent = `Could not characterize ecosystems: ${reason}`;
  status.className = "error";
  document.documentElement.dataset.characterizationStatus = "error";
}
