'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
  visibleRegistration: KangurTopNavigationRegistration | null;
};

type KangurTopNavigationActionsContextValue = {
  clearNavigation: (ownerId: string) => void;
  setNavigation: (ownerId: string, navigation: KangurPrimaryNavigationProps) => void;
};

const KangurTopNavigationStateContext =
  createContext<KangurTopNavigationStateContextValue | null>(null);
const KangurTopNavigationActionsContext =
  createContext<KangurTopNavigationActionsContextValue | null>(null);

const TOP_NAVIGATION_CLEAR_DELAY_MS = 1_200;

export function KangurTopNavigationProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [registration, setRegistration] = useState<KangurTopNavigationRegistration | null>(null);
  const [visibleRegistration, setVisibleRegistration] =
    useState<KangurTopNavigationRegistration | null>(null);
  const clearTimeoutRef = useRef<number | null>(null);

  const clearNavigation = useCallback((ownerId: string): void => {
    if (typeof window === 'undefined') {
      setRegistration((current) => {
        if (current?.ownerId !== ownerId) {
          return current;
        }
        return null;
      });
      return;
    }

    if (clearTimeoutRef.current !== null) {
      window.clearTimeout(clearTimeoutRef.current);
    }

    clearTimeoutRef.current = window.setTimeout(() => {
      clearTimeoutRef.current = null;
      setRegistration((current) => {
        if (current?.ownerId !== ownerId) {
          return current;
        }
        return null;
      });
      setVisibleRegistration((current) => {
        if (current?.ownerId !== ownerId) {
          return current;
        }
        return null;
      });
    }, TOP_NAVIGATION_CLEAR_DELAY_MS);
  }, []);

  const setNavigation = useCallback(
    (ownerId: string, navigation: KangurPrimaryNavigationProps): void => {
      if (clearTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }

      setRegistration((current) => {
        const nextRegistration = {
          ownerId,
          navigation,
        };

        if (current?.ownerId === ownerId && current.navigation === navigation) {
          return current;
        }

        return nextRegistration;
      });
      setVisibleRegistration((current) => {
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
      visibleRegistration,
    }),
    [registration, visibleRegistration]
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

  if (!state.visibleRegistration) {
    return null;
  }

  return <KangurPrimaryNavigation {...state.visibleRegistration.navigation} />;
}

export const useOptionalKangurTopNavigation = (): KangurTopNavigationActionsContextValue | null => {
  return useContext(KangurTopNavigationActionsContext);
};
