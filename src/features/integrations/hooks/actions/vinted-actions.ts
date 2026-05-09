import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  ensureVintedBrowserSession,
  isVintedBrowserAuthRequiredMessage,
} from '@/features/integrations/utils/vinted-browser-session';
import { normalizeVintedDisplayText } from '@/features/integrations/utils/vinted-display';
import { createVintedRecoveryContext } from '@/features/integrations/utils/product-listings-recovery';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type UseVintedActionsOptions = {
  onListingsUpdated?: (() => void) | undefined;
  productId: string;
  refetchListingsQuery: () => Promise<unknown>;
  setError: Dispatch<SetStateAction<string | null>>;
  setOpeningVintedLogin: Dispatch<SetStateAction<string | null>>;
  setRecoveryContext: Dispatch<SetStateAction<ProductListingsRecoveryContext | null>>;
};

export const useVintedActions = ({
  onListingsUpdated,
  productId,
  refetchListingsQuery,
  setError,
  setOpeningVintedLogin,
  setRecoveryContext,
}: UseVintedActionsOptions) => {
  const { toast } = useToast();

  const handleOpenVintedLogin = useCallback(
    async (listingId: string, integrationId: string, connectionId: string): Promise<boolean> => {
      try {
        setOpeningVintedLogin(listingId);
        setError(null);
        const response = await ensureVintedBrowserSession({
          integrationId,
          connectionId,
        });
        if (!response.savedSession) {
          const errorMessage =
            'Vinted.pl login session could not be saved. Complete login verification and retry.';
          setRecoveryContext(
            createVintedRecoveryContext({
              status: 'auth_required',
              runId: null,
              failureReason: errorMessage,
              integrationId,
              connectionId,
            })
          );
          toast(errorMessage, { variant: 'error' });
          return false;
        }
        toast('Vinted.pl login session refreshed.', { variant: 'success' });
        setRecoveryContext((current) =>
          current?.integrationSlug === 'vinted' ? null : current
        );
        await refetchListingsQuery();
        onListingsUpdated?.();
        return true;
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'openVintedLogin',
          listingId,
          productId,
          integrationId,
          connectionId,
        });
        const errorMessage = normalizeVintedDisplayText(
          err instanceof Error ? err.message : 'Failed to open Vinted.pl login window'
        );
        if (isVintedBrowserAuthRequiredMessage(errorMessage)) {
          setRecoveryContext(
            createVintedRecoveryContext({
              status: 'auth_required',
              runId: null,
              failureReason: errorMessage,
              integrationId,
              connectionId,
            })
          );
          toast(errorMessage, { variant: 'error' });
          return false;
        }
        setError(errorMessage);
        return false;
      } finally {
        setOpeningVintedLogin(null);
      }
    },
    [
      onListingsUpdated,
      productId,
      refetchListingsQuery,
      setError,
      setOpeningVintedLogin,
      setRecoveryContext,
      toast,
    ]
  );

  return { handleOpenVintedLogin };
};
