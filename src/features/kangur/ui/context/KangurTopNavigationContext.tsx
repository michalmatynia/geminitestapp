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
import { useAccessibleKangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation.access';
import { internalError } from '@/features/kangur/shared/errors/app-error';

type KangurTopNavigationRegistration = {
  ownerId: string;
  navigation: KangurPrimaryNavigationProps;
};

type KangurTopNavigationStateContextValue = {
  registration: KangurTopNavigationRegistration | null;
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
const EMPTY_KANGUR_TOP_NAVIGATION: KangurPrimaryNavigationProps = {
  basePath: '/kangur',
  currentPage: 'Game',
  isAuthenticated: false,
  onLogout: () => {},
};

export function KangurTopNavigationProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [registration, setRegistration] = useState<KangurTopNavigationRegistration | null>(null);
  const [visibleRegistration, setVisibleRegistration] =
    useState<KangurTopNavigationRegistration | null>(null);
  const clearTimeoutRef = useRef<number | null>(null);
  const applyClearNavigation = useCallback((ownerId: string): void => {
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
        setRegistration((current) => {
          if (current?.ownerId !== ownerId) {
            return current;
          }
          return null;
        });
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

  const navigation = useAccessibleKangurPrimaryNavigation(
    state.visibleRegistration?.navigation ?? EMPTY_KANGUR_TOP_NAVIGATION
  );

  if (!state.visibleRegistration) {
    return <>{fallback}</>;
  }

  return <KangurPrimaryNavigation {...navigation} />;
}

export const useOptionalKangurTopNavigation = (): KangurTopNavigationActionsContextValue | null => {
  return useContext(KangurTopNavigationActionsContext);
};
