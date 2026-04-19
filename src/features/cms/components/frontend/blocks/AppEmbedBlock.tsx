'use client';

import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import type { Session } from 'next-auth';
import React from 'react';

import {
  DEFAULT_APP_EMBED_BASE_PATH,
  DEFAULT_APP_EMBED_ENTRY_PAGE,
  DEFAULT_APP_EMBED_HEIGHT,
  DEFAULT_APP_EMBED_ID,
  getAppEmbedOption,
} from '@/shared/lib/app-embeds';
import { isSuperAdminSession } from '@/shared/lib/auth/elevated-session-user';
import { useOptionalNextAuthSession } from '@/shared/lib/auth/useOptionalNextAuthSession';
import {
  buildKangurEmbeddedBasePath,
  getKangurPageSlug,
  getKangurInternalQueryParamKeys,
  KANGUR_MAIN_PAGE_KEY,
  KANGUR_PAGE_TO_SLUG,
  readKangurUrlParam,
  KANGUR_EMBED_QUERY_PARAM,
  resolveKangurPageKeyFromSlug,
} from '@/shared/lib/kangur-cms-bridge';
import { Card } from '@/shared/ui/primitives.public';

import { useRequiredBlockRenderContext, useRequiredBlockSettings } from './BlockContext';

const LazyKangurFeaturePage = dynamic(
  () => import('@/features/kangur/ui/KangurFeaturePage').then((mod) => mod.KangurFeaturePage),
  {
    ssr: false,
    loading: () => null,
  }
);

const resolveAppEmbedHeight = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_APP_EMBED_HEIGHT;
  }
  return Math.max(240, value);
};

const resolveKangurSlug = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();
  const directPageSlug = KANGUR_PAGE_TO_SLUG[trimmed];
  if (directPageSlug) {
    return directPageSlug;
  }

  const directMatch = Object.entries(KANGUR_PAGE_TO_SLUG).find(
    ([, slug]) => slug.toLowerCase() === trimmed.toLowerCase()
  );
  if (directMatch) {
    return directMatch[1];
  }

  return null;
};

const resolveKangurEntrySlug = (entryPage: unknown): string[] => {
  const resolvedSlug = resolveKangurSlug(entryPage);
  if (!resolvedSlug) {
    return [];
  }

  if (resolvedSlug === getKangurPageSlug(KANGUR_MAIN_PAGE_KEY)) {
    return [];
  }

  return [resolvedSlug];
};

const SUPER_ADMIN_ONLY_KANGUR_PAGE_KEYS = new Set(['GamesLibrary']);

const canAccessKangurPage = (
  pageKey: string | null | undefined,
  session: Session | null | undefined
): boolean => {
  const normalizedPageKey = pageKey?.trim();
  return !normalizedPageKey ||
    !SUPER_ADMIN_ONLY_KANGUR_PAGE_KEYS.has(normalizedPageKey) ||
    isSuperAdminSession(session);
};

const canAccessKangurSlugSegments = (
  slugSegments: readonly string[] = [],
  session: Session | null | undefined
): boolean => {
  const leadSlug = slugSegments[0]?.trim() || null;
  const pageKey = resolveKangurPageKeyFromSlug(leadSlug);
  return canAccessKangurPage(pageKey, session);
};

const resolveAccessibleKangurEmbedSlug = (input: {
  requestedSlug: string | null;
  entryPage: unknown;
  session: import('next-auth').Session | null | undefined;
}): string[] => {
  const { requestedSlug, entryPage, session } = input;
  const fallbackSlug = resolveKangurEntrySlug(entryPage);
  const requestedActiveSlug =
    requestedSlug === null ? fallbackSlug : requestedSlug ? [requestedSlug] : [];

  if (canAccessKangurSlugSegments(requestedActiveSlug, session)) {
    return requestedActiveSlug;
  }

  return canAccessKangurSlugSegments(fallbackSlug, session) ? fallbackSlug : [];
};

export function AppEmbedBlock(): React.ReactNode {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settings = useRequiredBlockSettings();
  const { block } = useRequiredBlockRenderContext();
  const { data: session } = useOptionalNextAuthSession();
  const rawAppId = settings['appId'];
  const appOption = getAppEmbedOption(
    typeof rawAppId === 'string' ? rawAppId : DEFAULT_APP_EMBED_ID
  );
  const title = (settings['title'] as string) || '';
  const embedUrl = (settings['embedUrl'] as string) || '';
  const height = resolveAppEmbedHeight(settings['height']);
  const configuredBasePath = (settings['basePath'] as string) || DEFAULT_APP_EMBED_BASE_PATH;
  const entryPage = (settings['entryPage'] as string) || DEFAULT_APP_EMBED_ENTRY_PAGE;
  const appLabel = appOption?.label ?? 'App';
  const heading = title || appLabel;
  const hostPageSearchParams = new URLSearchParams(searchParams.toString());
  const currentBlockEmbeddedBasePath = buildKangurEmbeddedBasePath('/', block.id);

  getKangurInternalQueryParamKeys(currentBlockEmbeddedBasePath).forEach((key) => {
    hostPageSearchParams.delete(key);
  });
  getKangurInternalQueryParamKeys().forEach((key) => {
    hostPageSearchParams.delete(key);
  });

  const currentHostHref = `${pathname || '/'}${
    hostPageSearchParams.toString().length > 0 ? `?${hostPageSearchParams.toString()}` : ''
  }`;
  const hostPath = configuredBasePath.trim().length > 0 ? configuredBasePath : currentHostHref;
  const embeddedBasePath = buildKangurEmbeddedBasePath(hostPath, block.id);
  const requestedSlug = readKangurUrlParam(
    searchParams,
    KANGUR_EMBED_QUERY_PARAM,
    embeddedBasePath
  );
  const activeSlug = resolveAccessibleKangurEmbedSlug({
    requestedSlug,
    entryPage,
    session,
  });

  return (
    <Card
      variant='subtle'
      padding='md'
      className='cms-hover-card w-full border-border/40 bg-card/40'
    >
      <div className='mb-3 flex items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-[var(--cms-appearance-page-text)]'>
            {heading}
          </div>
          <div className='cms-appearance-muted-text text-[10px] uppercase tracking-wide'>
            {appOption?.renderMode === 'internal-app'
              ? `Internal app mount${hostPath ? ` · ${hostPath}` : ''}`
              : 'App embed'}
          </div>
        </div>
      </div>
      {appOption?.id === 'kangur' && appOption.renderMode === 'internal-app' ? (
        <div
          className='cms-appearance-surface relative overflow-hidden rounded-[28px] border'
          style={{ minHeight: height }}
        >
          <LazyKangurFeaturePage slug={activeSlug} basePath={embeddedBasePath} embedded />
        </div>
      ) : embedUrl ? (
        <iframe
          src={embedUrl}
          title={heading}
          className='w-full rounded-md border border-border/40 bg-black'
          style={{ height }}
        />
      ) : (
        <Card
          variant='subtle-compact'
          padding='none'
          className='cms-appearance-subtle-surface cms-appearance-muted-text flex items-center justify-center border-dashed px-4 text-center text-xs'
          style={{ minHeight: height }}
        >
          {appOption?.renderMode === 'internal-app'
            ? `This ${appLabel} block is configured for an internal app mount.`
            : `Provide an embed URL to render the ${appLabel} app here.`}
        </Card>
      )}
    </Card>
  );
}
