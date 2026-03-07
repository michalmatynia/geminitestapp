import { describe, expect, it } from 'vitest';

import {
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAvailability,
} from './settings-ai-tutor';

describe('kangur ai tutor settings', () => {
  it('fills guardrail defaults for legacy learner settings payloads', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          teachingAgentId: 'teacher-1',
          agentPersonaId: 'persona-1',
          playwrightPersonaId: '',
        },
      })
    );

    expect(getKangurAiTutorSettingsForLearner(store, 'learner-1')).toEqual({
      enabled: true,
      teachingAgentId: 'teacher-1',
      agentPersonaId: 'persona-1',
      motionPresetId: null,
      allowLessons: true,
      testAccessMode: 'guided',
      showSources: true,
      allowSelectedTextSupport: true,
      dailyMessageLimit: null,
    });
  });

  it('reads the new motion preset field while staying backward compatible with legacy data', () => {
    const store = parseKangurAiTutorSettings(
      JSON.stringify({
        'learner-1': {
          enabled: true,
          teachingAgentId: 'teacher-1',
          agentPersonaId: 'persona-1',
          motionPresetId: 'motion-2',
        },
        'learner-2': {
          enabled: true,
          teachingAgentId: 'teacher-2',
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

  it('blocks unrevealed test tutoring when the parent allows review only after the answer', () => {
    const availability = resolveKangurAiTutorAvailability(
      {
        enabled: true,
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: null,
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
