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
