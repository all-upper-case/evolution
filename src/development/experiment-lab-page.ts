import { parseLabRequest, runLabExperiment } from "./experiment-lab";

const element = (id: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`#${id}`);
  if (found === null) throw new Error(`Lab element #${id} was not found.`);
  return found;
};

const queryInput = element("lab-query") as HTMLTextAreaElement;
const status = element("status");
const report = element("report");

const render = (): void => {
  try {
    const request = parseLabRequest(window.location.search);
    const result = runLabExperiment(request);
    report.textContent = JSON.stringify(result, null, 2);
    status.textContent = `Complete: ${request.ticks.toLocaleString()} deterministic ticks and ${result.checkpoints.length.toLocaleString()} checkpoints.`;
    status.className = "";
    document.documentElement.dataset.labStatus = "complete";
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    report.textContent = JSON.stringify({ error: reason }, null, 2);
    status.textContent = `Could not run experiment: ${reason}`;
    status.className = "error";
    document.documentElement.dataset.labStatus = "error";
  }
};

queryInput.value =
  window.location.search.slice(1) ||
  "ticks=1000&checkpoints=0,250,500,750,1000";
element("lab-form").addEventListener("submit", (event) => {
  event.preventDefault();
  window.location.search = queryInput.value.trim();
});
render();
