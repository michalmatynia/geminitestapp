import { handleLinkedinApiTest } from './handler.linkedin';
import { handleTraderaApiTest } from './handler.tradera-api';
import { handleVintedBrowserTest } from './handler.vinted-browser';
import { handleTraderaBrowserTest } from './handler.tradera-browser';
import { handle1688BrowserTest } from './handler.1688-browser';
import { NextRequest, NextResponse } from 'next/server';

import {
  is1688IntegrationSlug,
  isTraderaApiIntegrationSlug,
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { getIntegrationRepository } from '@/features/integrations/server';
import { integrationConnectionTestRequestSchema } from '@/shared/contracts/integrations/session-testing';
import { type IntegrationConnectionTestRequest, type TestLogEntry } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { mapStatusToAppError } from '@/shared/errors/error-mapper';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const DEFAULT_MANUAL_LOGIN_TIMEOUT_MS = 240000;
const MAX_MANUAL_LOGIN_TIMEOUT_MS = 600000;


/**
 * POST /api/v2/integrations/[id]/connections/[connectionId]/test
 * Performs a lightweight credential check for the integration connection.
 */
export async function postTestConnectionHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  let integrationId: string | null;
  let integrationConnectionId: string | null;
  const steps: TestLogEntry[] = [];

  let requestBody: IntegrationConnectionTestRequest = {};
  const parsedBody = await parseJsonBody(req, integrationConnectionTestRequestSchema, {
    allowEmpty: true,
    logPrefix: 'integrations.connections.test',
  });
  if (parsedBody.ok) {
    requestBody = parsedBody.data;
  }

  const mode: 'manual' | 'manual_session_refresh' | 'quicklist_preflight' | 'auto' =
    requestBody.mode === 'manual'
      ? 'manual'
      : requestBody.mode === 'manual_session_refresh'
        ? 'manual_session_refresh'
        : requestBody.mode === 'quicklist_preflight'
          ? 'quicklist_preflight'
          : 'auto';
  const manualMode = mode === 'manual';
  const manualSessionRefreshMode = mode === 'manual_session_refresh';
  const quicklistPreflightMode = mode === 'quicklist_preflight';
  const rawManualTimeout = requestBody.manualTimeoutMs;
  const manualLoginTimeoutMs =
    typeof rawManualTimeout === 'number' && Number.isFinite(rawManualTimeout)
      ? Math.max(30_000, Math.min(MAX_MANUAL_LOGIN_TIMEOUT_MS, Math.floor(rawManualTimeout)))
      : DEFAULT_MANUAL_LOGIN_TIMEOUT_MS;
  const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
    steps.push({
      step,
      status,
      detail,
      timestamp: new Date().toISOString(),
    });
  };

  const fail = async (step: string, detail: string, status = 400) => {
    const safeDetail = detail?.trim() ? detail : 'Unknown error';
    pushStep(step, 'failed', safeDetail);

    throw mapStatusToAppError(safeDetail, status);
  };

  const { id, connectionId } = params;
  integrationId = id;
  integrationConnectionId = connectionId;
  if (!integrationId || !integrationConnectionId) {
    return fail('Loading connection', 'Integration id and connection id are required', 400);
  }

  pushStep('Loading connection', 'pending', 'Fetching stored credentials');
  const repo = await getIntegrationRepository();
  const connection = await repo.getConnectionByIdAndIntegration(connectionId, id);

  if (!connection) {
    return fail('Loading connection', 'Connection not found', 404);
  }
  pushStep('Loading connection', 'ok', 'Connection loaded');

  const integration = await repo.getIntegrationById(id);

  if (!integration) {
    return fail('Loading integration', 'Integration not found', 404);
  }

  if (integration.slug === 'baselinker') {
    // Redirect to Base-specific test endpoint
    const baseTestUrl = `/api/v2/integrations/${id}/connections/${connectionId}/base/test`;
    return NextResponse.json(
      {
        error: `Please use the Base.com-specific test endpoint: POST ${baseTestUrl}`,
        redirectUrl: baseTestUrl,
      },
      { status: 400 }
    );
  }

  if (isTraderaApiIntegrationSlug(integration.slug)) {
    return handleTraderaApiTest(connection, repo, manualMode, steps, pushStep, fail);
  }

  if (integration.slug === 'linkedin') {
    return handleLinkedinApiTest(connection, steps, pushStep, fail);
  }

  if (isVintedIntegrationSlug(integration.slug)) {
    return handleVintedBrowserTest(
      connection,
      repo,
      manualMode,
      quicklistPreflightMode,
      manualLoginTimeoutMs,
      steps,
      pushStep,
      fail
    );
  }

  if (is1688IntegrationSlug(integration.slug)) {
    return handle1688BrowserTest(
      connection,
      repo,
      manualMode,
      manualSessionRefreshMode,
      quicklistPreflightMode,
      manualLoginTimeoutMs,
      steps,
      pushStep,
      fail
    );
  }

  if (isTraderaBrowserIntegrationSlug(integration.slug)) {
    return handleTraderaBrowserTest(
      connection,
      repo,
      mode,
      manualLoginTimeoutMs,
      requestBody.productId ?? null,
      steps,
      pushStep,
      fail
    );
  }

  return fail(
    'Connection test',
    `${integration.name} connection tests are not configured yet.`,
    400
  );
}
