import { describe, expect, it } from "vitest";
import {
  MAX_LAB_TICKS,
  parseLabRequest,
  runLabExperiment,
} from "./experiment-lab";

describe("experiment lab", () => {
  it("parses complete dotted overrides and ordered checkpoints", () => {
    const request = parseLabRequest(
      "?ticks=20&checkpoints=20,0,10,10&seed=77&world.width=32&world.height=48&population.initialCount=12&population.maximumCount=50&evolution.mutationProbability=0.25",
    );
    expect(request).toMatchObject({
      ticks: 20,
      checkpoints: [0, 10, 20],
      config: {
        seed: 77,
        world: { width: 32, height: 48 },
        population: { initialCount: 12, maximumCount: 50 },
        evolution: { mutationProbability: 0.25 },
      },
    });
  });

  it("rejects unknown, invalid, and unbounded work", () => {
    expect(() => parseLabRequest("?typo=1")).toThrow("Unknown lab parameter");
    expect(() => parseLabRequest("?ticks=1&ticks=2")).toThrow(
      "Duplicate lab parameter",
    );
    expect(() =>
      parseLabRequest(`?ticks=${String(MAX_LAB_TICKS + 1)}`),
    ).toThrow("ticks must be");
    expect(() => parseLabRequest("?ticks=10&checkpoints=11")).toThrow(
      "checkpoint must be",
    );
    expect(() => parseLabRequest("?world.width=2")).toThrow(
      "Invalid simulation configuration",
    );
    expect(() => parseLabRequest("?population.maximumCount=1001")).toThrow(
      "at most 256×256",
    );
  });

  it("produces compact deterministic checkpoint reports", () => {
    const request = parseLabRequest(
      "?ticks=25&checkpoints=0,10&seed=123&world.width=32&world.height=32&population.initialCount=20&population.maximumCount=50&food.initialUnits=500&food.maximumUnits=1000",
    );
    const first = runLabExperiment(request);
    const second = runLabExperiment(request);
    expect(first).toEqual(second);
    expect(first.checkpoints.map((checkpoint) => checkpoint.tick)).toEqual([
      0, 10, 25,
    ]);
    expect(first.checkpoints[0]).toMatchObject({
      population: 20,
      lineages: 20,
    });
    expect(first.checkpoints[2]?.traits.movementSpeed.mean).toEqual(
      expect.any(Number),
    );
  });
});
