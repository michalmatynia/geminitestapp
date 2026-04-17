'use client';

import { useRouter } from 'nextjs-toploader/app';
import { usePathname, useSearchParams, useSelectedLayoutSegments } from 'next/navigation';
import { startTransition, useEffect, useMemo, useState } from 'react';

import { useOptionalCmsStorefrontAppearance } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import { isSupportedSiteLocale } from '@/shared/lib/i18n/site-locale';
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
  canonicalizeKangurPublicAliasPathname,
  getKangurSlugFromPathname,
} from '@/features/kangur/ui/routing/managed-paths';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

import type { CSSProperties, JSX } from 'react';

// CSS class added to <html> and <body> while the Kangur client shell is
// mounted. Used by global CSS to apply shell-specific layout overrides.
const KANGUR_CLIENT_SHELL_ACTIVE_CLASSNAME = 'kangur-client-shell-active';
// Delay (ms) before showing the "Open the Kangur app?" prompt after a
// dedicated-app launch intent is detected. Gives the URL replace time to
// settle before the prompt appears.
const KANGUR_DEDICATED_APP_LAUNCH_DELAY_MS = 160;

type RouterSearchParamsLike = {
  toString(): string;
} | null;

type KangurFeatureRouteShellNavigation = {
  replace: (href: string, options: { scroll: boolean }) => void;
};

type KangurFeatureRouteShellPathState = {
  normalizedBasePath: string;
  pageKey: ReturnType<typeof resolveKangurPageKeyFromSlug>;
  requestedPath: string;
  requestedHref: string;
  launchIntent: ReturnType<typeof readKangurLaunchIntent>;
  sanitizedRequestedHref: string;
  dedicatedAppHref: string | null;
};

// Strips Next.js layout-segment markers (route groups like "(app)" and
// parallel-route slots like "@modal") from the selected segments array so
// only real URL path segments remain.
const normalizeSelectedKangurSegments = ({
  normalizedBasePath,
  segments,
}: {
  normalizedBasePath: string;
  segments: readonly string[];
}): string[] => {
  const normalizedSegments = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('(') && !segment.startsWith('@'));

  if (normalizedSegments.length === 0) {
    return normalizedSegments;
  }

  const withoutLocale = isSupportedSiteLocale(normalizedSegments[0])
    ? normalizedSegments.slice(1)
    : normalizedSegments;

  const basePathSegments = normalizedBasePath
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
  const withoutBasePath =
    basePathSegments.length > 0 &&
    withoutLocale.length >= basePathSegments.length &&
    basePathSegments.every((segment, index) => withoutLocale[index]?.trim().toLowerCase() === segment)
      ? withoutLocale.slice(basePathSegments.length)
      : withoutLocale;

  if (normalizedBasePath === '/' && withoutBasePath[0]?.trim().toLowerCase() === 'kangur') {
    return withoutBasePath.slice(1);
  }

  return withoutBasePath;
};

// Returns the current browser pathname during client-side rendering, or null
// during SSR. Used as a fallback when Next.js usePathname() returns null.
const resolveKangurFeatureRouteShellBrowserPathname = (): string | null =>
  typeof window === 'undefined' ? null : window.location.pathname?.trim() || null;

// Returns the current browser search string (including "?") during CSR, or
// an empty string during SSR.
const resolveKangurFeatureRouteShellBrowserSearch = (): string =>
  typeof window === 'undefined' ? '' : window.location.search || '';

// Detects whether the current device is capable of launching the native app.
// Returns true for touch/mobile devices where the deep-link prompt makes sense.
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

// Resolves the effective pathname for the shell. Prefers the Next.js router
// pathname, falls back to the live browser pathname, then to the base path.
const resolveKangurFeatureRouteShellPathname = ({
  browserPathname,
  normalizedBasePath,
  pathname,
}: {
  browserPathname: string | null;
  normalizedBasePath: string;
  pathname: string | null;
}): string => pathname?.trim() || browserPathname || normalizedBasePath;

// Resolves the URL slug segments for the current route. Prefers the
// selectedLayoutSegments from Next.js (most accurate during RSC transitions),
// then falls back to parsing the pathname directly.
const resolveKangurFeatureRouteShellSlug = ({
  normalizedBasePath,
  resolvedPathname,
  selectedLayoutSegments,
}: {
  normalizedBasePath: string;
  resolvedPathname: string;
  selectedLayoutSegments: readonly string[];
}): string[] => {
  const selectedSlug = normalizeSelectedKangurSegments({
    normalizedBasePath,
    segments: selectedLayoutSegments,
  });
  if (selectedSlug.length > 0) {
    return selectedSlug;
  }

  const normalizedPathname =
    normalizedBasePath === '/'
      ? canonicalizeKangurPublicAliasPathname(resolvedPathname)
      : resolvedPathname;

  return getKangurSlugFromPathname(normalizedPathname, normalizedBasePath);
};

// The /login route is handled by a dedicated Next.js page outside the Kangur
// app shell. Treat it as the root slug so the shell renders the home page
// while the login page mounts above it.
const resolveKangurFeatureRouteShellEffectiveSlug = (slug: string[]): string[] =>
  slug[0]?.trim().toLowerCase() === 'login' ? [] : slug;

// Builds the canonical href for the current route by combining the resolved
// pathname with the active search params. Uses a URL parse to normalise
// trailing slashes. Falls back to a simple string concatenation if URL
// construction fails (e.g. malformed pathname from an edge case).
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

// Merges the Next.js router search params with the live browser search string.
// The browser string is used as a fallback because Next.js search params can
// lag behind the browser URL during rapid navigations.
const useActiveSearchParams = ({
  browserSearch,
  searchParams,
}: {
  browserSearch: string;
  searchParams: RouterSearchParamsLike;
}): URLSearchParams =>
  useMemo(() => {
    return new URLSearchParams(searchParams?.toString() || browserSearch.replace(/^\?/, ''));
  }, [browserSearch, searchParams]);

// Derives the three href variants needed by the shell:
//  requestedHref         – full href including launch-intent params (used for
//                          routing context so the app knows the original intent)
//  sanitizedRequestedHref – href with launch-intent params stripped (used for
//                           URL replacement so the intent doesn't persist in
//                           the browser history)
//  sanitizedSearchParams  – search params with launch-intent stripped
const useResolvedRequestedHrefs = ({
  activeSearchParams,
  requestedPath,
  resolvedPathname,
}: {
  activeSearchParams: URLSearchParams;
  requestedPath: string;
  resolvedPathname: string;
}): {
  requestedHref: string;
  sanitizedRequestedHref: string;
  sanitizedSearchParams: URLSearchParams;
} => {
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

  return {
    requestedHref: readKangurLaunchIntent(activeSearchParams) === 'dedicated_app'
      ? sanitizedRequestedHref
      : resolvedRequestedHref,
    sanitizedRequestedHref,
    sanitizedSearchParams,
  };
};

// Aggregates all path-related state for the shell into a single object.
// This hook is the single source of truth for the current route, page key,
// launch intent, and dedicated-app href.
const useKangurFeatureRouteShellPathState = ({
  basePath,
  pathname,
  searchParams,
  selectedLayoutSegments,
}: {
  basePath: string;
  pathname: string | null;
  searchParams: RouterSearchParamsLike;
  selectedLayoutSegments: readonly string[];
}): KangurFeatureRouteShellPathState => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);
  const browserPathname = resolveKangurFeatureRouteShellBrowserPathname();
  const browserSearch = resolveKangurFeatureRouteShellBrowserSearch();
  const activeSearchParams = useActiveSearchParams({
    browserSearch,
    searchParams,
  });
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
  const { requestedHref, sanitizedRequestedHref, sanitizedSearchParams } =
    useResolvedRequestedHrefs({
      activeSearchParams,
      requestedPath,
      resolvedPathname,
    });
  const dedicatedAppHref = useMemo(() => {
    return getKangurDedicatedAppHref(effectiveSlug, sanitizedSearchParams);
  }, [effectiveSlug, sanitizedSearchParams]);

  return {
    normalizedBasePath,
    pageKey,
    requestedPath,
    requestedHref,
    launchIntent,
    sanitizedRequestedHref,
    dedicatedAppHref,
  };
};

// Handles the "dedicated_app" launch intent: strips the intent param from the
// URL immediately (so it doesn't persist in history), then shows a bottom-sheet
// prompt on touch devices offering to open the native Kangur app via deep link.
const useKangurDedicatedAppLaunchPrompt = ({
  dedicatedAppHref,
  launchIntent,
  router,
  sanitizedRequestedHref,
}: {
  dedicatedAppHref: string | null;
  launchIntent: ReturnType<typeof readKangurLaunchIntent>;
  router: KangurFeatureRouteShellNavigation;
  sanitizedRequestedHref: string;
}): {
  pendingDedicatedAppHref: string | null;
  dismissDedicatedAppPrompt: () => void;
  openDedicatedApp: () => void;
} => {
  const [pendingDedicatedAppHref, setPendingDedicatedAppHref] = useState<string | null>(null);

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

  const openDedicatedApp = (): void => {
    if (!pendingDedicatedAppHref) {
      return;
    }

    window.location.assign(pendingDedicatedAppHref);
  };

  return {
    pendingDedicatedAppHref,
    dismissDedicatedAppPrompt: () => setPendingDedicatedAppHref(null),
    openDedicatedApp,
  };
};

// Bottom-sheet prompt shown on touch devices when a dedicated-app launch
// intent is detected. Lets the user choose between the web version and the
// installed native app.
function KangurDedicatedAppLaunchPrompt({
  pendingDedicatedAppHref,
  onDismiss,
  onOpen,
}: {
  pendingDedicatedAppHref: string | null;
  onDismiss: () => void;
  onOpen: () => void;
}): JSX.Element | null {
  if (!pendingDedicatedAppHref) {
    return null;
  }

  return (
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
          onClick={onDismiss}
        >
          Stay on web
        </button>
        <button
          type='button'
          className='rounded-full bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-200'
          onClick={onOpen}
        >
          Open app
        </button>
      </div>
    </div>
  );
};

// Adds/removes the shell-active CSS class on <html> and <body> for the
// lifetime of the Kangur shell mount. Cleans up on unmount so the class
// doesn't linger if the shell is conditionally rendered.
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

// KangurFeatureRouteShell is the outermost client component for the StudiQ
// web experience. It is rendered by the Next.js App Router layout and is
// responsible for:
//
//  - Resolving the current page key and requested href from the URL
//  - Detecting and handling the "dedicated_app" deep-link launch intent
//  - Applying the storefront appearance (theme CSS variables) to the shell div
//  - Providing routing context (KangurRoutingProvider) to the app tree
//  - Rendering the dedicated-app launch prompt on eligible touch devices
//
// Props:
//  basePath           – canonical Kangur base path (default: /kangur)
//  embedded           – true when the shell is embedded inside a CMS page
//  forceBodyScrollLock – locks body scroll (used by full-screen game views)
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
  const appearanceMode = appearance?.mode ?? 'default';
  const kangurAppearance = useKangurStorefrontAppearance();
  const {
    normalizedBasePath,
    pageKey,
    requestedPath,
    requestedHref,
    launchIntent,
    sanitizedRequestedHref,
    dedicatedAppHref,
  } = useKangurFeatureRouteShellPathState({
    basePath,
    pathname,
    searchParams,
    selectedLayoutSegments,
  });
  const { pendingDedicatedAppHref, dismissDedicatedAppPrompt, openDedicatedApp } =
    useKangurDedicatedAppLaunchPrompt({
      dedicatedAppHref,
      launchIntent,
      router,
      sanitizedRequestedHref,
    });
  useSyncKangurFeatureRouteShellActiveClass();

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
      <KangurDedicatedAppLaunchPrompt
        pendingDedicatedAppHref={pendingDedicatedAppHref}
        onDismiss={dismissDedicatedAppPrompt}
        onOpen={openDedicatedApp}
      />
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
