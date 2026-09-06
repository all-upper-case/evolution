# Ecosystem characterization

This document establishes a repeatable empirical baseline for the early ecological model. It describes simulator behavior, not real biology, and is intended to guide calibration rather than validate realism.

## Fixed matrix

The production-built `characterization.html` page runs the same deterministic matrix after every model change:

- seeds 11, 47, and 101;
- 2,000 ticks per run;
- observations every 250 ticks, including tick 0;
- the default configuration;
- a resource-poor regime with half the default initial food, food capacity, and regrowth;
- a resource-rich regime with twice those three food settings.

This is nine runs and 18,000 total simulated ticks. The page exposes one machine-readable JSON report and sets `data-characterization-status="complete"` or `"error"` on the document root. The fixed scope is small enough for routine browser use while covering seed variation and a fourfold resource gradient. Longer or broader studies can follow when a concrete question requires them.

## Baseline results — 2026-09-06

All values below are deterministic results from the pre-tradeoff model. Ranges show minimum, median, and maximum across the three seeds. Cap sampling excludes tick 0 and reports the fraction of eight later checkpoints at exactly 1,000 living organisms.

| Regime        |      Final population |                Births |          Deaths | Founder lineages retained |   Checkpoints at cap | Extinctions |
| ------------- | --------------------: | --------------------: | --------------: | ------------------------: | -------------------: | ----------: |
| Resource-poor |       486 / 504 / 544 |       719 / 758 / 767 | 473 / 483 / 504 |     36.0% / 38.4% / 41.6% |         0% / 0% / 0% |       0 / 3 |
| Default       |   924 / 1,000 / 1,000 | 1,441 / 1,460 / 1,474 | 691 / 710 / 800 |     52.4% / 56.0% / 60.8% |      25% / 75% / 75% |       0 / 3 |
| Resource-rich | 1,000 / 1,000 / 1,000 |       903 / 907 / 913 | 153 / 157 / 163 |     90.4% / 91.2% / 91.2% | 87.5% / 87.5% / 100% |       0 / 3 |

Median changes in trait mean are normalized to each trait's complete allowed range. Positive values move toward the maximum; negative values move toward the minimum.

| Regime        | Movement | Perception | Metabolism | Reproduction threshold | Mutation rate |
| ------------- | -------: | ---------: | ---------: | ---------------------: | ------------: |
| Resource-poor |   +28.2% |     +22.3% |     −25.5% |                 −10.3% |         +0.5% |
| Default       |   +30.7% |      +7.2% |     −21.3% |                  −7.9% |         −1.1% |
| Resource-rich |    +7.9% |      +3.3% |      −4.8% |                  −7.5% |         −0.8% |

## Interpretation

- Persistence and turnover are present: no run became extinct, and every regime produced hundreds of births and deaths.
- Resource availability matters, but the population ceiling hides much of the response. Two default runs finish at the cap, while every resource-rich run spends at least seven of eight sampled checkpoints there.
- The model strongly favors faster movement and lower metabolism. Under resource pressure it also strongly favors broader perception. These benefits currently have no direct energetic or reproductive counter-cost.
- Rich runs retain most founder lineages because rapid cap saturation suppresses later reproduction and limits competitive replacement. High lineage retention here should not be mistaken for stable coexistence.
- The default is therefore runnable but not yet a well-calibrated evolutionary sandbox. Its safety ceiling is acting as a primary ecological regulator.

## Calibration criteria

The next default model should be evaluated with the unchanged matrix. These are engineering targets for useful, legible dynamics, not claims about nature:

1. **Persistence:** all three default runs remain alive through tick 2,000.
2. **Headroom:** the median default run is at the population cap for no more than 25% of post-initial checkpoints, and no resource-rich run is at the cap for every checkpoint.
3. **Turnover:** median default cumulative births and deaths each exceed the 250 founders, demonstrating multiple generations rather than mere founder survival.
4. **Diversity:** the median default retains at least 20% of founder lineages at tick 2,000.
5. **Balanced selection:** no default median trait shift exceeds 20% of that trait's full allowed range in either direction by tick 2,000.
6. **Environmental sensitivity:** median final population increases from resource-poor to default to resource-rich without the population ceiling making the default and rich medians equal.

The baseline passes persistence, turnover, and diversity. It fails headroom, balanced selection, and the unmasked environmental-sensitivity target. Explicit energetic costs for advantageous movement and perception traits should be introduced and calibrated before presets are named.

## Reproduction

Run locally with `npm run dev` and open `/characterization.html`, or open that path on the deployed project. The report includes every per-seed outcome and aggregate minimum, median, and maximum values. Because the matrix uses the deterministic core and fixed seeds, identical code and configuration must produce identical JSON.

## First trait-cost increment — 2026-09-06

The unchanged nine-run matrix now uses speed cost 0.1 and perception cost 0.001. All other defaults, seeds, resource multipliers, durations, and checkpoints remain unchanged. The original baseline above is retained for comparison.

| Regime        | Final population (min / median / max) | Median births / deaths | Median lineage retention | Sampled cap fraction | Extinctions |
| ------------- | ------------------------------------: | ---------------------: | -----------------------: | -------------------: | ----------: |
| Resource-poor |                       116 / 123 / 125 |              549 / 676 |                    10.8% |      0% in every run |       0 / 3 |
| Default       |                       226 / 240 / 263 |            1110 / 1097 |                    27.6% |      0% in every run |       0 / 3 |
| Resource-rich |                       456 / 472 / 529 |            1559 / 1335 |                    43.2% |      0% in every run |       0 / 3 |

Default median normalized shifts are movement +4.1%, perception +21.7%, metabolism -24.2%, reproduction threshold +5.3%, and mutation tendency -2.0%. Five criteria pass: persistence, headroom, turnover, diversity, and environmental sensitivity. Balanced selection still fails. The cap fraction only describes 250-tick observations; it does not rule out brief saturation between samples or establish long-term equilibrium.

A preliminary speed cost of 0.04 with the same perception cost gave default median population 307 and movement shift +26.9%; increasing the speed cost to 0.1 reduced that directional advantage. These two trials establish a useful first increment, not a completed calibration. Low metabolism still has no compensating disadvantage, and perception remains strongly favored in sparse environments. Next, investigate these mechanisms with controlled comparisons before further default tuning; do not relax the acceptance criteria to fit the results.
