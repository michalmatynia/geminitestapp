import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportDefaultConnectionId,
  getIntegrationRepository,
  setExportDefaultConnectionId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type {
  IntegrationRecord as Integration,
  IntegrationConnectionRecord as IntegrationConnection,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const postSchema = z.object({
  connectionId: z.string().nullable(),
});

const normalizeOptionalId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const hasBaseCredentials = (connection: {
  baseApiToken?: string | null | undefined;
  password?: string | null | undefined;
}): boolean => {
  const token = connection.baseApiToken?.trim();
  if (token) return true;
  const password = connection.password?.trim();
  return Boolean(password);
};

const resolveFallbackBaseConnectionId = async (
  currentConnectionId: string
): Promise<string | null> => {
  const integrationRepository = await getIntegrationRepository();
  const integrations = await integrationRepository.listIntegrations();
  const baseIntegrations = integrations.filter((integration: Integration) =>
    BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase())
  );

  if (baseIntegrations.length === 0) return null;

  const baseConnections = (
    await Promise.all(
      baseIntegrations.map((integration: Integration) =>
        integrationRepository.listConnections(integration.id)
      )
    )
  ).flat();

  if (baseConnections.length === 0) return null;

  const currentConnection =
    baseConnections.find(
      (connection: IntegrationConnection) => connection.id === currentConnectionId
    ) ?? null;
  if (currentConnection && hasBaseCredentials(currentConnection)) {
    return currentConnection.id;
  }

  const credentialedConnection =
    baseConnections.find((connection: IntegrationConnection) => hasBaseCredentials(connection)) ??
    null;
  if (credentialedConnection) {
    return credentialedConnection.id;
  }

  if (currentConnection) {
    return currentConnection.id;
  }

  return baseConnections[0]?.id ?? null;
};

/**
 * GET /api/integrations/exports/base/default-connection
 * Returns the default Base.com connection ID for exports
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const storedConnectionId = normalizeOptionalId(await getExportDefaultConnectionId());
  if (!storedConnectionId) {
    return NextResponse.json({ connectionId: null });
  }

  try {
    const resolvedConnectionId = await resolveFallbackBaseConnectionId(storedConnectionId);
    if (!resolvedConnectionId) {
      return NextResponse.json({ connectionId: null });
    }
    if (resolvedConnectionId !== storedConnectionId) {
      await setExportDefaultConnectionId(resolvedConnectionId);
    }
    return NextResponse.json({ connectionId: resolvedConnectionId });
  } catch {
    // Preserve existing behavior when connection validation fails unexpectedly.
    return NextResponse.json({ connectionId: storedConnectionId });
  }
}

/**
 * POST /api/integrations/exports/base/default-connection
 * Sets the default Base.com connection ID for exports
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, postSchema, {
    logPrefix: 'exports.base.default-connection.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setExportDefaultConnectionId(data.connectionId);
  return NextResponse.json({ success: true });
}
