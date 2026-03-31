'use client';

import { usePathname, useRouter, useSearchParams, useSelectedLayoutSegments } from 'next/navigation';
import { startTransition, useEffect, useMemo, useState } from 'react';

import { useOptionalCmsStorefrontAppearance } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import {
  KANGUR_BASE_PATH,
  getKangurDedicatedAppHref,
  normalizeKangurBasePath,
  normalizeKangurRequestedPath,
  readKangurLaunchIntent,
  resolveKangurPageKeyFromSlug,
  stripKangurLaunchIntent,
} from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeaturePageShell } from '@/features/kangur/ui/KangurFeaturePage';
import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives/KangurPageContainer';
import {
  getKangurSlugFromPathname,
} from '@/features/kangur/ui/routing/managed-paths';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

import type { CSSProperties, JSX } from 'react';

const KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME = 'kangur-client-shell-active';
const KANGUR_DEDICATED_APP_LAUNCH_DELAY_MS = 160;

const normalizeSelectedKangurSegments = (segments: readonly string[]): string[] =>
  segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('(') && !segment.startsWith('@'));

const resolveKangurFeatureRouteShellBrowserPathname = (): string | null =>
  typeof window === 'undefined' ? null : window.location.pathname?.trim() || null;

const resolveKangurFeatureRouteShellBrowserSearch = (): string =>
  typeof window === 'undefined' ? '' : window.location.search || '';

const isKangurDedicatedAppLaunchCapable = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const coarsePointer =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
  const touchPoints =
    typeof navigator === 'undefined' ? 0 : Math.max(navigator.maxTouchPoints ?? 0, 0);
  const userAgent =
    typeof navigator === 'undefined' ? '' : navigator.userAgent?.trim().toLowerCase() || '';

  return (
    coarsePointer ||
    touchPoints > 0 ||
    /(android|iphone|ipad|ipod|iemobile|mobile)/.test(userAgent)
  );
};

const resolveKangurFeatureRouteShellPathname = ({
  browserPathname,
  normalizedBasePath,
  pathname,
}: {
  browserPathname: string | null;
  normalizedBasePath: string;
  pathname: string | null;
}): string => pathname?.trim() || browserPathname || normalizedBasePath;

const resolveKangurFeatureRouteShellSlug = ({
  normalizedBasePath,
  resolvedPathname,
  selectedLayoutSegments,
}: {
  normalizedBasePath: string;
  resolvedPathname: string;
  selectedLayoutSegments: readonly string[];
}): string[] => {
  const selectedSlug = normalizeSelectedKangurSegments(selectedLayoutSegments);
  if (selectedSlug.length > 0) {
    return selectedSlug;
  }

  return getKangurSlugFromPathname(resolvedPathname, normalizedBasePath);
};

const resolveKangurFeatureRouteShellEffectiveSlug = (slug: string[]): string[] =>
  slug[0]?.trim().toLowerCase() === 'login' ? [] : slug;

const resolveKangurFeatureRequestedHref = ({
  requestedPath,
  resolvedPathname,
  searchParams,
}: {
  requestedPath: string;
  resolvedPathname: string;
  searchParams: URLSearchParams;
}): string => {
  const search = searchParams.toString();
  const baseHref = resolvedPathname || requestedPath;
  const fallbackHref = baseHref.replace(/\/+$/, '') || '/';

  return withKangurClientErrorSync(
    {
      source: 'kangur-feature-route-shell',
      action: 'resolve-requested-href',
      description: 'Resolve the requested href for the Kangur route shell.',
      context: {
        baseHref,
        requestedPath,
      },
    },
    () => {
      const parsed = new URL(baseHref, 'https://kangur.local');
      const normalizedPathname = parsed.pathname.replace(/\/+$/, '') || '/';
      return search ? `${normalizedPathname}?${search}` : normalizedPathname;
    },
    { fallback: search ? `${fallbackHref}?${search}` : fallbackHref }
  );
};

function useSyncKangurFeatureRouteShellActiveClass(): void {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.add(KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME);
    document.body.classList.add(KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME);

    return () => {
      document.documentElement.classList.remove(KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME);
      document.body.classList.remove(KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME);
    };
  }, []);
}

export function KangurFeatureRouteShell({
  basePath = KANGUR_BASE_PATH,
  embedded = false,
  forceBodyScrollLock = false,
}: {
  basePath?: string;
  embedded?: boolean;
  forceBodyScrollLock?: boolean;
} = {}): JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLayoutSegments = useSelectedLayoutSegments();
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const appearanceMode = appearance?.mode ?? 'default';
  const kangurAppearance = useKangurStorefrontAppearance();
  const browserPathname = resolveKangurFeatureRouteShellBrowserPathname();
  const browserSearch = resolveKangurFeatureRouteShellBrowserSearch();
  const activeSearchParams = useMemo(() => {
    return new URLSearchParams(searchParams?.toString() || browserSearch.replace(/^\?/, ''));
  }, [browserSearch, searchParams]);
  const resolvedPathname = resolveKangurFeatureRouteShellPathname({
    browserPathname,
    normalizedBasePath,
    pathname,
  });
  const slug = useMemo(() => {
    return resolveKangurFeatureRouteShellSlug({
      normalizedBasePath,
      resolvedPathname,
      selectedLayoutSegments,
    });
  }, [normalizedBasePath, resolvedPathname, selectedLayoutSegments]);
  const activeSlug = slug[0] ?? null;
  const effectiveSlug = resolveKangurFeatureRouteShellEffectiveSlug(slug);
  const pageKey = resolveKangurPageKeyFromSlug(activeSlug);
  const requestedPath = normalizeKangurRequestedPath(effectiveSlug, normalizedBasePath);
  const launchIntent = readKangurLaunchIntent(activeSearchParams);
  const sanitizedSearchParams = useMemo(() => {
    return stripKangurLaunchIntent(activeSearchParams);
  }, [activeSearchParams]);
  const resolvedRequestedHref = useMemo(() => {
    return resolveKangurFeatureRequestedHref({
      requestedPath,
      resolvedPathname,
      searchParams: activeSearchParams,
    });
  }, [activeSearchParams, requestedPath, resolvedPathname]);
  const sanitizedRequestedHref = useMemo(() => {
    return resolveKangurFeatureRequestedHref({
      requestedPath,
      resolvedPathname,
      searchParams: sanitizedSearchParams,
    });
  }, [requestedPath, resolvedPathname, sanitizedSearchParams]);
  const requestedHref =
    launchIntent === 'dedicated_app' ? sanitizedRequestedHref : resolvedRequestedHref;
  const dedicatedAppHref = useMemo(() => {
    return getKangurDedicatedAppHref(effectiveSlug, sanitizedSearchParams);
  }, [effectiveSlug, sanitizedSearchParams]);
  const [pendingDedicatedAppHref, setPendingDedicatedAppHref] = useState<string | null>(null);
  useSyncKangurFeatureRouteShellActiveClass();

  useEffect(() => {
    if (launchIntent !== 'dedicated_app') {
      return;
    }

    startTransition(() => {
      router.replace(sanitizedRequestedHref, { scroll: false });
    });

    if (!dedicatedAppHref || !isKangurDedicatedAppLaunchCapable()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPendingDedicatedAppHref(dedicatedAppHref);
    }, KANGUR_DEDICATED_APP_LAUNCH_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [dedicatedAppHref, launchIntent, router, sanitizedRequestedHref]);

  const handleDedicatedAppOpen = (): void => {
    if (!pendingDedicatedAppHref) {
      return;
    }

    window.location.assign(pendingDedicatedAppHref);
  };

  const isEmbedded = embedded;
  const shellStyle: CSSProperties & Record<string, string> = {
    ...kangurAppearance.vars,
  };

  return (
    <div
      className={cn(
        'relative w-full min-w-0 overflow-x-hidden kangur-premium-bg kangur-shell-viewport-height'
      )}
      data-appearance-mode={appearanceMode}
      data-kangur-appearance={appearanceMode}
      data-testid='kangur-route-shell'
      style={shellStyle}
    >
      {pendingDedicatedAppHref ? (
        <div className='pointer-events-none fixed inset-x-3 bottom-4 z-[70] flex justify-center sm:bottom-6'>
          <div className='pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[24px] border border-white/15 bg-slate-950/92 px-4 py-3 text-white shadow-[0_20px_50px_rgba(15,23,42,0.45)] backdrop-blur'>
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-semibold leading-tight'>Open the Kangur app?</p>
              <p className='mt-1 text-xs leading-relaxed text-slate-300'>
                Continue in the installed app or stay on the web version.
              </p>
            </div>
            <button
              type='button'
              className='rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:text-white'
              onClick={() => setPendingDedicatedAppHref(null)}
            >
              Stay on web
            </button>
            <button
              type='button'
              className='rounded-full bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200'
              onClick={handleDedicatedAppOpen}
            >
              Open app
            </button>
          </div>
        </div>
      ) : null}
      <KangurRoutingProvider
        pageKey={pageKey}
        requestedPath={requestedPath}
        requestedHref={requestedHref}
        basePath={normalizedBasePath}
        embedded={isEmbedded}
      >
        <KangurMainRoleProvider suppressMainRole>
          <KangurFeaturePageShell forceBodyScrollLock={forceBodyScrollLock} />
        </KangurMainRoleProvider>
      </KangurRoutingProvider>
    </div>
  );
}
