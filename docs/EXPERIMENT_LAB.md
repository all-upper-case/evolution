# Experiment lab

The development-only experiment lab runs deterministic simulations without animation and prints one compact JSON report. It is intended for automated browser checks and rapid diagnosis, not as the main user interface.

Open `lab.html` in a development or deployed build. A run can be described entirely in the URL:

```text
lab.html?ticks=1000&checkpoints=0,250,500,1000&seed=77&world.width=64&world.height=64&population.initialCount=100&evolution.mutationProbability=0.2
```

The document sets `data-lab-status="complete"` or `"error"` on its root element. The `#report` element contains formatted JSON with:

- the complete normalized configuration;
- requested tick count;
- summaries at requested checkpoints and the final tick;
- population, cumulative births and deaths, total food, per-food totals, habitat cell counts, occupied cells, living lineages, mean age, and mean energy;
- minimum, mean, and maximum values for every inherited trait;
- final random state and next organism identity for deterministic comparison.

Birth and death totals come directly from every simulated lifecycle rather than differences between checkpoint populations. They therefore include organisms that are born and die between two requested checkpoints.

## Parameters

- `ticks`: whole number from 0 through 50,000; defaults to 1,000.
- `checkpoints`: comma-separated, unique tick numbers within the run. Tick 0 and the final tick are used by default. The final tick is always included in the report.
- Any complete configuration numeric field except `schemaVersion`, written as a dotted path. Examples: `food.regrowthUnitsPerTick`, `organisms.metabolismPerTick`, and `evolution.mutationMagnitude`.

Unknown and duplicate parameters are rejected. Configuration overrides pass through the same strict parser as saved experiment files. Lab runs additionally enforce the supported interactive ceiling of 256×256 cells and 1,000 organisms. This prevents an accidental diagnostic URL from locking up an ordinary browser; larger stress work remains in the dedicated benchmark.

For repeatable multi-seed calibration rather than a single custom run, use `characterization.html` and see [Ecosystem characterization](CHARACTERIZATION.md).

Trait maintenance costs can be overridden with `organisms.movementCostPerTick` and `organisms.perceptionCostPerTick` (each 0–1000). Defaults are 0.1 and 0.0018; each coefficient multiplies the corresponding inherited trait squared every acting tick, including while stationary. `organisms.metabolismFoodEnergyInfluence` accepts 0–1 and defaults to 0.4. At zero, metabolic rate does not affect food yield; at one, food yield scales directly with the inherited metabolism trait. Version-one and version-two files migrate with zero influence so their energy rules remain compatible.

Schema-4 habitat experiments expose `ecology.habitatPatchCount`, `ecology.groveFraction`, `ecology.secondaryInitialUnits`, `ecology.secondaryMaximumUnits`, `ecology.secondaryRegrowthUnitsPerTick`, and `ecology.secondaryEnergyPerUnit`. Meadow food continues to use the existing `food.*` paths. Set `ecology.enabled=0` for a legacy-style single habitat or `1` for both habitats. Every checkpoint reports both food totals and the meadow/grove cell counts.
