import { describe, expect, it } from 'vitest';

import {
  normalizePlaywrightAction,
  playwrightActionSchema,
  type PlaywrightAction,
} from './playwright-steps';

describe('playwright action normalization', () => {
  it('hydrates legacy step-set-only actions into ordered action blocks', () => {
    const parsed = playwrightActionSchema.parse({
      id: 'action_legacy',
      name: 'Legacy action',
      description: null,
      runtimeKey: null,
      stepSetIds: ['set_auth', 'set_list'],
      personaId: null,
      createdAt: '2026-04-16T08:00:00.000Z',
      updatedAt: '2026-04-16T08:00:00.000Z',
    });

    const normalized = normalizePlaywrightAction(parsed);

    expect(normalized.blocks).toEqual([
      {
        id: 'action_legacy__step_set__0',
        kind: 'step_set',
        refId: 'set_auth',
        enabled: true,
        label: null,
      },
      {
        id: 'action_legacy__step_set__1',
        kind: 'step_set',
        refId: 'set_list',
        enabled: true,
        label: null,
      },
    ]);
    expect(normalized.stepSetIds).toEqual(['set_auth', 'set_list']);
  });

  it('derives legacy stepSetIds from step-set blocks while preserving direct step blocks', () => {
    const action: PlaywrightAction = {
      id: 'action_mixed',
      name: 'Mixed action',
      description: null,
      runtimeKey: 'tradera_quicklist_list',
      blocks: [
        {
          id: 'block_step',
          kind: 'step',
          refId: 'step_login',
          enabled: true,
          label: null,
        },
        {
          id: 'block_set',
          kind: 'step_set',
          refId: 'set_publish',
          enabled: false,
          label: 'Publish bundle',
        },
      ],
      stepSetIds: [],
      personaId: 'persona_1',
      createdAt: '2026-04-16T08:00:00.000Z',
      updatedAt: '2026-04-16T08:00:00.000Z',
    };

    const normalized = normalizePlaywrightAction(action);

    expect(normalized.blocks).toEqual(action.blocks);
    expect(normalized.stepSetIds).toEqual(['set_publish']);
    expect(normalized.runtimeKey).toBe('tradera_quicklist_list');
  });
});
