import { z } from 'zod';

import { namedDtoSchema } from '../base';

export const integrationConnectionSchema = namedDtoSchema.extend({
  integrationId: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
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
  baseApiToken: z.string().nullable().optional(),
  hasBaseApiToken: z.boolean().optional(),
  baseTokenUpdatedAt: z.string().nullable().optional(),
  baseLastInventoryId: z.string().nullable().optional(),
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
  hasTraderaApiAppKey: z.boolean().optional(),
  hasTraderaApiToken: z.boolean().optional(),
  traderaApiTokenUpdatedAt: z.string().nullable().optional(),
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
