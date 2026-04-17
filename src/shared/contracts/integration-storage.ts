import type { Integration } from './integrations/base';
import type {
  ConnectionDeleteOptions,
  ConnectionDependencyCounts,
  IntegrationConnection,
  LegacyIntegrationConnectionPlaywrightSettings,
} from './integrations/connections';

export type { ConnectionDeleteOptions, ConnectionDependencyCounts };

export type IntegrationRecord = Omit<Integration, 'createdAt' | 'updatedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date | null;
};

export type IntegrationConnectionRecord = Omit<
  IntegrationConnection,
  | 'createdAt'
  | 'updatedAt'
  | 'playwrightStorageStateUpdatedAt'
  | 'traderaApiTokenUpdatedAt'
  | 'linkedinTokenUpdatedAt'
  | 'linkedinExpiresAt'
> &
  LegacyIntegrationConnectionPlaywrightSettings & {
    createdAt: string | Date;
    updatedAt: string | Date | null;
    playwrightStorageStateUpdatedAt?: string | Date | null;
    traderaApiTokenUpdatedAt?: string | Date | null;
    linkedinTokenUpdatedAt?: string | Date | null;
    linkedinExpiresAt?: string | Date | null;
  };

type NullablePlaywrightConnectionOverrideKey =
  | 'playwrightIdentityProfile'
  | 'playwrightSlowMo'
  | 'playwrightTimeout'
  | 'playwrightNavigationTimeout'
  | 'playwrightLocale'
  | 'playwrightTimezoneId'
  | 'playwrightHumanizeMouse'
  | 'playwrightMouseJitter'
  | 'playwrightClickDelayMin'
  | 'playwrightClickDelayMax'
  | 'playwrightInputDelayMin'
  | 'playwrightInputDelayMax'
  | 'playwrightActionDelayMin'
  | 'playwrightActionDelayMax'
  | 'playwrightProxyEnabled'
  | 'playwrightProxyServer'
  | 'playwrightProxyUsername'
  | 'playwrightProxyPassword'
  | 'playwrightProxySessionAffinity'
  | 'playwrightProxySessionMode'
  | 'playwrightProxyProviderPreset'
  | 'playwrightEmulateDevice'
  | 'playwrightDeviceName';

export type IntegrationConnectionUpdateInput = Omit<
  Partial<IntegrationConnectionRecord>,
  NullablePlaywrightConnectionOverrideKey
> & {
  [K in NullablePlaywrightConnectionOverrideKey]?: IntegrationConnectionRecord[K] | null;
} & {
  resetPlaywrightOverrides?: boolean;
};

export type IntegrationRepository = {
  listIntegrations: () => Promise<IntegrationRecord[]>;
  upsertIntegration: (input: { name: string; slug: string }) => Promise<IntegrationRecord>;
  getIntegrationById: (id: string) => Promise<IntegrationRecord | null>;
  listConnections: (integrationId: string) => Promise<IntegrationConnectionRecord[]>;
  getConnectionById: (id: string) => Promise<IntegrationConnectionRecord | null>;
  getConnectionByIdAndIntegration: (
    id: string,
    integrationId: string
  ) => Promise<IntegrationConnectionRecord | null>;
  createConnection: (
    integrationId: string,
    input: Record<string, unknown>
  ) => Promise<IntegrationConnectionRecord>;
  updateConnection: (
    id: string,
    input: IntegrationConnectionUpdateInput
  ) => Promise<IntegrationConnectionRecord>;
  deleteConnection: (
    id: string,
    options?: ConnectionDeleteOptions
  ) => Promise<void>;
};

export type IntegrationLookupRepository = Pick<
  IntegrationRepository,
  'getConnectionById' | 'getIntegrationById'
>;
