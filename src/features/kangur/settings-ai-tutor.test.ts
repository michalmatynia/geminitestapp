import { describe, expect, it } from 'vitest';

import {
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAvailability,
  resolveKangurAiTutorAppSettings,
  resolveKangurAiTutorMotionPresetKind,
} from './settings-ai-tutor';

describe('kangur ai tutor settings', () => {
  it('fills guardrail defaults for legacy learner settings payloads', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          agentPersonaId: 'persona-1',
          playwrightPersonaId: '',
        },
      })
    );

    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1')).toEqual({
      enabled: true,
      agentPersonaId: 'persona-1',
      motionPresetId: null,
      guestIntroMode: 'first_visit',
      homeOnboardingMode: 'first_visit',
      uiMode: 'anchored',
      allowCrossPagePersistence: true,
      rememberTutorContext: true,
      allowLessons: true,
      allowGames: true,
      testAccessMode: 'guided',
      showSources: true,
      allowSelectedTextSupport: true,
      hintDepth: 'guided',
      proactiveNudges: 'gentle',
      dailyMessageLimit: null,
    });
  });

  it('reads the new motion preset field while staying backward compatible with legacy data', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          agentPersonaId: 'persona-1',
          motionPresetId: 'motion-2',
        },
        'learner-2': {
          enabled: true,
          agentPersonaId: 'persona-2',
          playwrightPersonaId: 'legacy-motion',
        },
      })
    );

    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1').motionPresetId).toBe(
      'motion-2'
    );
    expect(getKangurAiTutorSettingsForLearner(store, 'learner-2').motionPresetId).toBe(
      'legacy-motion'
    );
  });

  it('maps local and legacy motion preset ids onto tutor motion kinds without Playwright', () => {
    expect(resolveKangurAiTutorMotionPresetKind(null)).toBe('default');
    expect(resolveKangurAiTutorMotionPresetKind('tablet')).toBe('tablet');
    expect(resolveKangurAiTutorMotionPresetKind('preset-tablet')).toBe('tablet');
    expect(resolveKangurAiTutorMotionPresetKind('iphone-15')).toBe('mobile');
    expect(resolveKangurAiTutorMotionPresetKind('desktop')).toBe('desktop');
  });

  it('respects an explicit cross-page persistence override', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          allowCrossPagePersistence: false,
        },
      })
    );

    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1').allowCrossPagePersistence).toBe(
      false
    );
  });

  it('normalizes tutor preference controls for hint depth, proactive nudges, and memory', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          rememberTutorContext: false,
          hintDepth: 'step_by_step',
          proactiveNudges: 'coach',
        },
      })
    );

    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1')).toEqual(
      expect.objectContaining({
        rememberTutorContext: false,
        hintDepth: 'step_by_step',
        proactiveNudges: 'coach',
      })
    );
  });

  it('respects an explicit static ui mode override', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          uiMode: 'static',
        },
      })
    );

    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1').uiMode).toBe('static');
  });

  it('respects an explicit freeform ui mode override', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          uiMode: 'freeform',
        },
      })
    );

    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1').uiMode).toBe('freeform');
  });

  it('resolves global tutor settings from the dedicated app key and overrides legacy learner values', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          agentPersonaId: 'legacy-persona',
          motionPresetId: 'legacy-motion',
          dailyMessageLimit: 3,
        },
      })
    );
    const appSettings = resolveKangurAiTutorAppSettings(
      JSON.stringify({
        agentPersonaId: 'persona-1',
        motionPresetId: 'motion-2',
        dailyMessageLimit: 12,
        guestIntroMode: 'every_visit',
        homeOnboardingMode: 'first_visit',
      }),
      store
    );

    expect(appSettings).toEqual({
      agentPersonaId: 'persona-1',
      motionPresetId: 'motion-2',
      dailyMessageLimit: 12,
      guestIntroMode: 'every_visit',
      homeOnboardingMode: 'first_visit',
    });
    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1', appSettings)).toMatchObject({
      agentPersonaId: 'persona-1',
      motionPresetId: 'motion-2',
      dailyMessageLimit: 12,
      guestIntroMode: 'every_visit',
      homeOnboardingMode: 'first_visit',
    });
  });

  it('ignores legacy teaching-agent ids in stored tutor settings', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          teachingAgentId: 'legacy-teacher',
          agentPersonaId: 'persona-1',
        },
      })
    );
    const appSettings = resolveKangurAiTutorAppSettings(
      JSON.stringify({
        teachingAgentId: 'legacy-teacher',
        agentPersonaId: 'persona-1',
        dailyMessageLimit: 9,
      }),
      store
    );

    expect(appSettings).toEqual({
      agentPersonaId: 'persona-1',
      motionPresetId: null,
      dailyMessageLimit: 9,
      guestIntroMode: 'first_visit',
      homeOnboardingMode: 'first_visit',
    });
    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1', appSettings)).toEqual(
      expect.objectContaining({
        agentPersonaId: 'persona-1',
        dailyMessageLimit: 9,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'first_visit',
      })
    );
  });

  it('normalizes the global guest intro mode for admin-controlled tutor onboarding', () => {
    const appSettings = resolveKangurAiTutorAppSettings(
      JSON.stringify({
        guestIntroMode: 'every_visit',
      }),
      {}
    );

    expect(appSettings).toEqual({
      agentPersonaId: null,
      motionPresetId: null,
      dailyMessageLimit: null,
      guestIntroMode: 'every_visit',
      homeOnboardingMode: 'first_visit',
    });
  });

  it('normalizes the global home onboarding mode for the Game first-page walkthrough', () => {
    const appSettings = resolveKangurAiTutorAppSettings(
      JSON.stringify({
        homeOnboardingMode: 'every_visit',
      }),
      {}
    );

    expect(appSettings).toEqual({
      agentPersonaId: null,
      motionPresetId: null,
      dailyMessageLimit: null,
      guestIntroMode: 'first_visit',
      homeOnboardingMode: 'every_visit',
    });
  });

  it('blocks unrevealed test tutoring when the parent allows review only after the answer', () => {
    const availability = resolveKangurAiTutorAvailability(
      {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'first_visit',
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        rememberTutorContext: true,
        allowLessons: true,
        allowGames: true,
        testAccessMode: 'review_after_answer',
        showSources: true,
        allowSelectedTextSupport: true,
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: 12,
      },
      {
        surface: 'test',
        contentId: 'suite-1',
        title: 'Kangur Mini',
        answerRevealed: false,
      }
    );

    expect(availability).toEqual({
      allowed: false,
      reason: 'review_after_answer_only',
    });
  });

  it('allows the tutor on the game surface when learner tutoring is enabled', () => {
    const availability = resolveKangurAiTutorAvailability(
      {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'first_visit',
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        rememberTutorContext: true,
        allowLessons: true,
        allowGames: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: 12,
      },
      {
        surface: 'game',
        contentId: 'game',
        title: 'Pytanie do rozwiazania',
        currentQuestion: 'Ile to 8 + 5?',
        questionProgressLabel: 'Pytanie 2/10',
      }
    );

    expect(availability).toEqual({ allowed: true });
  });

  it('blocks the tutor on the game surface when game tutoring is disabled separately from lessons', () => {
    const availability = resolveKangurAiTutorAvailability(
      {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'first_visit',
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        rememberTutorContext: true,
        allowLessons: true,
        allowGames: false,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: 12,
      },
      {
        surface: 'game',
        contentId: 'calendar-quiz',
        title: 'Ćwiczenie kalendarza',
        currentQuestion: 'Który dzień jest po wtorku?',
      }
    );

    expect(availability).toEqual({
      allowed: false,
      reason: 'games_disabled',
    });
  });

  it('allows the tutor on profile surfaces as long as the tutor is enabled overall', () => {
    const availability = resolveKangurAiTutorAvailability(
      {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'first_visit',
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        rememberTutorContext: true,
        allowLessons: false,
        allowGames: false,
        testAccessMode: 'disabled',
        showSources: true,
        allowSelectedTextSupport: true,
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: 12,
      },
      {
        surface: 'profile',
        contentId: 'profile:learner-1',
        title: 'Profil ucznia',
      }
    );

    expect(availability).toEqual({ allowed: true });
  });

  it('allows the tutor on auth surfaces as long as the tutor is enabled overall', () => {
    const availability = resolveKangurAiTutorAvailability(
      {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'first_visit',
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        rememberTutorContext: true,
        allowLessons: false,
        allowGames: false,
        testAccessMode: 'disabled',
        showSources: true,
        allowSelectedTextSupport: true,
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: 12,
      },
      {
        surface: 'auth',
        contentId: 'auth:login:sign-in',
        title: 'Logowanie do Kangur',
      }
    );

    expect(availability).toEqual({ allowed: true });
  });
});
