import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import {
  isPlaywrightProgrammableSlug,
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { type ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';

export const resolveIntegrationManagedRuntimeActionKeys = (args: {
  integrationSlug: string | null | undefined;
  connection?: Pick<IntegrationConnection, 'traderaBrowserMode'> | null;
}): ActionSequenceKey[] => {
  if (isTraderaBrowserIntegrationSlug(args.integrationSlug)) {
    const traderaListActionKey: ActionSequenceKey =
      args.connection?.traderaBrowserMode === 'scripted'
        ? 'tradera_quicklist_list'
        : 'tradera_standard_list';

    return [
      'tradera_auth',
      traderaListActionKey,
      'tradera_quicklist_relist',
      'tradera_quicklist_sync',
      'tradera_check_status',
      'tradera_fetch_categories',
    ];
  }

  if (isVintedIntegrationSlug(args.integrationSlug)) {
    return ['vinted_list', 'vinted_relist', 'vinted_sync'];
  }

  if (isPlaywrightProgrammableSlug(args.integrationSlug)) {
    return ['playwright_programmable_listing', 'playwright_programmable_import'];
  }

  return [];
};
