import { integrationDefinitions } from '@/shared/contracts/integrations/domain';
import { SessionCookie, TestLogEntry, SessionPayload } from '@/shared/contracts/integrations/session-testing';
import { ConnectionFormState, StepWithResult, SaveConnectionOptions } from '@/shared/contracts/integrations/connections';
import { type Integration, type IntegrationConnection } from '@/shared/contracts/integrations';
import type { PlaywrightPersona, PlaywrightSettings } from '@/shared/contracts/playwright';

export type {
  Integration,
  IntegrationConnection,
  SessionCookie,
  TestLogEntry,
  SessionPayload,
  PlaywrightPersona,
  PlaywrightSettings,
  ConnectionFormState,
  StepWithResult,
  SaveConnectionOptions,
};

export const createEmptyConnectionForm = (): ConnectionFormState => ({
  name: '',
  username: '',
  password: '',
  playwrightBrowser: 'auto',
  traderaBrowserMode: 'builtin',
  traderaCategoryStrategy: 'mapper',
  playwrightListingScript: '',
  traderaDefaultTemplateId: '',
  traderaDefaultDurationHours: 72,
  traderaAutoRelistEnabled: true,
  traderaAutoRelistLeadMinutes: 180,
  traderaApiAppId: '',
  traderaApiAppKey: '',
  traderaApiPublicKey: '',
  traderaApiUserId: '',
  traderaApiToken: '',
  traderaApiSandbox: false,
});

export type IntegrationDefinition = (typeof integrationDefinitions)[number];
