# Hearthwatch / Evolution

[Open Hearthwatch](https://all-upper-case.github.io/evolution/settlement.html) · [Open the original Evolution laboratory](https://all-upper-case.github.io/evolution/)

An autonomous, open-source living-world simulation developed collaboratively by Josie and Codex.

The project began as a population-evolution laboratory. Its new primary direction is Hearthwatch: a Dwarf Fortress-inspired but substantially less interactive simulation about following a small cast of autonomous inhabitants and watching their needs, work, relationships, environment, and history produce surprising but understandable stories. The original ecological simulator remains intact as a tested source of deterministic world, resource, inheritance, analytics, and experiment infrastructure.

## Intended experience

- Run directly in a modern web browser.
- Watch named inhabitants decide what to do without receiving player orders.
- Follow individual needs, intentions, personalities, relationships, work, and life histories.
- Read a selective chronicle of meaningful events rather than deciphering raw state alone.
- Pause, accelerate, reset, and replay a simulation from a seed.
- Preserve deterministic replay and inspectable causes as the world becomes more socially and materially complex.
- Keep the original ecosystem laboratory available for controlled evolutionary experiments.

## Engineering principles

1. **Deterministic core:** identical seed and settings must produce identical results.
2. **Simulation before spectacle:** rules and tests come before decorative effects.
3. **Small reviewable increments:** every development run should leave the project working.
4. **Measured complexity:** add systems only when they produce observable, testable behavior.
5. **Browser-first and local-first:** no account or hosted backend is required for the core simulator.
6. **Explainable evolution:** important outcomes should be visible through inspectable traits and statistics.

## Getting started

Evolution requires Node.js 22.12 or later.

```bash
npm install
npm run dev
```

The development server prints the local URL to open in a browser. Before committing, run the complete local quality gate:

```bash
npm run validate
```

Individual commands are also available for tests, type checking, linting, formatting checks, and production builds.

## Project status

Hearthwatch now follows fourteen people through readable days: gathering useful loads, carrying provisions, cooking, eating, talking, building shared shelters, and sleeping in personal beds. Trees felled for timber disappear, completed shelters improve rest, and repeated travel wears lasting paths. Each person has remembered encounters and acquaintance scores that influence companion choice.

Zoom with +/−, drag or use arrow keys to pan, tap a villager or select a cast member to inspect them, and toggle Follow to keep them in view. The detailed map shows trees, people, cargo, hearth, beds, and construction progress. Time advances at three moments per second (600 moments per day), with slower and faster options.

Worlds save automatically in the current browser and resume paused. Download JSON backups to move between devices; loading validates the entire world before replacement. No time passes while the page is closed. New world has an Undo button until the next reload or reset. Browser storage can be cleared by browser settings, so download important worlds. Earlier in-memory Hearthwatch format 2 is not accepted as a version 3 file.

Home locations are fixed, shelters are abstract open-roof structures, and acquaintance is not yet a complete relationship system. Families, seasons, combat, and LLM-controlled decisions remain future work.

### Original evolution laboratory

The project has a responsive browser interface that visualizes seeded meadow and grove patches, two habitat-bound renewable foods, impassable obstacles, prey refuges, foragers, and predators while a deterministic ecological core advances beneath it. Organisms inherit diet, predation, and defense traits. Predators pursue foragers for bounded energy, foragers escape visible predators, and refuges hide prey from predators at an explicit energy cost. Attacks and defensive capacity carry energy costs, and predators trade plant-feeding efficiency for hunting ability. A user can inspect each organism's ecological role and exact traits. Accessible bounded charts show population, exact births and deaths, food resources, and every inherited trait; the experiment lab separates starvation, age, and predation deaths and reports terrain occupancy. Safe controls and strict, versioned JSON files support reproducible experiments and deterministic continuation. See:

- [Roadmap](docs/ROADMAP.md)
- [Hearthwatch tentative roadmap](docs/HEARTHWATCH_ROADMAP.md)
- [Autonomous development policy](docs/AUTONOMY.md)
- [Decision log](docs/DECISIONS.md)
- [Progress log](docs/PROGRESS.md)
- [Browser performance](docs/PERFORMANCE.md)
- [Developer experiment lab](docs/EXPERIMENT_LAB.md)
- [Ecosystem characterization](docs/CHARACTERIZATION.md)
- [Diet-specialization characterization](docs/DIET_SPECIALIZATION.md)
- [Predation and defense characterization](docs/PREDATION.md)
- [Obstacles and refuges](docs/TERRAIN.md)
- [Combined richer-ecology characterization](docs/RICHER_ECOLOGY.md)

## License

A license will be selected before the first public release.
