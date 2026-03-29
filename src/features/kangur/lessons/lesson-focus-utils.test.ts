import { describe, expect, it } from 'vitest';

import { resolveFocusedLessonScope } from './lesson-focus-utils';

describe('lesson-focus-utils', () => {
  it('falls back to the built-in lesson library when the template map is empty', () => {
    const scope = resolveFocusedLessonScope('division', new Map());

    expect(scope).toEqual({
      componentId: 'division',
      subject: 'maths',
      ageGroup: 'ten_year_old',
    });
  });

  it('prefers the runtime template map when it has a matching component', () => {
    const scope = resolveFocusedLessonScope(
      'division',
      new Map([
        [
          'division',
          {
            componentId: 'division',
            subject: 'maths',
            ageGroup: 'six_year_old',
            label: 'Division',
            title: 'Division',
            description: 'Runtime override',
            emoji: '➗',
            color: 'x',
            activeBg: 'y',
            sortOrder: 1,
          },
        ],
      ])
    );

    expect(scope).toEqual({
      componentId: 'division',
      subject: 'maths',
      ageGroup: 'six_year_old',
    });
  });
});
