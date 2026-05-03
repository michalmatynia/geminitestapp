import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTestConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type ToastVariant = 'success' | 'warning' | 'error' | 'info';
type ProductScanToast = (message: string, options?: { variant?: ToastVariant }) => void;
type RefreshSessionResult = { ok: boolean; message: string };

type UseProductScan1688SessionRefreshInput = {
  queryClient: QueryClient;
  toast: ProductScanToast;
};

type Refresh1688SessionInput = {
  active1688ConnectionId: string | null;
  active1688IntegrationId: string | null;
  active1688ProfileName: string | null;
};

type ProductScan1688SessionRefreshState = {
  is1688LoginPending: boolean;
  latest1688SessionError: string | null;
  latest1688SessionMessage: string | null;
  refresh1688Session: (sessionInput: Refresh1688SessionInput) => Promise<RefreshSessionResult>;
  refreshed1688ConnectionIds: Set<string>;
  reset1688SessionState: () => void;
};

const missingSessionResult = (): RefreshSessionResult => ({
  ok: false,
  message: '1688 browser profile required before running supplier scans.',
});

const resolveProfileName = (profileName: string | null): string => profileName ?? '1688 profile';

const resolveSuccessMessage = (response: unknown, profileName: string | null): string => {
  if (
    response !== null &&
    typeof response === 'object' &&
    typeof (response as Record<string, unknown>)['message'] === 'string' &&
    ((response as Record<string, unknown>)['message'] as string).trim().length > 0
  ) {
    return ((response as Record<string, unknown>)['message'] as string).trim();
  }
  return `1688 session refreshed for profile ${resolveProfileName(profileName)}.`;
};

const resolveErrorMessage = (error: unknown, profileName: string | null): string => {
  if (error instanceof Error) return error.message;
  return `Failed to refresh the 1688 session for profile ${resolveProfileName(profileName)}.`;
};

const refresh1688SessionQueries = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.withConnections() }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.integrations.selection.scanner1688DefaultConnection(),
    }),
  ]);
  await Promise.all([
    queryClient.refetchQueries({
      queryKey: QUERY_KEYS.integrations.withConnections(),
      type: 'active',
    }),
    queryClient.refetchQueries({
      queryKey: QUERY_KEYS.integrations.selection.scanner1688DefaultConnection(),
      type: 'active',
    }),
  ]);
};

export const useProductScan1688SessionRefresh = (
  input: UseProductScan1688SessionRefreshInput
): ProductScan1688SessionRefreshState => {
  const testConnectionMutation = useTestConnection();
  const [is1688LoginPending, setIs1688LoginPending] = useState(false);
  const [refreshed1688ConnectionIds, setRefreshed1688ConnectionIds] = useState<Set<string>>(new Set());
  const [latest1688SessionMessage, setLatest1688SessionMessage] = useState<string | null>(null);
  const [latest1688SessionError, setLatest1688SessionError] = useState<string | null>(null);

  const reset1688SessionState = useCallback((): void => {
    setIs1688LoginPending(false);
    setRefreshed1688ConnectionIds(new Set());
    setLatest1688SessionMessage(null);
    setLatest1688SessionError(null);
  }, []);

  const refresh1688Session = useCallback(async (sessionInput: Refresh1688SessionInput): Promise<RefreshSessionResult> => {
    if (
      sessionInput.active1688ConnectionId === null ||
      sessionInput.active1688IntegrationId === null ||
      is1688LoginPending === true
    ) {
      return missingSessionResult();
    }
    const connectionId = sessionInput.active1688ConnectionId;
    const integrationId = sessionInput.active1688IntegrationId;
    setIs1688LoginPending(true);
    setLatest1688SessionError(null);
    setLatest1688SessionMessage(null);
    try {
      const response = await testConnectionMutation.mutateAsync({
        integrationId,
        connectionId,
        type: 'test',
        body: { mode: 'manual_session_refresh', manualTimeoutMs: 300000 },
        timeoutMs: 360000,
      });
      setRefreshed1688ConnectionIds((current) => new Set(current).add(connectionId));
      const successMessage = resolveSuccessMessage(response, sessionInput.active1688ProfileName);
      setLatest1688SessionMessage(successMessage);
      input.toast(successMessage, { variant: 'success' });
      return { ok: true, message: successMessage };
    } catch (error) {
      const message = resolveErrorMessage(error, sessionInput.active1688ProfileName);
      setLatest1688SessionError(message);
      input.toast(message, { variant: 'error' });
      return { ok: false, message };
    } finally {
      setIs1688LoginPending(false);
      await refresh1688SessionQueries(input.queryClient);
    }
  }, [input, is1688LoginPending, testConnectionMutation]);

  return { is1688LoginPending, latest1688SessionError, latest1688SessionMessage, refresh1688Session, refreshed1688ConnectionIds, reset1688SessionState };
};
