import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  type KangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';

import {
  buildKangurAiTutorContentLocaleScaffold,
  getKangurAiTutorContentLocaleOverlay,
} from './ai-tutor-content-locale-scaffold';

describe('ai tutor content locale scaffold', () => {
  it('builds an English scaffold with localized auth copy', () => {
    const content = buildKangurAiTutorContentLocaleScaffold({
      locale: 'en',
      sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
    });

    expect(content.locale).toBe('en');
    expect(content.common.openTutorAria).toBe('Open AI tutor');
    expect(content.guestIntro.initial.headline).toBe(
      'Do you want help with signing in or creating an account?'
    );
    expect(content.parentVerification.emailSubject).toBe(
      'Kangur: confirm the parent email'
    );
    expect(content.parentVerification.verifySuccessMessage).toContain('AI Tutor is unlocked');
    expect(content.quickActions.review.questionLabel).toBe('Review answer');
    expect(content.parentDashboard.guardrailsTitle).toBe('Parent guardrails');
    expect(content.moods.neutral.label).toBe('Neutral');
    expect(content.common.defaultTutorName).toBe(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.defaultTutorName
    );
  });

  it('builds a German scaffold with localized auth copy', () => {
    const content = buildKangurAiTutorContentLocaleScaffold({
      locale: 'de',
      sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
    });

    expect(content.locale).toBe('de');
    expect(content.panelChrome.moodPrefix).toBe('Stimmung');
    expect(content.messageList.loadingLabel).toBe('Ich denke nach...');
    expect(content.parentVerification.emailSubject).toBe(
      'Kangur: E-Mail der Eltern bestätigen'
    );
    expect(content.usageApi.availabilityErrors.emailUnverified).toContain('KI-Tutor');
    expect(content.quickActions.review.questionLabel).toBe('Antwort besprechen');
    expect(content.parentDashboard.guardrailsTitle).toBe('Guardrails der Eltern');
    expect(content.moods.neutral.description).toContain('stabiler Ausgangspunkt');
  });

  it('preserves manual target translations when they differ from the source locale', () => {
    const existingContent = {
      locale: 'en',
      common: {
        defaultTutorName: 'Alex',
        openTutorAria: 'Custom manual tutor label',
      },
      parentVerification: {
        emailSubject: 'Custom manual email subject',
      },
    } satisfies Partial<KangurAiTutorContent>;

    const content = buildKangurAiTutorContentLocaleScaffold({
      locale: 'en',
      sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      existingContent,
    });

    expect(content.common.defaultTutorName).toBe('Alex');
    expect(content.common.openTutorAria).toBe('Custom manual tutor label');
    expect(content.parentVerification.emailSubject).toBe('Custom manual email subject');
  });

  it('replaces scaffolded source-locale values with localized overlay values', () => {
    const existingContent = {
      locale: 'en',
      common: {
        openTutorAria: DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.openTutorAria,
      },
      parentVerification: {
        emailSubject: DEFAULT_KANGUR_AI_TUTOR_CONTENT.parentVerification.emailSubject,
      },
    } satisfies Partial<KangurAiTutorContent>;

    const content = buildKangurAiTutorContentLocaleScaffold({
      locale: 'en',
      sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      existingContent,
    });

    expect(content.common.openTutorAria).toBe('Open AI tutor');
    expect(content.parentVerification.emailSubject).toBe(
      getKangurAiTutorContentLocaleOverlay('en').parentVerification?.emailSubject
    );
  });
});
