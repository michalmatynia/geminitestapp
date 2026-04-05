import type { TestConnectionResponse } from '@/shared/contracts/integrations/session-testing';
import { ApiError, api } from '@/shared/lib/api-client';

export const TRADERA_BROWSER_MANUAL_TIMEOUT_MS = 240000;
export const TRADERA_BROWSER_MANUAL_REQUEST_TIMEOUT_MS =
  TRADERA_BROWSER_MANUAL_TIMEOUT_MS + 30000;
export const TRADERA_BROWSER_QUICKLIST_PREFLIGHT_TIMEOUT_MS = 20000;

export const isTraderaBrowserAuthRequiredMessage = (
  value: string | null | undefined
): boolean => {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) return false;
  return (
    normalized.includes('auth_required') ||
    normalized.includes('manual verification') ||
    normalized.includes('captcha') ||
    normalized.includes('login requires') ||
    normalized.includes('session expired') ||
    normalized.includes('session has expired') ||
    normalized.includes('session is missing or expired') ||
    normalized.includes('missing or expired')
  );
};

export const hasSavedTraderaBrowserSession = (response: TestConnectionResponse): boolean =>
  Array.isArray(response.steps)
    ? response.steps.some((step) => step.step === 'Saving session' && step.status === 'ok')
    : false;

export const isTraderaBrowserSessionReady = (
  response: TestConnectionResponse
): boolean => response.sessionReady === true;

const isTestConnectionResponse = (value: unknown): value is TestConnectionResponse =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'steps' in value &&
      Array.isArray((value as { steps?: unknown }).steps)
  );

const describeManualVerificationFailure = (
  response: TestConnectionResponse
): string | null => {
  const relevantStep =
    response.steps.find(
      (step) =>
        step.step === 'Captcha required' &&
        (step.status === 'pending' || step.status === 'failed') &&
        step.detail?.trim()
    ) ??
    response.steps.find(
      (step) =>
        (step.status === 'failed' || step.status === 'pending') &&
        step.detail?.trim()
    );

  if (!relevantStep?.detail?.trim()) {
    return null;
  }

  const detail = relevantStep.detail.trim();
  if (relevantStep.step === 'Captcha required' || detail.toLowerCase().includes('captcha')) {
    return 'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.';
  }

  return detail;
};

export const ensureTraderaBrowserSession = async (params: {
  integrationId: string;
  connectionId: string;
  manualTimeoutMs?: number;
}): Promise<{ response: TestConnectionResponse; savedSession: boolean }> => {
  try {
    const response = await api.post<TestConnectionResponse>(
      `/api/v2/integrations/${params.integrationId}/connections/${params.connectionId}/test`,
      {
        mode: 'manual',
        manualTimeoutMs: params.manualTimeoutMs ?? TRADERA_BROWSER_MANUAL_TIMEOUT_MS,
      },
      {
        timeout: Math.max(
          params.manualTimeoutMs ?? TRADERA_BROWSER_MANUAL_TIMEOUT_MS,
          TRADERA_BROWSER_MANUAL_REQUEST_TIMEOUT_MS
        ),
      }
    );

    return {
      response,
      savedSession: hasSavedTraderaBrowserSession(response),
    };
  } catch (error) {
    if (error instanceof ApiError && isTestConnectionResponse(error.payload)) {
      const detail = describeManualVerificationFailure(error.payload);
      if (detail) {
        throw new Error(detail);
      }
    }
    throw error;
  }
};

export const preflightTraderaQuickListSession = async (params: {
  integrationId: string;
  connectionId: string;
  productId?: string;
}): Promise<{ response: TestConnectionResponse; ready: boolean }> => {
  try {
    const response = await api.post<TestConnectionResponse>(
      `/api/v2/integrations/${params.integrationId}/connections/${params.connectionId}/test`,
      {
        mode: 'quicklist_preflight',
        ...(params.productId ? { productId: params.productId } : {}),
      },
      {
        timeout: TRADERA_BROWSER_QUICKLIST_PREFLIGHT_TIMEOUT_MS,
      }
    );

    return {
      response,
      ready: isTraderaBrowserSessionReady(response),
    };
  } catch (error) {
    if (error instanceof ApiError && isTestConnectionResponse(error.payload)) {
      const detail = describeManualVerificationFailure(error.payload);
      if (detail) {
        throw new Error(detail);
      }
    }
    throw error;
  }
};
