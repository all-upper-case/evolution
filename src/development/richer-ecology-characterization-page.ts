import { runRicherEcologyCharacterization } from "./richer-ecology-characterization";

const report = document.querySelector<HTMLElement>("#report");
const status = document.querySelector<HTMLElement>("#status");
if (report === null || status === null)
  throw new Error("Richer-ecology report elements were not found.");

try {
  const result = runRicherEcologyCharacterization();
  report.textContent = JSON.stringify(result, null, 2);
  status.textContent = `Complete: ${result.outcomes.length.toLocaleString()} deterministic runs through ${result.ticks.toLocaleString()} ticks.`;
  document.documentElement.dataset.characterizationStatus = "complete";
} catch (error: unknown) {
  const reason = error instanceof Error ? error.message : "Unknown error";
  report.textContent = JSON.stringify({ error: reason }, null, 2);
  status.textContent = `Could not characterize the richer ecology: ${reason}`;
  status.className = "error";
  document.documentElement.dataset.characterizationStatus = "error";
}
