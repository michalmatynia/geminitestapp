import type { KangurAuthSession } from '@kangur/platform';

const areKangurMobileAuthValuesEqual = (
  left: unknown,
  right: unknown,
): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (left === null || right === null) {
    return left === right;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((value, index) =>
      areKangurMobileAuthValuesEqual(value, right[index]),
    );
  }

  if (typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(rightRecord, key) &&
      areKangurMobileAuthValuesEqual(leftRecord[key], rightRecord[key]),
  );
};

export const hasKangurMobileAuthSessionPayloadChanged = (
  previousSession: KangurAuthSession,
  nextSession: KangurAuthSession,
): boolean =>
  previousSession.status !== nextSession.status ||
  previousSession.source !== nextSession.source ||
  !areKangurMobileAuthValuesEqual(previousSession.user, nextSession.user);
