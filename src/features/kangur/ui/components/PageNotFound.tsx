'use client';

import { useQuery } from '@tanstack/react-query';
import { Home } from 'lucide-react';
import { useMemo } from 'react';

import {
  getKangurHomeHref,
  getKangurEmbeddedHostPath,
  KANGUR_EMBED_QUERY_PARAM,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurAccentDot,
  KangurButton,
  KangurDivider,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KANGUR_INLINE_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const kangurPlatform = getKangurPlatform();

type PageNotFoundAuthState = {
  user: { role?: string } | null;
  isAuthenticated: boolean;
};

export function PageNotFound(): React.JSX.Element {
  const routeNavigator = useKangurRouteNavigator();
  const { requestedPath, basePath } = useKangurRouting();

  const pageName = useMemo(() => {
    const embeddedHostPath = getKangurEmbeddedHostPath(basePath);
    if (embeddedHostPath) {
      const fallbackName = requestedPath?.replace(/^\/+/, '') || 'unknown';
      return withKangurClientErrorSync(
        {
          source: 'page-not-found',
          action: 'resolve-embedded-page',
          description: 'Resolve embedded Kangur page name for 404 banner.',
          context: {
            basePath,
            requestedPath,
            embeddedHostPath,
          },
        },
        () => {
          const parsed = new URL(requestedPath || embeddedHostPath, 'https://kangur.local');
          return (
            readKangurUrlParam(parsed.searchParams, KANGUR_EMBED_QUERY_PARAM, basePath) || 'unknown'
          );
        },
        { fallback: fallbackName }
      );
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
    queryFn: () =>
      withKangurClientError<PageNotFoundAuthState>(
        {
          source: 'page-not-found',
          action: 'load-auth-state',
          description: 'Load auth state for the Kangur 404 page.',
        },
        async () => {
          const user = (await kangurPlatform.auth.me()) as PageNotFoundAuthState['user'];
          return { user, isAuthenticated: Boolean(user) };
        },
        { fallback: { user: null, isAuthenticated: false } }
      ),
  });

  return (
    <KangurStandardPageLayout
      id='kangur-page-not-found'
      shellClassName='p-6 kangur-premium-bg'
      // Visual contract: data-testid='page-not-found-shell'
      shellProps={{ 'data-testid': 'page-not-found-shell' }}
      skipLinkTargetId='kangur-page-not-found-main'
      containerProps={{
        as: 'main',
        className: 'flex w-full flex-1 items-center justify-center',
        id: 'kangur-page-not-found-main',
      }}
    >
      <div className='max-w-md w-full'>
        <div className='text-center space-y-6'>
          <div className='space-y-2'>
            <h1 className='text-7xl font-light [color:color-mix(in_srgb,var(--kangur-page-muted-text)_54%,white)]'>
              404
            </h1>
            <KangurDivider
              accent='slate'
              className='mx-auto'
              data-testid='page-not-found-divider'
              size='md'
            />
          </div>

          <div className='space-y-3'>
            <h2 className='text-2xl font-medium [color:var(--kangur-page-text)]'>
              Page Not Found
            </h2>
            <p className='leading-relaxed [color:var(--kangur-page-muted-text)]'>
              The page{' '}
              <span className='font-medium [color:var(--kangur-page-text)]'>"{pageName}"</span>{' '}
              could not be found in this application.
            </p>
          </div>

          {isFetched && authData?.isAuthenticated && authData.user?.role === 'admin' && (
            <KangurSummaryPanel
              accent='amber'
              className='mt-8 text-left'
              data-testid='page-not-found-admin-note'
              description='This could mean that the AI has not implemented this page yet.'
              label={
                <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
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
                routeNavigator.push(getKangurHomeHref(basePath), {
                  acknowledgeMs: 110,
                  pageKey: 'Game',
                  sourceId: 'page-not-found:home',
                });
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
    </KangurStandardPageLayout>
  );
}

export default PageNotFound;
