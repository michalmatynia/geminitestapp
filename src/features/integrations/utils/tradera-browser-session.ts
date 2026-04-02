import type { TestConnectionResponse } from '@/shared/contracts/integrations';
import { api } from '@/shared/lib/api-client';

export const TRADERA_BROWSER_MANUAL_TIMEOUT_MS = 240000;

export const hasSavedTraderaBrowserSession = (response: TestConnectionResponse): boolean =>
  Array.isArray(response.steps)
    ? response.steps.some((step) => step.step === 'Saving session' && step.status === 'ok')
    : false;

export const ensureTraderaBrowserSession = async (params: {
  integrationId: string;
  connectionId: string;
  manualTimeoutMs?: number;
}): Promise<{ response: TestConnectionResponse; savedSession: boolean }> => {
  const response = await api.post<TestConnectionResponse>(
    `/api/v2/integrations/${params.integrationId}/connections/${params.connectionId}/test`,
    {
      mode: 'manual',
      manualTimeoutMs: params.manualTimeoutMs ?? TRADERA_BROWSER_MANUAL_TIMEOUT_MS,
    }
  );

  return {
    response,
    savedSession: hasSavedTraderaBrowserSession(response),
  };
};
