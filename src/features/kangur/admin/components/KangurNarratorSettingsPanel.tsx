import React from 'react';

import {
  KANGUR_NARRATOR_ENGINE_OPTIONS,
  type KangurNarratorEngine,
} from '@/features/kangur/settings';
import {
  KANGUR_TTS_VOICE_OPTIONS,
  type KangurLessonTtsProbeResponse,
  type KangurLessonTtsVoice,
} from '@/features/kangur/tts/contracts';
import {
  Alert,
  Badge,
  Button,
  Card,
  FormSection,
} from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

import { SettingsChoiceCard } from './SettingsChoiceCard';

const TEST_NARRATOR_TEMPLATE_TEXT =
  'A bright classroom welcomes curious minds. Here is a short narration sample to verify the chosen voice.';

const formatShortTimestamp = (value: string): string => {
  return withKangurClientErrorSync(
    {
      source: 'kangur.admin.settings',
      action: 'format-timestamp',
      description: 'Formats a timestamp for settings display.',
      context: { value },
    },
    () =>
      new Intl.DateTimeFormat('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value)),
    { fallback: value }
  );
};

interface KangurNarratorSettingsPanelProps {
  engine: KangurNarratorEngine;
  voice: KangurLessonTtsVoice;
  setEngine: (value: KangurNarratorEngine) => void;
  setVoice: (value: KangurLessonTtsVoice) => void;
  copyStatus: string;
  onCopyTemplateText: () => void;
  isProbingNarrator: boolean;
  onProbeNarrator: (options: { notify: boolean }) => void;
  narratorProbe: KangurLessonTtsProbeResponse | null;
  className?: string;
}

export function KangurNarratorSettingsPanel({
  engine,
  voice,
  setEngine,
  setVoice,
  copyStatus,
  onCopyTemplateText,
  isProbingNarrator,
  onProbeNarrator,
  narratorProbe,
  className,
}: KangurNarratorSettingsPanelProps): React.JSX.Element {
  return (
    <FormSection
      title='Narrator Engine'
      description='This applies globally to every learner-facing Kangur lesson and exercise.'
      className={className}
    >
      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]'>
        <div className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            {KANGUR_NARRATOR_ENGINE_OPTIONS.map((option) => {
              const checked = engine === option.value;
              const optionId = `kangur-narrator-engine-${option.value}`;

              return (
                <SettingsChoiceCard
                  key={option.value}
                  htmlFor={optionId}
                  checked={checked}
                  title={option.label}
                  description={option.description}
                >
                  <input
                    id={optionId}
                    type='radio'
                    name='kangur-narrator-engine'
                    value={option.value}
                    checked={checked}
                    onChange={() => setEngine(option.value)}
                    className='h-4 w-4'
                    data-doc-id='settings_narrator_engine'
                    aria-label={option.label}
                  />
                </SettingsChoiceCard>
              );
            })}
          </div>

          <div className='space-y-4'>
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
                const optionId = `kangur-narrator-voice-${option.value}`;

                return (
                  <SettingsChoiceCard
                    key={option.value}
                    htmlFor={optionId}
                    checked={checked}
                    title={option.label}
                    description='Used when the Server narrator engine is active.'
                    hint='Switch to Client narrator to use browser speech instead.'
                    className='p-3'
                  >
                    <input
                      id={optionId}
                      type='radio'
                      name='kangur-narrator-voice'
                      value={option.value}
                      checked={checked}
                      onChange={() => setVoice(option.value)}
                      className='h-4 w-4'
                      data-doc-id='settings_narrator_voice'
                      aria-label={option.label}
                    />
                  </SettingsChoiceCard>
                );
              })}
            </div>
          </div>
        </div>

        <div className='space-y-4'>
          <Card variant='subtle' padding='md' className='rounded-2xl border-border/60 bg-card/40 shadow-sm'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='flex items-center gap-2'>
                  <div className='text-sm font-semibold text-foreground'>
                    Short narrator template
                  </div>
                  <Badge variant='outline'>Shared surface</Badge>
                </div>
                <p className='text-xs text-muted-foreground'>
                  Paste this sample into a lesson or narration override to quickly hear the selected
                  voice.
                </p>
                <p className='mt-2 text-xs text-muted-foreground'>
                  A silent health check also runs automatically when this page opens or the server
                  narrator voice changes.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={onCopyTemplateText}
                  data-doc-id='settings_narrator_sample_copy'
                >
                  {copyStatus}
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    onProbeNarrator({ notify: true });
                  }}
                  disabled={isProbingNarrator}
                >
                  {isProbingNarrator ? 'Testing...' : 'Test server narrator'}
                </Button>
              </div>
            </div>

            <Card
              variant='subtle'
              padding='sm'
              className={cn('mt-3 border-border/60 bg-background/70', 'text-sm text-foreground')}
            >
              {TEST_NARRATOR_TEMPLATE_TEXT}
            </Card>

            {narratorProbe ? (
              <Alert
                variant={narratorProbe.ok ? 'success' : 'warning'}
                title={narratorProbe.ok ? 'Server narrator ready' : 'Server narrator unavailable'}
                className='mt-4'
              >
                <p>{narratorProbe.message}</p>
                <div className='mt-2 text-xs opacity-80'>
                  Voice: {narratorProbe.voice} · Model: {narratorProbe.model} · Checked:{' '}
                  {formatShortTimestamp(narratorProbe.checkedAt)}
                </div>
                {!narratorProbe.ok && narratorProbe.errorStatus ? (
                  <div className='mt-2 text-xs opacity-80'>
                    Status: {narratorProbe.errorStatus}
                    {narratorProbe.errorCode ? ` · Code: ${narratorProbe.errorCode}` : ''}
                  </div>
                ) : null}
                {!narratorProbe.ok && narratorProbe.errorCode === 'billing_not_active' ? (
                  <div className='mt-2 text-xs font-medium'>
                    The configured OpenAI account exists, but billing is inactive. Keep Client
                    narrator enabled until billing is restored.
                  </div>
                ) : null}
              </Alert>
            ) : null}
          </Card>

          <Alert variant='default' title='Global behavior'>
            Lessons and exercises keep the play and pause controls, but the engine choice is no
            longer shown there. Change it here once and the whole Kangur app follows it.
          </Alert>
        </div>
      </div>
    </FormSection>
  );
}
