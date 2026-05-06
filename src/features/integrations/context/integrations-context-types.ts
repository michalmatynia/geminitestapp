/**
 * Integrations Context Types
 * 
 * Type definitions for integrations context system.
 * Provides:
 * - Integration definition types
 * - Session cookie and testing types
 * - Connection form state types
 * - Integration and connection interfaces
 * - Playwright persona and settings types
 */

import { type integrationDefinitions } from '@/shared/contracts/integrations/domain';
import { type SessionCookie, type TestLogEntry, type SessionPayload } from '@/shared/contracts/integrations/session-testing';
import { type ConnectionFormState, type StepWithResult, type SaveConnectionOptions } from '@/shared/contracts/integrations/connections';
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
  enabled: true,
  username: '',
  password: '',
  scanner1688StartUrl: 'https://www.1688.com/',
  scanner1688LoginMode: 'session_required',
  scanner1688DefaultSearchMode: 'local_image',
  scanner1688CandidateResultLimit: '',
  scanner1688MinimumCandidateScore: '',
  scanner1688MaxExtractedImages: '',
  scanner1688AllowUrlImageSearchFallback: false,
  jobApplicationPersonId: '',
  jobApplicationPersonName: '',
  pracujLoginMode: 'password' as const,
  pracujAuthMode: 'auto' as const,
  pracujSalaryExpectation: '18000',
  pracujCooperationForm: 'uop' as const,
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
