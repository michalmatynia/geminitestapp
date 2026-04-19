'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';
import { useKangurIdleReady } from '@/features/kangur/ui/hooks/useKangurIdleReady';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';

import { internalError } from '@/features/kangur/shared/errors/app-error';

type KangurGuestPlayerContextValue = {
  guestPlayerName: string;
  setGuestPlayerName: (value: string) => void;
};

const KANGUR_GUEST_PLAYER_STORAGE_KEY = 'kangur.guest-player-name';
const KangurGuestPlayerContext = createContext<KangurGuestPlayerContextValue | null>(null);

export function KangurGuestPlayerProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const routing = useOptionalKangurRouting();
  const shouldDelayGuestPlayerHydration =
    routing?.embedded === false && routing.pageKey === 'Game';
  const isIdleReady = useKangurIdleReady({
    minimumDelayMs: shouldDelayGuestPlayerHydration
      ? GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS
      : 0,
  });
  const isGuestPlayerHydrationReady = !shouldDelayGuestPlayerHydration || isIdleReady;
  const [guestPlayerName, setGuestPlayerName] = useState('');

  useEffect(() => {
    if (!isGuestPlayerHydrationReady || typeof window === 'undefined') {
      return;
    }

    setGuestPlayerName((current) => {
      if (current.trim().length > 0) {
        return current;
      }

      return window.sessionStorage.getItem(KANGUR_GUEST_PLAYER_STORAGE_KEY) ?? current;
    });
  }, [isGuestPlayerHydrationReady]);

  useEffect(() => {
    if (!isGuestPlayerHydrationReady || typeof window === 'undefined') {
      return;
    }

    const trimmedGuestPlayerName = guestPlayerName.trim();
    if (trimmedGuestPlayerName.length === 0) {
      window.sessionStorage.removeItem(KANGUR_GUEST_PLAYER_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(KANGUR_GUEST_PLAYER_STORAGE_KEY, trimmedGuestPlayerName);
  }, [guestPlayerName, isGuestPlayerHydrationReady]);

  const value = useMemo<KangurGuestPlayerContextValue>(
    () => ({
      guestPlayerName,
      setGuestPlayerName,
    }),
    [guestPlayerName]
  );

  return (
    <KangurGuestPlayerContext.Provider value={value}>
      {children}
    </KangurGuestPlayerContext.Provider>
  );
}

export const useKangurGuestPlayer = (): KangurGuestPlayerContextValue => {
  const context = useContext(KangurGuestPlayerContext);
  if (!context) {
    throw internalError('useKangurGuestPlayer must be used within a KangurGuestPlayerProvider');
  }
  return context;
};
