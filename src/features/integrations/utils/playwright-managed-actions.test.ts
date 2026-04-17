import { describe, expect, it } from 'vitest';

import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';

import {
  buildIntegrationManagedPlaywrightActionSummaries,
  resolveIntegrationManagedRuntimeActionKeys,
} from './playwright-managed-actions';

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

describe('resolveIntegrationManagedRuntimeActionKeys', () => {
  it('uses the standard Tradera listing action for builtin browser connections', () => {
    expect(
      resolveIntegrationManagedRuntimeActionKeys({
        integrationSlug: 'tradera',
        connection: { traderaBrowserMode: 'builtin' },
      })
    ).toEqual([
      'tradera_auth',
      'tradera_standard_list',
      'tradera_quicklist_relist',
      'tradera_quicklist_sync',
      'tradera_check_status',
      'tradera_fetch_categories',
    ]);
  });

  it('uses the quicklist Tradera listing action for scripted browser connections', () => {
    expect(
      resolveIntegrationManagedRuntimeActionKeys({
        integrationSlug: 'tradera',
        connection: { traderaBrowserMode: 'scripted' },
      })
    ).toEqual([
      'tradera_auth',
      'tradera_quicklist_list',
      'tradera_quicklist_relist',
      'tradera_quicklist_sync',
      'tradera_check_status',
      'tradera_fetch_categories',
    ]);
  });

  it('returns the Vinted runtime actions for Vinted connections', () => {
    expect(
      resolveIntegrationManagedRuntimeActionKeys({
        integrationSlug: 'vinted',
      })
    ).toEqual(['vinted_list', 'vinted_relist', 'vinted_sync']);
  });

  it('returns the programmable runtime actions for programmable Playwright connections', () => {
    expect(
      resolveIntegrationManagedRuntimeActionKeys({
        integrationSlug: 'playwright-programmable',
      })
    ).toEqual(['playwright_programmable_listing', 'playwright_programmable_import']);
  });
});

describe('buildIntegrationManagedPlaywrightActionSummaries', () => {
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

    const [summary] = buildIntegrationManagedPlaywrightActionSummaries({
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

    const [summary] = buildIntegrationManagedPlaywrightActionSummaries({
      actions: [
        buildRuntimeAction('tradera_standard_list'),
        invalidDuplicate,
      ],
      runtimeKeys: ['tradera_standard_list'],
    });

    expect(summary?.fallbackActive).toBe(true);
    expect(summary?.action.id).toBe('runtime_action__tradera_standard_list');
    expect(summary?.fallbackReason).toContain('cannot define runtimeKey "tradera_standard_list" more than once');
  });
});
