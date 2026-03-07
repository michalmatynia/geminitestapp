'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { KangurDocumentationCenter } from '@/features/kangur/admin/components/KangurDocumentationCenter';
import { KangurDocsTooltipEnhancer } from '@/features/kangur/docs/tooltips';
import {
  KANGUR_HELP_SETTINGS_KEY,
  areKangurDocsTooltipsEnabled,
  parseKangurHelpSettings,
  type KangurHelpSettings,
} from '@/features/kangur/help-settings';
import {
  KANGUR_NARRATOR_ENGINE_OPTIONS,
  KANGUR_NARRATOR_SETTINGS_KEY,
  parseKangurNarratorSettings,
  type KangurNarratorEngine,
} from '@/features/kangur/settings';
import {
  KANGUR_TTS_VOICE_OPTIONS,
  type KangurLessonTtsVoice,
} from '@/features/kangur/tts/contracts';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, FormSection, PageLayout, Switch, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { serializeSetting } from '@/shared/utils/settings-json';

const TEST_NARRATOR_TEMPLATE_TEXT =
  'A bright classroom welcomes curious minds. Here is a short narration sample to verify the chosen voice.';

const DOCS_TOOLTIP_SURFACES: Array<{
  key: keyof KangurHelpSettings['docsTooltips'];
  label: string;
  description: string;
  docId: string;
}> = [
  {
    key: 'homeEnabled',
    label: 'Home',
    description: 'Game home screen, quick-start practice, and practice shell controls.',
    docId: 'settings_docs_tooltips_home_toggle',
  },
  {
    key: 'lessonsEnabled',
    label: 'Lessons',
    description: 'Lesson library, document-mode lessons, and lesson navigation controls.',
    docId: 'settings_docs_tooltips_lessons_toggle',
  },
  {
    key: 'testsEnabled',
    label: 'Tests',
    description: 'Test-suite list and active suite playback controls.',
    docId: 'settings_docs_tooltips_tests_toggle',
  },
  {
    key: 'profileEnabled',
    label: 'Learner Profile',
    description: 'Learner progress summary, recommendations, and profile shortcuts.',
    docId: 'settings_docs_tooltips_profile_toggle',
  },
  {
    key: 'parentDashboardEnabled',
    label: 'Parent Dashboard',
    description: 'Learner switching, progress tabs, and assignment review on the parent surface.',
    docId: 'settings_docs_tooltips_parent_dashboard_toggle',
  },
  {
    key: 'adminEnabled',
    label: 'Admin',
    description: 'Documentation-driven tooltips inside Kangur admin routes, including this page.',
    docId: 'settings_docs_tooltips_admin_toggle',
  },
] as const;

const areHelpSettingsEqual = (left: KangurHelpSettings, right: KangurHelpSettings): boolean =>
  left.docsTooltips.enabled === right.docsTooltips.enabled &&
  left.docsTooltips.homeEnabled === right.docsTooltips.homeEnabled &&
  left.docsTooltips.lessonsEnabled === right.docsTooltips.lessonsEnabled &&
  left.docsTooltips.testsEnabled === right.docsTooltips.testsEnabled &&
  left.docsTooltips.profileEnabled === right.docsTooltips.profileEnabled &&
  left.docsTooltips.parentDashboardEnabled === right.docsTooltips.parentDashboardEnabled &&
  left.docsTooltips.adminEnabled === right.docsTooltips.adminEnabled;

export function AdminKangurSettingsPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);
  const rawHelpSettings = settingsStore.get(KANGUR_HELP_SETTINGS_KEY);

  const persistedNarratorSettings = useMemo(
    () => parseKangurNarratorSettings(rawNarratorSettings),
    [rawNarratorSettings]
  );
  const persistedHelpSettings = useMemo(
    () => parseKangurHelpSettings(rawHelpSettings),
    [rawHelpSettings]
  );

  const [engine, setEngine] = useState<KangurNarratorEngine>(persistedNarratorSettings.engine);
  const [voice, setVoice] = useState<KangurLessonTtsVoice>(persistedNarratorSettings.voice);
  const [helpSettings, setHelpSettings] = useState<KangurHelpSettings>(persistedHelpSettings);
  const [copyStatus, setCopyStatus] = useState('Copy text');
  const [isSaving, setIsSaving] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setEngine(persistedNarratorSettings.engine);
    setVoice(persistedNarratorSettings.voice);
  }, [persistedNarratorSettings.engine, persistedNarratorSettings.voice]);

  useEffect(() => {
    setHelpSettings(persistedHelpSettings);
  }, [persistedHelpSettings]);

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

  const narratorDirty =
    engine !== persistedNarratorSettings.engine || voice !== persistedNarratorSettings.voice;
  const helpSettingsDirty = !areHelpSettingsEqual(helpSettings, persistedHelpSettings);
  const isDirty = narratorDirty || helpSettingsDirty;
  const adminDocsEnabled = areKangurDocsTooltipsEnabled(helpSettings, 'admin');

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const savedSections: Array<'narrator' | 'docs'> = [];

      if (narratorDirty) {
        await updateSetting.mutateAsync({
          key: KANGUR_NARRATOR_SETTINGS_KEY,
          value: serializeSetting({ engine, voice }),
        });
        savedSections.push('narrator');
      }

      if (helpSettingsDirty) {
        await updateSetting.mutateAsync({
          key: KANGUR_HELP_SETTINGS_KEY,
          value: serializeSetting(helpSettings),
        });
        savedSections.push('docs');
      }

      if (savedSections.length === 0) {
        return;
      }

      if (savedSections.length === 2) {
        toast('Kangur settings saved.', { variant: 'success' });
      } else if (savedSections[0] === 'narrator') {
        toast('Kangur narrator settings saved.', { variant: 'success' });
      } else {
        toast('Kangur documentation tooltip settings saved.', { variant: 'success' });
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save Kangur settings.', {
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout
      title='Kangur Settings'
      description='Manage global narration and documentation-driven tooltip behavior across Kangur.'
      eyebrow={
        <Link href='/admin/kangur' className='text-blue-300 hover:text-blue-200'>
          ← Back to Kangur
        </Link>
      }
      containerClassName='container mx-auto py-10'
    >
      <div id='kangur-admin-settings-page' className='space-y-6'>
        <KangurDocsTooltipEnhancer enabled={adminDocsEnabled} rootId='kangur-admin-settings-page' />

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
                      data-doc-id='settings_narrator_engine'
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
                Choose which cached neural voice should speak lessons when the server narrator is
                active.
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
                        data-doc-id='settings_narrator_voice'
                      />
                      <div>
                        <div className='font-semibold text-foreground'>{option.label}</div>
                      </div>
                    </div>
                    <p className='text-[10px] text-muted-foreground'>
                      Used when the Server narrator engine is set; switch engines to Client narrator
                      to use browser speech.
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
                  Paste this sample into a lesson or narration override to quickly hear the selected
                  voice.
                </p>
              </div>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => {
                  void handleCopyTemplateText();
                }}
                data-doc-id='settings_narrator_sample_copy'
              >
                {copyStatus}
              </Button>
            </div>
            <div className='mt-3 rounded-xl border border-border/60 bg-white/80 px-3 py-2 text-sm text-slate-700'>
              {TEST_NARRATOR_TEMPLATE_TEXT}
            </div>
          </div>

          <div className='mt-6 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground'>
            Lessons and exercises keep the play and pause controls, but the engine choice is no
            longer shown there. Change it here once and the whole Kangur app follows it.
          </div>
        </FormSection>

        <FormSection
          title='Docs & Tooltips'
          description='These toggles control documentation-driven tooltips. Tooltip text is sourced only from the central Kangur documentation files.'
          className='p-6'
        >
          <div className='rounded-2xl border border-border/70 bg-muted/20 px-4 py-4'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <div className='text-sm font-semibold text-foreground'>
                  Enable Kangur docs tooltips
                </div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Master switch for learner and admin tooltip help generated from the Kangur
                  documentation catalog.
                </p>
              </div>
              <Switch
                checked={helpSettings.docsTooltips.enabled}
                onCheckedChange={(checked) =>
                  setHelpSettings((current) => ({
                    ...current,
                    docsTooltips: {
                      ...current.docsTooltips,
                      enabled: checked,
                    },
                  }))
                }
                data-doc-id='settings_docs_tooltips_master_toggle'
                aria-label='Enable Kangur docs tooltips'
              />
            </div>
          </div>

          <div className='grid gap-4 lg:grid-cols-2'>
            {DOCS_TOOLTIP_SURFACES.map((surface) => (
              <div
                key={surface.key}
                className='rounded-2xl border border-border/70 bg-background/90 px-4 py-4 shadow-sm'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <div className='text-sm font-semibold text-foreground'>{surface.label}</div>
                    <p className='mt-1 text-sm text-muted-foreground'>{surface.description}</p>
                  </div>
                  <Switch
                    checked={helpSettings.docsTooltips[surface.key]}
                    onCheckedChange={(checked) =>
                      setHelpSettings((current) => ({
                        ...current,
                        docsTooltips: {
                          ...current.docsTooltips,
                          [surface.key]: checked,
                        },
                      }))
                    }
                    data-doc-id={surface.docId}
                    aria-label={`${surface.label} docs tooltips`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className='rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-4 text-sm text-indigo-900'>
            <div className='font-semibold'>Current admin preview</div>
            <p className='mt-1 text-indigo-700'>
              Tooltips on this page are currently{' '}
              <span className='font-semibold'>{adminDocsEnabled ? 'enabled' : 'disabled'}</span>{' '}
              based on the in-progress settings state.
            </p>
          </div>

          <KangurDocumentationCenter />
        </FormSection>

        <div className='flex items-center justify-between border-t border-border pt-6'>
          <p className='text-xs text-muted-foreground'>
            Saved narrator mode:{' '}
            <span className='font-semibold text-foreground'>
              {persistedNarratorSettings.engine}
            </span>
            {' · '}
            Docs tooltips:{' '}
            <span className='font-semibold text-foreground'>
              {persistedHelpSettings.docsTooltips.enabled ? 'On' : 'Off'}
            </span>
          </p>
          <Button
            onClick={() => void handleSave()}
            disabled={!isDirty || isSaving}
            data-doc-id='settings_save'
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
