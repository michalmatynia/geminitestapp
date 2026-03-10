'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getKangurHomeHref, getKangurLoginHref } from '@/features/kangur/config/routing';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { internalError } from '@/shared/errors/app-error';

export type KangurLoginModalAuthMode = 'sign-in' | 'create-account';

type KangurLoginModalOpenOptions = {
  authMode?: KangurLoginModalAuthMode;
};

type KangurLoginModalContextValue = {
  authMode: KangurLoginModalAuthMode;
  callbackUrl: string;
  closeLoginModal: () => void;
  dismissLoginModal: () => void;
  homeHref: string;
  isOpen: boolean;
  isRouteDriven: boolean;
  openLoginModal: (callbackUrl?: string | null, options?: KangurLoginModalOpenOptions) => void;
};

type KangurLoginModalStateValue = Pick<
  KangurLoginModalContextValue,
  'authMode' | 'callbackUrl' | 'homeHref' | 'isOpen' | 'isRouteDriven'
>;

type KangurLoginModalActionsValue = Pick<
  KangurLoginModalContextValue,
  'closeLoginModal' | 'dismissLoginModal' | 'openLoginModal'
>;

type KangurLoginModalProviderProps = {
  children: ReactNode;
};

type InlineLoginModalState = {
  authMode: KangurLoginModalAuthMode;
  callbackUrl: string | null;
  isOpen: boolean;
};

const KangurLoginModalContext = createContext<KangurLoginModalContextValue | null>(null);

const toNonEmptyString = (value: string | null | undefined, fallback: string): string => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : fallback;
};

const getPathnameFromHref = (href: string): string => {
  try {
    return new URL(href, 'https://kangur.local').pathname;
  } catch {
    return href.split('?')[0] ?? href;
  }
};

const resolveAuthMode = (value: string | null | undefined): KangurLoginModalAuthMode =>
  value?.trim().toLowerCase() === 'create-account' ? 'create-account' : 'sign-in';

export const KangurLoginModalProvider = ({
  children,
}: KangurLoginModalProviderProps): React.JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { basePath, requestedPath } = useKangurRouting();
  const homeHref = useMemo(() => getKangurHomeHref(basePath), [basePath]);
  const loginPathname = useMemo(() => getPathnameFromHref(getKangurLoginHref(basePath)), [basePath]);
  const requestedCallbackUrl = useMemo(
    () => toNonEmptyString(searchParams.get('callbackUrl'), homeHref),
    [homeHref, searchParams]
  );
  const requestedAuthMode = useMemo(
    () => resolveAuthMode(searchParams.get('authMode')),
    [searchParams]
  );
  const [inlineState, setInlineState] = useState<InlineLoginModalState>({
    authMode: 'sign-in',
    callbackUrl: null,
    isOpen: false,
  });
  const isRouteDriven = pathname === loginPathname;
  const fallbackCallbackUrl = requestedPath || homeHref;
  const authMode = isRouteDriven ? requestedAuthMode : inlineState.authMode;
  const callbackUrl = isRouteDriven
    ? requestedCallbackUrl
    : toNonEmptyString(inlineState.callbackUrl, fallbackCallbackUrl);

  const openLoginModal = useCallback(
    (nextCallbackUrl?: string | null, options?: KangurLoginModalOpenOptions): void => {
      const currentHref =
        typeof window === 'undefined' ? fallbackCallbackUrl : window.location.href;
      setInlineState({
        authMode: options?.authMode ?? 'sign-in',
        callbackUrl: toNonEmptyString(nextCallbackUrl, currentHref),
        isOpen: true,
      });
    },
    [fallbackCallbackUrl]
  );

  const dismissLoginModal = useCallback((): void => {
    setInlineState((current) => {
      if (!current.isOpen) {
        return current;
      }

      return {
        ...current,
        isOpen: false,
      };
    });
  }, []);

  const closeLoginModal = useCallback((): void => {
    if (isRouteDriven) {
      dismissLoginModal();
      router.push(homeHref, { scroll: false });
      return;
    }

    dismissLoginModal();
  }, [dismissLoginModal, homeHref, isRouteDriven, router]);

  const value = useMemo<KangurLoginModalContextValue>(
    () => ({
      authMode,
      callbackUrl,
      closeLoginModal,
      dismissLoginModal,
      homeHref,
      isOpen: isRouteDriven || inlineState.isOpen,
      isRouteDriven,
      openLoginModal,
    }),
    [
      authMode,
      callbackUrl,
      closeLoginModal,
      dismissLoginModal,
      homeHref,
      inlineState.isOpen,
      isRouteDriven,
      openLoginModal,
    ]
  );

  return (
    <KangurLoginModalContext.Provider value={value}>{children}</KangurLoginModalContext.Provider>
  );
};

export const useKangurLoginModal = (): KangurLoginModalContextValue => {
  const state = useKangurLoginModalState();
  const actions = useKangurLoginModalActions();
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
};

export const useKangurLoginModalState = (): KangurLoginModalStateValue => {
  const context = useContext(KangurLoginModalContext);
  if (!context) {
    throw internalError(
      'useKangurLoginModalState must be used within a KangurLoginModalProvider'
    );
  }
  return useMemo(
    () => ({
      authMode: context.authMode,
      callbackUrl: context.callbackUrl,
      homeHref: context.homeHref,
      isOpen: context.isOpen,
      isRouteDriven: context.isRouteDriven,
    }),
    [context]
  );
};

export const useKangurLoginModalActions = (): KangurLoginModalActionsValue => {
  const context = useContext(KangurLoginModalContext);
  if (!context) {
    throw internalError(
      'useKangurLoginModalActions must be used within a KangurLoginModalProvider'
    );
  }
  return useMemo(
    () => ({
      closeLoginModal: context.closeLoginModal,
      dismissLoginModal: context.dismissLoginModal,
      openLoginModal: context.openLoginModal,
    }),
    [context]
  );
};
