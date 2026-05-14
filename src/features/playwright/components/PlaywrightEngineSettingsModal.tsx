'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';

import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';
import { AppModal } from '@/shared/ui/feedback.public';
import { Button } from '@/shared/ui/primitives.public';
import { PLAYWRIGHT_SETTINGS_HREF } from './PlaywrightEngineLogoButton';
import { PersonaList, ErrorState, LoadingComponent } from './playwright-modal/PersonaComponents';

export interface PlaywrightEngineSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function PlaywrightEngineSettingsModal({
  open,
  onClose,
}: PlaywrightEngineSettingsModalProps): React.JSX.Element {
  const personasQuery = usePlaywrightPersonas({ enabled: open });

  const renderContent = (): React.JSX.Element => {
    if (personasQuery.isLoading) return <LoadingComponent />;
    if (personasQuery.error) return <ErrorState />;
    return <PersonaList personas={personasQuery.data ?? []} />;
  };

  return (
    <AppModal
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
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
          <Button type='button' variant='outline' size='sm' onClick={() => { window.location.href = PLAYWRIGHT_SETTINGS_HREF; }}>
            <ExternalLink className='mr-1.5 h-3 w-3' />
            Manage
          </Button>
        </div>

        {renderContent()}

        <div className='flex justify-end border-t border-border/40 pt-3'>
          <Button type='button' variant='outline' size='sm' onClick={() => { window.location.href = PLAYWRIGHT_SETTINGS_HREF; }}>
            Open full Playwright settings
            <ExternalLink className='ml-1.5 h-3 w-3' />
          </Button>
        </div>
      </div>
    </AppModal>
  );
}


