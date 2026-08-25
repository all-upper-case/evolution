import { describe, expect, it } from "vitest";
import { SimulationClock } from "./clock";

describe("SimulationClock", () => {
  it("produces the same ticks for different frame partitions", () => {
    const steady = new SimulationClock(30);
    const uneven = new SimulationClock(30);
    steady.play();
    uneven.play();
    for (let frame = 0; frame < 60; frame += 1) steady.advance(1 / 60);
    for (const duration of [0.11, 0.03, 0.27, 0.09, 0.21, 0.29])
      uneven.advance(duration);
    expect(steady.snapshot.tick).toBe(30);
    expect(uneven.snapshot).toEqual(steady.snapshot);
  });

  it("pauses, steps once, and resumes without losing remainder", () => {
    const clock = new SimulationClock(10);
    clock.play();
    expect(clock.advance(0.15)).toBe(1);
    clock.pause();
    expect(clock.advance(1)).toBe(0);
    expect(clock.step()).toBe(1);
    clock.play();
    expect(clock.advance(0.05)).toBe(1);
    expect(clock.snapshot.tick).toBe(3);
  });

  it("applies speeds and rejects invalid input", () => {
    const clock = new SimulationClock(20);
    clock.setSpeed(4);
    clock.play();
    expect(clock.advance(0.25)).toBe(20);
    expect(() => clock.setSpeed(3)).toThrow(RangeError);
    expect(() => clock.advance(-1)).toThrow(RangeError);
  });

  it("reset restores the initial stopped state", () => {
    const clock = new SimulationClock(30);
    clock.setSpeed(2);
    clock.play();
    clock.advance(1);
    clock.reset();
    expect(clock.snapshot).toEqual({
      tick: 0,
      elapsedSimulationSeconds: 0,
      running: false,
      speed: 1,
    });
  });
});
