'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home } from 'lucide-react';

import {
  getKangurEmbeddedHostPath,
  getKangurPageHref,
  KANGUR_EMBED_QUERY_PARAM,
} from '@/features/kangur/config/routing';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { cn } from '@/shared/utils';

const kangurPlatform = getKangurPlatform();

type PageNotFoundAuthState = {
  user: { role?: string } | null;
  isAuthenticated: boolean;
};

export function PageNotFound(): React.JSX.Element {
  const { requestedPath, basePath, embedded } = useKangurRouting();

  const pageName = useMemo(() => {
    const embeddedHostPath = getKangurEmbeddedHostPath(basePath);
    if (embeddedHostPath) {
      try {
        const parsed = new URL(requestedPath || embeddedHostPath, 'https://kangur.local');
        return parsed.searchParams.get(KANGUR_EMBED_QUERY_PARAM) || 'unknown';
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
      className={cn(
        'flex items-center justify-center bg-slate-50 p-6',
        embedded ? 'min-h-full' : 'min-h-screen'
      )}
    >
      <div className='max-w-md w-full'>
        <div className='text-center space-y-6'>
          <div className='space-y-2'>
            <h1 className='text-7xl font-light text-slate-300'>404</h1>
            <div className='h-0.5 w-16 bg-slate-200 mx-auto'></div>
          </div>

          <div className='space-y-3'>
            <h2 className='text-2xl font-medium text-slate-800'>Page Not Found</h2>
            <p className='text-slate-600 leading-relaxed'>
              The page <span className='font-medium text-slate-700'>"{pageName}"</span> could not be
              found in this application.
            </p>
          </div>

          {isFetched && authData?.isAuthenticated && authData.user?.role === 'admin' && (
            <div className='mt-8 p-4 bg-slate-100 rounded-lg border border-slate-200'>
              <div className='flex items-start space-x-3'>
                <div className='flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5'>
                  <div className='w-2 h-2 rounded-full bg-orange-400'></div>
                </div>
                <div className='text-left space-y-1'>
                  <p className='text-sm font-medium text-slate-700'>Admin Note</p>
                  <p className='text-sm text-slate-600 leading-relaxed'>
                    This could mean that the AI has not implemented this page yet.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className='pt-6'>
            <KangurButton
              onClick={() => {
                window.location.href = getKangurPageHref('Game', basePath);
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
