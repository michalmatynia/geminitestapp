import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KANGUR_TUTOR_MOOD_ID,
  createDefaultKangurAiTutorLearnerMood,
} from '@/shared/contracts/kangur-ai-tutor-mood';

describe('kangur ai tutor mood contract', () => {
  it('builds the canonical default learner mood state', () => {
    expect(createDefaultKangurAiTutorLearnerMood()).toEqual({
      currentMoodId: DEFAULT_KANGUR_TUTOR_MOOD_ID,
      baselineMoodId: DEFAULT_KANGUR_TUTOR_MOOD_ID,
      confidence: 0.25,
      lastComputedAt: null,
      lastReasonCode: null,
    });
  });

  it('keeps explicit overrides while preserving other defaults', () => {
    expect(
      createDefaultKangurAiTutorLearnerMood({
        currentMoodId: 'focused',
        confidence: 0.8,
      })
    ).toEqual({
      currentMoodId: 'focused',
      baselineMoodId: DEFAULT_KANGUR_TUTOR_MOOD_ID,
      confidence: 0.8,
      lastComputedAt: null,
      lastReasonCode: null,
    });
  });
});
