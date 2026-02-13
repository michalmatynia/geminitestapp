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
};

export const TEST_STATUSES = ['pending', 'ok', 'failed'] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export type TestLogEntry = {
  step: string;
  status: TestStatus;
  timestamp: string;
  detail?: string;
};

export type TestConnectionResponse = {
  error?: string;
  errorId?: string;
  integrationId?: string | null;
  connectionId?: string | null;
  steps?: unknown;
  profile?: unknown;
};

export type SessionCookie = {
  name?: string;
  value?: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
};

export const integrationDefinitions = [
  { name: 'Tradera', slug: 'tradera' },
  { name: 'Allegro', slug: 'allegro' },
  { name: 'Baselinker', slug: 'baselinker' },
] as const;
