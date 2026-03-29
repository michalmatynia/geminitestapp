import { describe, expect, it } from 'vitest';

import { formatKangurMobileQuestionCount } from './questionCountLabel';

describe('formatKangurMobileQuestionCount', () => {
  it('formats german and english singular and plural labels', () => {
    expect(formatKangurMobileQuestionCount(1, 'de')).toBe('1 Frage');
    expect(formatKangurMobileQuestionCount(3, 'de')).toBe('3 Fragen');
    expect(formatKangurMobileQuestionCount(1, 'en')).toBe('1 question');
    expect(formatKangurMobileQuestionCount(3, 'en')).toBe('3 questions');
  });

  it('uses the correct Polish noun forms', () => {
    expect(formatKangurMobileQuestionCount(1, 'pl')).toBe('1 pytanie');
    expect(formatKangurMobileQuestionCount(2, 'pl')).toBe('2 pytania');
    expect(formatKangurMobileQuestionCount(5, 'pl')).toBe('5 pytań');
    expect(formatKangurMobileQuestionCount(12, 'pl')).toBe('12 pytań');
    expect(formatKangurMobileQuestionCount(22, 'pl')).toBe('22 pytania');
  });
});
