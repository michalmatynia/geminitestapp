'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  KANGUR_NARRATOR_ENGINE_OPTIONS,
  KANGUR_NARRATOR_SETTINGS_KEY,
  parseKangurNarratorSettings,
  type KangurNarratorEngine,
} from '@/features/kangur/settings';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, FormSection, PageLayout, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { serializeSetting } from '@/shared/utils/settings-json';

export function AdminKangurSettingsPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);
  const persistedSettings = useMemo(
    () => parseKangurNarratorSettings(rawNarratorSettings),
    [rawNarratorSettings]
  );
  const [engine, setEngine] = useState<KangurNarratorEngine>(persistedSettings.engine);

  useEffect(() => {
    setEngine(persistedSettings.engine);
  }, [persistedSettings.engine]);

  const isDirty = engine !== persistedSettings.engine;

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: KANGUR_NARRATOR_SETTINGS_KEY,
        value: serializeSetting({ engine }),
      });
      toast('Kangur narrator settings saved.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save Kangur narrator settings.', {
        variant: 'error',
      });
    }
  };

  return (
    <PageLayout
      title='Kangur Settings'
      description='Manage the narrator engine used across Kangur lessons and exercises.'
      eyebrow={
        <Link href='/admin/kangur' className='text-blue-300 hover:text-blue-200'>
          ← Back to Kangur
        </Link>
      }
      containerClassName='container mx-auto py-10'
    >
      <FormSection
        title='Narrator Engine'
        description='This applies globally to every learner-facing Kangur lesson and exercise.'
        className='p-6'
      >
        <div className='grid gap-4 md:grid-cols-2'>
          {KANGUR_NARRATOR_ENGINE_OPTIONS.map((option) => {
            const checked = engine === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-4 transition',
                  checked
                    ? 'border-indigo-400 bg-indigo-50/80 shadow-sm'
                    : 'border-border bg-card hover:border-indigo-300/60 hover:bg-card/80'
                )}
              >
                <div className='flex items-start gap-3'>
                  <input
                    type='radio'
                    name='kangur-narrator-engine'
                    value={option.value}
                    checked={checked}
                    onChange={() => {
                      setEngine(option.value);
                    }}
                    className='mt-1 h-4 w-4 accent-indigo-600'
                  />
                  <div>
                    <div className='font-semibold text-foreground'>{option.label}</div>
                    <div className='mt-1 text-sm text-muted-foreground'>{option.description}</div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div className='mt-6 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground'>
          Lessons and exercises keep the play and pause controls, but the engine choice is no longer
          shown there. Change it here once and the whole Kangur app follows it.
        </div>

        <div className='mt-6 flex items-center justify-between border-t border-border pt-6'>
          <p className='text-xs text-muted-foreground'>
            Current saved mode: <span className='font-semibold text-foreground'>{persistedSettings.engine}</span>
          </p>
          <Button onClick={() => void handleSave()} disabled={!isDirty || updateSetting.isPending}>
            {updateSetting.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </FormSection>
    </PageLayout>
  );
}
