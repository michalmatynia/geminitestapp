'use client';

import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';

import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Card, useToast } from '@/shared/ui/primitives.public';
import { PanelHeader } from '@/shared/ui/templates.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export const PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY = 'page_builder_show_extract_placeholder';
export const PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY =
  'page_builder_show_section_drop_placeholder';

export function PageBuilderSettingsPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const settingsMap = settingsStore.map;
  const isLoading = settingsStore.isLoading;
  const updateSettingsBulk = useUpdateSettingsBulk();
  const { toast } = useToast();

  // Get server values
  const serverExtractValue = settingsMap?.get(PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY);
  const serverSectionDropValue = settingsMap?.get(PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY);

  // Local state for user edits (null means use server value)
  const [localExtractPlaceholder, setLocalExtractPlaceholder] = useState<boolean | null>(null);
  const [localSectionDropPlaceholder, setLocalSectionDropPlaceholder] = useState<boolean | null>(
    null
  );

  // Compute displayed values: use local if edited, otherwise derive from server
  const showExtractPlaceholder = localExtractPlaceholder ?? serverExtractValue === 'true';
  const showSectionDropPlaceholder =
    localSectionDropPlaceholder ?? serverSectionDropValue !== 'false';

  const isDirty = localExtractPlaceholder !== null || localSectionDropPlaceholder !== null;

  const handleSave = async (): Promise<void> => {
    try {
      await updateSettingsBulk.mutateAsync([
        {
          key: PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY,
          value: showExtractPlaceholder ? 'true' : 'false',
        },
        {
          key: PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY,
          value: showSectionDropPlaceholder ? 'true' : 'false',
        },
      ]);
      // Reset local state after successful save
      setLocalExtractPlaceholder(null);
      setLocalSectionDropPlaceholder(null);
      toast('Settings saved successfully.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'PageBuilderSettingsPage',
        action: 'saveSettings',
      });
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      toast(message, { variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <LoadingState message='Loading settings...' />
      </div>
    );
  }

  return (
    <div className='space-y-6 p-6'>
      <PanelHeader
        title='Page Builder Settings'
        description='Configure settings for the CMS Page Builder.'
        actions={[
          {
            key: 'save',
            label: updateSettingsBulk.isPending ? 'Saving...' : 'Save Settings',
            onClick: handleSave,
            disabled: !isDirty || updateSettingsBulk.isPending,
            icon: updateSettingsBulk.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : undefined,
            variant: 'default',
          },
        ]}
      />

      <Card className='border-border/50 bg-gray-800/30 p-6'>
        <h2 className='mb-4 text-lg font-medium text-white'>Drag & Drop Placeholders</h2>
        <div className='space-y-2'>
          <ToggleRow
            checked={showSectionDropPlaceholder}
            onCheckedChange={setLocalSectionDropPlaceholder}
            label='Show section drop placeholder'
            description='When enabled, purple "Drop here" placeholders will appear when dragging sections between zones.'
            variant='checkbox'
          />

          <ToggleRow
            checked={showExtractPlaceholder}
            onCheckedChange={setLocalExtractPlaceholder}
            label='Show extract placeholder when dragging blocks'
            description='When enabled, a "Drop here to extract" placeholder will appear when dragging promotable blocks (ImageElement, TextElement, ButtonElement) to allow extracting them as standalone sections.'
            variant='checkbox'
          />
        </div>
      </Card>
    </div>
  );
}
