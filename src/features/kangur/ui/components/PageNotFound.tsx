'use client';

import { useQuery } from '@tanstack/react-query';
import { Home } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
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

const resolveUnknownPageFallback = (
  requestedPath: string | null | undefined,
  unknownPageLabel: string
): string => requestedPath?.replace(/^\/+/, '') || unknownPageLabel;

const resolveEmbeddedPageName = (input: {
  basePath: string;
  embeddedHostPath: string;
  requestedPath: string | null | undefined;
  unknownPageLabel: string;
}): string =>
  withKangurClientErrorSync(
    {
      source: 'page-not-found',
      action: 'resolve-embedded-page',
      description: 'Resolve embedded Kangur page name for 404 banner.',
      context: {
        basePath: input.basePath,
        requestedPath: input.requestedPath,
        embeddedHostPath: input.embeddedHostPath,
      },
    },
    () => {
      const parsed = new URL(input.requestedPath || input.embeddedHostPath, 'https://kangur.local');
      return (
        readKangurUrlParam(parsed.searchParams, KANGUR_EMBED_QUERY_PARAM, input.basePath) ||
        input.unknownPageLabel
      );
    },
    { fallback: resolveUnknownPageFallback(input.requestedPath, input.unknownPageLabel) }
  );

const resolveRequestedPageName = (input: {
  basePath: string;
  requestedPath: string | null | undefined;
  unknownPageLabel: string;
}): string => {
  if (!input.requestedPath || input.requestedPath.length === 0) {
    return input.unknownPageLabel;
  }
  if (!input.requestedPath.startsWith(input.basePath)) {
    return resolveUnknownPageFallback(input.requestedPath, input.unknownPageLabel);
  }

  const suffix = input.requestedPath.slice(input.basePath.length).replace(/^\/+/, '');
  return suffix || input.unknownPageLabel;
};

export function PageNotFound(): React.JSX.Element {
  const translations = useTranslations('KangurPageNotFound');
  const isCoarsePointer = useKangurCoarsePointer();
  const routeNavigator = useKangurRouteNavigator();
  const { requestedPath, basePath } = useKangurRouting();
  const unknownPageLabel = translations('unknownPage');

  const pageName = useMemo(() => {
    const embeddedHostPath = getKangurEmbeddedHostPath(basePath);
    if (embeddedHostPath) {
      return resolveEmbeddedPageName({
        basePath,
        requestedPath,
        embeddedHostPath,
        unknownPageLabel,
      });
    }

    return resolveRequestedPageName({
      basePath,
      requestedPath,
      unknownPageLabel,
    });
  }, [basePath, requestedPath, unknownPageLabel]);

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
              {translations('title')}
            </h2>
            <p className='leading-relaxed [color:var(--kangur-page-muted-text)]'>
              {translations('description', { pageName })}
            </p>
          </div>

          {isFetched && authData?.isAuthenticated && authData.user?.role === 'admin' && (
            <KangurSummaryPanel
              accent='amber'
              className='mt-8 text-left'
              data-testid='page-not-found-admin-note'
              description={translations('adminNoteDescription')}
              label={
                <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
                  <KangurAccentDot
                    accent='amber'
                    aria-hidden='true'
                    data-testid='page-not-found-admin-dot'
                    size='sm'
                  />
                  {translations('adminNoteLabel')}
                </span>
              }
              labelAccent='amber'
              padding='md'
            />
          )}

          <div className='pt-6'>
            <KangurButton
              className={
                isCoarsePointer
                  ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
                  : undefined
              }
              onClick={() => {
                routeNavigator.push(getKangurHomeHref(basePath), {
                  acknowledgeMs: 0,
                  pageKey: 'Game',
                  sourceId: 'page-not-found:home',
                });
              }}
              size='lg'
              type='button'
              variant='primary'
            >
              <Home aria-hidden='true' className='w-4 h-4' />
              {translations('goHome')}
            </KangurButton>
          </div>
        </div>
      </div>
    </KangurStandardPageLayout>
  );
}

export default PageNotFound;
