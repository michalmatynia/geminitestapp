import React from 'react';

import {
  useProductListingsActions,
  useProductListingsUIState,
} from '@/features/integrations/context/ProductListingsContext';

type TraderaRecoveryContinueButtonProps = {
  integrationId: string;
  connectionId: string;
  size?: 'sm' | 'md';
};

export function TraderaRecoveryContinueButton({
  integrationId,
  connectionId,
  size = 'sm',
}: TraderaRecoveryContinueButtonProps): React.JSX.Element {
  const { handleOpenTraderaLogin } = useProductListingsActions();
  const { openingTraderaLogin } = useProductListingsUIState();
  const openingRecoveryLogin = openingTraderaLogin === 'recovery';
  const className =
    size === 'md'
      ? 'inline-flex h-9 items-center justify-center rounded-md border border-amber-400/50 bg-amber-500/10 px-4 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60'
      : 'inline-flex h-8 items-center justify-center rounded-md border border-amber-400/50 bg-amber-500/10 px-3 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <button
      type='button'
      className={className}
      onClick={(): void => {
        void (async (): Promise<void> => {
          await handleOpenTraderaLogin(
            'recovery',
            integrationId,
            connectionId
          );
        })();
      }}
      disabled={openingRecoveryLogin}
    >
      {openingRecoveryLogin ? 'Waiting for manual login...' : 'Login to Tradera'}
    </button>
  );
}
