# Decision log

Record durable decisions in chronological order. Do not rewrite old entries; append superseding decisions.

## 2026-08-23 — Browser-first TypeScript application

**Status:** Accepted

The simulator will begin as a browser-based TypeScript application. Simulation logic will remain independent from rendering so that it can run headlessly in tests and may later support other clients.

**Why:** A browser application is easy to run and share, while TypeScript provides guardrails for a project developed incrementally by autonomous agents.

## 2026-08-23 — Determinism is a core requirement

**Status:** Accepted

All stochastic behavior will use a seeded project-owned random interface. Simulation updates will use discrete ticks and a stable ordering independent of rendering.

**Why:** Reproducibility is necessary for debugging, automated testing, meaningful experiments, and explainable evolutionary outcomes.

## 2026-08-23 — Start with inheritable numeric traits

**Status:** Accepted

Early organisms will use a compact genome of explicit numeric traits affecting properties such as movement, perception, metabolism, reproduction, and mutation. Neural controllers, sexual reproduction, and species clustering are deferred.

**Why:** Simple explicit traits can generate selection pressure while remaining testable and understandable. Rich behavior can be added after the ecological core is stable.

## 2026-08-23 — Pull requests are the unit of autonomous work

**Status:** Accepted

Scheduled work will use focused branches and pull requests. Direct changes to the default branch are limited to initial repository bootstrap.

**Why:** Reviewable increments make unattended work observable and recoverable.

## 2026-08-24 — Minimal vanilla TypeScript toolchain

**Status:** Accepted

The initial application uses Vite, vanilla TypeScript, Vitest, ESLint with typed rules, and Prettier. It deliberately does not use a component framework.

**Why:** The first interface is small, and the simulation core must remain framework-independent. Avoiding a UI framework reduces dependencies and architectural commitment while Vite provides a fast browser build and a test-compatible toolchain. A framework can be adopted later if measured interface complexity justifies it.

## 2026-08-24 — Autonomous merge authority

**Status:** Accepted

The owner explicitly delegates authority to merge or squash-merge completed autonomous branches without waiting for case-by-case approval.

**Why:** Evolution is intended to progress as an autonomous project. Pull requests remain useful as validation and audit boundaries, but routine owner review is not a release gate. The agent should prefer squash merges after re-checking that the branch is current and all required validation is green.

## 2026-08-25 — Strict versioned configuration boundary

**Status:** Accepted

Simulation configuration is a complete versioned document rather than a collection of loose optional settings. Parsing rejects missing and unknown fields, validates all numerical limits and cross-field relationships, and returns a normalized independent object. Serialization uses the normalized property order and compact JSON.

**Why:** Experiments must be reproducible and configuration mistakes must fail visibly. A strict schema prevents misspelled fields from being ignored, bounds future memory and processing costs, and gives later migrations an explicit schema version to target.

## 2026-08-26 — Dense bounded resource grid

**Status:** Accepted

The first world stores food quantities in a fixed-size row-major numeric grid. Seeded placement and renewal operate on cell indices, while public coordinates remain two-dimensional. Total resources and occupied cells are tracked incrementally.

**Why:** The configuration already imposes a small bounded world area. A dense grid gives deterministic constant-time lookup and simple snapshots without committing future organisms or rendering to a spatial-index design. It can be replaced behind the headless world boundary if measurements later favor another representation.
