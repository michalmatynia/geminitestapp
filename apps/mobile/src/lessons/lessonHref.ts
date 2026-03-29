import { resolveKangurLessonFocusForPracticeOperation } from '@kangur/core';
import type { Href } from 'expo-router';

export const createKangurLessonsCatalogHref = (): Href =>
  ({
    pathname: '/lessons',
  }) as unknown as Href;

export const createKangurLessonHref = (focus: string | null | undefined): Href => {
  const trimmedFocus = focus?.trim();
  if (!trimmedFocus) {
    return createKangurLessonsCatalogHref();
  }

  return ({
    pathname: '/lessons',
    params: {
      focus: trimmedFocus,
    },
  }) as unknown as Href;
};

export const createKangurLessonHrefForPracticeOperation = (
  operation: string | null | undefined,
): Href | null => {
  const focus = resolveKangurLessonFocusForPracticeOperation(operation);
  return focus ? createKangurLessonHref(focus) : null;
};
