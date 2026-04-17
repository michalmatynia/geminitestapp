import type { ConnectionFormState } from '@/features/integrations/context/integrations-context-types';
import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';

export const toConnectionFormState = (connection: IntegrationConnection): ConnectionFormState => ({
  name: connection.name,
  username: connection.username ?? '',
  password: '',
  scanner1688StartUrl: connection.scanner1688StartUrl ?? 'https://www.1688.com/',
  scanner1688LoginMode: connection.scanner1688LoginMode ?? 'session_required',
  scanner1688DefaultSearchMode: connection.scanner1688DefaultSearchMode ?? 'local_image',
  scanner1688CandidateResultLimit:
    typeof connection.scanner1688CandidateResultLimit === 'number'
      ? String(connection.scanner1688CandidateResultLimit)
      : '',
  scanner1688MinimumCandidateScore:
    typeof connection.scanner1688MinimumCandidateScore === 'number'
      ? String(connection.scanner1688MinimumCandidateScore)
      : '',
  scanner1688MaxExtractedImages:
    typeof connection.scanner1688MaxExtractedImages === 'number'
      ? String(connection.scanner1688MaxExtractedImages)
      : '',
  scanner1688AllowUrlImageSearchFallback:
    connection.scanner1688AllowUrlImageSearchFallback ?? false,
  traderaBrowserMode: connection.traderaBrowserMode ?? 'builtin',
  traderaCategoryStrategy: connection.traderaCategoryStrategy ?? 'mapper',
  playwrightListingScript: connection.playwrightListingScript ?? '',
  traderaDefaultTemplateId: connection.traderaDefaultTemplateId ?? '',
  traderaDefaultDurationHours: connection.traderaDefaultDurationHours ?? 72,
  traderaAutoRelistEnabled: connection.traderaAutoRelistEnabled ?? true,
  traderaAutoRelistLeadMinutes: connection.traderaAutoRelistLeadMinutes ?? 180,
  traderaApiAppId:
    typeof connection.traderaApiAppId === 'number' ? String(connection.traderaApiAppId) : '',
  traderaApiAppKey: '',
  traderaApiPublicKey: connection.traderaApiPublicKey ?? '',
  traderaApiUserId:
    typeof connection.traderaApiUserId === 'number' ? String(connection.traderaApiUserId) : '',
  traderaApiToken: '',
  traderaApiSandbox: connection.traderaApiSandbox ?? false,
});
