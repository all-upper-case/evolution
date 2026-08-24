import "./styles.css";

import { SeededRandom } from "./simulation/random";

const app = document.querySelector<HTMLElement>("#app");

if (app === null) {
  throw new Error("Application root was not found.");
}

app.innerHTML = `
  <section class="shell" aria-labelledby="page-title">
    <header class="hero">
      <p class="eyebrow">Deterministic ecosystem laboratory</p>
      <h1 id="page-title">Evolution</h1>
      <p class="summary">
        A living sandbox for observing inheritance, competition, mutation, and
        ecological change. The simulation world is being built from a tested,
        reproducible foundation.
      </p>
    </header>

    <section class="panel" aria-labelledby="foundation-title">
      <div>
        <p class="status"><span aria-hidden="true"></span> Foundation online</p>
        <h2 id="foundation-title">Seeded randomness preview</h2>
        <p>
          Enter a whole-number seed. The same seed always produces the same
          sequence—the first invariant required by the future ecosystem.
        </p>
      </div>

      <form id="seed-form" class="seed-form">
        <label for="seed">Seed</label>
        <div class="input-row">
          <input id="seed" name="seed" type="number" step="1" value="42" required />
          <button type="submit">Generate</button>
        </div>
      </form>

      <output id="sequence" class="sequence" aria-live="polite"></output>
    </section>

    <footer>
      <span>Milestone 0</span>
      <span>Simulation core next</span>
    </footer>
  </section>
`;

const seedForm = document.querySelector<HTMLFormElement>("#seed-form");
const seedInput = document.querySelector<HTMLInputElement>("#seed");
const sequenceOutput = document.querySelector<HTMLOutputElement>("#sequence");

if (seedForm === null || seedInput === null || sequenceOutput === null) {
  throw new Error("Seed preview controls were not found.");
}

const renderSequence = (): void => {
  const seed = Number(seedInput.value);

  if (!Number.isSafeInteger(seed)) {
    sequenceOutput.textContent = "Enter a safe whole-number seed.";
    return;
  }

  const random = new SeededRandom(seed);
  const values = Array.from({ length: 5 }, () => random.next().toFixed(6));
  sequenceOutput.innerHTML = values
    .map(
      (value, index) =>
        `<span><small>${String(index + 1)}</small>${value}</span>`,
    )
    .join("");
};

seedForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderSequence();
});

renderSequence();
