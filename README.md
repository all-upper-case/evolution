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

Hearthwatch is now available as a separate early prototype. It creates a seeded 64×64 valley and a cast of fourteen named inhabitants with roles, practical strengths, personality dispositions, health, hunger, fatigue, loneliness, possessions, and current intentions. They gather finite wild food, carry it home, stock communal stores, cook nourishing meals, eat, rest, and find neighbors for conversation. The browser exposes wild, raw, and prepared food, plus each selected inhabitant's cargo and strongest skill. The complete settlement continues deterministically from an in-memory snapshot.

This is an observation-first foundation, not a colony-management game. The subsistence economy is intentionally small; there are not yet buildings, durable possessions, relationships, memories, families, seasons, combat, or player-issued work orders.

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
