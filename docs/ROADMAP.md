# Roadmap

This is the source of truth for autonomous development. Work from the earliest incomplete milestone unless a defect or dependency requires otherwise.

## Milestone 0 — Project foundation

- [x] Select and scaffold a minimal browser-oriented TypeScript toolchain.
- [x] Establish unit tests, type checking, linting, formatting, and CI.
- [x] Implement a seeded pseudorandom-number generator with determinism tests.
- [x] Establish simulation configuration, serialization conventions, and numerical limits.
- [x] Render a minimal application shell with simulation controls.

Exit condition: a tested application builds in CI and can run locally from a documented command.

## Milestone 1 — Deterministic ecological core

- [x] Implement a fixed-timestep world independent of display frame rate.
- [x] Represent a bounded two-dimensional environment with renewable food resources.
- [x] Implement organisms with position, age, energy, and inheritable genome traits.
- [x] Implement movement, feeding, metabolism, reproduction, mutation, and death.
- [x] Enforce population/resource limits and stable update ordering.
- [x] Add deterministic snapshot and replay tests.

Exit condition: seeded headless simulations show reproducible population dynamics over thousands of ticks.

## Milestone 2 — Watchable simulation

- [x] Visualize terrain, food, and organisms efficiently.
- [x] Add play, pause, step, speed, reset, and seed controls.
- [x] Add organism selection and trait/lineage inspection.
- [x] Add population, birth, death, resource, and trait-distribution charts.
- [x] Add accessible color choices and responsive layout.
- [x] Measure and document practical browser performance limits.

Exit condition: a user can run, understand, and inspect an evolving ecosystem without developer tools.

## Milestone 3 — Experiment tools

- [x] Export/import configuration, seed, and simulation snapshot.
- [x] Add environment and mutation controls with safe ranges.
- [x] Establish exact lifecycle-event accounting for analytics and experiments.
- [ ] Characterize default dynamics across seeds and representative environments.
- [ ] Add explicit trait costs/tradeoffs and calibrate default dynamics.
- [ ] Add extinction, equilibrium, and runaway-population diagnostics.
- [ ] Add named experiment presets based on demonstrated ecological regimes.
- [ ] Compare repeated runs and summarize outcomes.

Exit condition: users can reproduce and compare controlled experiments.

## Milestone 4 — Richer evolution

Introduce these incrementally and only with tests and visible metrics:

- [ ] Sensor and behavior genes.
- [ ] Predation and defense.
- [ ] Sexual reproduction or mate selection.
- [ ] Environmental variation and distinct resource types.
- [ ] Species/lineage clustering based on genomic distance.
- [ ] Spatial niches, obstacles, and biome variation.

Exit condition: multiple ecological strategies can emerge and remain explainable.

## Continuous work

These may interrupt milestones when justified:

- Fix regressions, failing CI, security problems, and serious usability defects.
- Improve performance when measurements identify a bottleneck.
- Simplify architecture before complexity makes extension unsafe.
- Maintain documentation and dependency health.

## Non-goals before Milestone 4

- Multiplayer, accounts, cloud persistence, or a required backend.
- Photorealistic graphics.
- Unbounded worlds or populations.
- Machine-learning models or paid external APIs.
- Claims that the simulator predicts real biological systems.
