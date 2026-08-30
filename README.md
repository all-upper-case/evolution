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

The project has a functional browser interface that visualizes the food field and living organisms while a deterministic ecological core advances beneath it. Organisms seek food, spend energy, reproduce with bounded mutation, and die. A user can select a living organism to inspect its identity, ancestry, age, energy, position, and inherited traits. Complete world state can also be serialized, strictly validated, restored, and continued without changing future outcomes. See:

- [Roadmap](docs/ROADMAP.md)
- [Autonomous development policy](docs/AUTONOMY.md)
- [Decision log](docs/DECISIONS.md)
- [Progress log](docs/PROGRESS.md)

## License

A license will be selected before the first public release.
