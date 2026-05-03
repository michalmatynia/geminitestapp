export const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

export const firstOrEmpty = (values: string[]): string => values[0] ?? '';
