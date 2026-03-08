import { resolveKangurLessonFocusForPracticeOperation } from '@kangur/core';
import type { Href } from 'expo-router';

export const createKangurLessonHref = (focus: string | null | undefined): Href => {
  const trimmedFocus = focus?.trim();
  if (!trimmedFocus) {
    return '/lessons' as Href;
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
