# Diet-specialization characterization

## Mechanic

Every organism in a schema-5 diet experiment inherits a bounded preference from 0 (meadow food) through 0.5 (generalist) to 1 (grove food). Preference changes both food targeting and extracted energy. With the default 1.25 specialist and 0.25 opposite-food efficiencies:

- a complete specialist receives 1.25× energy from its preferred food and 0.25× from the other food;
- a generalist receives 0.75× from either food;
- intermediate preferences interpolate linearly.

This is an explicit symmetric tradeoff. Specialists gain peak efficiency but risk poor feeding when the preferred resource is scarce. Generalists can use either resource equally but never reach specialist peak efficiency. These rules are an intentionally legible model mechanism, not a claim about biological digestion.

## Opposing-resource experiment

The deterministic regression experiment uses seeds 11, 47, and 101, a 32×32 two-habitat world, 100 founders, a 300-organism cap, and 2,000 ticks. Both foods yield the same base energy. One regime supplies and renews meadow food at eight times the grove-food rate; the other reverses those quantities. All other rules remain identical.

| Regime      | Seed | Initial mean | Final mean |  Shift | Final population |
| ----------- | ---: | -----------: | ---------: | -----: | ---------------: |
| Meadow-rich |   11 |        0.484 |      0.180 | -0.304 |              229 |
| Meadow-rich |   47 |        0.511 |      0.197 | -0.314 |              205 |
| Meadow-rich |  101 |        0.480 |      0.132 | -0.348 |              286 |
| Grove-rich  |   11 |        0.484 |      0.902 | +0.418 |              240 |
| Grove-rich  |   47 |        0.511 |      0.755 | +0.244 |              205 |
| Grove-rich  |  101 |        0.480 |      0.874 | +0.394 |              228 |

Every meadow-rich run shifted toward meadow specialization, every grove-rich run shifted toward grove specialization, and every population persisted through the measured window. This demonstrates opposing finite-run selection under controlled resource asymmetry; it does not establish long-term equilibrium, universal robustness, or biological realism.

The established nine-run ecosystem characterization explicitly disables the new diet mechanic so it remains a compatibility baseline. Diet behavior is evaluated separately by `src/development/diet-characterization.test.ts`.

## Persistence compatibility

Configuration schema 5 stores whether diet specialization is active and its two efficiency endpoints. World snapshot schema 3 stores diet preference in every genome. Schema-4 configurations and schema-1/2 worlds migrate to a disabled neutral diet with preference 0.5 and do not add diet-related random draws, preserving their established continuation rules.
