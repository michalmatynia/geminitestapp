import { describe, expect, it } from 'vitest';

import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

import { buildManagedPlaywrightActionSummaries } from './playwright-managed-runtime-actions';

const buildRuntimeAction = (
  runtimeKey: NonNullable<PlaywrightAction['runtimeKey']>,
  overrides?: Partial<PlaywrightAction>
): PlaywrightAction => {
  const seed = getPlaywrightRuntimeActionSeed(runtimeKey);
  if (seed === null) {
    throw new Error(`Missing runtime action seed: ${runtimeKey}`);
  }

  return normalizePlaywrightAction({
    ...seed,
    ...overrides,
    blocks:
      overrides?.blocks ??
      seed.blocks.map((block) => ({
        ...block,
      })),
    executionSettings: {
      ...defaultPlaywrightActionExecutionSettings,
      ...seed.executionSettings,
      ...(overrides?.executionSettings ?? {}),
    },
  });
};

describe('buildManagedPlaywrightActionSummaries', () => {
  it('summarizes action execution settings and browser preparation overrides', () => {
    const action = buildRuntimeAction('vinted_list', {
      executionSettings: {
        headless: false,
        browserPreference: 'chrome',
        locale: 'en-US',
        timezoneId: 'Europe/Warsaw',
      },
      blocks: getPlaywrightRuntimeActionSeed('vinted_list')!.blocks.map((block) =>
        block.refId === 'browser_preparation'
          ? {
              ...block,
              config: {
                viewportWidth: 1440,
                viewportHeight: 900,
                settleDelayMs: 750,
                locale: 'en-GB',
                permissions: ['geolocation'],
              },
            }
          : { ...block }
      ),
    });

    const [summary] = buildManagedPlaywrightActionSummaries({
      actions: [action],
      runtimeKeys: ['vinted_list'],
    });

    expect(summary?.fallbackActive).toBe(false);
    expect(summary?.executionSettingsSummary).toEqual(
      expect.arrayContaining([
        'Headed',
        'Browser: chrome',
        'Locale: en-US',
        'Timezone: Europe/Warsaw',
      ])
    );
    expect(summary?.browserPreparationSummary).toEqual(
      expect.arrayContaining([
        'Viewport: 1440x900',
        'Settle delay: 750ms',
        'Locale override: en-GB',
        'Permissions: geolocation',
      ])
    );
  });

  it('falls back to the seeded runtime action when the stored action is invalid', () => {
    const invalidDuplicate = buildRuntimeAction('tradera_standard_list', {
      id: 'runtime_action__duplicate_tradera_standard_list',
      name: 'Broken duplicate',
    });

    const [summary] = buildManagedPlaywrightActionSummaries({
      actions: [buildRuntimeAction('tradera_standard_list'), invalidDuplicate],
      runtimeKeys: ['tradera_standard_list'],
    });

    expect(summary?.fallbackActive).toBe(true);
    expect(summary?.action.id).toBe('runtime_action__tradera_standard_list');
    expect(summary?.fallbackReason).toContain(
      'cannot define runtimeKey "tradera_standard_list" more than once'
    );
  });
});
