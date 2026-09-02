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
snapshot, canvas upload, three 600-point line calculations, and all five trait
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

Release measurements and conservative guidance will be recorded after the
benchmark is exercised from the production deployment. Configuration schema
hard caps remain safety boundaries, not performance promises.
