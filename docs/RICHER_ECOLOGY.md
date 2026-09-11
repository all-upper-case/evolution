# Combined richer-ecology characterization

The fixed combined matrix evaluates habitats, two food types, inherited diets,
predation, defense, obstacles, and refuges together. It uses seeds 17, 53, and
97 for 1,000 ticks with 100-tick checkpoints. Three terrain regimes preserve
the same richer model while varying refuge coverage: none, the 2.5% default,
and 10%. Obstacles remain at 4% throughout.

Run `richer-ecology.html` in a development or deployed build for the complete
machine-readable report. The diagnostic records population and role counts,
exact deaths by cause, cap pressure, sampled refuge occupancy, and the initial
and final means of diet preference, predation tendency, and defense.

## 2026-09-11 baseline

| Refuge regime | Final population median | Final predators median | Predation deaths median | Predation share of deaths | Sampled refuge occupancy |
| ------------- | ----------------------: | ---------------------: | ----------------------: | ------------------------: | -----------------------: |
| None          |                     325 |                      0 |                     334 |                     22.9% |                     0.0% |
| Default 2.5%  |                     320 |                      0 |                     278 |                     17.1% |                     2.4% |
| Rich 10%      |                     363 |                      0 |                     117 |                      7.8% |                    10.8% |

Every run retained a living population, recorded predation, and stayed below
the population ceiling at at least 75% of sampled checkpoints. Refuge occupancy
tracked available refuge coverage, and the richer-refuge counterfactual reduced
the median fraction of deaths caused by predation. The shelter mechanic is
therefore behaviorally active rather than merely visible.

Predators did not persist over the longer combined window. The default regime
retained zero predators at tick 1,000 in all three seeds, compared with 10–18
predators in the earlier abundant-resource, terrain-free 300-tick check.
Meanwhile, mean predation tendency declined in every default run, by 0.114 to
0.278. This is finite deterministic evidence of a model pressure, not proof of
equilibrium, long-term instability, or biological realism.

## Decision supported by the matrix

The next behavior gene should be `huntingDrive`: a bounded inherited threshold
that determines at what fraction of its own energy a predator pursues visible
prey. Today, every predator pursues visible prey unconditionally, even when a
costly hunt is less useful than fallback plant foraging. Variable drive creates
an explainable choice between missed hunting opportunities and wasted pursuit
energy without conflating that choice with predator role classification.

Acceptance for the increment:

- the gene changes only prey-pursuit decisions and remains inspectable;
- low and high drive have explicit opportunity or energy tradeoffs;
- a fixed multi-seed comparison retains both predators and prey through 1,000
  ticks more often than the current zero-of-three default baseline without
  population-cap pressure;
- seeded replay, save/load continuation, legacy migration, and bounded target
  selection remain deterministic.
