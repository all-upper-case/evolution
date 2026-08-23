# Repository instructions

## Mission

Build a deterministic, browser-based evolution and ecosystem simulator that is scientifically legible, enjoyable to watch, and easy to extend.

## Required workflow

1. Read `README.md`, `docs/ROADMAP.md`, `docs/AUTONOMY.md`, `docs/DECISIONS.md`, and `docs/PROGRESS.md`.
2. Inspect the current repository, open issues, branches, pull requests, and CI status before selecting work.
3. Choose the highest-priority unblocked roadmap item that fits the current run.
4. Make one coherent, reviewable increment. Never combine unrelated features.
5. Add or update tests for simulation behavior.
6. Run all available validation: tests, type checking, linting, and build.
7. Update documentation when behavior or architecture changes.
8. Append a concise dated entry to `docs/PROGRESS.md`.
9. Commit on a dedicated branch and open a pull request. Never push development work directly to `main` after bootstrap.

## Simulation invariants

- The simulation must be deterministic for a given seed, configuration, and ordered input sequence.
- Simulation logic must not depend on rendering frame rate or wall-clock time.
- Randomness must pass through the project's seeded random-number interface.
- Core simulation code must remain separable from UI and rendering.
- Numerical limits must be explicit; prevent unbounded population, memory, and history growth.
- New mechanics need a measurable purpose and tests covering their main effects.
- Avoid claims of biological realism unless documented and supported.

## Autonomous judgment

Prefer the simplest choice that keeps future options open. Record material architectural or product decisions in `docs/DECISIONS.md`. If several choices are reasonable, choose one and proceed; do not block on owner input. Defer only actions involving secrets, financial cost, legal commitments, destructive history rewrites, publication outside GitHub, or a major change to the project mission.

## Quality gates

A change is not complete unless the repository remains runnable and all existing automated checks pass. If existing checks are broken, prioritize restoring them before feature work.
