import { describe, expect, it } from 'vitest';

import {
  createKangurLessonsCatalogHref,
  createKangurLessonHref,
  createKangurLessonHrefForPracticeOperation,
} from './lessonHref';

describe('createKangurLessonsCatalogHref', () => {
  it('builds the base lessons catalog route', () => {
    expect(createKangurLessonsCatalogHref()).toEqual({
      pathname: '/lessons',
    });
  });
});

describe('createKangurLessonHref', () => {
  it('builds the base lessons route when no focus is provided', () => {
    expect(createKangurLessonHref(null)).toEqual({
      pathname: '/lessons',
    });
  });

  it('builds a focused lessons route when a lesson focus is provided', () => {
    expect(createKangurLessonHref('logical_patterns')).toEqual({
      pathname: '/lessons',
      params: {
        focus: 'logical_patterns',
      },
    });
  });

  it('maps practice operations to focused lesson routes when possible', () => {
    expect(
      createKangurLessonHrefForPracticeOperation('logical_patterns'),
    ).toEqual({
      pathname: '/lessons',
      params: {
        focus: 'logical_patterns',
      },
    });
    expect(createKangurLessonHrefForPracticeOperation('mixed')).toBeNull();
  });
});
