# Obstacles and refuges

Configuration schema 7 adds a deterministic terrain layer when rich ecology
and terrain are enabled. Every world cell is open ground, an obstacle, or a
refuge. The default seeded draw assigns 4% of cells to obstacles and 2.5% to
refuges, with a combined configurable ceiling of 35% so terrain cannot consume
most of the bounded world.

## Rules

- Obstacles are impassable to every organism and cannot hold food.
- Refuges are accessible to foragers but not predators. A forager inside a
  refuge is excluded from predator targeting and pays the configured refuge
  energy cost on that tick.
- Predators and food targets exclude inaccessible cells. Each movement step
  evaluates at most four neighboring cells and selects the candidate with the
  shortest Manhattan distance to its target. Up, left, right, then down is the
  stable tie order, so blocked routes take reproducible bounded detours.
- Seeded terrain generation consumes one random draw per cell. Founders retain
  their established generation order and are relocated to the nearest legal
  cell only when terrain makes their generated position inaccessible.

The live map renders obstacles in slate and refuges in teal. Settings expose
the terrain toggle, both proportions, and refuge cost. The experiment lab
accepts the same overrides and reports open, obstacle, and refuge cell totals
plus the number of organisms occupying refuges at each checkpoint.

## Persistence and compatibility

World snapshot schema 5 stores the complete terrain grid and exact totals.
Loading rejects invalid cell values, mismatched totals, food on obstacles, and
organisms on terrain they cannot enter. Configuration schemas 1–6 and world
snapshots 1–4 migrate with terrain disabled, an all-open grid, zero refuge cost,
and no new random draws, preserving their established continuation.

## Bounded performance evidence

The routing work is bounded by two movement steps, four candidate neighbors,
and the existing perception radius of at most 12 cells. A local Node 22 timing
run on 2026-09-10 advanced the recommended 256×256, 1,000-organism workload for
100 ticks in 901.9 ms with terrain, versus 848.9 ms with terrain disabled (9.0
ms versus 8.5 ms per tick on that runner).

After static habitat and terrain snapshot arrays were cached, two deployed
production-browser runs on 2026-09-10 measured the recommended 256×256,
1,000-organism workload at 27.4 ms and 27.6 ms p95 for complete tick-plus-render
work. Both pass the 33.3 ms responsiveness budget. The unsupported
5,000-organism stress workload exceeded the budget, as expected; the documented
interactive ceiling remains 1,000 organisms.

These checks establish deterministic bounded mechanics and practical runtime,
not biological realism or long-term predator/prey stability.
