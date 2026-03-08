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

    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1')).toEqual(
      expect.objectContaining({
        enabled: true,
        agentPersonaId: 'persona-1',
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      })
    );
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
      }),
      store
    );

    expect(appSettings).toEqual({
      agentPersonaId: 'persona-1',
      motionPresetId: 'motion-2',
      dailyMessageLimit: 12,
    });
    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1', appSettings)).toMatchObject({
      agentPersonaId: 'persona-1',
      motionPresetId: 'motion-2',
      dailyMessageLimit: 12,
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
    });
    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1', appSettings)).toEqual(
      expect.objectContaining({
        agentPersonaId: 'persona-1',
        dailyMessageLimit: 9,
      })
    );
  });

  it('blocks unrevealed test tutoring when the parent allows review only after the answer', () => {
    const availability = resolveKangurAiTutorAvailability(
      {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'review_after_answer',
        showSources: true,
        allowSelectedTextSupport: true,
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
});
