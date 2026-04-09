import { handleTraderaBrowserTest } from '../[id]/connections/[connectionId]/test/handler.tradera-browser';

import type {
  IntegrationRepository,
  TestConnectionResponse,
  TestLogEntry,
} from '@/shared/contracts/integrations';
import { mapStatusToAppError } from '@/shared/errors/error-mapper';
import { notFoundError } from '@/shared/errors/app-error';

const QUICKLIST_AUTH_REQUIRED_DETAIL =
  'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.';
const TRADERA_PREFLIGHT_TIMEOUT_MS = 240000;

const readResponseMessage = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const message = (value as { message?: unknown }).message;
  return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
};

const isSessionReadyResponse = (
  value: unknown
): value is TestConnectionResponse & { sessionReady: true } =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'sessionReady' in value &&
      (value as { sessionReady?: unknown }).sessionReady === true
  );

export const assertTraderaBrowserSessionReady = async ({
  connectionId,
  integrationId,
  integrationRepository,
}: {
  connectionId: string;
  integrationId: string;
  integrationRepository: Pick<
    IntegrationRepository,
    'getConnectionByIdAndIntegration' | 'updateConnection'
  >;
}): Promise<void> => {
  const connection = await integrationRepository.getConnectionByIdAndIntegration(
    connectionId,
    integrationId
  );
  if (!connection) {
    throw notFoundError('Tradera browser connection not found', {
      connectionId,
      integrationId,
    });
  }

  const steps: TestLogEntry[] = [];
  const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
    steps.push({
      step,
      status,
      detail,
      timestamp: new Date().toISOString(),
    });
  };
  const fail = async (
    step: string,
    detail: string,
    status = 400
  ): Promise<never> => {
    const safeDetail = detail?.trim() ? detail : 'Unknown error';
    pushStep(step, 'failed', safeDetail);
    throw mapStatusToAppError(safeDetail, status);
  };

  const response = await handleTraderaBrowserTest(
    connection,
    integrationRepository,
    'quicklist_preflight',
    TRADERA_PREFLIGHT_TIMEOUT_MS,
    null,
    steps,
    pushStep,
    fail
  );
  const payload = (await response
    .json()
    .catch(() => null)) as (TestConnectionResponse & { message?: string }) | null;

  if (response.ok && isSessionReadyResponse(payload)) {
    return;
  }

  const message = readResponseMessage(payload) ?? QUICKLIST_AUTH_REQUIRED_DETAIL;
  throw mapStatusToAppError(message, response.ok ? 409 : response.status);
};
