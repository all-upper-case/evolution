import { describe, expect, it } from "vitest";

import { SeededRandom } from "./random";

describe("SeededRandom", () => {
  it("repeats the same sequence for the same seed", () => {
    const first = new SeededRandom(42);
    const second = new SeededRandom(42);

    const firstSequence = Array.from({ length: 100 }, () => first.next());
    const secondSequence = Array.from({ length: 100 }, () => second.next());

    expect(firstSequence).toEqual(secondSequence);
  });

  it("produces a known sequence for cross-runtime regression detection", () => {
    const random = new SeededRandom(1);

    expect(Array.from({ length: 5 }, () => random.next())).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
      0.9810509674716741, 0.9683778982143849,
    ]);
  });

  it("resets to the initial sequence", () => {
    const random = new SeededRandom(8675309);
    const expected = [random.next(), random.next(), random.next()];

    random.reset();

    expect([random.next(), random.next(), random.next()]).toEqual(expected);
  });

  it("generates integers inside a half-open interval", () => {
    const random = new SeededRandom(17);
    const values = Array.from({ length: 250 }, () => random.integer(-3, 8));

    expect(values.every((value) => value >= -3 && value < 8)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it("validates seeds, bounds, and probabilities", () => {
    expect(() => new SeededRandom(Number.NaN)).toThrow(TypeError);
    expect(() => new SeededRandom(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      TypeError,
    );

    const random = new SeededRandom(4);
    expect(() => random.integer(3, 3)).toThrow(RangeError);
    expect(() => random.integer(0.5, 3)).toThrow(TypeError);
    expect(() => random.chance(-0.1)).toThrow(RangeError);
    expect(() => random.chance(1.1)).toThrow(RangeError);
  });

  it("handles deterministic probability boundaries", () => {
    const never = new SeededRandom(5);
    const always = new SeededRandom(5);

    expect(Array.from({ length: 20 }, () => never.chance(0))).not.toContain(
      true,
    );
    expect(Array.from({ length: 20 }, () => always.chance(1))).not.toContain(
      false,
    );
  });
});
