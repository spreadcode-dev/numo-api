const DURATION_FORMAT = /^([1-9]\d*)([smh])$/;
const SECONDS_PER_UNIT: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3_600,
};

export const parseDurationSeconds = (
  variableName: string,
  value: string,
): number => {
  const match = DURATION_FORMAT.exec(value);
  if (!match) {
    throw new Error(
      `${variableName} must be a positive number followed by s, m or h (e.g. 15m), got "${value}"`,
    );
  }
  const [, amount, unit] = match;
  return Number(amount) * SECONDS_PER_UNIT[unit];
};
