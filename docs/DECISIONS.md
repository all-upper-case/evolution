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

## 2026-08-27 — Stable founder identity and bounded scalar genomes

**Status:** Accepted

Founders receive monotonically increasing numeric identities in stable array order, begin one lineage each, and carry five bounded floating-point traits for movement, perception, metabolism, reproduction threshold, and mutation rate. Initial positions and traits are sampled through the world's seeded random stream. Multiple organisms may initially occupy one cell.

**Why:** Explicit scalar traits remain inspectable and easy to test while giving upcoming ecological mechanics meaningful heritable inputs. Stable identity order supports deterministic updates and lineage tracking. Permitting co-location avoids adding collision or placement-retry rules before movement semantics exist.

## 2026-08-27 — Deterministic first ecological lifecycle

**Status:** Accepted

Each tick renews food, then processes organisms in ascending identity order. Organisms move toward the richest visible cell using row-major ties, consume at most one food unit, pay genome-scaled metabolism, die when energy or age is exhausted, and reproduce asexually when their genome-scaled threshold is met. Newborns inherit their parent's lineage and bounded mutated traits, receive new monotonic identities, and begin acting on the next tick.

**Why:** A stable, explicit lifecycle makes resource competition and selection pressure reproducible and inspectable. Delaying newborn actions avoids recursive same-tick population growth, while hard trait and population bounds keep autonomous runs safe.

## 2026-08-29 — Versioned complete world snapshots

**Status:** Accepted

Restorable snapshots are strict versioned documents containing the normalized simulation configuration, full food grid, living organisms, tick, aggregate resource counts, pseudorandom-number state, and next organism identity. Restoration rejects unknown, missing, inconsistent, out-of-bounds, or non-finite state before constructing a continuing world.

**Why:** A seed alone can replay from the beginning but cannot efficiently pause, transfer, or resume a mature ecosystem. Capturing every source of future behavior makes save/load continuation deterministic, while strict validation prevents corrupt or hand-edited state from silently violating simulation invariants.

## 2026-08-30 — One canvas pixel per world cell

**Status:** Accepted

The first live world view uses a single canvas whose internal resolution matches the simulation grid. Each world cell becomes one opaque RGBA pixel: food intensity controls green brightness, organisms overwrite their occupied cell in an energy-scaled amber, and CSS scales the canvas responsively with pixelated sampling. Rendering reads immutable snapshots and never advances or mutates simulation state.

**Why:** A fixed-size pixel buffer provides bounded linear rendering work and one canvas upload instead of thousands of DOM nodes or drawing calls. It keeps the visual layer replaceable, preserves the core/UI boundary, and makes the complete 128×128 default habitat legible immediately.

## 2026-08-30 — Snapshot-driven organism inspection

**Status:** Accepted

Organism selection maps pointer coordinates through the canvas's displayed rectangle into a world cell, then selects the first organism in stable identity order at that cell. Selection is stored only in the interface, rendered cyan, and refreshed from immutable world snapshots as the organism moves and changes. It never enters serialized simulation state or update logic.

**Why:** This makes individual lives and inheritable traits observable without weakening determinism. Stable overlap resolution is predictable, and keeping selection outside the ecological core ensures that observing an organism cannot change its fate.

## 2026-08-31 — Bounded observational ecosystem analytics

**Status:** Accepted

The browser samples immutable world snapshots at the configured history interval. Population, food, and organism-identity changes form a bounded trend history; current genome values form fixed-bin distributions using the model's explicit trait bounds. Analytics remain outside the simulation core and are reset with the world.

**Why:** Stable identities provide exact births and deaths between samples without adding counters to serialized world state. Snapshot-derived analytics cannot alter seeded outcomes, while explicit intervals and capacity prevent unbounded memory or rendering work.

## 2026-09-01 — Keyboard-first inspection and redundant chart encoding

**Status:** Accepted

The habitat remains a compact canvas but exposes a complete keyboard path: arrow keys cycle through living organisms, Home and End jump to population boundaries, and Escape clears selection. Charts use text descriptions and solid-versus-dashed life-event lines in addition to color. Rapidly changing metrics and inspector values are not live regions; intentional selection and control messages use the dedicated status region.

**Why:** Canvas rendering stays efficient while pointer access is no longer required. Redundant visual encodings support color-vision differences, and limiting live announcements prevents simulation ticks from overwhelming screen-reader users.
