'use client';

import React from 'react';

import { APP_EMBED_OPTIONS, type AppEmbedId } from '@/features/app-embeds/lib/constants';
import { Card } from '@/shared/ui';

import { useRequiredBlockSettings } from './BlockContext';

export function AppEmbedBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const appId = (settings['appId'] as AppEmbedId) || 'chatbot';
  const title = (settings['title'] as string) || '';
  const embedUrl = (settings['embedUrl'] as string) || '';
  const height = (settings['height'] as number) || 420;
  const appLabel = APP_EMBED_OPTIONS.find((option: { id: AppEmbedId; label: string }) => option.id === appId)?.label ?? 'App';

  return (
    <Card variant='subtle' padding='md' className='cms-hover-card w-full border-border/40 bg-card/40'>
      <div className='mb-3'>
        <div className='text-sm font-semibold text-white'>{title || appLabel}</div>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>App embed</div>
      </div>
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={title || appLabel}
          className='w-full rounded-md border border-border/40 bg-black'
          style={{ height }}
        />
      ) : (
        <Card
          variant='subtle-compact'
          padding='none'
          className='flex items-center justify-center border-dashed border-border/40 bg-card/20 text-xs text-gray-400'
          style={{ height }}
        >
          Provide an embed URL to render the {appLabel} app here.
        </Card>
      )}
    </Card>
  );
}
