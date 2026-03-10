import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  parseKangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';

describe('kangur ai tutor content contract', () => {
  it('backfills newly added content sections from defaults when parsing older mongo documents', () => {
    const parsed = parseKangurAiTutorContent({
      locale: 'pl',
      version: 1,
      common: {
        openTutorAria: 'Otwórz pomocnika AI',
      },
      moods: {
        neutral: {
          label: 'Spokojny',
          description: 'Zmodyfikowany opis.',
        },
      },
    });

    expect(parsed.common.signInLabel).toBe(DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.signInLabel);
    expect(parsed.common.sendFailureFallback).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.sendFailureFallback
    );
    expect(parsed.guestIntro.intentPhrases.createAccount).toEqual(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.guestIntro.intentPhrases.createAccount
    );
    expect(parsed.profileMoodWidget.title).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.profileMoodWidget.title
    );
    expect(parsed.parentDashboard.saveIdleLabel).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.parentDashboard.saveIdleLabel
    );
    expect(parsed.moods.neutral?.label).toBe('Spokojny');
    expect(parsed.moods.neutral?.description).toBe('Zmodyfikowany opis.');
  });
});
