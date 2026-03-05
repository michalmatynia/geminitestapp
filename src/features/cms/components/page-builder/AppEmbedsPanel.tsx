'use client';

import Link from 'next/link';
import React from 'react';

import { APP_EMBED_OPTIONS } from '@/features/app-embeds/lib/constants';
import { AppEmbedsProvider, useAppEmbeds } from '@/features/app-embeds/providers/AppEmbedsProvider';
import { Button, Checkbox, SectionHeader, SimpleSettingsList, LoadingState } from '@/shared/ui';

export function AppEmbedsPanel({
  showHeader = true,
}: { showHeader?: boolean } = {}): React.ReactNode {
  const shouldShowHeader = showHeader;

  return (
    <AppEmbedsProvider>
      <AppEmbedsPanelContent showHeader={shouldShowHeader} />
    </AppEmbedsProvider>
  );
}

function AppEmbedsPanelContent({ showHeader }: { showHeader: boolean }): React.ReactNode {
  const { enabled, toggleOption, save, isLoading, isSaving } = useAppEmbeds();

  if (isLoading) {
    return <LoadingState message='Loading app embeds...' className='h-full' />;
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
        <SimpleSettingsList
          items={APP_EMBED_OPTIONS.map((option) => ({
            id: option.id,
            title: option.label,
            description: option.description,
            original: option,
          }))}
          renderActions={(item) => {
            const isEnabled = enabled.has(item.id);
            return (
              <div className='flex items-center gap-4'>
                <label className='flex items-center gap-2 text-xs text-gray-300 cursor-pointer'>
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      toggleOption(item.id, checked === true)
                    }
                  />
                  Enabled
                </label>
                <Link
                  href={item.original.settingsRoute}
                  className='text-xs text-blue-300 hover:text-blue-200 underline underline-offset-2'
                >
                  Settings
                </Link>
              </div>
            );
          }}
        />
      </div>
      <div className='border-t border-border px-4 py-3'>
        <Button
          onClick={() => void save()}
          loading={isSaving}
          loadingText='Saving...'
          className='w-full'
        >
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
