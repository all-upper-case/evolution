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

## 2026-09-02 — Conservative interactive performance ceiling

**Status:** Accepted

Interactive experiments should use no more than a 256×256 world and 1,000 living organisms; the 128×128, 250-founder default remains preferred for phones and unknown hardware. Larger schema limits remain safety bounds, while 5,000 organisms is a benchmark stress case rather than a supported responsiveness target.

**Why:** The production Chromium benchmark kept the recommended ceiling's 95th-percentile tick-plus-render work at 16.6 ms, below half of a 30 FPS frame budget. Preserving the remaining margin accounts for slower devices, browser variation, longer sessions, and future interface work without lowering the model's explicit hard safety caps.

## 2026-09-03 — Local JSON experiment files

**Status:** Accepted

The browser exports canonical JSON configuration files and complete world snapshots through local downloads. Imports are limited to 16 MiB, parsed through the existing strict versioned boundaries, and must validate completely before replacing the current experiment. Loading a configuration begins a new paused world; loading a snapshot restores its exact tick and future state while beginning a fresh observational chart history.

**Why:** Plain local files provide portable, inspectable, backend-free experiments without adding a second serialization format. Atomic validation prevents a malformed file from partly changing the running world, and excluding derived chart history keeps snapshots focused on state that affects deterministic continuation.

## 2026-09-03 — Conservative interactive settings editor

**Status:** Accepted

The browser settings editor exposes world dimensions, founder and maximum populations, food supply and renewal, key organism energy costs, and mutation probability and magnitude. Applying settings validates a complete configuration and begins a new paused world. The editor caps dimensions at 256×256 cells and both population values at 1,000 organisms, while strict file imports retain the larger schema safety bounds.

**Why:** Restart semantics make controlled experiments explicit and prevent settings from partly altering an evolving world. The measured interactive ceiling is an appropriate limit for ordinary browser controls, while preserving broader import support keeps stress tests and advanced hand-authored experiments possible.

## 2026-09-03 — URL-driven development experiment lab

**Status:** Accepted

A separate `lab.html` build entry accepts strict numeric configuration overrides, a bounded tick count, and explicit checkpoints through URL parameters. It runs synchronously without animation and publishes a compact JSON report plus a machine-readable completion state in the DOM. It shares the simulation configuration parser and conservative interactive limits; larger performance workloads remain in the benchmark.

**Why:** A URL is reproducible, easy for browser automation to construct, and eliminates fragile sequences of expanding panels and editing individual inputs. Keeping this diagnostic separate avoids exposing test-oriented complexity in the main experience, while DOM JSON permits one-read verification without privileged page scripting.

## 2026-09-04 — Exact lifecycle events and evidence-led experiment planning

**Status:** Accepted

Every world tick returns immutable birth and death counts, and multi-tick headless runs return their exact aggregate. Observational history consumes consecutive tick events and rolls them into its bounded sampling intervals; the experiment lab publishes cumulative totals at checkpoints. These derived events are not serialized because they do not affect continuation. A restored world begins a new observational baseline with zero prior events, regardless of its tick alignment.

The remaining Milestone 3 order now places multi-seed characterization, explicit trait tradeoffs, and ecological diagnostics before named presets and comparison presentation. Milestone boundaries and every four development increments trigger an evidence-based product/model review.

**Why:** Comparing live identities only at sample boundaries misses organisms that are both born and die inside an interval, making lifecycle charts scientifically misleading. Exact transient counts belong at the lifecycle boundary. Separately, current lab observations show the default population quickly presses against its ceiling and movement, perception, and lower metabolism lack balancing costs. Presets should describe demonstrated ecological regimes, not canonize insufficiently characterized settings. Engineering health alone cannot establish that the model produces useful evolution.

## 2026-09-06 — Fixed model-characterization matrix

**Status:** Accepted

Early ecological calibration will use a fixed deterministic matrix of three seeds, three resource regimes, 2,000 ticks, and 250-tick checkpoints. The resource-poor and resource-rich regimes change initial food, food capacity, and regrowth together to one-half and twice their default values. A production-built diagnostic reports per-run outcomes and aggregate ranges; `docs/CHARACTERIZATION.md` records the current baseline and explicit healthy-dynamics targets.

**Why:** A small fixed matrix detects seed-specific failures, cap saturation, environmental sensitivity, lineage loss, turnover, and directional trait pressure without making routine validation prohibitively slow. Keeping the matrix unchanged across calibration increments makes before-and-after effects attributable. The criteria define useful model behavior without claiming biological realism or turning exact stochastic outcomes into brittle pass/fail tests.

## 2026-09-06 — Configurable quadratic trait maintenance costs

**Status:** Accepted

Each acting organism pays base metabolism plus movementCostPerTick times movementSpeed squared plus perceptionCostPerTick times perceptionRange squared after feeding and before death/reproduction. These are maintenance costs of inherited capacity, charged even while stationary and independent of metabolismScale. They are not distance-traveled costs. Squared costs make extreme capacity increasingly expensive; fractional perception retains its existing floored search radius but incurs a continuous capacity cost. No random draws or update-order rules are added.

Configuration schema 2 requires both bounded, nonnegative coefficients. Strict schema-1 inputs migrate to schema 2 with both costs zero, including configurations embedded in version-1 world snapshots. This preserves their ecological continuation while future exports use the normalized new configuration schema. New defaults are 0.1 for speed and 0.001 for perception; the settings editor and URL lab expose both controls.

**Why:** Free movement and perception produced unbalanced selection and cap-regulated populations. The fixed matrix now passes five of six targets and sharply reduces speed selection, but calibration remains incomplete. Independent trait costs avoid making lower metabolism also discount these new tradeoffs.

## 2026-09-07 — Metabolism yield tradeoff and calibrated defaults

**Status:** Accepted

Configuration schema 3 adds `metabolismFoodEnergyInfluence`, a bounded coefficient from zero through one. Food energy is multiplied by `1 + (metabolismScale - 1) * influence`; base metabolic expenditure continues to scale directly with the same inherited trait. Schema-one and schema-two configurations migrate with zero influence, preserving their earlier food-yield behavior. New defaults use influence 0.4, perception maintenance cost 0.0018, and food regrowth 23 units per tick; movement cost remains 0.1.

The fixed characterization report now evaluates the six previously declared calibration criteria as threshold-based booleans. Exact populations are not regression assertions, but all six thresholds must remain explicit and reviewable when model behavior changes.

**Why:** Lower metabolism previously reduced expense without any countervailing disadvantage. Partial food-yield scaling creates a legible conservation-versus-assimilation tradeoff without adding randomness or coupling to rendering. The selected defaults are the simplest tested combination that passes persistence, headroom, turnover, diversity, balanced-selection, and environmental-sensitivity criteria across the unchanged matrix. Versioned migration prevents the new mechanic from silently changing imported historical experiments.

## 2026-09-07 — Prioritize environmental and biological diversity

**Status:** Accepted; supersedes the remaining diagnostics-first ordering.

The owner requests richer environments, food types, and predation. Begin Milestone 4 before completing the remaining Milestone 3 tools: habitat/resource heterogeneity, inherited diet specialization, predation/defense, then deeper terrain constraints. Include only the observability needed to validate each feature alongside its implementation. Do not repeatedly defer visible ecological features for generic infrastructure or further tuning of the simple model.

Current organisms die from energy depletion or maximum age. Predation will add a distinct interaction and death cause. Ecological roles should be grounded in inherited capabilities and tradeoffs rather than cosmetic labels. New state must preserve deterministic ordering, explicit bounds, and versioned legacy continuation.

**Why:** The calibrated single-resource world is a useful foundation but offers too few distinct ways to live. Spatially different resources create the first niches; diet specialization and predator–prey interactions build on those niches. This is within the original ecosystem mission and explicitly authorized by the owner.
