# Predation and defense

Predation is a bounded inherited strategy, not a cosmetic label. An organism whose `predationTendency` meets the configured threshold pursues the nearest visible forager using Manhattan distance and stable identity tie-breaking. A visible forager instead chooses the adjacent in-bounds cell that maximizes distance from the nearest predator. Ordinary food targeting remains the fallback.

Predators attempt at most one attack per tick after moving. Every attempt costs energy. Success uses only the seeded simulation random source and is more likely with higher predation tendency and less likely against higher defense. A successful predator receives the smaller of a configured fraction of prey energy, the configured gain cap, and its remaining energy capacity. Killed prey are removed from the live spatial index immediately, cannot act later in the tick, and cannot be consumed twice.

The strategy has two continuing tradeoffs. Predation and defense each incur a configurable quadratic maintenance cost. Predators also retain only `1 - predationTendency` of energy from plant food, so stronger hunters are less effective fallback foragers. Defaults classify the upper 20% of the trait range as predators.

## Fixed viability check

The regression-sized characterization uses seeds 13, 59, and 103 in 32×32 worlds with 120 founders, a 300-organism cap, and abundant meadow/grove resources. At tick 300:

| Seed | Initial predators | Final predators | Final prey | Predation deaths | Final population |
| ---: | ----------------: | --------------: | ---------: | ---------------: | ---------------: |
|   13 |                26 |              13 |        124 |              296 |              137 |
|   59 |                20 |              18 |         89 |              305 |              107 |
|  103 |                24 |              10 |        134 |              289 |              144 |

Every sampled world therefore retains both roles and records successful attacks over the documented window. This demonstrates finite-run viability, not equilibrium, long-term stability, or biological realism.

Configuration schema 6 and world snapshot schema 4 store the new settings and traits. Older configurations migrate with predation disabled and zero predation/defense costs; older worlds receive neutral zero traits without consuming new random values, preserving their established deterministic continuation.
