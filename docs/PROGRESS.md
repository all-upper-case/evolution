# Progress log

Append one entry per autonomous development activation.

## 2026-08-23 — Bootstrap (planning)

### Changed

- Established project mission and engineering principles.
- Created an ordered milestone roadmap.
- Added autonomous workload, priority, branching, and stop rules.
- Recorded initial architecture decisions.
- Added repository-level agent instructions.

### Validation

Repository documentation initialized successfully. Application code and CI do not exist yet.

### Risk and follow-up

The first implementation run must select a minimal TypeScript browser toolchain and establish all quality gates before simulation feature work.

### Recommended next action

Complete the first portion of Milestone 0: scaffold the application and add test, type-check, lint, build, and CI commands.

## 2026-08-24 — Foundation scaffold (development)

### Changed

- Scaffolded a vanilla TypeScript browser application with Vite.
- Added strict TypeScript settings, typed ESLint rules, Prettier, Vitest, and a single aggregate validation command.
- Added a GitHub Actions workflow that validates pull requests and the default branch on Node.js 24.
- Implemented the project-owned `SeededRandom` utility with deterministic floating-point, integer, probability, state, and reset behavior.
- Added six tests, including a fixed cross-runtime regression sequence.
- Added an accessible responsive foundation page that demonstrates reproducible seeded output.
- Documented local installation, validation, and the selected toolchain.

### Validation

Local formatting, linting, strict type checking, six unit tests, and the Vite production build all pass on Node.js 24.19.0. The pull request's first GitHub Actions run also completed successfully, so the quality-gate roadmap item is complete.

### Risk and follow-up

The ecological model does not exist yet. The next work should define bounded, serializable simulation configuration before adding world state. Dependency versions are locked in `package-lock.json`; future upgrades should remain deliberate.

### Recommended next action

After recording the owner's delegated merge authority, squash-merge this green foundation pull request. Then implement validated simulation configuration, serialization conventions, and explicit numerical limits.

## 2026-08-25 — Versioned simulation configuration (development)

### Changed

- Added a complete versioned `SimulationConfig` covering the world, population, food, organism energy lifecycle, mutation, and bounded history collection.
- Added explicit public numerical limits for world area, population, resources, organism lifespan and energy, mutation, and retained history.
- Added strict parsing that rejects missing fields, unknown fields, non-finite values, unsafe integers, values outside limits, and invalid cross-field relationships.
- Added canonical compact JSON serialization and validated deserialization with structured error paths.
- Added tests for defaults, independent ownership, canonical round trips, malformed JSON, schema incompatibility, individual bounds, world-area limits, and relational constraints.
- Recorded the strict configuration-boundary decision and completed the corresponding Milestone 0 roadmap item.

### Validation

Formatting, typed linting, strict type checking, unit tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

The limits are conservative starting values rather than claims about final browser performance. They can be revised through a schema-versioned change after measurements exist. The configuration is not yet exposed in the browser shell.

### Recommended next action

Add a minimal application shell with functional play, pause, single-step, speed, reset, and seed controls backed by a fixed-timestep simulation clock.

## 2026-08-25 — Functional simulation clock (development)

### Changed

- Replaced the randomness preview with a responsive simulation control deck supporting play, pause, step, speed, seed, and reset controls.
- Added a deterministic fixed-timestep clock that converts irregular display-frame durations into discrete ticks without reading wall time itself.
- Added tests covering frame-partition independence, pause and step behavior, speed scaling, invalid input, and reset behavior.
- Completed the final Milestone 0 roadmap item and the fixed-timestep foundation item in Milestone 1.

### Validation

Formatting, typed linting, strict type checking, unit tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

The clock deliberately does not cap catch-up ticks yet because no world workload exists. A bounded catch-up policy should be measured when rendering and background-tab behavior can be tested. Seed reset currently prepares the experiment identity; it will initialize world state in the next increment.

### Recommended next action

Implement the bounded two-dimensional world and deterministic renewable food resources as a headless simulation module, then connect its aggregate state to the control shell.

## 2026-08-26 — Bounded renewable world (development)

### Changed

- Added a headless bounded two-dimensional world backed by a fixed-size numeric food grid.
- Added deterministic seeded initial food placement and per-tick renewal capped by the configured maximum resource count.
- Added immutable world snapshots, lightweight aggregate summaries, coordinate lookup, stable tick advancement, and validation of public inputs.
- Connected world advancement and food statistics to the existing browser controls without coupling core simulation code to rendering.
- Added deterministic tests covering bounds, seed effects, fractional renewal, resource caps, snapshot ownership, and partition-independent 1,000-tick runs.
- Recorded the dense resource-grid decision and completed the corresponding Milestone 1 roadmap item.

### Validation

Formatting, typed linting, strict type checking, unit tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

Initial placement permits multiple food units in one cell, which keeps the model simple and allows spatial concentration. Food is not consumed yet; the cap therefore fills and remains stable. Organism feeding will create the depletion needed for continuing renewal dynamics.

### Recommended next action

Implement organisms with bounded position, age, energy, lineage identity, and explicit inheritable numeric genome traits, without movement or reproduction behavior yet.

## 2026-08-27 — Seeded founder organisms (development)

### Changed

- Added deterministic founder organisms with bounded positions, stable identity order, separate lineage identity, parent references, age, and energy.
- Added explicit bounded scalar genome traits for movement, perception, metabolism, reproduction threshold, and mutation rate.
- Included independently owned organism records in immutable world snapshots and live population count in the browser shell.
- Added focused founder and world integration tests, recorded the organism model decision, and completed the corresponding Milestone 1 roadmap item.

### Validation

Formatting, typed linting, strict type checking, unit tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

Founders may share cells because collision semantics do not exist yet. Organism state is intentionally static: age, energy, and traits will begin changing only when the ecological lifecycle mechanics are implemented in the next increment.

### Recommended next action

Implement deterministic movement, feeding, metabolism, reproduction with mutation, and death in stable organism identity order.

## 2026-08-27 — First ecological lifecycle (development)

### Changed

- Implemented food-seeking movement driven by inheritable speed and perception traits with deterministic spatial tie-breaking.
- Added food consumption, energy gain, genome-scaled metabolism, aging, and death from energy exhaustion or maximum age.
- Added asexual reproduction with lineage continuity, monotonic identities, delayed newborn activation, bounded genome mutation, and the configured population ceiling.
- Added lifecycle, inheritance, cap, mortality, and 500-tick replay tests and completed the lifecycle roadmap item.

### Validation

Formatting, typed linting, strict type checking, unit tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

Movement currently searches a bounded Manhattan neighborhood directly for each organism. This is intentionally simple and deterministic; practical browser measurements should precede any spatial-index optimization. The population ceiling is conservative during ticks containing deaths because reproduction never assumes that a later organism will die.

### Recommended next action

Harden and explicitly test stable update ordering and all population/resource limits, then add canonical full-world snapshot restoration and long-run replay tests.

## 2026-08-28 — Core limit and ordering guarantees (development)

### Changed

- Added explicit tests proving that survivors remain in identity order, births are assigned to parents in that order, and newborns cannot act until the following tick.
- Added a sustained consumption/regrowth test that independently recalculates food totals and occupied cells while checking non-negative resources and hard food/population ceilings on every tick.
- Completed the stable ordering and limit-enforcement roadmap item.

### Validation

Local formatting, typed linting, strict type checking, all 46 unit tests, and the production build pass. GitHub Actions CI must also pass before merge.

### Risk and follow-up

World snapshots remain read-only observations rather than a restorable serialized state. Long-run replay currently proves identical fresh runs but does not yet prove continuation after a save/load boundary.

### Recommended next action

Define a strict versioned full-world snapshot format, implement validated restoration including random and identity-generator state, and prove uninterrupted and restored runs remain identical over thousands of ticks.

## 2026-08-29 — Restorable deterministic world snapshots (development)

### Changed

- Expanded world snapshots into strict versioned documents containing configuration, food, organisms, tick, aggregate counts, random state, and the next organism identity.
- Added canonical JSON serialization, deserialization, and full restoration of a continuing headless world.
- Added validation for document shape, schema version, world dimensions, resources, population, organism ordering, ancestry, genome bounds, living-state bounds, random state, and identity continuity.
- Added direct pseudorandom-state restoration and regression coverage.
- Proved that a world saved at tick 750 and restored from JSON remains identical to an uninterrupted world through tick 3,000.
- Completed Milestone 1's final roadmap item and exit condition.

### Validation

Local formatting, typed linting, strict type checking, all 49 unit tests, and the production build pass. GitHub Actions CI must also pass before merge.

### Risk and follow-up

The snapshot API is currently headless; browser-facing download/upload controls remain correctly deferred to Milestone 3. Snapshot schema migration is also deferred until a second schema version exists.

### Recommended next action

Begin Milestone 2 by rendering the bounded food grid and living organisms efficiently, without coupling simulation updates to display frame timing.

## 2026-08-30 — Live ecosystem canvas (development)

### Changed

- Added a responsive live habitat canvas showing every world cell, food concentration, and organism position.
- Implemented a bounded linear pixel-buffer renderer with one opaque RGBA pixel per cell and one canvas upload per changed simulation tick.
- Made food brightness reflect local quantity and organism brightness reflect current energy.
- Added a visible legend, updated milestone labeling, and a changing accessible canvas description with tick, population, and food totals.
- Kept rendering snapshot-driven and separate from deterministic simulation updates.
- Added renderer tests covering bounded output size, opacity, food intensity, organism precedence, and snapshot immutability.
- Completed Milestone 2's first roadmap item.

### Validation

Local formatting, typed linting, strict type checking, all 52 unit tests, and the production build pass. GitHub Actions CI must also pass before merge.

### Risk and follow-up

Multiple organisms occupying one cell currently appear as one pixel, which is an accurate occupancy view but does not communicate local density. Selection and inspection will provide individual access later. Practical browser performance limits remain to be measured after the interface gains its planned inspection and charting workload.

### Recommended next action

Review and harden the existing play, pause, step, speed, reset, and seed controls in the now-visible simulation, then mark that Milestone 2 item complete only after UI-level behavior is explicitly tested.

## 2026-08-30 — Browser control behavior (development)

### Changed

- Added a browser-level integration test for the complete simulation control deck.
- Verified that play and pause update visible state and safely disable single-step while running.
- Verified fixed-timestep advancement at normal and accelerated speeds through scheduled display frames.
- Verified single-step behavior, invalid-seed feedback, and complete reset behavior with a new seed.
- Completed the simulation-controls roadmap item using the actual rendered interface rather than clock-only tests.

### Validation

Formatting, typed linting, strict type checking, all unit and browser-interface tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

The integration test uses a minimal DOM harness and a mocked pixel renderer so it exercises browser controls and animation scheduling without adding a browser-emulation dependency or depending on canvas support in the test environment. Pixel rendering remains independently covered by the renderer test suite.

### Recommended next action

Add organism selection on the habitat canvas and an inspectable panel showing identity, ancestry, age, energy, position, and inheritable traits.

## 2026-08-30 — GitHub Pages hosting (development)

### Changed

- Configured Vite to generate assets beneath the repository's `/evolution/` project-site path.
- Added an official GitHub Pages build-and-deploy workflow for every successful merge to `main`, with manual dispatch available for recovery.
- Added the public simulator URL to the README.

### Validation

Formatting, typed linting, strict type checking, all tests, and the production build pass locally. The generated HTML references assets beneath `/evolution/`. Pull-request CI and the first Pages deployment must pass before hosting is considered complete.

### Risk and follow-up

The first deployment requires GitHub Pages to use GitHub Actions as its publishing source. Mobile layout and performance still need verification on the deployed site and actual phone hardware.

### Recommended next action

After the first successful deployment, verify the public site on a narrow mobile viewport. Then resume Milestone 2 with organism selection and trait/lineage inspection.

## 2026-08-30 — Organism selection and inspection (development)

### Changed

- Added pointer-to-world coordinate mapping that remains accurate when the habitat canvas is responsively scaled.
- Made living organisms selectable by mouse or touch, with deterministic oldest-identity selection when multiple organisms overlap.
- Added a cyan selection highlight and a responsive inspection panel showing identity, lineage, parent, age, energy, position, and all five inherited traits.
- Kept inspection synchronized as the organism moves and changes, and clearly reports when the selected organism dies.
- Added pure coordinate/selection tests, selected-pixel renderer coverage, and a browser-level interaction test using a real seeded founder.
- Completed the organism-selection and trait/lineage-inspection roadmap item.

### Validation

Formatting, typed linting, strict type checking, all 57 tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

When organisms overlap, the oldest identity is selected; cycling through co-located organisms is deferred until density or overlap proves to be a usability problem. The current panel presents exact values but does not yet explain whether a trait is relatively high or low within the population.

### Recommended next action

Add bounded population, birth, death, resource, and trait-distribution history collection with clear live charts, without placing rendering concerns inside the deterministic core.

## 2026-08-31 — Live ecosystem analytics (development)

### Changed

- Added bounded snapshot-derived history for population, food resources, and births and deaths inferred from stable organism identities.
- Added responsive live line charts for population, life events, and food, plus fixed-bin histograms for all five inherited traits.
- Kept analytics observational and separate from the deterministic core; reset now clears all collected history with the world.
- Added analytics, chart-coordinate, histogram, validation, capacity, and browser-level integration tests.
- Completed the Milestone 2 ecosystem-chart roadmap item.

### Validation

Formatting, typed linting, strict type checking, all 64 tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

Birth and death counts summarize each configured sampling interval rather than every individual tick. The default one-second simulated interval is intended to keep trends legible and collection bounded. Chart rendering currently scales linearly with retained samples up to the explicit configured cap; practical performance measurement remains a later Milestone 2 item.

### Recommended next action

Audit color contrast, non-color chart cues, keyboard interaction, narrow-screen layout, and live-region behavior, then complete the accessible-color and responsive-layout roadmap item only after browser-level coverage passes.

## 2026-09-01 — Accessible responsive interface (development)

### Changed

- Added complete keyboard organism navigation on the focusable habitat with arrow-key cycling, Home/End jumps, Escape clearing, visible focus, instructions, and status feedback.
- Added redundant solid/dashed birth and death encodings and dynamic text descriptions for population, life-event, and food charts.
- Removed continuously changing live regions from metrics and organism details while preserving intentional action feedback through the status region.
- Raised the remaining low-contrast footer text above WCAG AA and added automated contrast checks for every small-text palette color.
- Added tablet and phone breakpoints, safer narrow-screen title sizing, single-column trait cards, stacked organism details, and full-width 48-pixel mobile controls.
- Added keyboard, semantic-markup, contrast, non-color, reduced-motion, and responsive-rule regression coverage.
- Completed the Milestone 2 accessible-color and responsive-layout roadmap item.

### Validation

Formatting, typed linting, strict type checking, all 68 tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

Keyboard navigation follows stable organism identity order rather than spatial proximity, which is predictable and works even when organisms overlap. The two explicit responsive breakpoints cover phone and tablet layouts, while practical measurements on supported browsers remain the next roadmap item.

### Recommended next action

Build a repeatable browser benchmark for representative world and population sizes, record frame and tick throughput plus memory observations, and document conservative practical browser limits before completing Milestone 2.

## 2026-09-02 — Production browser benchmark harness (development)

### Changed

- Added a production-built browser benchmark for the default 250-organism world, a proposed 1,000-organism ceiling, and a 5,000-organism stress case.
- Measured simulation tick time separately from a representative rendered frame containing snapshot creation, canvas upload, bounded line history, and all five trait histograms.
- Added median, 95th-percentile, estimated-frame-rate, 30 FPS budget, and optional Chromium heap observations.
- Documented the methodology and kept timing out of CI pass/fail decisions so shared-runner variance cannot create flaky builds.

### Validation

The focused benchmark tests, strict type checking, and production multi-page build pass locally. The complete local quality gate and GitHub Actions CI must also pass before merge.

### Risk and follow-up

The development environment cannot expose its local HTTP server to the remote browser, so production-browser numbers must be collected from the deployed benchmark after this harness reaches GitHub Pages. The roadmap item and Milestone 2 remain open until those measurements and conservative limits are recorded.

### Recommended next action

After deployment, run the benchmark in production Chromium, record its results and browser environment in `docs/PERFORMANCE.md`, set conservative supported limits from the evidence, and then complete Milestone 2.

## 2026-09-02 — Practical browser limits (development)

### Changed

- Ran the deployed production benchmark in Chromium and recorded default, recommended-ceiling, and stress-case tick, frame, throughput, and heap observations.
- Established 256×256 cells and 1,000 living organisms as the conservative interactive ceiling, while retaining 128×128 and 250 founders as the phone and unknown-device default.
- Explicitly classified the 5,000-organism result as a stress observation and the 10,000-organism schema cap as a safety boundary rather than a responsiveness promise.
- Completed the final Milestone 2 roadmap item and its watchable-simulation exit condition.

### Validation

The production Chromium benchmark passed its 30 FPS frame-work budget in all three scenarios: 2.8 ms p95 at the default size, 16.6 ms at the recommended ceiling, and 18.3 ms in the 5,000-organism stress case. The complete local quality gate and GitHub Actions CI must also pass before merge.

### Risk and follow-up

The remote browser did not expose host hardware details, and its heap readings are sensitive to garbage-collection timing. The recommendation therefore retains substantial measured headroom and does not claim equivalent results for every device. Actual phone measurements can refine, but should not automatically raise, the ceiling.

### Recommended next action

Begin Milestone 3 with browser-facing export and strict import of configuration, seed, and complete simulation snapshots, reusing the existing versioned serialization boundaries.

## 2026-09-03 — Portable experiment files (development)

### Changed

- Added local JSON downloads for the current strict configuration and complete evolving world snapshot, with descriptive seed/tick filenames.
- Added browser file pickers that validate configurations and snapshots completely before atomically replacing the current experiment.
- Restored snapshot clock position so a loaded world displays and continues from its exact saved tick; configuration imports intentionally begin a new paused world.
- Added a 16 MiB import ceiling, clear success/error status, fresh post-load chart history, responsive file controls, and explicit local-data guidance.
- Added bounded file-reading, restored-clock, export, configuration-import, snapshot-import, deterministic continuation, and invalid-file regression coverage.
- Completed Milestone 3's export/import roadmap item.

### Validation

Focused strict type checking and all 17 experiment-file, clock, and browser-interface tests pass locally. The complete formatting, linting, test, build, and GitHub CI gates must also pass before merge.

### Risk and follow-up

Snapshots intentionally omit derived chart history because it does not affect future simulation behavior; charts restart from the loaded state. Schema migrations remain deferred until a second format version exists. Very large but valid snapshots are bounded at import time and may still take noticeable time to validate on slow phones.

### Recommended next action

Add safe browser controls for environment, population, food, organism, and mutation settings, using the strict configuration limits and conservative performance guidance.

## 2026-09-03 — Controlled experiment settings (development)

### Changed

- Added a responsive settings editor for world dimensions, starting and maximum population, food supply and regrowth, food energy, metabolism, reproduction and offspring energy, and mutation chance and size.
- Made settings changes atomic: a complete strict configuration is validated before a clean paused world replaces the current experiment.
- Limited ordinary browser controls to the measured 256×256-cell and 1,000-organism interactive ceiling while preserving the larger strict import bounds for advanced experiments.
- Kept settings synchronized after configuration and world imports, and added clear restart and safety guidance.
- Added browser-interface coverage for successful application, import synchronization, conservative limits, relational validation, and preservation of the current world after invalid input.
- Completed Milestone 3's environment and mutation controls roadmap item.

### Validation

Formatting, linting, strict type checking, all 81 tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

The controls intentionally expose the variables most useful for early ecological experiments rather than every schema field. Advanced configurations remain editable through exported JSON. The next increment should establish named, understandable bundles of these settings without duplicating validation logic.

### Recommended next action

Add named experiment presets that populate the existing editor and begin reproducible paused worlds, with clear descriptions of the ecological pressure each preset creates.

## 2026-09-03 — Default population ceiling alignment (recovery)

### Changed

- Lowered the default world's population ceiling from the 5,000-organism stress workload to the documented 1,000-organism interactive ceiling.
- Added a regression assertion that the settings editor opens with a valid default population ceiling.

### Validation

Formatting, linting, strict type checking, all 81 tests, and the production build pass locally. GitHub Actions CI must also pass before merge.

### Risk and follow-up

This changes only the default configuration; the strict schema still permits bounded larger populations for imported stress experiments. Existing saved configurations and world snapshots remain compatible and unchanged.

### Recommended next action

Add named experiment presets that populate the existing editor and begin reproducible paused worlds, with clear descriptions of the ecological pressure each preset creates.
