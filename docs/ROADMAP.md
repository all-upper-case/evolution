# Roadmap

This is the source of truth for autonomous development. Follow the active priority below; completed foundation work remains recorded in milestone order.

## Active priority — Observational living-world pivot

Owner direction, 2026-09-14: spin the project into a Dwarf Fortress-style simulation focused much more strongly on observing autonomous critters or NPCs than on directing them. The tested Evolution application remains available as a compatibility laboratory; new product development targets the separate Hearthwatch experience until it is mature enough to become the default route.

The detailed, tentative product sequence and design strategy now live in [the Hearthwatch roadmap](HEARTHWATCH_ROADMAP.md). The next implementation is days, routines, and meaningful places: shelter, beds, hearth, work sites, and an observable day/night rhythm.

## Milestone 5 — Hearthwatch observational settlement

- [x] Establish a separate deterministic prototype with a small named cast, terrain, wild food, personal needs, autonomous activities, selection, and a bounded event chronicle.
- [x] Add a causal work and material loop: gathering, carrying, stockpiling, cooking, consumption, and meaningful role or skill differences.
- [ ] Add days, routines, shelter, beds, hearth, and work sites that make time and place consequential.
- [ ] Add persistent relationships, interaction memories, preferences, and compatible/conflicting dispositions.
- [ ] Add places that matter: shelters, beds or dens, workshops, communal spaces, and inhabitant attachment to them.
- [ ] Add autonomous settlement planning and construction without requiring player work orders.
- [ ] Add injury, illness, recovery, hazards, predators, and deaths with specific attributable causes.
- [ ] Add seasons, weather, resource cycles, migration, and environmental pressure.
- [ ] Add families, generations, inheritance, and the original evolutionary systems where they enrich individual lives.
- [ ] Add searchable biographies, relationship views, settlement history, and story-oriented observation tools.

Exit condition: a seeded settlement sustains a causally legible material and social life over long runs, and following one inhabitant reveals an individual history rather than merely current meters. Observation remains non-interventional.

Do not copy Dwarf Fortress feature-for-feature. Use its depth, autonomy, persistent individuals, and emergent history as inspiration while keeping the browser experience bounded and readable.

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
- [x] Characterize default dynamics across seeds and representative environments.
- [x] Add configurable movement and perception energy costs with legacy replay compatibility.
- [x] Complete default calibration, including balanced perception and metabolism selection.
- [ ] Add extinction, equilibrium, and runaway-population diagnostics.
- [ ] Add named experiment presets based on demonstrated ecological regimes.
- [ ] Compare repeated runs and summarize outcomes.

Exit condition: users can reproduce and compare controlled experiments.

## Milestone 4 — Richer evolution

Implement in this order, with tests, visible behavior, and focused metrics:

- [x] Seeded habitat patches and two distinct renewable food types.
      Acceptance: habitat changes resource availability; types differ in renewal or energy yield; both are distinguishable in the world view and lab; same-seed generation and save/load continuation are deterministic; legacy worlds retain their old rules.
- [x] Inherited diet specialization with a cost to generalism or specialization.
      Acceptance: feeding preferences and efficiencies affect behavior; controlled opposing resource environments favor different strategies; diets are inspectable rather than just different creature colors.
- [x] Predation and defense, including pursuit and escape.
      Acceptance: predators gain bounded energy from successful attacks; attacks carry costs and defense has a tradeoff; killed prey cannot act again or be eaten twice; starvation, age, and predation deaths are counted separately; multi-seed experiments demonstrate viable predator/prey interaction over a documented window.
- [x] Obstacles, movement costs, and refuges that deepen spatial niches.
      Acceptance: terrain affects movement or exposure; route/target selection is deterministic and bounded; spatial behavior is visible and performance remains within interactive limits.
- [ ] Additional sensor and behavior genes motivated by the new ecology.
      Next gene: inherited hunting drive controls the predator's own-energy threshold for pursuing visible prey. Acceptance: the gene is bounded, costly choices are inspectable, deterministic compatibility is preserved, and a fixed multi-seed comparison retains both roles through 1,000 ticks more often than the current zero-of-three baseline without cap pressure.
- [ ] Species/lineage clustering based on genomic distance.
- [ ] Sexual reproduction or mate selection.

Exit condition: multiple ecological strategies can emerge and remain explainable across heterogeneous habitats and food-web interactions. Short finite-run coexistence must not be described as proven long-term stability.

Retain the existing simple-world calibration as a compatibility baseline. Add mechanic-specific experiments for the richer model; do not assume that its trait shifts or population patterns must match the old single-resource model.

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
