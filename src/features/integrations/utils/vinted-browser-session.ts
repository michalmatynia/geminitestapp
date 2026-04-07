import { api } from '@/shared/lib/api-client';
import type { TestConnectionResponse } from '@/shared/contracts/integrations/session-testing';

export const VINTED_BROWSER_MANUAL_TIMEOUT_MS = 240000;
export const VINTED_BROWSER_MANUAL_REQUEST_TIMEOUT_MS = VINTED_BROWSER_MANUAL_TIMEOUT_MS + 30000;
export const VINTED_BROWSER_QUICKLIST_PREFLIGHT_TIMEOUT_MS = 20000;

export const isVintedBrowserAuthRequiredMessage = (
  value: string | null | undefined
): boolean => {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) return false;
  return (
    normalized.includes('auth_required') ||
    normalized.includes('manual verification') ||
    normalized.includes('vinted session expired')
  );
};

export const hasSavedVintedBrowserSession = (response: TestConnectionResponse): boolean =>
  Array.isArray(response.steps)
    ? response.steps.some((step) => step.step === 'Saving session' && step.status === 'ok')
    : false;

export const isVintedBrowserSessionReady = (
  response: TestConnectionResponse
): boolean => response.sessionReady === true;

export const ensureVintedBrowserSession = async (params: {
  integrationId: string;
  connectionId: string;
  manualTimeoutMs?: number;
}): Promise<{ response: TestConnectionResponse; savedSession: boolean }> => {
  const response = await api.post<TestConnectionResponse>(
    `/api/v2/integrations/${params.integrationId}/connections/${params.connectionId}/test`,
    {
      mode: 'manual',
      manualTimeoutMs: params.manualTimeoutMs ?? VINTED_BROWSER_MANUAL_TIMEOUT_MS,
    },
    {
      timeout: Math.max(
        params.manualTimeoutMs ?? VINTED_BROWSER_MANUAL_TIMEOUT_MS,
        VINTED_BROWSER_MANUAL_REQUEST_TIMEOUT_MS
      ),
    }
  );

  return {
    response,
    savedSession: hasSavedVintedBrowserSession(response),
  };
};

export const preflightVintedQuickListSession = async (params: {
  integrationId: string;
  connectionId: string;
  productId?: string;
}): Promise<{ response: TestConnectionResponse; ready: boolean }> => {
  const response = await api.post<TestConnectionResponse>(
    `/api/v2/integrations/${params.integrationId}/connections/${params.connectionId}/test`,
    {
      mode: 'quicklist_preflight',
      ...(params.productId ? { productId: params.productId } : {}),
    },
    {
      timeout: VINTED_BROWSER_QUICKLIST_PREFLIGHT_TIMEOUT_MS,
    }
  );

  return {
    response,
    ready: isVintedBrowserSessionReady(response),
  };
};
