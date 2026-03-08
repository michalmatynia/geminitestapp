'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  getKangurHomeHref,
  getKangurEmbeddedHostPath,
  KANGUR_EMBED_QUERY_PARAM,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { useOptionalKangurRouteTransition } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurAccentDot,
  KangurButton,
  KangurDivider,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const kangurPlatform = getKangurPlatform();

type PageNotFoundAuthState = {
  user: { role?: string } | null;
  isAuthenticated: boolean;
};

export function PageNotFound(): React.JSX.Element {
  const router = useRouter();
  const routeTransition = useOptionalKangurRouteTransition();
  const { requestedPath, basePath, embedded } = useKangurRouting();

  const pageName = useMemo(() => {
    const embeddedHostPath = getKangurEmbeddedHostPath(basePath);
    if (embeddedHostPath) {
      try {
        const parsed = new URL(requestedPath || embeddedHostPath, 'https://kangur.local');
        return (
          readKangurUrlParam(parsed.searchParams, KANGUR_EMBED_QUERY_PARAM, basePath) || 'unknown'
        );
      } catch {
        return requestedPath?.replace(/^\/+/, '') || 'unknown';
      }
    }

    if (!requestedPath || requestedPath.length === 0) {
      return 'unknown';
    }
    if (!requestedPath.startsWith(basePath)) {
      return requestedPath.replace(/^\/+/, '') || 'unknown';
    }
    const suffix = requestedPath.slice(basePath.length).replace(/^\/+/, '');
    return suffix || 'unknown';
  }, [basePath, requestedPath]);

  const { data: authData, isFetched } = useQuery<PageNotFoundAuthState>({
    queryKey: QUERY_KEYS.auth.user(),
    queryFn: async () => {
      try {
        const user = await kangurPlatform.auth.me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  return (
    <div
      className={
        embedded
          ? 'kangur-premium-bg min-h-full flex items-center justify-center p-6'
          : 'kangur-premium-bg min-h-screen flex items-center justify-center p-6'
      }
      data-testid='page-not-found-shell'
    >
      <div className='max-w-md w-full'>
        <div className='text-center space-y-6'>
          <div className='space-y-2'>
            <h1 className='text-7xl font-light text-slate-300'>404</h1>
            <KangurDivider
              accent='slate'
              className='mx-auto'
              data-testid='page-not-found-divider'
              size='md'
            />
          </div>

          <div className='space-y-3'>
            <h2 className='text-2xl font-medium text-slate-800'>Page Not Found</h2>
            <p className='text-slate-600 leading-relaxed'>
              The page <span className='font-medium text-slate-700'>"{pageName}"</span> could not be
              found in this application.
            </p>
          </div>

          {isFetched && authData?.isAuthenticated && authData.user?.role === 'admin' && (
            <KangurSummaryPanel
              accent='amber'
              className='mt-8 text-left'
              data-testid='page-not-found-admin-note'
              description='This could mean that the AI has not implemented this page yet.'
              label={
                <span className='inline-flex items-center gap-2'>
                  <KangurAccentDot
                    accent='amber'
                    aria-hidden='true'
                    data-testid='page-not-found-admin-dot'
                    size='sm'
                  />
                  Admin Note
                </span>
              }
              labelAccent='amber'
              padding='md'
            />
          )}

          <div className='pt-6'>
            <KangurButton
              onClick={() => {
                const homeHref = getKangurHomeHref(basePath);
                routeTransition?.startRouteTransition({
                  href: homeHref,
                  pageKey: 'Game',
                });
                router.push(homeHref);
              }}
              size='lg'
              type='button'
              variant='primary'
            >
              <Home className='w-4 h-4' />
              Go Home
            </KangurButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageNotFound;
