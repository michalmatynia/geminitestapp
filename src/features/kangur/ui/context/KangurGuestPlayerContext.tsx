'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';

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
  const [guestPlayerName, setGuestPlayerName] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.sessionStorage.getItem(KANGUR_GUEST_PLAYER_STORAGE_KEY) ?? '';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const trimmedGuestPlayerName = guestPlayerName.trim();
    if (trimmedGuestPlayerName.length === 0) {
      window.sessionStorage.removeItem(KANGUR_GUEST_PLAYER_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(KANGUR_GUEST_PLAYER_STORAGE_KEY, trimmedGuestPlayerName);
  }, [guestPlayerName]);

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
