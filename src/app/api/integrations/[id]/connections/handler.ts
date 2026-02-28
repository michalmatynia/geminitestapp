import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIntegrationRepository } from '@/shared/lib/integrations/server';
import { encryptSecret } from '@/shared/lib/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const createConnectionSchema = z
  .object({
    name: z.string().trim().min(1),
    username: z.string().trim().optional(),
    password: z.string().trim().min(1),
    traderaDefaultTemplateId: z.string().trim().nullable().optional(),
    traderaDefaultDurationHours: z.number().int().min(1).max(720).optional(),
    traderaAutoRelistEnabled: z.boolean().optional(),
    traderaAutoRelistLeadMinutes: z.number().int().min(0).max(10080).optional(),
    traderaApiAppId: z.number().int().positive().optional(),
    traderaApiAppKey: z.string().trim().min(1).optional(),
    traderaApiPublicKey: z.string().trim().nullable().optional(),
    traderaApiUserId: z.number().int().positive().optional(),
    traderaApiToken: z.string().trim().min(1).optional(),
    traderaApiSandbox: z.boolean().optional(),
  })
  .strict();

/**
 * GET /api/integrations/[id]/connections
 * Fetch connections for an integration.
 */
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id: integrationId } = params;
  if (!integrationId) {
    throw badRequestError('Integration id is required');
  }

  const repo = await getIntegrationRepository();
  const connections = await repo.listConnections(integrationId);
  const payload = connections.map((connection: (typeof connections)[number]) => ({
    id: connection.id,
    integrationId: connection.integrationId,
    name: connection.name,
    username: connection.username,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,

    hasPlaywrightStorageState: Boolean(connection.playwrightStorageState),
    playwrightStorageStateUpdatedAt: connection.playwrightStorageStateUpdatedAt,
    hasAllegroAccessToken: Boolean(connection.allegroAccessToken),
    allegroTokenUpdatedAt: connection.allegroTokenUpdatedAt,
    allegroExpiresAt: connection.allegroExpiresAt,
    allegroScope: connection.allegroScope,
    allegroUseSandbox: connection.allegroUseSandbox ?? false,

    hasBaseApiToken: Boolean(connection.baseApiToken),
    baseTokenUpdatedAt: connection.baseTokenUpdatedAt,
    baseLastInventoryId: connection.baseLastInventoryId,

    playwrightHeadless: connection.playwrightHeadless,
    playwrightSlowMo: connection.playwrightSlowMo,
    playwrightTimeout: connection.playwrightTimeout,
    playwrightNavigationTimeout: connection.playwrightNavigationTimeout,
    playwrightHumanizeMouse: connection.playwrightHumanizeMouse,
    playwrightMouseJitter: connection.playwrightMouseJitter,
    playwrightClickDelayMin: connection.playwrightClickDelayMin,
    playwrightClickDelayMax: connection.playwrightClickDelayMax,
    playwrightInputDelayMin: connection.playwrightInputDelayMin,
    playwrightInputDelayMax: connection.playwrightInputDelayMax,
    playwrightActionDelayMin: connection.playwrightActionDelayMin,
    playwrightActionDelayMax: connection.playwrightActionDelayMax,
    playwrightProxyEnabled: connection.playwrightProxyEnabled,
    playwrightProxyServer: connection.playwrightProxyServer,
    playwrightProxyUsername: connection.playwrightProxyUsername,
    playwrightProxyHasPassword: Boolean(connection.playwrightProxyPassword),
    playwrightEmulateDevice: connection.playwrightEmulateDevice,
    playwrightDeviceName: connection.playwrightDeviceName,
    playwrightPersonaId: connection.playwrightPersonaId ?? null,
    traderaDefaultTemplateId: connection.traderaDefaultTemplateId ?? null,
    traderaDefaultDurationHours: connection.traderaDefaultDurationHours ?? 72,
    traderaAutoRelistEnabled: connection.traderaAutoRelistEnabled ?? true,
    traderaAutoRelistLeadMinutes: connection.traderaAutoRelistLeadMinutes ?? 180,
    traderaApiAppId: connection.traderaApiAppId ?? null,
    traderaApiPublicKey: connection.traderaApiPublicKey ?? null,
    traderaApiUserId: connection.traderaApiUserId ?? null,
    traderaApiSandbox: connection.traderaApiSandbox ?? false,
    hasTraderaApiAppKey: Boolean(connection.traderaApiAppKey),
    hasTraderaApiToken: Boolean(connection.traderaApiToken),
    traderaApiTokenUpdatedAt: connection.traderaApiTokenUpdatedAt ?? null,
  }));

  return NextResponse.json(payload);
}

/**
 * POST /api/integrations/[id]/connections
 * Create a new connection for an integration.
 */
export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id: integrationId } = params;
  if (!integrationId) {
    throw badRequestError('Integration id is required');
  }

  const parsed = await parseJsonBody(req, createConnectionSchema, {
    logPrefix: 'integrations.connections.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  const repo = await getIntegrationRepository();
  const integration = await repo.getIntegrationById(integrationId);
  if (!integration) {
    throw notFoundError('Integration not found', { integrationId });
  }

  const normalizedUsername = data.username?.trim() ?? '';
  if (integration.slug !== 'baselinker' && !normalizedUsername) {
    throw badRequestError('Username is required for this integration.', {
      integrationId,
      integrationSlug: integration.slug,
    });
  }

  const created = await repo.createConnection(integrationId, {
    name: data.name,
    username: normalizedUsername,
    password: encryptSecret(data.password),
    ...(typeof data.traderaDefaultTemplateId === 'string' || data.traderaDefaultTemplateId === null
      ? { traderaDefaultTemplateId: data.traderaDefaultTemplateId ?? null }
      : {}),
    ...(typeof data.traderaDefaultDurationHours === 'number'
      ? { traderaDefaultDurationHours: data.traderaDefaultDurationHours }
      : {}),
    ...(typeof data.traderaAutoRelistEnabled === 'boolean'
      ? { traderaAutoRelistEnabled: data.traderaAutoRelistEnabled }
      : {}),
    ...(typeof data.traderaAutoRelistLeadMinutes === 'number'
      ? { traderaAutoRelistLeadMinutes: data.traderaAutoRelistLeadMinutes }
      : {}),
    ...(typeof data.traderaApiAppId === 'number' ? { traderaApiAppId: data.traderaApiAppId } : {}),
    ...(typeof data.traderaApiAppKey === 'string'
      ? { traderaApiAppKey: encryptSecret(data.traderaApiAppKey) }
      : {}),
    ...(typeof data.traderaApiPublicKey === 'string' || data.traderaApiPublicKey === null
      ? { traderaApiPublicKey: data.traderaApiPublicKey ?? null }
      : {}),
    ...(typeof data.traderaApiUserId === 'number'
      ? { traderaApiUserId: data.traderaApiUserId }
      : {}),
    ...(typeof data.traderaApiToken === 'string'
      ? {
        traderaApiToken: encryptSecret(data.traderaApiToken),
        traderaApiTokenUpdatedAt: new Date(),
      }
      : {}),
    ...(typeof data.traderaApiSandbox === 'boolean'
      ? { traderaApiSandbox: data.traderaApiSandbox }
      : {}),
  });

  return NextResponse.json({
    id: created.id,
    integrationId: created.integrationId,
    name: created.name,
    username: created.username,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    hasPlaywrightStorageState: Boolean(created.playwrightStorageState),
    playwrightStorageStateUpdatedAt: created.playwrightStorageStateUpdatedAt,
    hasBaseApiToken: Boolean(created.baseApiToken),
    baseTokenUpdatedAt: created.baseTokenUpdatedAt,
    baseLastInventoryId: created.baseLastInventoryId,
    allegroUseSandbox: created.allegroUseSandbox ?? false,
    playwrightHeadless: created.playwrightHeadless,
    playwrightSlowMo: created.playwrightSlowMo,
    playwrightTimeout: created.playwrightTimeout,
    playwrightNavigationTimeout: created.playwrightNavigationTimeout,
    playwrightHumanizeMouse: created.playwrightHumanizeMouse,
    playwrightMouseJitter: created.playwrightMouseJitter,
    playwrightClickDelayMin: created.playwrightClickDelayMin,
    playwrightClickDelayMax: created.playwrightClickDelayMax,
    playwrightInputDelayMin: created.playwrightInputDelayMin,
    playwrightInputDelayMax: created.playwrightInputDelayMax,
    playwrightActionDelayMin: created.playwrightActionDelayMin,
    playwrightActionDelayMax: created.playwrightActionDelayMax,
    playwrightProxyEnabled: created.playwrightProxyEnabled,
    playwrightProxyServer: created.playwrightProxyServer,
    playwrightProxyUsername: created.playwrightProxyUsername,
    playwrightProxyHasPassword: Boolean(created.playwrightProxyPassword),
    playwrightEmulateDevice: created.playwrightEmulateDevice,
    playwrightDeviceName: created.playwrightDeviceName,
    playwrightPersonaId: created.playwrightPersonaId ?? null,
    traderaDefaultTemplateId: created.traderaDefaultTemplateId ?? null,
    traderaDefaultDurationHours: created.traderaDefaultDurationHours ?? 72,
    traderaAutoRelistEnabled: created.traderaAutoRelistEnabled ?? true,
    traderaAutoRelistLeadMinutes: created.traderaAutoRelistLeadMinutes ?? 180,
    traderaApiAppId: created.traderaApiAppId ?? null,
    traderaApiPublicKey: created.traderaApiPublicKey ?? null,
    traderaApiUserId: created.traderaApiUserId ?? null,
    traderaApiSandbox: created.traderaApiSandbox ?? false,
    hasTraderaApiAppKey: Boolean(created.traderaApiAppKey),
    hasTraderaApiToken: Boolean(created.traderaApiToken),
    traderaApiTokenUpdatedAt: created.traderaApiTokenUpdatedAt ?? null,
  });
}
