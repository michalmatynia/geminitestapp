import { describe, expect, it } from 'vitest';

import { resolveIntegrationManagedRuntimeActionKeys } from './playwright-managed-actions';

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
      'tradera_move_to_unsold',
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
      'tradera_move_to_unsold',
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
