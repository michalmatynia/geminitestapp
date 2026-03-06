export type KangurStatusError = { status: number };

export const isKangurStatusError = (value: unknown): value is KangurStatusError =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  typeof (value as { status?: unknown }).status === 'number';

export const isKangurAuthStatusError = (value: unknown): value is KangurStatusError =>
  isKangurStatusError(value) && (value.status === 401 || value.status === 403);
