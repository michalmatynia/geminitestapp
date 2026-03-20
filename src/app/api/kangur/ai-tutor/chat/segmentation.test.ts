import { describe, it, expect } from 'vitest';
import { buildLearnerSegmentation } from './segmentation';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';

describe('buildLearnerSegmentation', () => {
  it('returns null/false for undefined context', () => {
    const result = buildLearnerSegmentation(undefined, null, false);
    expect(result).toEqual({
      surface: null,
      focusKind: null,
      interactionIntent: null,
      promptMode: null,
      contentId: null,
      questionId: null,
      hasDrawing: false,
      coachingMode: null,
      experimentCoachingMode: null,
      experimentContextStrategy: null,
    });
  });

  it('extracts segmentation from full context', () => {
    const context: KangurAiTutorConversationContext = {
      surface: 'lesson',
      contentId: 'lesson-123',
      focusKind: 'geometry',
      interactionIntent: 'explain',
      promptMode: 'chat',
      questionId: 'q-456',
      title: 'Triangles',
    };
    const result = buildLearnerSegmentation(context, 'socratic_method', true);
    expect(result).toEqual({
      surface: 'lesson',
      focusKind: 'geometry',
      interactionIntent: 'explain',
      promptMode: 'chat',
      contentId: 'lesson-123',
      questionId: 'q-456',
      hasDrawing: true,
      coachingMode: 'socratic_method',
      experimentCoachingMode: null,
      experimentContextStrategy: null,
    });
  });

  it('handles partial context with some fields missing', () => {
    const context: KangurAiTutorConversationContext = {
      surface: 'game',
      contentId: 'game-789',
      focusKind: 'fractions',
    };
    const result = buildLearnerSegmentation(context, null, false);
    expect(result.surface).toBe('game');
    expect(result.focusKind).toBe('fractions');
    expect(result.interactionIntent).toBeNull();
    expect(result.coachingMode).toBeNull();
  });

  it('distinguishes between coaching modes', () => {
    const context: KangurAiTutorConversationContext = {
      surface: 'lesson',
    };

    const withCoaching = buildLearnerSegmentation(context, 'hint_ladder', false);
    const withoutCoaching = buildLearnerSegmentation(context, null, false);

    expect(withCoaching.coachingMode).toBe('hint_ladder');
    expect(withoutCoaching.coachingMode).toBeNull();
  });

  it('tracks drawing adoption', () => {
    const context: KangurAiTutorConversationContext = {
      surface: 'lesson',
    };

    const withDrawing = buildLearnerSegmentation(context, null, true);
    const withoutDrawing = buildLearnerSegmentation(context, null, false);

    expect(withDrawing.hasDrawing).toBe(true);
    expect(withoutDrawing.hasDrawing).toBe(false);
  });
});
