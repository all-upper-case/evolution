export const MAX_EXPERIMENT_FILE_BYTES = 16 * 1_024 * 1_024;

export interface ReadableExperimentFile {
  size: number;
  text(): Promise<string>;
}

export const readExperimentFile = async (
  file: ReadableExperimentFile,
): Promise<string> => {
  if (!Number.isSafeInteger(file.size) || file.size < 0)
    throw new TypeError("File size is invalid.");
  if (file.size > MAX_EXPERIMENT_FILE_BYTES)
    throw new RangeError("File exceeds the 16 MiB import limit.");
  return file.text();
};

/** Starts a local browser download without sending experiment data anywhere. */
export const downloadJsonFile = (contents: string, filename: string): void => {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
