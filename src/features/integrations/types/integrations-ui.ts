import type {
  TestStatusDto,
  TestLogEntryDto,
  TestConnectionResponseDto,
  SessionCookieDto,
} from '@/shared/contracts/integrations';

export type Integration = {
  id: string;
  name: string;
  slug: string;
};

export type IntegrationConnection = {
  id: string;
  integrationId: string;
  name: string;
  username?: string | undefined;
  password?: string | undefined; // Optional for UI form
  hasAllegroAccessToken?: boolean | undefined;
  allegroTokenUpdatedAt?: string | null | undefined;
  allegroExpiresAt?: string | null | undefined;
  allegroScope?: string | null | undefined;
  allegroUseSandbox?: boolean | undefined;
  hasBaseApiToken?: boolean | undefined;
  baseTokenUpdatedAt?: string | null | undefined;
  baseLastInventoryId?: string | null | undefined;
  hasPlaywrightStorageState?: boolean | undefined;
  playwrightStorageStateUpdatedAt?: string | null | undefined;
  playwrightPersonaId?: string | null | undefined;
  playwrightHeadless?: boolean | undefined;
  playwrightSlowMo?: number | undefined;
  playwrightTimeout?: number | undefined;
  playwrightNavigationTimeout?: number | undefined;
  playwrightHumanizeMouse?: boolean | undefined;
  playwrightMouseJitter?: number | undefined;
  playwrightClickDelayMin?: number | undefined;
  playwrightClickDelayMax?: number | undefined;
  playwrightInputDelayMin?: number | undefined;
  playwrightInputDelayMax?: number | undefined;
  playwrightActionDelayMin?: number | undefined;
  playwrightActionDelayMax?: number | undefined;
  playwrightProxyEnabled?: boolean | undefined;
  playwrightProxyServer?: string | null | undefined;
  playwrightProxyUsername?: string | null | undefined;
  playwrightProxyHasPassword?: boolean | undefined;
  playwrightEmulateDevice?: boolean | undefined;
  playwrightDeviceName?: string | null | undefined;
  traderaDefaultTemplateId?: string | null | undefined;
  traderaDefaultDurationHours?: number | undefined;
  traderaAutoRelistEnabled?: boolean | undefined;
  traderaAutoRelistLeadMinutes?: number | undefined;
  traderaApiAppId?: number | null | undefined;
  traderaApiPublicKey?: string | null | undefined;
  traderaApiUserId?: number | null | undefined;
  traderaApiSandbox?: boolean | undefined;
  hasTraderaApiAppKey?: boolean | undefined;
  hasTraderaApiToken?: boolean | undefined;
  traderaApiTokenUpdatedAt?: string | null | undefined;
};

export const TEST_STATUSES = ['pending', 'ok', 'failed'] as const;
export type TestStatus = TestStatusDto;

export type TestLogEntry = TestLogEntryDto;

export type TestConnectionResponse = TestConnectionResponseDto;

export type SessionCookie = SessionCookieDto;

export const integrationDefinitions = [
  { name: 'Tradera', slug: 'tradera' },
  { name: 'Tradera API', slug: 'tradera-api' },
  { name: 'Allegro', slug: 'allegro' },
  { name: 'Baselinker', slug: 'baselinker' },
] as const;
