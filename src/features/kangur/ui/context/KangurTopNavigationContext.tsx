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
  KangurPrimaryNavigation
} from '@/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation';
import { useAccessibleKangurPrimaryNavigation } from '@/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.access';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.types';

type KangurTopNavigationRegistration = {
  ownerId: string;
  navigation: KangurPrimaryNavigationProps;
};

type KangurTopNavigationStateContextValue = {
  visibleRegistration: KangurTopNavigationRegistration | null;
};

type KangurTopNavigationActionsContextValue = {
  clearNavigation: (ownerId: string, options?: { immediate?: boolean }) => void;
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
  const [visibleRegistration, setVisibleRegistration] =
    useState<KangurTopNavigationRegistration | null>(null);
  const clearTimeoutRef = useRef<number | null>(null);
  const applyClearNavigation = useCallback((ownerId: string): void => {
    setVisibleRegistration((current) => {
      if (current?.ownerId !== ownerId) {
        return current;
      }
      return null;
    });
  }, []);

  const clearNavigation = useCallback(
    (ownerId: string, options?: { immediate?: boolean }): void => {
      const immediate = options?.immediate === true;
      if (clearTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }

      if (typeof window === 'undefined') {
        applyClearNavigation(ownerId);
        return;
      }

      if (immediate) {
        // A hidden controller can replace a previously visible page controller during route
        // transitions, so clear the currently rendered host navigation right away even when
        // the owner ids do not match yet.
        setVisibleRegistration(null);
        return;
      }

      clearTimeoutRef.current = window.setTimeout(() => {
        clearTimeoutRef.current = null;
        applyClearNavigation(ownerId);
      }, TOP_NAVIGATION_CLEAR_DELAY_MS);
    },
    [applyClearNavigation]
  );

  const setNavigation = useCallback(
    (ownerId: string, navigation: KangurPrimaryNavigationProps): void => {
      if (clearTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }

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
      visibleRegistration,
    }),
    [visibleRegistration]
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

function KangurHostedTopNavigation({
  navigation,
}: {
  navigation: KangurPrimaryNavigationProps;
}): React.JSX.Element {
  const accessibleNavigation = useAccessibleKangurPrimaryNavigation(navigation);
  return <KangurPrimaryNavigation {...accessibleNavigation} />;
}

export function KangurTopNavigationHost({
  fallback = null,
}: {
  fallback?: ReactNode;
} = {}): React.JSX.Element | null {
  const state = useContext(KangurTopNavigationStateContext);
  if (!state) {
    throw internalError(
      'KangurTopNavigationHost must be used within a KangurTopNavigationProvider'
    );
  }

  if (!state.visibleRegistration) {
    return <>{fallback}</>;
  }

  return <KangurHostedTopNavigation navigation={state.visibleRegistration.navigation} />;
}

export const useOptionalKangurTopNavigation = (): KangurTopNavigationActionsContextValue | null => {
  return useContext(KangurTopNavigationActionsContext);
};
