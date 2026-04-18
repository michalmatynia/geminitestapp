import type { KangurAuthSession } from '@kangur/platform';

const areArraysEqual = (left: unknown[], right: unknown[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) =>
    areKangurMobileAuthValuesEqual(value, right[index]),
  );
};

const areObjectsEqual = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      areKangurMobileAuthValuesEqual(left[key], right[key]),
  );
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const areKangurMobileAuthValuesEqual = (
  left: unknown,
  right: unknown,
): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left)) {
    return Array.isArray(right) && areArraysEqual(left, right);
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    return areObjectsEqual(left, right);
  }

  return false;
};

export const hasKangurMobileAuthSessionPayloadChanged = (
  previousSession: KangurAuthSession,
  nextSession: KangurAuthSession,
): boolean =>
  previousSession.status !== nextSession.status ||
  previousSession.source !== nextSession.source ||
  !areKangurMobileAuthValuesEqual(previousSession.user, nextSession.user);
