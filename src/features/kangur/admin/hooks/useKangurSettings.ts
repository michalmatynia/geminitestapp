import { useEffect, useMemo, useRef, useState } from 'react';

import {
  KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
  KANGUR_NARRATOR_SETTINGS_KEY,
  KANGUR_PARENT_VERIFICATION_SETTINGS_KEY,
  parseKangurLaunchRouteSettings,
  parseKangurParentVerificationEmailSettings,
  parseKangurNarratorSettings,
  type KangurLaunchRoute,
  type KangurNarratorEngine,
  type KangurParentVerificationEmailSettings,
} from '@/features/kangur/settings';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
  resolveKangurAiTutorMotionPresetKind,
  type KangurAiTutorAppSettings,
  type KangurAiTutorGuestIntroMode,
  type KangurAiTutorHomeOnboardingMode,
} from '@/features/kangur/ai-tutor/settings';
import type {
  KangurLessonTtsProbeResponse,
  KangurLessonTtsVoice,
} from '@/features/kangur/tts/contracts';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useAgentPersonas } from '@/shared/hooks/useAgentPersonas';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { useToast } from '@/features/kangur/shared/ui';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { withKangurClientError } from '@/features/kangur/observability/client';

const TEST_NARRATOR_TEMPLATE_TEXT =
  'A bright classroom welcomes curious minds. Here is a short narration sample to verify the chosen voice.';
const TEST_NARRATOR_PROBE_TEXT = 'To jest krótki test narratora Kangur.';

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
  left.homeOnboardingMode === right.homeOnboardingMode &&
  left.contextRegistryMaxNodes === right.contextRegistryMaxNodes &&
  left.contextRegistryDepth === right.contextRegistryDepth &&
  left.knowledgeGraphEnabled === right.knowledgeGraphEnabled;

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

export function useKangurSettings() {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { data: agentPersonas = [] } = useAgentPersonas();

  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);
  const rawAiTutorSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const rawAiTutorAppSettings = settingsStore.get(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const rawParentVerificationEmailSettings =
    settingsStore.get(KANGUR_PARENT_VERIFICATION_SETTINGS_KEY);
  const rawLaunchRouteSettings = settingsStore.get(KANGUR_LAUNCH_ROUTE_SETTINGS_KEY);

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
  const persistedLaunchRouteSettings = useMemo(
    () => parseKangurLaunchRouteSettings(rawLaunchRouteSettings),
    [rawLaunchRouteSettings]
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
    parentVerificationRequireEmailVerification,
    setParentVerificationRequireEmailVerification,
  ] = useState(persistedParentVerificationEmailSettings.requireEmailVerification);
  const [parentVerificationRequireCaptcha, setParentVerificationRequireCaptcha] = useState(
    persistedParentVerificationEmailSettings.requireCaptcha
  );
  const [
    parentVerificationNotificationsDisabledUntilInput,
    setParentVerificationNotificationsDisabledUntilInput,
  ] = useState(
    formatParentVerificationDisabledUntilInput(
      persistedParentVerificationEmailSettings.notificationsDisabledUntil
    )
  );
  const [launchRoute, setLaunchRoute] = useState<KangurLaunchRoute>(
    persistedLaunchRouteSettings.route
  );
  const [guestIntroMode, setGuestIntroMode] = useState<KangurAiTutorGuestIntroMode>(
    persistedAiTutorSettings.guestIntroMode
  );
  const [homeOnboardingMode, setHomeOnboardingMode] = useState<KangurAiTutorHomeOnboardingMode>(
    persistedAiTutorSettings.homeOnboardingMode
  );
  const [contextRegistryMaxNodes, setContextRegistryMaxNodes] = useState(
    String(persistedAiTutorSettings.contextRegistryMaxNodes)
  );
  const [contextRegistryDepth, setContextRegistryDepth] = useState(
    String(persistedAiTutorSettings.contextRegistryDepth)
  );
  const [knowledgeGraphEnabled, setKnowledgeGraphEnabled] = useState(
    persistedAiTutorSettings.knowledgeGraphEnabled
  );
  const [copyStatus, setCopyStatus] = useState('Copy text');
  const [narratorProbe, setNarratorProbe] = useState<KangurLessonTtsProbeResponse | null>(null);
  const [isProbingNarrator, setIsProbingNarrator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const narratorProbeRequestIdRef = useRef(0);
  const lastAutoProbeVoiceRef = useRef<KangurLessonTtsVoice | null>(null);

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
    setContextRegistryMaxNodes(String(persistedAiTutorSettings.contextRegistryMaxNodes));
    setContextRegistryDepth(String(persistedAiTutorSettings.contextRegistryDepth));
    setKnowledgeGraphEnabled(persistedAiTutorSettings.knowledgeGraphEnabled);
  }, [persistedAiTutorSettings]);

  useEffect(() => {
    setParentVerificationResendCooldownInput(
      String(persistedParentVerificationEmailSettings.resendCooldownSeconds)
    );
    setParentVerificationNotificationsEnabled(
      persistedParentVerificationEmailSettings.notificationsEnabled
    );
    setParentVerificationRequireEmailVerification(
      persistedParentVerificationEmailSettings.requireEmailVerification
    );
    setParentVerificationRequireCaptcha(persistedParentVerificationEmailSettings.requireCaptcha);
    setParentVerificationNotificationsDisabledUntilInput(
      formatParentVerificationDisabledUntilInput(
        persistedParentVerificationEmailSettings.notificationsDisabledUntil
      )
    );
  }, [persistedParentVerificationEmailSettings]);

  useEffect(() => {
    setLaunchRoute(persistedLaunchRouteSettings.route);
  }, [persistedLaunchRouteSettings.route]);

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

    const didCopy = await withKangurClientError(
      {
        source: 'kangur.admin.settings',
        action: 'copy-narrator-template',
        description: 'Copies the narrator template text to clipboard.',
      },
      async () => {
        await navigator.clipboard.writeText(TEST_NARRATOR_TEMPLATE_TEXT);
        return true;
      },
      {
        fallback: false,
        onError: () => {
          setCopyStatus('Copy failed');
        },
      }
    );

    if (didCopy) {
      setCopyStatus('Copied!');
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopyStatus('Copy text'), 1800);
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
    const probeResult = await withKangurClientError(
      {
        source: 'kangur.admin.settings',
        action: 'probe-narrator',
        description: 'Runs a narrator TTS probe for the selected voice.',
        context: { voice },
      },
      async () =>
        await api.post<KangurLessonTtsProbeResponse>(
          '/api/kangur/tts/probe',
          {
            voice,
            locale: 'pl-PL',
            text: TEST_NARRATOR_PROBE_TEXT,
          },
          { logError: false }
        ),
      {
        fallback: null,
        onError: (error) => {
          if (narratorProbeRequestIdRef.current !== probeRequestId) {
            return;
          }
          if (notify) {
            toast(error instanceof Error ? error.message : 'Failed to próbę the server narrator.', {
              variant: 'error',
            });
          }
        },
      }
    );

    if (narratorProbeRequestIdRef.current === probeRequestId && probeResult) {
      setNarratorProbe(probeResult);
      if (notify) {
        toast(probeResult.ok ? 'Server narrator is ready.' : 'Server narrator próbę found an issue.', {
          variant: probeResult.ok ? 'success' : 'error',
        });
      }
    }
    if (narratorProbeRequestIdRef.current === probeRequestId) {
      setIsProbingNarrator(false);
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
      contextRegistryMaxNodes: Math.max(1, Math.min(100, parseInt(contextRegistryMaxNodes) || 24)),
      contextRegistryDepth: Math.max(0, Math.min(5, parseInt(contextRegistryDepth) || 1)),
      knowledgeGraphEnabled,
    }),
    [agentPersonaId, dailyMessageLimitInput, guestIntroMode, homeOnboardingMode, motionPresetId, contextRegistryMaxNodes, contextRegistryDepth, knowledgeGraphEnabled]
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
        requireEmailVerification: parentVerificationRequireEmailVerification,
        requireCaptcha: parentVerificationRequireCaptcha,
      };
    },
    [
      parentVerificationNotificationsDisabledUntilInput,
      parentVerificationNotificationsEnabled,
      parentVerificationRequireCaptcha,
      parentVerificationRequireEmailVerification,
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
    persistedParentVerificationEmailSettings.notificationsDisabledUntil ||
    parentVerificationEmailDraft.requireEmailVerification !==
    persistedParentVerificationEmailSettings.requireEmailVerification ||
    parentVerificationEmailDraft.requireCaptcha !==
    persistedParentVerificationEmailSettings.requireCaptcha;
  const parentVerificationNotificationsPausedUntil = useMemo(() => {
    const value = parentVerificationEmailDraft.notificationsDisabledUntil;
    if (!value) return null;
    const untilMs = Date.parse(value);
    if (!Number.isFinite(untilMs) || untilMs <= Date.now()) {
      return null;
    }
    return value;
  }, [parentVerificationEmailDraft.notificationsDisabledUntil]);
  const launchRouteSettingsDirty = launchRoute !== persistedLaunchRouteSettings.route;
  const isDirty =
    narratorDirty ||
    aiTutorSettingsDirty ||
    parentVerificationEmailSettingsDirty ||
    launchRouteSettingsDirty;

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    const saveResult = await withKangurClientError(
      {
        source: 'kangur.admin.settings',
        action: 'save-settings',
        description: 'Saves Kangur settings sections.',
      },
      async () => {
        const savedSections: Array<
          | 'narrator'
          | 'ai-tutor'
          | 'parent-verification'
          | 'launch-route'
        > = [];

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

        if (launchRouteSettingsDirty) {
          await updateSetting.mutateAsync({
            key: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
            value: serializeSetting({ route: launchRoute }),
          });
          savedSections.push('launch-route');
        }

        return savedSections;
      },
      {
        fallback: null,
        onError: (error) => {
          toast(error instanceof Error ? error.message : 'Failed to save Kangur settings.', {
            variant: 'error',
          });
        },
      }
    );

    if (saveResult && saveResult.length > 0) {
      if (saveResult.length > 1) {
        toast('Kangur settings saved.', { variant: 'success' });
      } else if (saveResult[0] === 'narrator') {
        toast('Kangur narrator settings saved.', { variant: 'success' });
      } else if (saveResult[0] === 'ai-tutor') {
        toast('Kangur AI Tutor settings saved.', { variant: 'success' });
      } else if (saveResult[0] === 'parent-verification') {
        toast('Kangur parent verification email settings saved.', {
          variant: 'success',
        });
      } else if (saveResult[0] === 'launch-route') {
        toast('Kangur launch route saved.', {
          variant: 'success',
        });
      }
    }
    setIsSaving(false);
  };

  return {
    engine,
    setEngine,
    voice,
    setVoice,
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
    parentVerificationResendCooldownInput,
    setParentVerificationResendCooldownInput,
    parentVerificationNotificationsEnabled,
    setParentVerificationNotificationsEnabled,
    parentVerificationRequireEmailVerification,
    setParentVerificationRequireEmailVerification,
    parentVerificationRequireCaptcha,
    setParentVerificationRequireCaptcha,
    parentVerificationNotificationsDisabledUntilInput,
    setParentVerificationNotificationsDisabledUntilInput,
    launchRoute,
    setLaunchRoute,
    copyStatus,
    narratorProbe,
    isProbingNarrator,
    isSaving,
    isDirty,
    handleCopyTemplateText,
    handleProbeNarrator,
    handleSave,
    agentPersonas,
    persistedNarratorSettings,
    parentVerificationNotificationsPausedUntil,
    persistedParentVerificationEmailSettings,
    persistedLaunchRouteSettings,
  };
}
