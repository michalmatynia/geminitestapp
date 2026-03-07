'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  KANGUR_NARRATOR_ENGINE_OPTIONS,
  KANGUR_NARRATOR_SETTINGS_KEY,
  parseKangurNarratorSettings,
  type KangurNarratorEngine,
} from '@/features/kangur/settings';
import { KANGUR_TTS_VOICE_OPTIONS, type KangurLessonTtsVoice } from '@/features/kangur/tts/contracts';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, FormSection, PageLayout, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { serializeSetting } from '@/shared/utils/settings-json';

const TEST_NARRATOR_TEMPLATE_TEXT = 'A bright classroom welcomes curious minds. Here is a short narration sample to verify the chosen voice.';

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
  const [voice, setVoice] = useState<KangurLessonTtsVoice>(persistedSettings.voice);
  const [copyStatus, setCopyStatus] = useState('Copy text');
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setEngine(persistedSettings.engine);
    setVoice(persistedSettings.voice);
  }, [persistedSettings.engine, persistedSettings.voice]);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    },
    []
  );

  const handleCopyTemplateText = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyStatus('Copy not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(TEST_NARRATOR_TEMPLATE_TEXT);
      setCopyStatus('Copied!');
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopyStatus('Copy text'), 1800);
    } catch {
      setCopyStatus('Copy failed');
    }
  };

  const isDirty =
    engine !== persistedSettings.engine || voice !== persistedSettings.voice;

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: KANGUR_NARRATOR_SETTINGS_KEY,
        value: serializeSetting({ engine, voice }),
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
        <div className='mt-8 space-y-4'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Server narrator voice</div>
            <p className='text-xs text-muted-foreground'>
                Choose which cached neural voice should speak lessons when the server narrator is active.
            </p>
          </div>
          <div className='grid gap-3 md:grid-cols-4'>
            {KANGUR_TTS_VOICE_OPTIONS.map((option) => {
              const checked = voice === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer flex-col gap-3 rounded-2xl border px-3 py-3 transition',
                    checked
                      ? 'border-indigo-400 bg-indigo-50/80 shadow-sm'
                      : 'border-border bg-card hover:border-indigo-300/60 hover:bg-card/80'
                  )}
                >
                  <div className='flex items-center gap-3'>
                    <input
                      type='radio'
                      name='kangur-narrator-voice'
                      value={option.value}
                      checked={checked}
                      onChange={() => setVoice(option.value)}
                      className='mt-1 h-4 w-4 accent-indigo-600'
                    />
                    <div>
                      <div className='font-semibold text-foreground'>{option.label}</div>
                    </div>
                  </div>
                  <p className='text-[10px] text-muted-foreground'>
                      Used when the Server narrator engine is set; switch engines to Client narrator to use browser speech.
                  </p>
                </label>
              );
            })}
          </div>
        </div>

        <div className='mt-6 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='text-sm font-semibold text-foreground'>Short narrator template</div>
              <p className='text-xs text-muted-foreground'>
                  Paste this sample into a lesson or narration override to quickly hear the selected voice.
              </p>
            </div>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => {
                void handleCopyTemplateText();
              }}
            >
              {copyStatus}
            </Button>
          </div>
          <div className='mt-3 rounded-xl border border-border/60 bg-white/80 px-3 py-2 text-sm text-slate-700'>
            {TEST_NARRATOR_TEMPLATE_TEXT}
          </div>
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
