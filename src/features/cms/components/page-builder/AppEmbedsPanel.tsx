'use client';

import Link from 'next/link';
import React from 'react';

import { APP_EMBED_OPTIONS, type AppEmbedId } from '@/features/app-embeds/lib/constants';
import { AppEmbedsProvider, useAppEmbeds } from '@/features/app-embeds/providers/AppEmbedsProvider';
import { Button, Checkbox, SectionHeader, SectionPanel } from '@/shared/ui';

export function AppEmbedsPanel({ showHeader = true }: { showHeader?: boolean } = {}): React.ReactNode {
  return (
    <AppEmbedsProvider>
      <AppEmbedsPanelContent showHeader={showHeader} />
    </AppEmbedsProvider>
  );
}

function AppEmbedsPanelContent({ showHeader }: { showHeader: boolean }): React.ReactNode {
  const { enabled, toggleOption, save, isLoading, isSaving } = useAppEmbeds();

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center p-4 text-xs text-gray-500'>
        Loading app embeds...
      </div>
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {showHeader && (
        <SectionHeader
          title='App embeds'
          subtitle='Enable apps you can embed into CMS layouts.'
          size='xs'
          className='p-3 border-b border-border'
        />
      )}
      <div className='flex-1 overflow-y-auto p-3'>
        <div className='space-y-3'>
          {APP_EMBED_OPTIONS.map((option: { id: AppEmbedId; label: string; description: string; settingsRoute: string }) => {
            const isEnabled = enabled.has(option.id);
            return (
              <SectionPanel
                key={option.id}
                variant='subtle'
                className='p-3'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <div className='text-sm font-medium text-gray-100'>{option.label}</div>
                    <div className='text-xs text-gray-500'>{option.description}</div>
                  </div>
                  <label className='flex items-center gap-2 text-xs text-gray-300'>
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={(checked: boolean | 'indeterminate') => toggleOption(option.id, checked === true)}
                    />
                    Enabled
                  </label>
                </div>
                <div className='mt-2'>
                  <Link
                    href={option.settingsRoute}
                    className='text-xs text-blue-300 hover:text-blue-200'
                  >
                    Open settings
                  </Link>
                </div>
              </SectionPanel>
            );
          })}
        </div>
      </div>
      <div className='border-t border-border px-4 py-3'>
        <Button
          onClick={() => void save()}
          disabled={isSaving}
          className='w-full bg-blue-600 text-white hover:bg-blue-700'
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}