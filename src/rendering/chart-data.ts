export const lineChartPoints = (
  values: readonly number[],
  width: number,
  height: number,
  sharedMaximum?: number,
): string => {
  if (values.length === 0) return "";
  const maximum = Math.max(sharedMaximum ?? 0, ...values, 1);
  const denominator = Math.max(1, values.length - 1);
  return values
    .map((value, index) => {
      const x = (index / denominator) * width;
      const y = height - (Math.max(0, value) / maximum) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

export const histogramBars = (
  values: readonly number[],
  width: number,
  height: number,
): string => {
  if (values.length === 0) return "";
  const maximum = Math.max(...values, 1);
  const slotWidth = width / values.length;
  const barWidth = Math.max(0, slotWidth - 1);
  return values
    .map((value, index) => {
      const barHeight = (Math.max(0, value) / maximum) * height;
      return `<rect x="${(index * slotWidth).toFixed(2)}" y="${(height - barHeight).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" />`;
    })
    .join("");
};
