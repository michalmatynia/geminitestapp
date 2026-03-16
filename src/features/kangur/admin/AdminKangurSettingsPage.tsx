'use client';

import Link from 'next/link';
import { type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import {
  KANGUR_NARRATOR_ENGINE_OPTIONS,
  KANGUR_NARRATOR_SETTINGS_KEY,
  KANGUR_PARENT_VERIFICATION_SETTINGS_KEY,
  parseKangurParentVerificationEmailSettings,
  parseKangurNarratorSettings,
  type KangurParentVerificationEmailSettings,
  type KangurNarratorEngine,
} from '@/features/kangur/settings';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS,
  KANGUR_AI_TUTOR_MOTION_PRESET_OPTIONS,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
  resolveKangurAiTutorMotionPresetKind,
  type KangurAiTutorAppSettings,
  type KangurAiTutorGuestIntroMode,
  type KangurAiTutorHomeOnboardingMode,
} from '@/features/kangur/settings-ai-tutor';
import {
  KANGUR_TTS_VOICE_OPTIONS,
  type KangurLessonTtsProbeResponse,
  type KangurLessonTtsVoice,
} from '@/features/kangur/tts/contracts';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useAgentPersonas } from '@/shared/hooks/useAgentPersonas';
import { resolveAgentPersonaMood } from '@/shared/lib/agent-personas';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
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
  ToggleRow,
  useToast,
} from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';

import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { KangurAdminStatusCard } from './components/KangurAdminStatusCard';
import { KangurAiTutorContentSettingsPanel } from './components/KangurAiTutorContentSettingsPanel';
import { KangurAiTutorNativeGuideSettingsPanel } from './components/KangurAiTutorNativeGuideSettingsPanel';
import { KangurClassOverridesSettingsPanel } from './components/KangurClassOverridesSettingsPanel';
import { KangurPageContentSettingsPanel } from './components/KangurPageContentSettingsPanel';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';


const TEST_NARRATOR_TEMPLATE_TEXT =
  'A bright classroom welcomes curious minds. Here is a short narration sample to verify the chosen voice.';
const TEST_NARRATOR_PROBE_TEXT = 'To jest krótki test narratora Kangur.';

const DEFAULT_AGENT_PERSONA_OPTION = '__default_agent_persona__';
const DEFAULT_MOTION_PRESET_OPTION = '__default_motion_preset__';
const AI_TUTOR_GUEST_INTRO_MODE_OPTIONS: Array<{
  value: KangurAiTutorGuestIntroMode;
  label: string;
  description: string;
}> = [
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
const AI_TUTOR_HOME_ONBOARDING_MODE_OPTIONS: Array<{
  value: KangurAiTutorHomeOnboardingMode;
  label: string;
  description: string;
}> = [
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
const SETTINGS_SECTION_CLASS_NAME = 'border-border/60 bg-card/35 shadow-sm';
const SETTINGS_CARD_CLASS_NAME = 'rounded-2xl border-border/60 bg-card/40 shadow-sm';
const SETTINGS_INSET_CARD_CLASS_NAME = 'rounded-2xl border-border/60 bg-background/60 shadow-sm';
const KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MIN = 1;
const KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MAX = 3600;

const areAiTutorAppSettingsEqual = (
  left: KangurAiTutorAppSettings,
  right: KangurAiTutorAppSettings
): boolean =>
  left.agentPersonaId === right.agentPersonaId &&
  left.motionPresetId === right.motionPresetId &&
  left.dailyMessageLimit === right.dailyMessageLimit &&
  left.guestIntroMode === right.guestIntroMode &&
  left.homeOnboardingMode === right.homeOnboardingMode;

const parseAiTutorDailyMessageLimit = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(parsed, 200);
};

const parseParentVerificationCooldownInput = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(
    Math.max(parsed, KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MIN),
    KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MAX
  );
};

const formatShortTimestamp = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('pl-PL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    logClientError(error);
    return value;
  }
};

const formatParentVerificationDisabledUntilInput = (value: string | null): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
};

const parseParentVerificationDisabledUntilInput = (
  value: string
): string | null | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

type SettingsChoiceCardProps = {
  htmlFor: string;
  checked: boolean;
  title: string;
  description: string;
  children: ReactNode;
  hint?: string;
  className?: string;
};

function SettingsChoiceCard({
  htmlFor,
  checked,
  title,
  description,
  children,
  hint,
  className,
}: SettingsChoiceCardProps): ReactElement {
  const cardSelectionClassName = checked
    ? 'border-primary/30 bg-card shadow-sm ring-1 ring-primary/15'
    : 'hover:border-border hover:bg-card/60';
  const selectionBadgeVariant = checked ? 'secondary' : 'outline';
  const cardClassName = cn(
    'h-full rounded-2xl border-border/60 bg-card/40 transition-all',
    cardSelectionClassName,
    className
  );

  return (
    <label htmlFor={htmlFor} className='block cursor-pointer'>
      <Card variant='subtle' padding='md' className={cardClassName}>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='mt-0.5 shrink-0'>{children}</div>
            <div className='min-w-0'>
              <div className='text-sm font-semibold text-foreground'>{title}</div>
              <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
            </div>
          </div>
          <Badge variant={selectionBadgeVariant}>
            {checked ? 'Selected' : 'Option'}
          </Badge>
        </div>
        {hint ? <p className='mt-3 text-xs leading-relaxed text-muted-foreground'>{hint}</p> : null}
      </Card>
    </label>
  );
}

export function AdminKangurSettingsPage(): ReactElement {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);
  const rawAiTutorSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const rawAiTutorAppSettings = settingsStore.get(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const rawParentVerificationEmailSettings =
    settingsStore.get(KANGUR_PARENT_VERIFICATION_SETTINGS_KEY);

  const persistedNarratorSettings = useMemo(
    () => parseKangurNarratorSettings(rawNarratorSettings),
    [rawNarratorSettings]
  );
  const aiTutorSettingsStore = useMemo(
    () => parseKangurAiTutorSettings(rawAiTutorSettings),
    [rawAiTutorSettings]
  );
  const persistedAiTutorSettings = useMemo(
    () => resolveKangurAiTutorAppSettings(rawAiTutorAppSettings, aiTutorSettingsStore),
    [rawAiTutorAppSettings, aiTutorSettingsStore]
  );
  const persistedParentVerificationEmailSettings = useMemo(
    () => parseKangurParentVerificationEmailSettings(rawParentVerificationEmailSettings),
    [rawParentVerificationEmailSettings]
  );

  const [engine, setEngine] = useState<KangurNarratorEngine>(persistedNarratorSettings.engine);
  const [voice, setVoice] = useState<KangurLessonTtsVoice>(persistedNarratorSettings.voice);
  const [agentPersonaId, setAgentPersonaId] = useState(persistedAiTutorSettings.agentPersonaId ?? '');
  const [motionPresetId, setMotionPresetId] = useState(() => {
    const resolved = resolveKangurAiTutorMotionPresetKind(persistedAiTutorSettings.motionPresetId);
    return resolved === 'default' ? '' : resolved;
  });
  const [dailyMessageLimitInput, setDailyMessageLimitInput] = useState(
    persistedAiTutorSettings.dailyMessageLimit
      ? String(persistedAiTutorSettings.dailyMessageLimit)
      : ''
  );
  const [parentVerificationResendCooldownInput, setParentVerificationResendCooldownInput] =
    useState(
      String(persistedParentVerificationEmailSettings.resendCooldownSeconds)
    );
  const [parentVerificationNotificationsEnabled, setParentVerificationNotificationsEnabled] =
    useState(persistedParentVerificationEmailSettings.notificationsEnabled);
  const [
    parentVerificationNotificationsDisabledUntilInput,
    setParentVerificationNotificationsDisabledUntilInput,
  ] = useState(
    formatParentVerificationDisabledUntilInput(
      persistedParentVerificationEmailSettings.notificationsDisabledUntil
    )
  );
  const [guestIntroMode, setGuestIntroMode] = useState<KangurAiTutorGuestIntroMode>(
    persistedAiTutorSettings.guestIntroMode
  );
  const [homeOnboardingMode, setHomeOnboardingMode] = useState<KangurAiTutorHomeOnboardingMode>(
    persistedAiTutorSettings.homeOnboardingMode
  );
  const [copyStatus, setCopyStatus] = useState('Copy text');
  const [narratorProbe, setNarratorProbe] = useState<KangurLessonTtsProbeResponse | null>(null);
  const [isProbingNarrator, setIsProbingNarrator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const narratorProbeRequestIdRef = useRef(0);
  const lastAutoProbeVoiceRef = useRef<KangurLessonTtsVoice | null>(null);

  const { data: agentPersonas = [] } = useAgentPersonas();

  useEffect(() => {
    setEngine(persistedNarratorSettings.engine);
    setVoice(persistedNarratorSettings.voice);
  }, [persistedNarratorSettings.engine, persistedNarratorSettings.voice]);

  useEffect(() => {
    setAgentPersonaId(persistedAiTutorSettings.agentPersonaId ?? '');
    const resolved = resolveKangurAiTutorMotionPresetKind(persistedAiTutorSettings.motionPresetId);
    setMotionPresetId(resolved === 'default' ? '' : resolved);
    setDailyMessageLimitInput(
      persistedAiTutorSettings.dailyMessageLimit
        ? String(persistedAiTutorSettings.dailyMessageLimit)
        : ''
    );
    setGuestIntroMode(persistedAiTutorSettings.guestIntroMode);
    setHomeOnboardingMode(persistedAiTutorSettings.homeOnboardingMode);
  }, [persistedAiTutorSettings]);

  useEffect(() => {
    setParentVerificationResendCooldownInput(
      String(persistedParentVerificationEmailSettings.resendCooldownSeconds)
    );
    setParentVerificationNotificationsEnabled(
      persistedParentVerificationEmailSettings.notificationsEnabled
    );
    setParentVerificationNotificationsDisabledUntilInput(
      formatParentVerificationDisabledUntilInput(
        persistedParentVerificationEmailSettings.notificationsDisabledUntil
      )
    );
  }, [persistedParentVerificationEmailSettings]);

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
    } catch (error) {
      logClientError(error);
      setCopyStatus('Copy failed');
    }
  };

  const handleProbeNarrator = async ({
    notify = true,
  }: {
    notify?: boolean;
  } = {}): Promise<void> => {
    const probeRequestId = narratorProbeRequestIdRef.current + 1;
    narratorProbeRequestIdRef.current = probeRequestId;
    setNarratorProbe(null);
    setIsProbingNarrator(true);
    try {
      const response = await api.post<KangurLessonTtsProbeResponse>(
        '/api/kangur/tts/probe',
        {
          voice,
          locale: 'pl-PL',
          text: TEST_NARRATOR_PROBE_TEXT,
        },
        { logError: false }
      );
      if (narratorProbeRequestIdRef.current !== probeRequestId) {
        return;
      }
      setNarratorProbe(response);
      if (notify) {
        toast(response.ok ? 'Server narrator is ready.' : 'Server narrator próbę found an issue.', {
          variant: response.ok ? 'success' : 'error',
        });
      }
    } catch (error) {
      logClientError(error);
      if (narratorProbeRequestIdRef.current !== probeRequestId) {
        return;
      }
      if (notify) {
        toast(error instanceof Error ? error.message : 'Failed to próbę the server narrator.', {
          variant: 'error',
        });
      }
    } finally {
      if (narratorProbeRequestIdRef.current === probeRequestId) {
        setIsProbingNarrator(false);
      }
    }
  };

  useEffect(() => {
    if (lastAutoProbeVoiceRef.current === voice) {
      return;
    }
    lastAutoProbeVoiceRef.current = voice;
    void handleProbeNarrator({ notify: false });
  }, [voice]);

  const narratorDirty =
    engine !== persistedNarratorSettings.engine || voice !== persistedNarratorSettings.voice;
  const draftAiTutorSettings = useMemo<KangurAiTutorAppSettings>(
    () => ({
      agentPersonaId: agentPersonaId || null,
      motionPresetId: motionPresetId || null,
      dailyMessageLimit: parseAiTutorDailyMessageLimit(dailyMessageLimitInput),
      guestIntroMode,
      homeOnboardingMode,
    }),
    [agentPersonaId, dailyMessageLimitInput, guestIntroMode, homeOnboardingMode, motionPresetId]
  );
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
  const aiTutorSettingsDirty = !areAiTutorAppSettingsEqual(
    draftAiTutorSettings,
    persistedAiTutorSettings
  );
  const parentVerificationEmailDraft = useMemo<KangurParentVerificationEmailSettings>(
    () => {
      const parsedDisabledUntil = parseParentVerificationDisabledUntilInput(
        parentVerificationNotificationsDisabledUntilInput
      );

      return {
        resendCooldownSeconds:
          parseParentVerificationCooldownInput(parentVerificationResendCooldownInput) ??
          persistedParentVerificationEmailSettings.resendCooldownSeconds,
        notificationsEnabled: parentVerificationNotificationsEnabled,
        notificationsDisabledUntil:
          parsedDisabledUntil === undefined
            ? persistedParentVerificationEmailSettings.notificationsDisabledUntil
            : parsedDisabledUntil,
      };
    },
    [
      parentVerificationNotificationsDisabledUntilInput,
      parentVerificationNotificationsEnabled,
      parentVerificationResendCooldownInput,
      persistedParentVerificationEmailSettings,
    ]
  );
  const parentVerificationEmailSettingsDirty =
    parentVerificationEmailDraft.resendCooldownSeconds !==
    persistedParentVerificationEmailSettings.resendCooldownSeconds ||
    parentVerificationEmailDraft.notificationsEnabled !==
    persistedParentVerificationEmailSettings.notificationsEnabled ||
    parentVerificationEmailDraft.notificationsDisabledUntil !==
    persistedParentVerificationEmailSettings.notificationsDisabledUntil;
  const parentVerificationNotificationsPausedUntil = useMemo(() => {
    const value = parentVerificationEmailDraft.notificationsDisabledUntil;
    if (!value) return null;
    const untilMs = Date.parse(value);
    if (!Number.isFinite(untilMs) || untilMs <= Date.now()) {
      return null;
    }
    return value;
  }, [parentVerificationEmailDraft.notificationsDisabledUntil]);
  const isDirty =
    narratorDirty || aiTutorSettingsDirty || parentVerificationEmailSettingsDirty;

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const savedSections: Array<'narrator' | 'ai-tutor' | 'parent-verification'> = [];

      if (narratorDirty) {
        await updateSetting.mutateAsync({
          key: KANGUR_NARRATOR_SETTINGS_KEY,
          value: serializeSetting({ engine, voice }),
        });
        savedSections.push('narrator');
      }

      if (aiTutorSettingsDirty) {
        await updateSetting.mutateAsync({
          key: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
          value: serializeSetting(draftAiTutorSettings),
        });
        savedSections.push('ai-tutor');
      }

      if (parentVerificationEmailSettingsDirty) {
        await updateSetting.mutateAsync({
          key: KANGUR_PARENT_VERIFICATION_SETTINGS_KEY,
          value: serializeSetting(parentVerificationEmailDraft),
        });
        savedSections.push('parent-verification');
      }

      if (savedSections.length === 0) {
        return;
      }

      if (savedSections.length > 1) {
        toast('Kangur settings saved.', { variant: 'success' });
      } else if (savedSections[0] === 'narrator') {
        toast('Kangur narrator settings saved.', { variant: 'success' });
      } else if (savedSections[0] === 'ai-tutor') {
        toast('Kangur AI Tutor settings saved.', { variant: 'success' });
      } else if (savedSections[0] === 'parent-verification') {
        toast('Kangur parent verification email settings saved.', {
          variant: 'success',
        });
      }
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save Kangur settings.', {
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KangurAdminContentShell
      title='Kangur Settings'
      description='Manage storefront theme, class overrides, AI Tutor, narration, and parent verification behavior across Kangur.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Settings' },
      ]}
      headerActions={
        <>
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/kangur/documentation'>Documentation</Link>
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!isDirty || isSaving}
            data-doc-id='settings_save'
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </>
      }
    >
      <div id='kangur-admin-settings-page' className='space-y-8'>
        <div className='grid gap-6 xl:grid-cols-2'>
          <FormSection
            title='Storefront Theme'
            description='Edit daily and nightly Kangur themes. Changes auto-save to Mongo and apply immediately to the live app.'
            className={SETTINGS_SECTION_CLASS_NAME}
          >
            <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
              <div className='flex items-center justify-between gap-4'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>
                    Daily &amp; nightly themes
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    Customise colours, typography, and spacing for both the day and night variants of
                    the Kangur storefront. Includes a reset-to-default option per theme.
                  </p>
                </div>
                <Button asChild variant='outline' size='sm' className='shrink-0'>
                  <Link href='/admin/kangur/appearance'>Open theme editor</Link>
                </Button>
              </div>
            </Card>
          </FormSection>

          <FormSection
            title='Class Overrides'
            description='Attach extra Tailwind classes to Kangur shells and root surfaces through Mongo.'
            className={SETTINGS_SECTION_CLASS_NAME}
          >
            <KangurClassOverridesSettingsPanel />
          </FormSection>
        </div>

        <FormSection
          title='Narrator Engine'
          description='This applies globally to every learner-facing Kangur lesson and exercise.'
          className={SETTINGS_SECTION_CLASS_NAME}
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
              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
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
                      onClick={() => {
                        void handleCopyTemplateText();
                      }}
                      data-doc-id='settings_narrator_sample_copy'
                    >
                      {copyStatus}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        void handleProbeNarrator({ notify: true });
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

        <FormSection
          title='AI Tutor'
          description='These settings apply to the whole Kangur app. Parent profiles only manage learner-specific access and guardrails, while model routing stays in AI Brain.'
          className={SETTINGS_SECTION_CLASS_NAME}
        >
          <div className='grid gap-4 xl:grid-cols-2'>
            <div className='space-y-4'>
              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
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

              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
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
                   title='Puste = bez limitu'/>
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
                   title='Anonimowy onboarding AI Tutora'/>
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
                   title='Onboarding pierwszej strony'/>
                </FormField>
              </Card>
            </div>

            <div className='space-y-4'>
              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
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
                   title='Persona (charakter tutora)'/>
                </FormField>

                <Card
                  variant='subtle'
                  padding='sm'
                  className={cn('mt-4', SETTINGS_INSET_CARD_CLASS_NAME)}
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

              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
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
                   title='Preset ruchu tutora'/>
                </FormField>
              </Card>
            </div>
          </div>

          <Alert variant='default' title='Scope' className='mt-4'>
            Parents no longer change these fields per learner. Configure them here once, then use
            the parent dashboard only for access and guardrails.
          </Alert>
        </FormSection>

        <FormSection
          title='Parent verification email'
          description='Configure resend throttling for parent account verification emails.'
          className={SETTINGS_SECTION_CLASS_NAME}
          gridClassName='gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'
        >
          <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
            <div className='space-y-4'>
              <FormField
                label='Wysyłka e-maili potwierdzających'
                description='Disable to pause delivery of parent email confirmations.'
              >
                <ToggleRow
                  label={parentVerificationNotificationsEnabled ? 'Włączona' : 'Wyłączona'}
                  description={
                    parentVerificationNotificationsEnabled
                      ? 'Notifications are active for new parent verifications.'
                      : 'Parent confirmation emails will not be sent.'
                  }
                  checked={parentVerificationNotificationsEnabled}
                  onCheckedChange={setParentVerificationNotificationsEnabled}
                  variant='switch'
                  className='border-none bg-muted/20 px-3 py-2 hover:bg-muted/30'
                />
              </FormField>

              <FormField
                label='Wstrzymaj wysyłkę do'
                description='Temporarily pause confirmation emails until the chosen time (local). Leave blank to send normally.'
              >
                <Input
                  type='datetime-local'
                  value={parentVerificationNotificationsDisabledUntilInput}
                  onChange={(event) =>
                    setParentVerificationNotificationsDisabledUntilInput(event.target.value)
                  }
                  aria-label='Wstrzymaj wysyłkę do'
                 title='Wstrzymaj wysyłkę do'/>
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setParentVerificationNotificationsDisabledUntilInput('')}
                  >
                    Clear pause
                  </Button>
                  {parentVerificationNotificationsPausedUntil ? (
                    <Badge variant='outline'>
                      Wstrzymane do {formatShortTimestamp(parentVerificationNotificationsPausedUntil)}
                    </Badge>
                  ) : null}
                </div>
              </FormField>

              <FormField
                label='Czas oczekiwania na ponowne wysłanie e-maila (sekundy)'
                description='Controls how long to wait before another verification email can be sent to the same address.'
              >
                <Input
                  type='number'
                  min={KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MIN}
                  max={KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MAX}
                  step={1}
                  value={parentVerificationResendCooldownInput}
                  onChange={(event) => setParentVerificationResendCooldownInput(event.target.value)}
                  aria-label='Czas oczekiwania na ponowne wysłanie e-maila (sekundy)'
                  inputMode='numeric'
                 title='Czas oczekiwania na ponowne wysłanie e-maila (sekundy)'/>
              </FormField>
              <p className='text-xs text-muted-foreground'>
                Akceptowany zakres: {KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MIN}–
                {KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_SECONDS_MAX} s.
              </p>
            </div>
          </Card>
          <div className='space-y-3'>
            <Alert variant='default' title='Scope'>
              Applies to parent create-account and resend-verification actions across login pages and public
              enrollment flow.
            </Alert>
            <Alert variant='default' title='Security'>
              Shorter values increase retry attempts and email traffic. Longer values reduce request spam but
              also slow account confirmation.
            </Alert>
          </div>
        </FormSection>

        <div className='space-y-6'>
          <div>
            <div className='text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground'>
              Content &amp; Guidance
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              Refine onboarding copy, page content, and native guide instructions used across Kangur.
            </p>
          </div>
          <KangurAiTutorContentSettingsPanel />
          <KangurPageContentSettingsPanel />
          <KangurAiTutorNativeGuideSettingsPanel />
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]'>
          <FormSection
            title='Operations & Observability'
            description='Quick access to Kangur telemetry, summary health, and log triage surfaces.'
            className={SETTINGS_SECTION_CLASS_NAME}
          >
            <div className='grid gap-4 lg:grid-cols-3'>
              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
                <div className='text-sm font-semibold text-foreground'>Observability dashboard</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Open the dedicated Kangur dashboard with alerts, route health, client telemetry,
                  recent server logs, and the latest performance baseline.
                </p>
                <Button asChild variant='outline' size='sm' className='mt-4'>
                  <Link href='/admin/kangur/observability'>Open observability dashboard</Link>
                </Button>
              </Card>

              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
                <div className='text-sm font-semibold text-foreground'>Kangur system logs</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Jump into System Logs scoped to Kangur events. Saved presets available there:
                  Kangur, Kangur Auth, Kangur Progress, and Kangur TTS.
                </p>
                <div className='mt-4 flex flex-wrap gap-2'>
                  <Button asChild variant='outline' size='sm'>
                    <Link href='/admin/system/logs?query=kangur.'>Open Kangur logs</Link>
                  </Button>
                  <Button asChild variant='ghost' size='sm'>
                    <Link href='/admin/system/logs?source=kangur.tts.fallback'>TTS fallbacks</Link>
                  </Button>
                </div>
              </Card>

              <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
                <div className='text-sm font-semibold text-foreground'>Raw summary and runbook</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Use the summary API for direct payload inspection. Operational steps live in{' '}
                  <span className='font-mono text-xs text-foreground'>
                    docs/kangur/observability-and-operations.md
                  </span>
                  .
                </p>
                <div className='mt-4 flex flex-wrap gap-2'>
                  <Button asChild variant='outline' size='sm'>
                    <Link href='/api/kangur/observability/summary?range=24h'>
                      Open 24h summary JSON
                    </Link>
                  </Button>
                  <Button asChild variant='ghost' size='sm'>
                    <Link href='/api/kangur/observability/summary?range=7d'>
                      Open 7d summary JSON
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          </FormSection>

          <KangurAdminStatusCard
            title='Status'
            statusBadge={
              <Badge variant={isDirty ? 'warning' : 'secondary'}>
                {isDirty ? 'Unsaved changes' : 'All settings in sync'}
              </Badge>
            }
          >
            <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              <span>Saved state</span>
              <Badge variant='outline'>{persistedNarratorSettings.engine}</Badge>
              <Badge variant='outline'>
                Parent email cooldown {persistedParentVerificationEmailSettings.resendCooldownSeconds}s
              </Badge>
            </div>
          </KangurAdminStatusCard>
        </div>
      </div>
    </KangurAdminContentShell>
  );
}
