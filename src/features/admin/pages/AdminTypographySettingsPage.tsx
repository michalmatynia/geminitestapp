'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  APP_FONT_SET_SETTING_KEY,
  APP_FONT_SETS,
  getAppFontSet,
  type AppFontSetId,
} from '@/shared/constants/typography';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  AdminSettingsPageLayout,
  FormActions,
  FormField,
  FormSection,
  Hint,
  LoadingState,
  MetadataItem,
  SelectSimple,
  useToast,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export function AdminTypographySettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const storedId: AppFontSetId = useMemo(() => {
    const raw = settingsQuery.data?.get(APP_FONT_SET_SETTING_KEY);
    return getAppFontSet(raw).id;
  }, [settingsQuery.data]);

  const [selected, setSelected] = useState<AppFontSetId>(storedId);

  useEffect(() => {
    setSelected(storedId);
  }, [storedId]);

  const isDirty = selected !== storedId;
  const current = useMemo(() => getAppFontSet(selected), [selected]);

  const handleSave = (): void => {
    updateSetting.mutate(
      { key: APP_FONT_SET_SETTING_KEY, value: selected },
      {
        onSuccess: (): void => toast('Typography settings saved', { variant: 'success' }),
        onError: (error: Error): void => {
          logClientError(error, {
            context: { source: 'AdminTypographySettingsPage', action: 'save' },
          });
          toast(error.message || 'Failed to save typography settings', { variant: 'error' });
        },
      }
    );
  };

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <AdminSettingsPageLayout
        title='Typography'
        current='Typography'
        description='Choose an app-wide font set. Fonts are served locally from public/fonts.'
      >
        <LoadingState message='Loading typography settings...' />
      </AdminSettingsPageLayout>
    );
  }

  return (
    <AdminSettingsPageLayout
      title='Typography'
      current='Typography'
      description='Choose an app-wide font set. Fonts are served locally from public/fonts.'
    >
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='lg:col-span-2 space-y-6'>
          <FormSection title='Typography Settings' className='p-6'>
            <FormField
              label='Font set'
              description='Fonts are defined in src/app/fonts.css and loaded from public/fonts.'
            >
              <SelectSimple
                size='sm'
                value={selected}
                onValueChange={(val: string) => setSelected(val as AppFontSetId)}
                options={APP_FONT_SETS.map(
                  (set: { id: AppFontSetId; name: string; description: string }) => ({
                    value: set.id,
                    label: set.name,
                    description: set.description,
                  })
                )}
                placeholder='Select a font set'
               ariaLabel='Select a font set' title='Select a font set'/>
            </FormField>

            <FormActions
              onSave={handleSave}
              onCancel={() => setSelected(storedId)}
              saveText='Save Settings'
              cancelText='Reset'
              isDisabled={!isDirty || updateSetting.isPending}
              isSaving={updateSetting.isPending}
              className='border-t border-border pt-6 justify-start'
            />
          </FormSection>
        </div>

        <div>
          <FormSection title='Preview' className='sticky top-6 p-6 space-y-4'>
            <FormSection variant='subtle-compact' className='p-4'>
              <Hint uppercase className='mb-2'>
                Headings
              </Hint>
              <div className='space-y-2'>
                <h3 className='text-xl font-semibold text-white'>Edit Product</h3>
                <h4 className='text-base font-semibold text-white'>Product Settings</h4>
              </div>
            </FormSection>

            <FormSection variant='subtle-compact' className='p-4'>
              <Hint uppercase className='mb-2'>
                Body
              </Hint>
              <p className='text-sm text-gray-200'>
                The quick brown fox jumps over the lazy dog. 0123456789.
              </p>
            </FormSection>

            <FormSection variant='subtle-compact' className='p-4 text-xs text-gray-300 space-y-2'>
              <MetadataItem label='Selected' value={current.id} mono variant='minimal' />
              <MetadataItem label='Heading' value={current.heading} mono variant='minimal' />
              <MetadataItem label='Body' value={current.body} mono variant='minimal' />
            </FormSection>

            <Hint
              variant='info'
              className='rounded-md border border-blue-500/20 bg-blue-500/5 p-3 italic'
              size='xs'
            >
              Tip: If a font file is missing, the app silently falls back to system fonts.
            </Hint>
          </FormSection>
        </div>
      </div>
    </AdminSettingsPageLayout>
  );
}
