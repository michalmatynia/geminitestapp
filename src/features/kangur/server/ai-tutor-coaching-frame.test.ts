import { describe, expect, it } from 'vitest';

import {
  appendCoachingFrameInstructions,
  buildKangurAiTutorCoachingFrame,
  COACHING_MODE_INSTRUCTIONS,
} from './ai-tutor-coaching-frame';

describe('COACHING_MODE_INSTRUCTIONS', () => {
  it('covers all four coaching modes', () => {
    expect(COACHING_MODE_INSTRUCTIONS).toMatchObject({
      hint_ladder: expect.any(String),
      misconception_check: expect.any(String),
      review_reflection: expect.any(String),
      next_best_action: expect.any(String),
    });
  });
});

describe('buildKangurAiTutorCoachingFrame', () => {
  const baseInput = {
    context: undefined,
    averageAccuracy: 80,
    weakMasteryPercent: 80,
    previousCoachingMode: null,
  } as const;

  it('returns review_reflection when answer_revealed hint recovery signal is present', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      context: { recentHintRecoverySignal: 'answer_revealed' } as never,
    });
    expect(frame.mode).toBe('review_reflection');
  });

  it('returns review_reflection when answerRevealed is true', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      context: { answerRevealed: true } as never,
    });
    expect(frame.mode).toBe('review_reflection');
  });

  it('returns review_reflection when interactionIntent is review', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      context: { interactionIntent: 'review' } as never,
    });
    expect(frame.mode).toBe('review_reflection');
  });

  it('returns next_best_action when interactionIntent is next_step', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      context: { interactionIntent: 'next_step' } as never,
    });
    expect(frame.mode).toBe('next_best_action');
  });

  it('returns next_best_action when focus_advanced hint recovery signal is present', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      context: { recentHintRecoverySignal: 'focus_advanced' } as never,
    });
    expect(frame.mode).toBe('next_best_action');
  });

  it('returns misconception_check on repeated question with hint intent', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      context: {
        repeatedQuestionCount: 2,
        interactionIntent: 'hint',
      } as never,
    });
    expect(frame.mode).toBe('misconception_check');
  });

  it('escalates to misconception_check with hint_ladder rationale when previous mode was hint_ladder', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      previousCoachingMode: 'hint_ladder',
      context: {
        repeatedQuestionCount: 1,
        promptMode: 'hint',
      } as never,
    });
    expect(frame.mode).toBe('misconception_check');
    expect(frame.rationale).toContain('przejść z kolejnego tropu');
  });

  it('returns misconception_check when learner selected text', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      context: { selectedText: 'some text' } as never,
    });
    expect(frame.mode).toBe('misconception_check');
  });

  it('returns hint_ladder when surface is test', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      context: { surface: 'test' } as never,
    });
    expect(frame.mode).toBe('hint_ladder');
  });

  it('returns hint_ladder when averageAccuracy is below 70', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      averageAccuracy: 65,
    });
    expect(frame.mode).toBe('hint_ladder');
  });

  it('returns hint_ladder when weakMasteryPercent is below 60', () => {
    const frame = buildKangurAiTutorCoachingFrame({
      ...baseInput,
      weakMasteryPercent: 55,
    });
    expect(frame.mode).toBe('hint_ladder');
  });

  it('falls back to misconception_check when no signals match', () => {
    const frame = buildKangurAiTutorCoachingFrame(baseInput);
    expect(frame.mode).toBe('misconception_check');
  });
});

describe('appendCoachingFrameInstructions', () => {
  it('appends mode instruction line to the lines array', () => {
    const lines: string[] = [];
    appendCoachingFrameInstructions(lines, {
      mode: 'hint_ladder',
      label: 'Jeden trop',
      description: 'Daj jeden krok.',
      rationale: 'Niska skuteczność.',
    });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('hint_ladder');
    expect(lines[0]).toContain(COACHING_MODE_INSTRUCTIONS.hint_ladder);
    expect(lines[1]).toContain('Niska skuteczność.');
  });

  it('skips rationale line when rationale is absent', () => {
    const lines: string[] = [];
    appendCoachingFrameInstructions(lines, {
      mode: 'review_reflection',
      label: 'Omów',
      description: 'Podsumuj.',
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('review_reflection');
  });
});
