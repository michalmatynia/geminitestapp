'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  KangurPrimaryNavigation,
  type KangurPrimaryNavigationProps,
} from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { internalError } from '@/shared/errors/app-error';

type KangurTopNavigationRegistration = {
  ownerId: string;
  navigation: KangurPrimaryNavigationProps;
};

type KangurTopNavigationStateContextValue = {
  registration: KangurTopNavigationRegistration | null;
};

type KangurTopNavigationActionsContextValue = {
  clearNavigation: (ownerId: string) => void;
  setNavigation: (ownerId: string, navigation: KangurPrimaryNavigationProps) => void;
};

const KangurTopNavigationStateContext =
  createContext<KangurTopNavigationStateContextValue | null>(null);
const KangurTopNavigationActionsContext =
  createContext<KangurTopNavigationActionsContextValue | null>(null);

export function KangurTopNavigationProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [registration, setRegistration] = useState<KangurTopNavigationRegistration | null>(null);

  const clearNavigation = useCallback((ownerId: string): void => {
    setRegistration((current) => {
      if (!current || current.ownerId !== ownerId) {
        return current;
      }
      return null;
    });
  }, []);

  const setNavigation = useCallback(
    (ownerId: string, navigation: KangurPrimaryNavigationProps): void => {
      setRegistration((current) => {
        if (current?.ownerId === ownerId && current.navigation === navigation) {
          return current;
        }

        return {
          ownerId,
          navigation,
        };
      });
    },
    []
  );

  const stateValue = useMemo<KangurTopNavigationStateContextValue>(
    () => ({
      registration,
    }),
    [registration]
  );
  const actionsValue = useMemo<KangurTopNavigationActionsContextValue>(
    () => ({
      clearNavigation,
      setNavigation,
    }),
    [clearNavigation, setNavigation]
  );

  return (
    <KangurTopNavigationActionsContext.Provider value={actionsValue}>
      <KangurTopNavigationStateContext.Provider value={stateValue}>
        {children}
      </KangurTopNavigationStateContext.Provider>
    </KangurTopNavigationActionsContext.Provider>
  );
}

export function KangurTopNavigationHost(): React.JSX.Element | null {
  const state = useContext(KangurTopNavigationStateContext);
  if (!state) {
    throw internalError(
      'KangurTopNavigationHost must be used within a KangurTopNavigationProvider'
    );
  }

  if (!state.registration) {
    return null;
  }

  return <KangurPrimaryNavigation {...state.registration.navigation} />;
}

export const useOptionalKangurTopNavigation = (): KangurTopNavigationActionsContextValue | null => {
  return useContext(KangurTopNavigationActionsContext);
};
