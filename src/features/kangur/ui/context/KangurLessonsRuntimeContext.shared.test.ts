import { describe, expect, it } from 'vitest';

import { resolveFocusedLessonSubject } from './KangurLessonsRuntimeContext.shared';

describe('KangurLessonsRuntimeContext.shared', () => {
  it('resolves subjects from focus tokens', () => {
    expect(resolveFocusedLessonSubject('english')).toBe('english');
    expect(resolveFocusedLessonSubject('english_basics')).toBe('english');
    expect(resolveFocusedLessonSubject('addition')).toBe('maths');
    expect(resolveFocusedLessonSubject('adding')).toBe('maths');
  });

  it('returns null for unknown focus tokens', () => {
    expect(resolveFocusedLessonSubject('not-a-lesson')).toBeNull();
  });
});
