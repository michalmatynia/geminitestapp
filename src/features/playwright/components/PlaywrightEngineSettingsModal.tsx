'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';

import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';
import { AppModal, Button, LoadingState } from '@/shared/ui';

import { PLAYWRIGHT_SETTINGS_HREF } from './PlaywrightEngineLogoButton';

export interface PlaywrightEngineSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function PlaywrightEngineSettingsModal({
  open,
  onClose,
}: PlaywrightEngineSettingsModalProps): React.JSX.Element {
  const personasQuery = usePlaywrightPersonas({ enabled: open });

  return (
    <AppModal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      onClose={onClose}
      title='Playwright Engine'
      subtitle='Browser automation engine powering programmable captures and AI Path runs.'
      size='sm'
    >
      <div className='space-y-4'>
        <div className='flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Playwright Personas</div>
            <div className='text-xs text-muted-foreground'>
              {personasQuery.isLoading
                ? 'Loading…'
                : `${personasQuery.data?.length ?? 0} persona${(personasQuery.data?.length ?? 0) === 1 ? '' : 's'} configured`}
            </div>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              window.open(PLAYWRIGHT_SETTINGS_HREF, '_self');
            }}
          >
            <ExternalLink className='mr-1.5 h-3 w-3' />
            Manage
          </Button>
        </div>

        {personasQuery.isLoading ? (
          <LoadingState
            message='Loading personas…'
            size='sm'
            className='rounded-xl border border-border/60 bg-background/40 py-3'
          />
        ) : personasQuery.error ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200'>
            Could not load personas. Check{' '}
            <a
              href={PLAYWRIGHT_SETTINGS_HREF}
              className='underline underline-offset-2 hover:text-amber-100'
            >
              Playwright settings
            </a>{' '}
            to manage them.
          </div>
        ) : (personasQuery.data?.length ?? 0) > 0 ? (
          <ul className='space-y-1.5'>
            {(personasQuery.data ?? []).map((persona) => (
              <li
                key={persona.id}
                className='flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-xs'
              >
                <span
                  className='inline-flex size-5 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-950/50 text-[8px] font-black uppercase text-cyan-300'
                  aria-hidden='true'
                >
                  PW
                </span>
                <span className='flex-1 truncate font-medium text-foreground'>{persona.name}</span>
                <span className='text-muted-foreground'>
                  {persona.settings.headless ? 'Headless' : 'Headful'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
            No personas configured yet.{' '}
            <a
              href={PLAYWRIGHT_SETTINGS_HREF}
              className='font-medium text-foreground underline underline-offset-2 hover:text-white'
            >
              Add one in Playwright settings.
            </a>
          </div>
        )}

        <div className='flex justify-end border-t border-border/40 pt-3'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              window.open(PLAYWRIGHT_SETTINGS_HREF, '_self');
            }}
          >
            Open full Playwright settings
            <ExternalLink className='ml-1.5 h-3 w-3' />
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
