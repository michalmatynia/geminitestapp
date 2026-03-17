import Link from 'next/link';
import React, { useMemo } from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { AgentPersona } from '@/shared/contracts/agent-personas';
import {
  DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS,
  KANGUR_AI_TUTOR_MOTION_PRESET_OPTIONS,
  type KangurAiTutorGuestIntroMode,
  type KangurAiTutorHomeOnboardingMode,
} from '@/features/kangur/settings-ai-tutor';
import { resolveAgentPersonaMood } from '@/shared/lib/agent-personas';
import {
  AgentPersonaMoodAvatar,
  Alert,
  Badge,
  Button,
  Card,
  FormField,
  FormSection,
  Input,
  SelectSimple,
} from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

const DEFAULT_AGENT_PERSONA_OPTION = '__default_agent_persona__';
const DEFAULT_MOTION_PRESET_OPTION = '__default_motion_preset__';

const AI_TUTOR_GUEST_INTRO_MODE_OPTIONS: Array<
  LabeledOptionWithDescriptionDto<KangurAiTutorGuestIntroMode>
> = [
  {
    value: 'first_visit',
    label: 'Pierwsza wizyta',
    description: 'Show the anonymous AI Tutor intro only once on the first visit.',
  },
  {
    value: 'every_visit',
    label: 'Każde wejście',
    description: 'Show the anonymous AI Tutor intro on every page entry.',
  },
];

const AI_TUTOR_HOME_ONBOARDING_MODE_OPTIONS: Array<
  LabeledOptionWithDescriptionDto<KangurAiTutorHomeOnboardingMode>
> = [
  {
    value: 'first_visit',
    label: 'Pierwsza wizyta',
    description: 'Show the Game home walkthrough once for each learner on their first eligible visit.',
  },
  {
    value: 'every_visit',
    label: 'Każde wejście',
    description: 'Show the Game home walkthrough on every eligible visit to the first page.',
  },
  {
    value: 'off',
    label: 'Tylko ręcznie',
    description: 'Do not auto-open the walkthrough. Learners can still start it manually from the tutor.',
  },
];

interface KangurAiTutorSettingsPanelProps {
  agentPersonaId: string;
  setAgentPersonaId: (id: string) => void;
  motionPresetId: string;
  setMotionPresetId: (id: string) => void;
  dailyMessageLimitInput: string;
  setDailyMessageLimitInput: (value: string) => void;
  guestIntroMode: KangurAiTutorGuestIntroMode;
  setGuestIntroMode: (mode: KangurAiTutorGuestIntroMode) => void;
  homeOnboardingMode: KangurAiTutorHomeOnboardingMode;
  setHomeOnboardingMode: (mode: KangurAiTutorHomeOnboardingMode) => void;
  agentPersonas: AgentPersona[];
  className?: string;
}

export function KangurAiTutorSettingsPanel({
  agentPersonaId,
  setAgentPersonaId,
  motionPresetId,
  setMotionPresetId,
  dailyMessageLimitInput,
  setDailyMessageLimitInput,
  guestIntroMode,
  setGuestIntroMode,
  homeOnboardingMode,
  setHomeOnboardingMode,
  agentPersonas,
  className,
}: KangurAiTutorSettingsPanelProps): React.JSX.Element {
  const selectedAgentPersona = useMemo(
    () => agentPersonas.find((persona) => persona.id === agentPersonaId) ?? null,
    [agentPersonaId, agentPersonas]
  );
  const selectedAgentPersonaMood = useMemo(
    () => resolveAgentPersonaMood(selectedAgentPersona),
    [selectedAgentPersona]
  );

  const agentPersonaOptions = useMemo(
    () => [
      {
        value: DEFAULT_AGENT_PERSONA_OPTION,
        label: 'Domyślna persona',
        description: 'Use the default Kangur tutor voice and identity.',
      },
      ...agentPersonas.map((persona) => ({
        value: persona.id,
        label: persona.name,
        description: persona.role
          ? `${persona.role} - Custom tutor identity`
          : 'Custom tutor identity',
      })),
    ],
    [agentPersonas]
  );

  const motionPresetOptions = useMemo(
    () => [
      {
        value: DEFAULT_MOTION_PRESET_OPTION,
        label: 'Brak',
        description: 'Use the default Kangur tutor motion behavior.',
      },
      ...KANGUR_AI_TUTOR_MOTION_PRESET_OPTIONS.map((preset) => ({
        value: preset.id,
        label: preset.label,
        description: preset.description,
      })),
    ],
    []
  );

  return (
    <FormSection
      title='AI Tutor'
      description='These settings apply to the whole Kangur app. Parent profiles only manage learner-specific access and guardrails, while model routing stays in AI Brain.'
      className={className}
    >
      <div className='grid gap-4 xl:grid-cols-2'>
        <div className='space-y-4'>
          <Card variant='subtle' padding='md' className='rounded-2xl border-border/60 bg-card/40 shadow-sm'>
            <div className='flex items-center gap-2'>
              <Badge variant='secondary'>AI Brain Routing</Badge>
            </div>
            <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
              <p>
                Kangur AI Tutor runs through Brain with the dedicated{' '}
                <span className='font-semibold text-foreground'>Kangur AI Tutor Chat</span>{' '}
                capability.
              </p>
              <p>
                Agent Personas shape tutor identity and instructions. Learner Agents remain part
                of the separate Agent Teaching feature and are not used by Kangur AI Tutor.
              </p>
            </div>
            <div className='mt-4'>
              <Button asChild variant='outline' size='sm'>
                <Link href='/admin/brain?tab=routing'>Open AI Brain routing</Link>
              </Button>
            </div>
          </Card>

          <Card variant='subtle' padding='md' className='rounded-2xl border-border/60 bg-card/40 shadow-sm'>
            <FormField
              label='Dzienny limit wiadomości'
              description='Każda wysłana wiadomość do tutora zużywa 1 punkt limitu. Puste pole oznacza brak limitu.'
            >
              <Input
                type='number'
                min={1}
                max={200}
                inputMode='numeric'
                value={dailyMessageLimitInput}
                onChange={(event) => setDailyMessageLimitInput(event.target.value)}
                placeholder='Puste = bez limitu'
                aria-label='Dzienny limit wiadomości'
                title='Puste = bez limitu'
              />
            </FormField>

            <FormField
              label='Anonimowy onboarding AI Tutora'
              description='Control how the first AI Tutor helper appears before the user logs in.'
              className='mt-4'
            >
              <SelectSimple
                value={guestIntroMode || DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS.guestIntroMode}
                onValueChange={(value) =>
                  setGuestIntroMode(value as KangurAiTutorGuestIntroMode)
                }
                options={AI_TUTOR_GUEST_INTRO_MODE_OPTIONS}
                ariaLabel='Anonimowy onboarding AI Tutora'
                variant='subtle'
                title='Anonimowy onboarding AI Tutora'
              />
            </FormField>

            <FormField
              label='Onboarding pierwszej strony'
              description='Control how the AI Tutor explains the Game home screen after the learner signs in.'
              className='mt-4'
            >
              <SelectSimple
                value={
                  homeOnboardingMode ||
                  DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS.homeOnboardingMode
                }
                onValueChange={(value) =>
                  setHomeOnboardingMode(value as KangurAiTutorHomeOnboardingMode)
                }
                options={AI_TUTOR_HOME_ONBOARDING_MODE_OPTIONS}
                ariaLabel='Onboarding pierwszej strony'
                variant='subtle'
                title='Onboarding pierwszej strony'
              />
            </FormField>
          </Card>
        </div>

        <div className='space-y-4'>
          <Card variant='subtle' padding='md' className='rounded-2xl border-border/60 bg-card/40 shadow-sm'>
            <FormField
              label='Persona (charakter tutora)'
              description='Choose the default tutor identity and voice used across Kangur.'
            >
              <SelectSimple
                value={agentPersonaId || DEFAULT_AGENT_PERSONA_OPTION}
                onValueChange={(value) =>
                  setAgentPersonaId(value === DEFAULT_AGENT_PERSONA_OPTION ? '' : value)
                }
                options={agentPersonaOptions}
                ariaLabel='Persona (charakter tutora)'
                variant='subtle'
                title='Persona (charakter tutora)'
              />
            </FormField>

            <Card
              variant='subtle'
              padding='sm'
              className={cn('mt-4', 'rounded-2xl border-border/60 bg-background/60 shadow-sm')}
            >
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>Current persona</Badge>
              </div>
              <div className='mt-3 flex items-center gap-3'>
                <AgentPersonaMoodAvatar
                  svgContent={selectedAgentPersonaMood.svgContent}
                  avatarImageUrl={selectedAgentPersonaMood.avatarImageUrl}
                  label={`AI Tutor persona preview for ${selectedAgentPersona?.name ?? 'the default persona'}`}
                  className='h-12 w-12 border border-border/60 bg-muted/40'
                  fallbackIconClassName='text-muted-foreground'
                />
                <div className='min-w-0'>
                  <div className='text-sm font-semibold text-foreground'>
                    {selectedAgentPersona?.name ?? 'Domyślna persona'}
                  </div>
                  <div className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>
                    {selectedAgentPersona
                      ? `${selectedAgentPersona.role ? `${selectedAgentPersona.role} - ` : ''}This persona defines the tutor voice and avatar while Brain handles the model route. Avatar uploads and embedded Kangur thumbnails are managed in Agent Personas.`
                      : 'Tutor uses the default helper persona when no custom persona is selected. Avatar uploads are managed in Agent Personas.'}
                  </div>
                </div>
              </div>
            </Card>
          </Card>

          <Card variant='subtle' padding='md' className='rounded-2xl border-border/60 bg-card/40 shadow-sm'>
            <FormField
              label='Preset ruchu tutora'
              description='Select a local motion profile for the tutor avatar and bubble.'
            >
              <SelectSimple
                value={motionPresetId || DEFAULT_MOTION_PRESET_OPTION}
                onValueChange={(value) =>
                  setMotionPresetId(value === DEFAULT_MOTION_PRESET_OPTION ? '' : value)
                }
                options={motionPresetOptions}
                ariaLabel='Preset ruchu tutora'
                variant='subtle'
                title='Preset ruchu tutora'
              />
            </FormField>
          </Card>
        </div>
      </div>

      <Alert variant='default' title='Scope' className='mt-4'>
        Parents no longer change these fields per learner. Configure them here once, then use
        the parent dashboard only for access and guardrails.
      </Alert>
    </FormSection>
  );
}
