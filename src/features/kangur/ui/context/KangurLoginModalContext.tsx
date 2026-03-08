'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getKangurHomeHref, getKangurLoginHref } from '@/features/kangur/config/routing';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { internalError } from '@/shared/errors/app-error';

type KangurLoginModalContextValue = {
  callbackUrl: string;
  closeLoginModal: () => void;
  dismissLoginModal: () => void;
  homeHref: string;
  isOpen: boolean;
  isRouteDriven: boolean;
  openLoginModal: (callbackUrl?: string | null) => void;
};

type KangurLoginModalProviderProps = {
  children: ReactNode;
};

type InlineLoginModalState = {
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
  const [inlineState, setInlineState] = useState<InlineLoginModalState>({
    callbackUrl: null,
    isOpen: false,
  });
  const isRouteDriven = pathname === loginPathname;
  const fallbackCallbackUrl = requestedPath || homeHref;
  const callbackUrl = isRouteDriven
    ? requestedCallbackUrl
    : toNonEmptyString(inlineState.callbackUrl, fallbackCallbackUrl);

  const openLoginModal = useCallback(
    (nextCallbackUrl?: string | null): void => {
      const currentHref =
        typeof window === 'undefined' ? fallbackCallbackUrl : window.location.href;
      setInlineState({
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
      callbackUrl,
      closeLoginModal,
      dismissLoginModal,
      homeHref,
      isOpen: isRouteDriven || inlineState.isOpen,
      isRouteDriven,
      openLoginModal,
    }),
    [
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
  const context = useContext(KangurLoginModalContext);
  if (!context) {
    throw internalError(
      'useKangurLoginModal must be used within a KangurLoginModalProvider'
    );
  }
  return context;
};
