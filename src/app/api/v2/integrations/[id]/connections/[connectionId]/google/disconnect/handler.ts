import { type NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import type { IntegrationDisconnectResponse } from '@/shared/contracts/integrations/api';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { mapErrorToAppError } from '@/shared/errors/error-mapper';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const GOOGLE_INTEGRATION_LOG_SOURCE =
  'integrations.[id].connections.[connectionId].google.disconnect.POST';

type GoogleDisconnectContext = {
  integrationId: string | null;
  connectionId: string | null;
  startedAt: number;
};

const assertRouteParams = (params: { id: string; connectionId: string }): void => {
  if (params.id.length === 0 || params.connectionId.length === 0) {
    throw badRequestError('Integration id and connection id are required.');
  }
};

const loadConnectionForDisconnect = async (
  integrationId: string,
  connectionId: string
): Promise<void> => {
  const repo = getIntegrationRepository();
  const integration = await repo.getIntegrationById(integrationId);
  if (integration === null) {
    throw notFoundError('Integration not found.', { integrationId });
  }
  const connection = await repo.getConnectionByIdAndIntegration(connectionId, integrationId);
  if (connection === null) {
    throw notFoundError('Connection not found.', { integrationId, connectionId });
  }
};

const clearGoogleConnectionTokens = async (connectionId: string): Promise<void> => {
  const repo = getIntegrationRepository();
  await repo.updateConnection(connectionId, {
    googleAccessToken: null,
    googleRefreshToken: null,
    googleTokenType: null,
    googleScope: null,
    googleExpiresAt: null,
    googleTokenUpdatedAt: null,
  });
};

const logDisconnectSuccess = (
  req: NextRequest,
  context: GoogleDisconnectContext
): void => {
  void logSystemEvent({
    level: 'info',
    message: 'Google connection disconnected',
    source: GOOGLE_INTEGRATION_LOG_SOURCE,
    request: req,
    context: {
      integrationId: context.integrationId,
      connectionId: context.connectionId,
      durationMs: Date.now() - context.startedAt,
    },
  });
};

const logDisconnectError = (
  req: NextRequest,
  error: unknown,
  context: GoogleDisconnectContext
): void => {
  void ErrorSystem.captureException(error, {
    service: 'integrations.google',
    action: 'disconnect',
    integrationId: context.integrationId,
    connectionId: context.connectionId,
    durationMs: Date.now() - context.startedAt,
  });
  const mapped = mapErrorToAppError(error, 'Google disconnect failed.');
  void logSystemEvent({
    level: mapped?.expected === true ? 'warn' : 'error',
    message: mapped?.message ?? 'Google disconnect failed',
    source: GOOGLE_INTEGRATION_LOG_SOURCE,
    error,
    request: req,
    context: {
      integrationId: context.integrationId,
      connectionId: context.connectionId,
      durationMs: Date.now() - context.startedAt,
    },
  });
};

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  const context: GoogleDisconnectContext = {
    integrationId: params.id,
    connectionId: params.connectionId,
    startedAt: Date.now(),
  };

  try {
    assertRouteParams(params);
    await loadConnectionForDisconnect(params.id, params.connectionId);
    await clearGoogleConnectionTokens(params.connectionId);
    logDisconnectSuccess(req, context);

    const response: IntegrationDisconnectResponse = { ok: true };
    return NextResponse.json(response);
  } catch (error) {
    logDisconnectError(req, error, context);
    throw error;
  }
}
