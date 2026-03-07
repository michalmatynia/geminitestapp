'use client';

import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  DEFAULT_APP_EMBED_BASE_PATH,
  DEFAULT_APP_EMBED_ENTRY_PAGE,
  DEFAULT_APP_EMBED_HEIGHT,
  DEFAULT_APP_EMBED_ID,
  getAppEmbedOption,
} from '@/features/app-embeds/lib/constants';
import {
  buildKangurEmbeddedBasePath,
  getKangurPageSlug,
  KANGUR_EMBED_QUERY_PARAM,
  KANGUR_INTERNAL_QUERY_PARAM_KEYS,
  KANGUR_MAIN_PAGE_KEY,
  KANGUR_PAGE_TO_SLUG,
} from '@/features/kangur/config/routing';
import { KangurFeaturePage } from '@/features/kangur/public';
import { Card } from '@/shared/ui';

import { useRequiredBlockSettings } from './BlockContext';

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

export function AppEmbedBlock(): React.ReactNode {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settings = useRequiredBlockSettings();
  const rawAppId = settings['appId'];
  const appOption = getAppEmbedOption(typeof rawAppId === 'string' ? rawAppId : DEFAULT_APP_EMBED_ID);
  const title = (settings['title'] as string) || '';
  const embedUrl = (settings['embedUrl'] as string) || '';
  const height = resolveAppEmbedHeight(settings['height']);
  const configuredBasePath = (settings['basePath'] as string) || DEFAULT_APP_EMBED_BASE_PATH;
  const entryPage = (settings['entryPage'] as string) || DEFAULT_APP_EMBED_ENTRY_PAGE;
  const appLabel = appOption?.label ?? 'App';
  const heading = title || appLabel;
  const hostPageSearchParams = new URLSearchParams(searchParams.toString());

  KANGUR_INTERNAL_QUERY_PARAM_KEYS.forEach((key) => {
    hostPageSearchParams.delete(key);
  });

  const currentHostHref = `${pathname || '/'}${
    hostPageSearchParams.toString().length > 0 ? `?${hostPageSearchParams.toString()}` : ''
  }`;
  const hostPath = configuredBasePath.trim().length > 0 ? configuredBasePath : currentHostHref;
  const embeddedBasePath = buildKangurEmbeddedBasePath(hostPath);
  const requestedSlug = searchParams.get(KANGUR_EMBED_QUERY_PARAM);
  const activeSlug =
    requestedSlug === null ? resolveKangurEntrySlug(entryPage) : requestedSlug ? [requestedSlug] : [];

  return (
    <Card
      variant='subtle'
      padding='md'
      className='cms-hover-card w-full border-border/40 bg-card/40'
    >
      <div className='mb-3 flex items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-white'>{heading}</div>
          <div className='text-[10px] uppercase tracking-wide text-gray-500'>
            {appOption?.renderMode === 'internal-app'
              ? `Internal app mount${hostPath ? ` · ${hostPath}` : ''}`
              : 'App embed'}
          </div>
        </div>
      </div>
      {appOption?.id === 'kangur' && appOption.renderMode === 'internal-app' ? (
        <div
          className='relative overflow-hidden rounded-[28px] border border-border/40 bg-white/95'
          style={{ minHeight: height }}
        >
          <KangurFeaturePage
            slug={activeSlug}
            basePath={embeddedBasePath}
            embedded
          />
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
          className='flex items-center justify-center border-dashed border-border/40 bg-card/20 px-4 text-center text-xs text-gray-400'
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
