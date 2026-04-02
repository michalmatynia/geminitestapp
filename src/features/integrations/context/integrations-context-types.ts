import {
  integrationDefinitions,
  type Integration,
  type IntegrationConnection,
  SessionCookie,
  TestLogEntry,
  SessionPayload,
  ConnectionFormState,
  StepWithResult,
  SaveConnectionOptions,
} from '@/shared/contracts/integrations';
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
  traderaBrowserMode: 'builtin',
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
