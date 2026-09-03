import { describe, expect, it, vi } from "vitest";

import { MAX_EXPERIMENT_FILE_BYTES, readExperimentFile } from "./file-transfer";

describe("experiment file transfer", () => {
  it("reads a bounded local file", async () => {
    const text = vi.fn().mockResolvedValue('{"schemaVersion":1}');
    await expect(readExperimentFile({ size: 19, text })).resolves.toBe(
      '{"schemaVersion":1}',
    );
    expect(text).toHaveBeenCalledOnce();
  });

  it("rejects oversized files before reading them", async () => {
    const text = vi.fn().mockResolvedValue("ignored");
    await expect(
      readExperimentFile({ size: MAX_EXPERIMENT_FILE_BYTES + 1, text }),
    ).rejects.toThrow("16 MiB");
    expect(text).not.toHaveBeenCalled();
  });

  it("rejects invalid size metadata", async () => {
    await expect(
      readExperimentFile({ size: -1, text: () => Promise.resolve("") }),
    ).rejects.toThrow(TypeError);
  });
});
