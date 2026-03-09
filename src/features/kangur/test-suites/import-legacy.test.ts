import { describe, expect, it } from 'vitest';

import { importLegacyKangurQuestions } from './import-legacy';

describe('importLegacyKangurQuestions', () => {
  it('preserves legacy choice descriptions as structured choice review content', () => {
    const { questionStore } = importLegacyKangurQuestions();
    const importedQuestion = Object.values(questionStore).find(
      (question) => question.editorial.legacyId === '2024_1'
    );

    expect(importedQuestion).toBeDefined();
    expect(importedQuestion?.presentation.choiceStyle).toBe('grid');
    expect(importedQuestion?.choices[0]?.description).toContain('schodkowym');
    expect(importedQuestion?.editorial.auditFlags).toContain('legacy_choice_descriptions');
  });

  it('flags known inconsistent legacy questions for editorial repair', () => {
    const { questionStore } = importLegacyKangurQuestions();
    const importedQuestion = Object.values(questionStore).find(
      (question) => question.editorial.legacyId === '2024_3'
    );

    expect(importedQuestion).toBeDefined();
    expect(importedQuestion?.editorial.reviewStatus).toBe('needs-fix');
    expect(importedQuestion?.editorial.auditFlags).toContain('explanation_answer_mismatch');
  });

  it('reports a review summary for the current imported legacy bank', () => {
    const { suites, questionStore, summary } = importLegacyKangurQuestions();

    expect(suites).toHaveLength(4);
    expect(Object.keys(questionStore)).toHaveLength(34);
    expect(summary.questionCount).toBe(34);
    expect(summary.needsReviewCount + summary.needsFixCount).toBeGreaterThan(0);
  });
});
