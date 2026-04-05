import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import type { IntegrationDisconnectResponse } from '@/shared/contracts/integrations/api';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { mapErrorToAppError } from '@/shared/errors/error-mapper';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  const startedAt = Date.now();
  let integrationId: string | null = null;
  let connectionId: string | null = null;
  try {
    const { id, connectionId: connId } = params;
    integrationId = id;
    connectionId = connId;
    if (!id || !connId) {
      throw badRequestError('Integration id and connection id are required.');
    }

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);

    if (integration?.slug !== 'linkedin') {
      throw notFoundError('LinkedIn integration not found.', {
        integrationId: id,
      });
    }

    await repo.updateConnection(connId, {
      linkedinAccessToken: null,
      linkedinRefreshToken: null,
      linkedinTokenType: null,
      linkedinScope: null,
      linkedinExpiresAt: null,
      linkedinTokenUpdatedAt: null,
      linkedinPersonUrn: null,
      linkedinProfileUrl: null,
    });

    const response: IntegrationDisconnectResponse = { ok: true };

    void logSystemEvent({
      level: 'info',
      message: 'LinkedIn connection disconnected',
      source: 'integrations.[id].connections.[connectionId].linkedin.disconnect.POST',
      request: req,
      context: {
        integrationId,
        connectionId,
        durationMs: Date.now() - startedAt,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'integrations.linkedin',
      action: 'disconnect',
      integrationId,
      connectionId,
      durationMs: Date.now() - startedAt,
    });
    const mapped = mapErrorToAppError(error, 'LinkedIn disconnect failed.');
    const message = mapped?.message ?? 'LinkedIn disconnect failed';
    void logSystemEvent({
      level: mapped?.expected ? 'warn' : 'error',
      message,
      source: 'integrations.[id].connections.[connectionId].linkedin.disconnect.POST',
      error,
      request: req,
      context: {
        integrationId,
        connectionId,
        durationMs: Date.now() - startedAt,
        ...(mapped
          ? {
              code: mapped.code,
              httpStatus: mapped.httpStatus,
              expected: mapped.expected,
              critical: mapped.critical,
              retryable: mapped.retryable,
            }
          : {}),
      },
    });
    throw error;
  }
}
