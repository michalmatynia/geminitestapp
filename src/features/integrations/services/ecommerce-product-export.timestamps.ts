export const toValidDate = (value: string | Date | null | undefined, fallback: Date): Date => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return fallback;
};

export const toIsoString = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : value;
