import React from 'react';

import {
  useProductListingsActions,
  useProductListingsUIState,
} from '@/features/integrations/context/ProductListingsContext';

type VintedRecoveryContinueButtonProps = {
  integrationId: string;
  connectionId: string;
  size?: 'sm' | 'md';
};

export function VintedRecoveryContinueButton({
  integrationId,
  connectionId,
  size = 'sm',
}: VintedRecoveryContinueButtonProps): React.JSX.Element {
  const { handleOpenVintedLogin } = useProductListingsActions();
  const { openingVintedLogin } = useProductListingsUIState();
  const openingRecoveryLogin = openingVintedLogin === 'recovery';
  const className =
    size === 'md'
      ? 'inline-flex h-9 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60'
      : 'inline-flex h-8 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <button
      type='button'
      className={className}
      onClick={(): void => {
        void (async (): Promise<void> => {
          await handleOpenVintedLogin('recovery', integrationId, connectionId);
        })();
      }}
      disabled={openingRecoveryLogin}
    >
      {openingRecoveryLogin ? 'Waiting for Vinted login...' : 'Login to Vinted.pl'}
    </button>
  );
}
