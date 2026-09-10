# Browser performance

Evolution includes a repeatable production-browser benchmark at
`benchmark.html`. It measures three deterministic workloads:

| Scenario            |   World | Population | Purpose                             |
| ------------------- | ------: | ---------: | ----------------------------------- |
| Default             | 128×128 |        250 | Normal interactive use              |
| Recommended ceiling | 256×256 |      1,000 | Conservative upper target           |
| Population stress   | 256×256 |      5,000 | Degradation and safety-margin check |

Each scenario warms the JavaScript engine, then measures simulation ticks and a
representative rendered frame. The frame workload includes a complete immutable
snapshot, canvas upload, three 600-point line calculations, and all eight trait
histograms. The report uses medians for expected throughput and the 95th
percentile against a 33.3 ms (30 FPS) responsiveness budget. When Chromium
exposes its non-standard heap counter, the report also records the change in
used JavaScript heap; this is an observation rather than a portable guarantee.

The benchmark is intentionally separate from simulation state and is not a CI
timing gate. Shared CI runners and browsers vary too much for a stable absolute
threshold. Its calculations and bounded scenarios are covered by automated
tests, while release measurements are recorded here with the exact browser and
date.

## Practical limits

The production bundle was remeasured twice on 2026-09-10 after predation,
terrain, and static-grid snapshot caching were enabled. Ranges below span both
runs in the same remote Chromium environment:

| Scenario            |  Tick median |    Frame p95 | Estimated FPS | 30 FPS budget |
| ------------------- | -----------: | -----------: | ------------: | ------------- |
| Default             |   3.0–3.4 ms | 13.5–17.6 ms |       156–175 | Pass          |
| Recommended ceiling |  9.1–10.0 ms | 27.4–27.6 ms |         55–58 | Pass          |
| Population stress   | 41.5–41.9 ms | 57.8–75.6 ms |            19 | Fail          |

The richer default remains responsive through the supported ceiling. The
5,000-organism stress case now demonstrates graceful degradation rather than a
supported interactive workload.

### Earlier simple-ecology reference

The production bundle was measured on 2026-09-02 in Chromium in the project's
remote browser environment. Exact host hardware was not exposed, so these
results are a reproducible reference point rather than a device guarantee.

| Scenario            | Tick median | Frame p95 | Estimated FPS | 30 FPS budget | Heap change |
| ------------------- | ----------: | --------: | ------------: | ------------- | ----------: |
| Default             |      0.4 ms |    2.8 ms |           526 | Pass          |    +2.3 MiB |
| Recommended ceiling |      1.3 ms |   16.6 ms |           164 | Pass          |    +7.5 MiB |
| Population stress   |      5.4 ms |   18.3 ms |            72 | Pass          |    +3.5 MiB |

The estimated FPS column is derived from median measured work and is not the
browser's display refresh rate. Heap changes are noisy because garbage
collection timing is outside the benchmark's control.

For interactive experiments, use at most a **256×256 world and 1,000 living
organisms**. The richer model remains within a 30 FPS frame on the reference
environment. The default 128×128 world with 250 founders leaves substantially
more headroom and remains the appropriate choice for phones and unknown
hardware.

The configuration schema's 10,000-organism and 65,536-cell hard caps prevent
unbounded work; they are safety boundaries, not performance promises. Rerun the
deployed benchmark after major simulation, rendering, analytics, or dependency
changes and revise the recommendation only from repeated evidence on
representative devices.
