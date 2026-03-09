import { describe, expect, it } from 'vitest';

import { getQuestionAuthoringSummary } from '@/features/kangur/admin/question-authoring-insights';
import type { KangurTestQuestion } from '@/shared/contracts/kangur-tests';

const makeQuestion = (overrides: Partial<KangurTestQuestion> = {}): KangurTestQuestion => ({
  id: 'q1',
  suiteId: 'suite-1',
  sortOrder: 1000,
  prompt: 'What is 2 + 2?',
  choices: [
    { label: 'A', text: '3', svgContent: '' },
    { label: 'B', text: '4', svgContent: '' },
  ],
  correctChoiceLabel: 'B',
  pointValue: 3,
  explanation: 'Because two plus two equals four.',
  illustration: { type: 'none' },
  presentation: { layout: 'classic', choiceStyle: 'list' },
  editorial: { source: 'manual', reviewStatus: 'ready', auditFlags: [] },
  ...overrides,
});

describe('getQuestionAuthoringSummary', () => {
  it('marks structurally valid questions as ready', () => {
    const summary = getQuestionAuthoringSummary(makeQuestion());

    expect(summary.status).toBe('ready');
    expect(summary.blockers).toHaveLength(0);
    expect(summary.warnings).toHaveLength(0);
  });

  it('returns blockers for missing structural requirements', () => {
    const summary = getQuestionAuthoringSummary(
      makeQuestion({
        prompt: '',
        choices: [{ label: 'A', text: '', svgContent: '' }],
        correctChoiceLabel: 'B',
      })
    );

    expect(summary.status).toBe('needs-fix');
    expect(summary.blockers.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'missing_prompt',
        'not_enough_choices',
        'empty_choice_text',
        'missing_correct_choice',
      ])
    );
  });

  it('treats split layouts without illustration as blocked', () => {
    const summary = getQuestionAuthoringSummary(
      makeQuestion({
        presentation: { layout: 'split-illustration-right', choiceStyle: 'grid' },
      })
    );

    expect(summary.status).toBe('needs-fix');
    expect(summary.blockers.map((issue) => issue.code)).toContain(
      'split_layout_without_illustration'
    );
  });

  it('keeps legacy review as warning and legacy fix as blocker', () => {
    const reviewSummary = getQuestionAuthoringSummary(
      makeQuestion({
        editorial: {
          source: 'legacy-import',
          reviewStatus: 'needs-review',
          auditFlags: ['legacy_choice_descriptions'],
        },
      })
    );
    const fixSummary = getQuestionAuthoringSummary(
      makeQuestion({
        editorial: {
          source: 'legacy-import',
          reviewStatus: 'needs-fix',
          auditFlags: ['explanation_answer_mismatch'],
          note: 'Legacy question needs editorial repair before publishing.',
        },
      })
    );

    expect(reviewSummary.status).toBe('needs-review');
    expect(reviewSummary.warnings.map((issue) => issue.code)).toContain('legacy_review_required');
    expect(fixSummary.status).toBe('needs-fix');
    expect(fixSummary.blockers.map((issue) => issue.code)).toContain('legacy_fix_required');
  });

  it('warns when a visual prompt has no supporting visual or when choice svg lacks note', () => {
    const summary = getQuestionAuthoringSummary(
      makeQuestion({
        prompt: 'Patrz na rysunek i wybierz poprawna odpowiedz.',
        choices: [
          { label: 'A', text: '3', svgContent: '<svg viewBox="0 0 10 10"></svg>' },
          { label: 'B', text: '4', svgContent: '' },
        ],
      })
    );

    expect(summary.status).toBe('needs-review');
    expect(summary.warnings.map((issue) => issue.code)).toContain('choice_svg_without_note');
    expect(summary.warnings.map((issue) => issue.code)).not.toContain(
      'visual_prompt_without_visuals'
    );
  });
});
