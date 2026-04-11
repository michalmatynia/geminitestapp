import { z } from 'zod';

import { namedDtoSchema } from '@/shared/contracts/base';

export const integrationConnectionSchema = namedDtoSchema.extend({
  integrationId: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  hasPlaywrightStorageState: z.boolean().optional(),
  playwrightStorageState: z.string().nullable().optional(),
  playwrightStorageStateUpdatedAt: z.string().nullable().optional(),
  playwrightPersonaId: z.string().nullable().optional(),
  playwrightHeadless: z.boolean().optional(),
  playwrightSlowMo: z.number().optional(),
  playwrightTimeout: z.number().optional(),
  playwrightNavigationTimeout: z.number().optional(),
  playwrightHumanizeMouse: z.boolean().optional(),
  playwrightMouseJitter: z.number().optional(),
  playwrightClickDelayMin: z.number().optional(),
  playwrightClickDelayMax: z.number().optional(),
  playwrightInputDelayMin: z.number().optional(),
  playwrightInputDelayMax: z.number().optional(),
  playwrightActionDelayMin: z.number().optional(),
  playwrightActionDelayMax: z.number().optional(),
  playwrightProxyEnabled: z.boolean().optional(),
  playwrightProxyServer: z.string().nullable().optional(),
  playwrightProxyUsername: z.string().nullable().optional(),
  playwrightProxyPassword: z.string().nullable().optional(),
  playwrightBrowser: z.enum(['auto', 'brave', 'chrome', 'chromium']).nullable().optional(),
  playwrightEmulateDevice: z.boolean().optional(),
  playwrightDeviceName: z.string().nullable().optional(),
  allegroAccessToken: z.string().nullable().optional(),
  allegroRefreshToken: z.string().nullable().optional(),
  allegroTokenType: z.string().nullable().optional(),
  allegroScope: z.string().nullable().optional(),
  allegroExpiresAt: z.string().nullable().optional(),
  allegroTokenUpdatedAt: z.string().nullable().optional(),
  allegroUseSandbox: z.boolean().optional(),
  hasAllegroAccessToken: z.boolean().optional(),
  linkedinAccessToken: z.string().nullable().optional(),
  linkedinRefreshToken: z.string().nullable().optional(),
  linkedinTokenType: z.string().nullable().optional(),
  linkedinScope: z.string().nullable().optional(),
  linkedinExpiresAt: z.string().nullable().optional(),
  linkedinTokenUpdatedAt: z.string().nullable().optional(),
  linkedinPersonUrn: z.string().nullable().optional(),
  linkedinProfileUrl: z.string().nullable().optional(),
  hasLinkedInAccessToken: z.boolean().optional(),
  baseApiToken: z.string().nullable().optional(),
  hasBaseApiToken: z.boolean().optional(),
  baseTokenUpdatedAt: z.string().nullable().optional(),
  baseLastInventoryId: z.string().nullable().optional(),
  traderaBrowserMode: z.enum(['builtin', 'scripted']).nullable().optional(),
  traderaCategoryStrategy: z.enum(['mapper', 'top_suggested']).nullable().optional(),
  traderaDefaultTemplateId: z.string().nullable().optional(),
  traderaDefaultDurationHours: z.number().optional(),
  traderaAutoRelistEnabled: z.boolean().optional(),
  traderaAutoRelistLeadMinutes: z.number().optional(),
  traderaApiAppId: z.number().nullable().optional(),
  traderaApiAppKey: z.string().nullable().optional(),
  traderaApiPublicKey: z.string().nullable().optional(),
  traderaApiUserId: z.number().nullable().optional(),
  traderaApiToken: z.string().nullable().optional(),
  traderaApiSandbox: z.boolean().optional(),
  traderaParameterMapperRulesJson: z.string().nullable().optional(),
  traderaParameterMapperCatalogJson: z.string().nullable().optional(),
  hasTraderaApiAppKey: z.boolean().optional(),
  hasTraderaApiToken: z.boolean().optional(),
  traderaApiTokenUpdatedAt: z.string().nullable().optional(),
  /** Playwright (Programmable) integration fields */
  playwrightListingScript: z.string().nullable().optional(),
  playwrightImportScript: z.string().nullable().optional(),
  playwrightImportBaseUrl: z.string().nullable().optional(),
  /** JSON-encoded import config. Supports either PlaywrightConfigCaptureRoute[] or { routes, appearanceMode }. */
  playwrightImportCaptureRoutesJson: z.string().nullable().optional(),
  /** JSON-encoded key→field mapping: { sourceKey: string, targetField: string }[] */
  playwrightFieldMapperJson: z.string().nullable().optional(),
});

export type IntegrationConnection = z.infer<typeof integrationConnectionSchema>;

export const createIntegrationConnectionSchema = integrationConnectionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateIntegrationConnection = z.infer<typeof createIntegrationConnectionSchema>;
export type UpdateIntegrationConnection = Partial<CreateIntegrationConnection>;

export type ConnectionDeleteOptions = {
  replacementConnectionId?: string | null | undefined;
};

export type ConnectionDependencyCounts = {
  productListings: number;
  categoryMappings: number;
  externalCategories: number;
  producerMappings: number;
  externalProducers: number;
  tagMappings: number;
  externalTags: number;
  total: number;
};

/**
 * Integration Connection UI DTOs
 */

export type ConnectionFormState = {
  name: string;
  username: string;
  password: string;
  playwrightBrowser: 'auto' | 'brave' | 'chrome' | 'chromium';
  traderaBrowserMode: 'builtin' | 'scripted';
  traderaCategoryStrategy: 'mapper' | 'top_suggested';
  playwrightListingScript: string;
  traderaDefaultTemplateId: string;
  traderaDefaultDurationHours: number;
  traderaAutoRelistEnabled: boolean;
  traderaAutoRelistLeadMinutes: number;
  traderaApiAppId: string;
  traderaApiAppKey: string;
  traderaApiPublicKey: string;
  traderaApiUserId: string;
  traderaApiToken: string;
  traderaApiSandbox: boolean;
};

import { type TestLogEntry } from './index';

export type StepWithResult = TestLogEntry & { status: 'ok' | 'failed' };

export type SaveConnectionOptions = {
  mode?: 'create' | 'update';
  connectionId?: string | null;
  formData?: ConnectionFormState;
};

/**
 * Generic container for a resolved browser connection in UI hooks.
 */
export type ResolvedBrowserConnection<TConnection> = {
  integrationId: string;
  connection: TConnection;
};
