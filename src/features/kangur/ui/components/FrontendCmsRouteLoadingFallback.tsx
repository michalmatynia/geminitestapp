import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import { cn } from '@/shared/utils/ui-utils';

import type { CSSProperties } from 'react';

export type FrontendCmsRouteLoadingVariant =
  | 'home'
  | 'page'
  | 'preview'
  | 'preview-runtime';

const SHELL_SURFACE_STYLE: CSSProperties = {
  backgroundColor: 'var(--cms-appearance-page-background, #f8fafc)',
  color: 'var(--cms-appearance-page-text, #0f172a)',
};

const PRIMARY_BLOCK_STYLE: CSSProperties = {
  backgroundColor:
    'color-mix(in srgb, var(--cms-appearance-page-text, #0f172a) 11%, transparent)',
};

const SOFT_BLOCK_STYLE: CSSProperties = {
  backgroundColor:
    'color-mix(in srgb, var(--cms-appearance-page-text, #0f172a) 7%, transparent)',
};

const ACCENT_BLOCK_STYLE: CSSProperties = {
  backgroundColor:
    'color-mix(in srgb, var(--cms-appearance-page-accent, #6366f1) 18%, transparent)',
};

export const resolveFrontendCmsRouteLoadingVariant = (
  pathname: string | null | undefined
): FrontendCmsRouteLoadingVariant => {
  const normalizedPathname = stripSiteLocalePrefix(pathname?.trim() || '/');

  if (!normalizedPathname || normalizedPathname === '/') {
    return 'home';
  }

  if (normalizedPathname.startsWith('/preview/')) {
    return 'preview';
  }

  return 'page';
};

function CmsSkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}): React.JSX.Element {
  return (
    <div
      className={cn('animate-pulse rounded-[24px]', className)}
      style={style ?? PRIMARY_BLOCK_STYLE}
    />
  );
}

function CmsSkeletonHeader(): React.JSX.Element {
  return (
    <div className='border-b px-4 py-4 md:px-6' style={SOFT_BLOCK_STYLE}>
      <div className='mx-auto flex w-full max-w-6xl items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <CmsSkeletonBlock className='h-11 w-11 rounded-full' style={ACCENT_BLOCK_STYLE} />
          <CmsSkeletonBlock className='h-6 w-32 rounded-full' />
        </div>
        <div className='hidden items-center gap-3 md:flex'>
          <CmsSkeletonBlock className='h-10 w-24 rounded-full' />
          <CmsSkeletonBlock className='h-10 w-28 rounded-full' />
          <CmsSkeletonBlock className='h-10 w-20 rounded-full' />
        </div>
      </div>
    </div>
  );
}

function CmsHomeRouteSkeleton(): React.JSX.Element {
  return (
    <div className='mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:py-12'>
      <div className='space-y-6'>
        <CmsSkeletonBlock className='h-12 w-40 rounded-full' style={ACCENT_BLOCK_STYLE} />
        <CmsSkeletonBlock className='h-[18rem] w-full rounded-[36px]' />
        <div className='grid gap-4 md:grid-cols-3'>
          <CmsSkeletonBlock className='h-32 w-full' />
          <CmsSkeletonBlock className='h-32 w-full' />
          <CmsSkeletonBlock className='h-32 w-full' />
        </div>
      </div>
      <div className='space-y-4'>
        <CmsSkeletonBlock className='h-64 w-full rounded-[32px]' />
        <CmsSkeletonBlock className='h-32 w-full' />
        <CmsSkeletonBlock className='h-32 w-full' />
      </div>
    </div>
  );
}

function CmsPageRouteSkeleton(): React.JSX.Element {
  return (
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 lg:py-12'>
      <CmsSkeletonBlock className='h-10 w-36 rounded-full' style={ACCENT_BLOCK_STYLE} />
      <CmsSkeletonBlock className='h-16 w-3/4 rounded-[28px]' />
      <CmsSkeletonBlock className='h-6 w-full rounded-full' style={SOFT_BLOCK_STYLE} />
      <CmsSkeletonBlock className='h-[22rem] w-full rounded-[36px]' />
      <div className='grid gap-4 md:grid-cols-2'>
        <CmsSkeletonBlock className='h-44 w-full' />
        <CmsSkeletonBlock className='h-44 w-full' />
      </div>
      <CmsSkeletonBlock className='h-56 w-full rounded-[32px]' />
    </div>
  );
}

function CmsPreviewRouteSkeleton(): React.JSX.Element {
  return (
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 lg:py-12'>
      <div className='flex items-center gap-3'>
        <CmsSkeletonBlock className='h-9 w-28 rounded-full' style={ACCENT_BLOCK_STYLE} />
        <CmsSkeletonBlock className='h-5 w-40 rounded-full' />
      </div>
      <CmsSkeletonBlock className='h-14 w-2/3 rounded-[28px]' />
      <CmsSkeletonBlock className='h-[24rem] w-full rounded-[36px]' />
      <div className='grid gap-4 md:grid-cols-3'>
        <CmsSkeletonBlock className='h-36 w-full' />
        <CmsSkeletonBlock className='h-36 w-full' />
        <CmsSkeletonBlock className='h-36 w-full' />
      </div>
    </div>
  );
}

function CmsPreviewRuntimeRouteSkeleton(): React.JSX.Element {
  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 md:px-6 lg:py-12'>
      <CmsSkeletonBlock className='h-10 w-72 rounded-[24px]' style={ACCENT_BLOCK_STYLE} />
      <CmsSkeletonBlock className='h-5 w-full rounded-full' style={SOFT_BLOCK_STYLE} />
      <CmsSkeletonBlock className='h-5 w-4/5 rounded-full' style={SOFT_BLOCK_STYLE} />
      <div className='flex gap-2'>
        <CmsSkeletonBlock className='h-10 w-28 rounded-[18px]' />
        <CmsSkeletonBlock className='h-10 w-28 rounded-[18px]' />
      </div>
      <CmsSkeletonBlock className='h-[20rem] w-full rounded-[28px]' />
    </div>
  );
}

const ROUTE_STATUS_LABELS: Record<FrontendCmsRouteLoadingVariant, string> = {
  home: 'Loading storefront home',
  page: 'Loading page',
  preview: 'Loading preview',
  'preview-runtime': 'Loading preview runtime',
};

export function FrontendCmsRouteLoadingFallback({
  pathname,
  variant,
}: {
  pathname: string | null | undefined;
  variant?: FrontendCmsRouteLoadingVariant;
}): React.JSX.Element {
  const resolvedVariant = variant ?? resolveFrontendCmsRouteLoadingVariant(pathname);

  return (
    <div
      className='min-h-screen w-full'
      data-testid='frontend-route-loading-fallback'
      data-frontend-route-loading-variant={resolvedVariant}
      role='status'
      aria-live='polite'
      aria-atomic='true'
      aria-label={ROUTE_STATUS_LABELS[resolvedVariant]}
      style={SHELL_SURFACE_STYLE}
    >
      <CmsSkeletonHeader />
      <div data-testid={`frontend-route-loading-fallback-${resolvedVariant}`}>
        {resolvedVariant === 'home' ? <CmsHomeRouteSkeleton /> : null}
        {resolvedVariant === 'page' ? <CmsPageRouteSkeleton /> : null}
        {resolvedVariant === 'preview' ? <CmsPreviewRouteSkeleton /> : null}
        {resolvedVariant === 'preview-runtime' ? <CmsPreviewRuntimeRouteSkeleton /> : null}
      </div>
    </div>
  );
}
