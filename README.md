# Evolution

[Open the live simulator](https://all-upper-case.github.io/evolution/)

An autonomous, open-source ecosystem and evolution simulator developed collaboratively by Josie and Codex.

The long-term goal is a living sandbox in which populations compete for resources, reproduce with mutation, form ecological niches, and generate surprising but explainable evolutionary dynamics.

## Intended experience

- Run directly in a modern web browser.
- Watch organisms move, feed, reproduce, mutate, and die.
- Pause, accelerate, reset, and replay a simulation from a seed.
- Inspect organisms, lineages, traits, population history, and ecosystem statistics.
- Adjust environmental conditions and observe evolutionary consequences.
- Export and reload reproducible experiments.

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

The project has a responsive browser interface that visualizes seeded meadow and grove patches, two habitat-bound renewable foods, impassable obstacles, prey refuges, foragers, and predators while a deterministic ecological core advances beneath it. Organisms inherit diet, predation, and defense traits. Predators pursue foragers for bounded energy, foragers escape visible predators, and refuges hide prey from predators at an explicit energy cost. Attacks and defensive capacity carry energy costs, and predators trade plant-feeding efficiency for hunting ability. A user can inspect each organism's ecological role and exact traits. Accessible bounded charts show population, exact births and deaths, food resources, and every inherited trait; the experiment lab separates starvation, age, and predation deaths and reports terrain occupancy. Safe controls and strict, versioned JSON files support reproducible experiments and deterministic continuation. See:

- [Roadmap](docs/ROADMAP.md)
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
