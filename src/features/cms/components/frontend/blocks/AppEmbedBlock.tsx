'use client';

import React from 'react';

import {
  DEFAULT_APP_EMBED_BASE_PATH,
  DEFAULT_APP_EMBED_ENTRY_PAGE,
  DEFAULT_APP_EMBED_HEIGHT,
  DEFAULT_APP_EMBED_ID,
  getAppEmbedOption,
} from '@/features/app-embeds/lib/constants';
import { KANGUR_MAIN_PAGE_KEY, KANGUR_PAGE_TO_SLUG, getKangurPageSlug } from '@/shared/contracts/kangur';
import { KangurFeaturePage } from '@/features/kangur/ui/KangurFeaturePage';
import { Card } from '@/shared/ui';

import { useRequiredBlockSettings } from './BlockContext';

const resolveAppEmbedHeight = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_APP_EMBED_HEIGHT;
  }
  return Math.max(240, value);
};

const resolveKangurEntrySlug = (entryPage: unknown): string[] => {
  if (typeof entryPage !== 'string' || entryPage.trim().length === 0) {
    return [];
  }

  const trimmed = entryPage.trim();
  if (trimmed === KANGUR_MAIN_PAGE_KEY) {
    return [];
  }

  const pageSlug = KANGUR_PAGE_TO_SLUG[trimmed];
  if (pageSlug) {
    return pageSlug === KANGUR_PAGE_TO_SLUG[KANGUR_MAIN_PAGE_KEY] ? [] : [pageSlug];
  }

  const directMatch = Object.entries(KANGUR_PAGE_TO_SLUG).find(
    ([, slug]) => slug.toLowerCase() === trimmed.toLowerCase()
  );
  if (directMatch) {
    return directMatch[0] === KANGUR_MAIN_PAGE_KEY ? [] : [directMatch[1]];
  }

  return [];
};

export function AppEmbedBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const rawAppId = settings['appId'];
  const appOption = getAppEmbedOption(typeof rawAppId === 'string' ? rawAppId : DEFAULT_APP_EMBED_ID);
  const title = (settings['title'] as string) || '';
  const embedUrl = (settings['embedUrl'] as string) || '';
  const height = resolveAppEmbedHeight(settings['height']);
  const basePath = (settings['basePath'] as string) || DEFAULT_APP_EMBED_BASE_PATH;
  const entryPage = (settings['entryPage'] as string) || DEFAULT_APP_EMBED_ENTRY_PAGE;
  const appLabel = appOption?.label ?? 'App';
  const heading = title || appLabel;

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
              ? `Internal app mount${basePath ? ` · ${basePath}` : ''}`
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
            slug={resolveKangurEntrySlug(entryPage)}
            basePath={basePath}
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
