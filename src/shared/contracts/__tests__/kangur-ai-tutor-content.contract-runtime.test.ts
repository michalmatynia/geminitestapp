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
    expect(parsed.common.defaultTutorName).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.defaultTutorName
    );
    expect(parsed.common.sessionRegistryLabel).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.sessionRegistryLabel
    );
    expect(parsed.guestIntro.intentPhrases.createAccount).toEqual(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.guestIntro.intentPhrases.createAccount
    );
    expect(parsed.narrator.registrySourceLabel).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.narrator.registrySourceLabel
    );
    expect(parsed.panelChrome.surfaceLabels.profile).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.surfaceLabels.profile
    );
    expect(parsed.panelChrome.surfaceLabels.parent_dashboard).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.surfaceLabels.parent_dashboard
    );
    expect(parsed.panelChrome.surfaceLabels.auth).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.surfaceLabels.auth
    );
    expect(parsed.panelChrome.contextFallbackTargets.profile).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.contextFallbackTargets.profile
    );
    expect(parsed.panelChrome.contextFallbackTargets.parent_dashboard).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.contextFallbackTargets.parent_dashboard
    );
    expect(parsed.panelChrome.contextFallbackTargets.auth).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.contextFallbackTargets.auth
    );
    expect(parsed.usageApi.availabilityErrors.emailUnverified).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.usageApi.availabilityErrors.emailUnverified
    );
    expect(parsed.parentVerification.verifySuccessMessage).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.parentVerification.verifySuccessMessage
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
