import { describe, expect, it } from 'vitest';

import {
  getKangurCompetitionQuestions,
  isKangurCompetitionExamMode,
} from './competition';

describe('kangur-core competition questions', () => {
  it('returns the full 2024 competition set and clones question records', () => {
    const firstRun = getKangurCompetitionQuestions('full_test_2024');
    const secondRun = getKangurCompetitionQuestions('full_test_2024');

    expect(firstRun).toHaveLength(24);
    expect(secondRun).toHaveLength(24);
    expect(firstRun[0]).not.toBe(secondRun[0]);
    expect(firstRun[0]?.id).toBe('2024_1');
    expect(firstRun.at(-1)?.id).toBe('2024_5pt_24');
  });

  it('marks only the full test as exam mode', () => {
    expect(isKangurCompetitionExamMode('full_test_2024')).toBe(true);
    expect(isKangurCompetitionExamMode('original_2024')).toBe(false);
    expect(isKangurCompetitionExamMode('training_3pt')).toBe(false);
  });
});
