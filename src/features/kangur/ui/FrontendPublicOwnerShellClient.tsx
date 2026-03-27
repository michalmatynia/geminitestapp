'use client';

import '@/app/(frontend)/kangur/kangur.css';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import type { FrontendPublicOwnerKangurShellInitialAppearance } from '@/features/kangur/ui/FrontendPublicOwnerKangurShell';

import type { JSX } from 'react';

const KANGUR_COARSE_POINTER_QUERY = '(pointer: coarse)';
const KANGUR_HOVER_NONE_QUERY = '(hover: none)';

const shouldLimitKangurWarmup = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const matchesCoarsePointer =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_COARSE_POINTER_QUERY).matches
      : false;

  if (matchesCoarsePointer) {
    return true;
  }

  const maxTouchPoints =
    typeof navigator === 'undefined' ? 0 : Math.max(navigator.maxTouchPoints ?? 0, 0);
  const prefersTouchOnlyInteraction =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_HOVER_NONE_QUERY).matches
      : false;

  return maxTouchPoints > 0 && prefersTouchOnlyInteraction;
};

const scheduleKangurWarmupTask = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleCallbackId = window.requestIdleCallback(() => {
      callback();
    });

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }

  const timeoutId = window.setTimeout(callback, 1);
  return () => {
    window.clearTimeout(timeoutId);
  };
};

type FrontendPublicOwnerKangurShellComponent = (
  typeof import('@/features/kangur/ui/FrontendPublicOwnerKangurShell')
)['FrontendPublicOwnerKangurShell'];

let frontendPublicOwnerKangurShellPromise:
  | Promise<FrontendPublicOwnerKangurShellComponent>
  | null = null;

const loadFrontendPublicOwnerKangurShell = async (): Promise<FrontendPublicOwnerKangurShellComponent> => {
  if (!frontendPublicOwnerKangurShellPromise) {
    frontendPublicOwnerKangurShellPromise = import(
      '@/features/kangur/ui/FrontendPublicOwnerKangurShell'
    ).then((module) => module.FrontendPublicOwnerKangurShell);
  }

  return frontendPublicOwnerKangurShellPromise;
};

export type FrontendPublicOwnerShellProps = {
  publicOwner: 'cms' | 'kangur';
  initialAppearance?: FrontendPublicOwnerKangurShellInitialAppearance;
  children: JSX.Element;
};

export default function FrontendPublicOwnerShellClient({
  publicOwner,
  initialAppearance,
  children,
}: FrontendPublicOwnerShellProps): JSX.Element {
  const [kangurShellComponent, setKangurShellComponent] =
    useState<FrontendPublicOwnerKangurShellComponent | null>(null);
  const pathname = usePathname();
  const browserPathname =
    typeof window === 'undefined' ? null : window.location.pathname?.trim() || null;
  const resolvedPathname = pathname?.trim() || browserPathname || '/';
  const normalizedPathname = stripSiteLocalePrefix(resolvedPathname);
  const isCanonicalPublicLoginRoute = normalizedPathname === '/login';
  const isKangurAliasRoute =
    normalizedPathname === '/kangur' || normalizedPathname.startsWith('/kangur/');
  const shouldRenderStandaloneKangurShell =
    publicOwner === 'kangur' && !isKangurAliasRoute && !isCanonicalPublicLoginRoute;

  useEffect(() => {
    if (process.env['NODE_ENV'] === 'test') {
      return undefined;
    }

    if (publicOwner !== 'kangur') {
      return undefined;
    }

    const warmupAuth = (): void => {
      void import('@/features/kangur/services/kangur-auth-prefetch')
        .then((m) => m.prefetchKangurAuth())
        .catch(() => {});
    };

    if (shouldLimitKangurWarmup()) {
      return scheduleKangurWarmupTask(warmupAuth);
    }

    warmupAuth();
    return undefined;
  }, [publicOwner]);

  useEffect(() => {
    if (!shouldRenderStandaloneKangurShell || kangurShellComponent) {
      return;
    }

    let cancelled = false;

    void loadFrontendPublicOwnerKangurShell()
      .then((component) => {
        if (!cancelled) {
          setKangurShellComponent(() => component);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [kangurShellComponent, shouldRenderStandaloneKangurShell]);

  if (shouldRenderStandaloneKangurShell) {
    if (!kangurShellComponent) {
      return children;
    }

    const KangurShellComponent = kangurShellComponent;
    return <KangurShellComponent initialAppearance={initialAppearance} />;
  }

  return children;
}
