'use client';

import type { ConnectionFormState } from '@/shared/lib/integrations/context/integrations-context-types';
import type { IntegrationConnection } from '@/shared/contracts/integrations';

export const toConnectionFormState = (connection: IntegrationConnection): ConnectionFormState => ({
  name: connection.name,
  username: connection.username ?? '',
  password: '',
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
