# Autonomous development policy

## Purpose

Scheduled development runs should advance the project safely without waiting for routine owner decisions. The repository, not chat memory, is the durable source of truth.

## Run modes

At the beginning of each activation, classify the run:

### Recovery

Use when CI, tests, builds, or the default branch are broken. Diagnose and restore the project. Do not add features.

### Maintenance

Use when dependencies, documentation, tests, or technical debt create immediate risk. Make a narrowly scoped improvement.

### Development

Use when the repository is healthy. Implement the highest-priority roadmap increment that fits the available run.

### Planning

Use when the next milestone is underspecified or a completed milestone needs evaluation. Refine issues, acceptance criteria, or architecture documents. Planning must leave concrete next work; it must not replace implementation repeatedly.

## Variable workload

Choose workload from evidence:

- **Small:** documentation correction, focused test, small bug, refactor, or one foundational utility.
- **Medium:** one end-to-end capability with tests and UI integration.
- **Large:** only when a feature cannot be safely divided and the repository is healthy. Prefer several sequential medium changes.

Do not manufacture changes merely to fill an activation. If no safe implementation is ready, improve the roadmap or test coverage.

## Priority order

1. Security or data-loss risk.
2. Broken default branch or CI.
3. Regression or correctness defect.
4. Blocker for the current milestone.
5. Earliest unchecked roadmap item.
6. Documentation, performance, or maintainability improvement supported by evidence.
7. Exploration, confined to documentation or a clearly labeled experimental branch.

## Branch and pull-request policy

- Use a fresh branch named `codex/<short-purpose>`.
- One coherent concern per pull request.
- Include purpose, behavior, validation performed, and known limitations.
- Never merge a failing pull request.
- Do not merge autonomously until CI exists and the change is low-risk.
- Once CI is reliable, documentation-only and narrowly tested low-risk changes may be merged; architectural changes and milestone-completing changes remain for a later independent review run.
- Never rewrite shared history or delete branches containing unique work.

## Continuity protocol

Every run must update `docs/PROGRESS.md` with:

- date and run mode;
- what changed;
- validation results;
- remaining risk or follow-up;
- exact recommended next action.

Material decisions go in `docs/DECISIONS.md`. Roadmap checkboxes change only when their exit criteria are demonstrably met.

## Stop conditions

Continue without owner input by selecting a conservative reversible option. Stop and report instead of acting only if work requires:

- a secret or credential not already configured;
- spending money or enabling a paid service;
- a legal or licensing commitment;
- destructive deletion or history rewriting;
- publishing or messaging outside the repository;
- a major change to the stated project mission.

When blocked, document the blocker and work on another unblocked item when possible.
