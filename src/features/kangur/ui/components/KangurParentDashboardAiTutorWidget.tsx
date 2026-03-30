'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BrainCircuit } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
  type KangurAiTutorHintDepth,
  type KangurAiTutorLearnerStoredSettings,
  type KangurAiTutorProactiveNudges,
  type KangurAiTutorTestAccessMode,
  type KangurAiTutorUiMode,
} from '@/features/kangur/ai-tutor/settings';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurLabeledValueSummary } from '@/features/kangur/ui/components/KangurLabeledValueSummary';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurPanelIntro,
  KangurPanelRow,
  KangurPanelStack,
  KangurSelectField,
  KangurSectionEyebrow,
  KangurStatusChip,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import type { KangurAiTutorUsageResponse } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import {
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  formatKangurAiTutorTemplate,
  getKangurAiTutorMoodCopy,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import {
  loadPersistedTutorVisibilityHidden,
  persistTutorVisibilityHidden,
  subscribeToTutorVisibilityChanges,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import { useOptionalKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurTutorMoodId,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateAllSettings } from '@/shared/lib/query-invalidation';
import { kangurKeys } from '@/shared/lib/query-key-exports';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { withKangurClientError } from '@/features/kangur/observability/client';


const KANGUR_PARENT_TUTOR_MOOD_ACCENTS: Record<KangurTutorMoodId, 'slate' | 'indigo' | 'sky' | 'violet' | 'amber' | 'teal' | 'emerald' | 'rose'> = {
  neutral: 'slate',
  thinking: 'slate',
  focused: 'indigo',
  careful: 'sky',
  curious: 'violet',
  encouraging: 'amber',
  motivating: 'amber',
  playful: 'violet',
  calm: 'teal',
  patient: 'teal',
  gentle: 'teal',
  reassuring: 'sky',
  empathetic: 'emerald',
  supportive: 'emerald',
  reflective: 'sky',
  determined: 'indigo',
  confident: 'indigo',
  proud: 'rose',
  happy: 'amber',
  celebrating: 'rose',
};

const PARENT_DASHBOARD_AI_TUTOR_TEMPORARILY_DISABLED = false;
const AI_TUTOR_USAGE_LOAD_DEFER_MS = 900;
const KANGUR_PARENT_DASHBOARD_ENABLE_TUTOR_BUTTON_CLASSNAME =
  'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800';

type KangurAiTutorContentValue = ReturnType<typeof useKangurAiTutorContent>;
type KangurParentDashboardTutorContent = KangurAiTutorContentValue['parentDashboard'];
type KangurAiTutorUsageSummary = KangurAiTutorUsageResponse['usage'];
type KangurActiveLearner = ReturnType<typeof useKangurParentDashboardRuntime>['activeLearner'];

type KangurAiTutorFormState = {
  enabled: boolean;
  uiMode: KangurAiTutorUiMode;
  allowCrossPagePersistence: boolean;
  rememberTutorContext: boolean;
  allowLessons: boolean;
  allowGames: boolean;
  testAccessMode: KangurAiTutorTestAccessMode;
  showSources: boolean;
  allowSelectedTextSupport: boolean;
  hintDepth: KangurAiTutorHintDepth;
  proactiveNudges: KangurAiTutorProactiveNudges;
};

type KangurAiTutorActionClasses = {
  compactActionClassName: string;
  fullWidthActionClassName: string | undefined;
};

type KangurAiTutorUsagePresentation = {
  showUsage: boolean;
  summaryText: string;
  badgeText: string | null;
  showBadge: boolean;
};

type KangurAiTutorMoodPresentation = {
  currentMoodAccent: (typeof KANGUR_PARENT_TUTOR_MOOD_ACCENTS)[KangurTutorMoodId];
  currentMoodId: KangurTutorMoodId;
  currentMoodLabel: string;
  currentMoodDescription: string;
  baselineMoodLabel: string;
  moodConfidence: string;
  moodUpdatedAt: string;
};

type KangurAiTutorFormBindings = {
  formState: KangurAiTutorFormState;
  setEnabled: (enabled: boolean) => void;
  setUiMode: (uiMode: KangurAiTutorUiMode) => void;
  setAllowCrossPagePersistence: (checked: boolean) => void;
  setRememberTutorContext: (checked: boolean) => void;
  setAllowLessons: (checked: boolean) => void;
  setAllowGames: (checked: boolean) => void;
  setTestAccessMode: (mode: KangurAiTutorTestAccessMode) => void;
  setShowSources: (checked: boolean) => void;
  setAllowSelectedTextSupport: (checked: boolean) => void;
  setHintDepth: (depth: KangurAiTutorHintDepth) => void;
  setProactiveNudges: (nudges: KangurAiTutorProactiveNudges) => void;
};

const DEFAULT_AI_TUTOR_FORM_STATE: KangurAiTutorFormState = {
  enabled: false,
  uiMode: 'anchored',
  allowCrossPagePersistence: true,
  rememberTutorContext: true,
  allowLessons: true,
  allowGames: true,
  testAccessMode: 'guided',
  showSources: true,
  allowSelectedTextSupport: true,
  hintDepth: 'guided',
  proactiveNudges: 'gentle',
};

const formatTutorMoodTimestamp = (
  value: string | null,
  fallback: string,
  locale: string
): string => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const resolveAiTutorActionClasses = (isCoarsePointer: boolean): KangurAiTutorActionClasses => ({
  compactActionClassName: isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto',
  fullWidthActionClassName: isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
    : undefined,
});

const resolveAiTutorEnabled = (
  currentSettings: KangurAiTutorLearnerStoredSettings | null,
  isTemporarilyDisabled: boolean
): boolean => (isTemporarilyDisabled ? false : currentSettings?.enabled ?? false);

const createAiTutorFormState = (
  currentSettings: KangurAiTutorLearnerStoredSettings | null,
  isTemporarilyDisabled: boolean
): KangurAiTutorFormState => {
  const resolvedSettings = {
    ...DEFAULT_AI_TUTOR_FORM_STATE,
    ...currentSettings,
  };

  return {
    ...resolvedSettings,
    enabled: resolveAiTutorEnabled(currentSettings, isTemporarilyDisabled),
  };
};

const resolveCrossPagePersistenceFormState = (
  current: KangurAiTutorFormState,
  checked: boolean
): KangurAiTutorFormState =>
  checked
    ? { ...current, allowCrossPagePersistence: true }
    : {
      ...current,
      allowCrossPagePersistence: false,
      rememberTutorContext: false,
    };

const createAiTutorStoredSettings = (
  formState: KangurAiTutorFormState
): KangurAiTutorLearnerStoredSettings => ({
  enabled: formState.enabled,
  uiMode: formState.uiMode,
  allowCrossPagePersistence: formState.allowCrossPagePersistence,
  rememberTutorContext: formState.rememberTutorContext,
  allowLessons: formState.allowLessons,
  allowGames: formState.allowGames,
  testAccessMode: formState.testAccessMode,
  showSources: formState.showSources,
  allowSelectedTextSupport: formState.allowSelectedTextSupport,
  hintDepth: formState.hintDepth,
  proactiveNudges: formState.proactiveNudges,
  experimentFlags: { coachingMode: null, contextStrategy: null },
});

const resolveAiTutorUsageSummaryText = (
  parentDashboardContent: KangurParentDashboardTutorContent,
  usageSummary: KangurAiTutorUsageSummary | null,
  isUsagePending: boolean,
  hasUsageError: boolean
): string => {
  if (isUsagePending) {
    return parentDashboardContent.usageLoading;
  }

  if (hasUsageError || !usageSummary) {
    return parentDashboardContent.usageError;
  }

  if (usageSummary.dailyMessageLimit === null) {
    return formatKangurAiTutorTemplate(parentDashboardContent.usageUnlimitedTemplate, {
      messageCount: usageSummary.messageCount,
    });
  }

  return formatKangurAiTutorTemplate(parentDashboardContent.usageLimitedTemplate, {
    messageCount: usageSummary.messageCount,
    dailyMessageLimit: usageSummary.dailyMessageLimit,
  });
};

const resolveAiTutorUsageBadgeText = (
  parentDashboardContent: KangurParentDashboardTutorContent,
  usageSummary: KangurAiTutorUsageSummary | null
): string | null => {
  if (!usageSummary) {
    return null;
  }

  if (usageSummary.dailyMessageLimit === null) {
    return parentDashboardContent.usageUnlimitedBadge;
  }

  if (usageSummary.remainingMessages === 0) {
    return parentDashboardContent.usageExhaustedBadge;
  }

  return formatKangurAiTutorTemplate(parentDashboardContent.usageRemainingBadgeTemplate, {
    remainingMessages: usageSummary.remainingMessages,
  });
};

const resolveAiTutorUsagePresentation = ({
  parentDashboardContent,
  usageSummary,
  isUsagePending,
  hasUsageError,
  showUsage,
}: {
  parentDashboardContent: KangurParentDashboardTutorContent;
  usageSummary: KangurAiTutorUsageSummary | null;
  isUsagePending: boolean;
  hasUsageError: boolean;
  showUsage: boolean;
}): KangurAiTutorUsagePresentation => {
  const badgeText = resolveAiTutorUsageBadgeText(parentDashboardContent, usageSummary);

  return {
    showUsage,
    summaryText: resolveAiTutorUsageSummaryText(
      parentDashboardContent,
      usageSummary,
      isUsagePending,
      hasUsageError
    ),
    badgeText,
    showBadge: !isUsagePending && !hasUsageError && Boolean(usageSummary),
  };
};

const resolveAiTutorMoodPresentation = ({
  activeLearner,
  locale,
  parentDashboardContent,
  tutorContent,
}: {
  activeLearner: KangurActiveLearner;
  locale: string;
  parentDashboardContent: KangurParentDashboardTutorContent;
  tutorContent: KangurAiTutorContentValue;
}): KangurAiTutorMoodPresentation => {
  const learnerMood = activeLearner?.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
  const currentMoodPreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.currentMoodId);
  const baselineMoodPreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.baselineMoodId);

  return {
    currentMoodAccent: KANGUR_PARENT_TUTOR_MOOD_ACCENTS[learnerMood.currentMoodId],
    currentMoodId: learnerMood.currentMoodId,
    currentMoodLabel: currentMoodPreset.label,
    currentMoodDescription: currentMoodPreset.description,
    baselineMoodLabel: baselineMoodPreset.label,
    moodConfidence: `${Math.round(learnerMood.confidence * 100)}%`,
    moodUpdatedAt: formatTutorMoodTimestamp(
      learnerMood.lastComputedAt,
      parentDashboardContent.updatedFallback,
      locale
    ),
  };
};

function TutorToggleField({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): React.JSX.Element {
  const controlId = useId();

  return (
    <label
      htmlFor={controlId}
      aria-label={label}
      className={`flex items-start kangur-panel-gap rounded-2xl border px-3 py-3 transition-colors ${
        disabled
          ? 'cursor-not-allowed [border-color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_72%,#cbd5e1)] opacity-70'
          : checked
            ? 'cursor-pointer border-amber-200 bg-amber-50/65'
            : 'cursor-pointer [border-color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
      }`}
    >
      <div className='relative mt-0.5'>
        <input
          id={controlId}
          type='checkbox'
          className='sr-only'
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
        />
        <div
          className={`h-5 w-10 rounded-full transition-all ${
            checked
              ? 'bg-gradient-to-r kangur-gradient-accent-amber shadow-[0_8px_18px_-14px_rgba(249,115,22,0.72)]'
              : '[background:color-mix(in_srgb,var(--kangur-soft-card-border)_86%,#94a3b8)]'
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full [background:var(--kangur-soft-card-background)] shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      <div className='min-w-0'>
        <div className='text-sm font-medium [color:var(--kangur-page-text)]'>{label}</div>
        <div className='mt-1 text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
          {description}
        </div>
      </div>
    </label>
  );
}

function AiTutorSelectFieldRow({
  children,
  description,
  disabled = false,
  id,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  description: string;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  value: string;
}): React.JSX.Element {
  return (
    <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
      <label
        htmlFor={id}
        className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
      >
        {label}
      </label>
      <KangurSelectField
        id={id}
        value={value}
        onChange={onChange}
        accent='amber'
        size='md'
        disabled={disabled}
      >
        {children}
      </KangurSelectField>
      <p className='text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>{description}</p>
    </div>
  );
}

function useAiTutorVisibilityHidden(): boolean {
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

  return isTutorHidden;
}

function useAiTutorDeferredUsageQueryReady(shouldLoadUsage: boolean): boolean {
  const [isUsageQueryReady, setIsUsageQueryReady] = useState(false);

  useEffect(() => {
    if (!shouldLoadUsage) {
      setIsUsageQueryReady(false);
      return;
    }

    setIsUsageQueryReady(false);
    const timeoutId = setTimeout(() => {
      setIsUsageQueryReady(true);
    }, AI_TUTOR_USAGE_LOAD_DEFER_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [shouldLoadUsage]);

  return isUsageQueryReady;
}

function useAiTutorUsageState({
  activeLearnerId,
  shouldLoadUsage,
}: {
  activeLearnerId: string | null;
  shouldLoadUsage: boolean;
}): {
  usageSummary: KangurAiTutorUsageSummary | null;
  isUsagePending: boolean;
  hasUsageError: boolean;
} {
  const isUsageQueryReady = useAiTutorDeferredUsageQueryReady(shouldLoadUsage);
  const { data, isLoading, isError } = createSingleQueryV2<KangurAiTutorUsageResponse>({
    id: activeLearnerId,
    queryKey: kangurKeys.aiTutor.usage(activeLearnerId),
    queryFn: async () => {
      if (!activeLearnerId) {
        throw new Error('Missing active learner.');
      }

      return api.get<KangurAiTutorUsageResponse>('/api/kangur/ai-tutor/usage', {
        headers: {
          'x-kangur-learner-id': activeLearnerId,
        },
      });
    },
    enabled: shouldLoadUsage && isUsageQueryReady,
    staleTime: 10_000,
    refetchInterval: shouldLoadUsage && isUsageQueryReady ? 30_000 : false,
    refetchOnWindowFocus: false,
    meta: {
      source: 'kangur.ui.KangurParentDashboardAiTutorWidget.usage',
      operation: 'detail',
      resource: 'kangur.ai-tutor.usage',
      domain: 'kangur',
      queryKey: kangurKeys.aiTutor.usage(activeLearnerId),
      tags: ['kangur', 'ai-tutor', 'usage'],
      description: 'Loads AI tutor usage for the active learner.',
    },
  });

  return {
    usageSummary: data?.usage ?? null,
    isUsagePending: shouldLoadUsage && (!isUsageQueryReady || isLoading),
    hasUsageError: isError,
  };
}

function useAiTutorConfigFormState({
  activeLearnerId,
  currentSettings,
  isTemporarilyDisabled,
}: {
  activeLearnerId: string | null;
  currentSettings: KangurAiTutorLearnerStoredSettings | null;
  isTemporarilyDisabled: boolean;
}): KangurAiTutorFormBindings {
  const [formState, setFormState] = useState(() =>
    createAiTutorFormState(currentSettings, isTemporarilyDisabled)
  );

  useEffect(() => {
    setFormState(createAiTutorFormState(currentSettings, isTemporarilyDisabled));
  }, [activeLearnerId, currentSettings, isTemporarilyDisabled]);

  const updateFormState = useCallback((next: Partial<KangurAiTutorFormState>): void => {
    setFormState((current) => ({ ...current, ...next }));
  }, []);

  const setAllowCrossPagePersistence = useCallback((checked: boolean): void => {
    setFormState((current) => resolveCrossPagePersistenceFormState(current, checked));
  }, []);

  return {
    formState,
    setEnabled: useCallback((enabled: boolean) => updateFormState({ enabled }), [updateFormState]),
    setUiMode: useCallback((uiMode: KangurAiTutorUiMode) => updateFormState({ uiMode }), [updateFormState]),
    setAllowCrossPagePersistence,
    setRememberTutorContext: useCallback(
      (rememberTutorContext: boolean) => updateFormState({ rememberTutorContext }),
      [updateFormState]
    ),
    setAllowLessons: useCallback(
      (allowLessons: boolean) => updateFormState({ allowLessons }),
      [updateFormState]
    ),
    setAllowGames: useCallback((allowGames: boolean) => updateFormState({ allowGames }), [updateFormState]),
    setTestAccessMode: useCallback(
      (testAccessMode: KangurAiTutorTestAccessMode) => updateFormState({ testAccessMode }),
      [updateFormState]
    ),
    setShowSources: useCallback((showSources: boolean) => updateFormState({ showSources }), [updateFormState]),
    setAllowSelectedTextSupport: useCallback(
      (allowSelectedTextSupport: boolean) => updateFormState({ allowSelectedTextSupport }),
      [updateFormState]
    ),
    setHintDepth: useCallback(
      (hintDepth: KangurAiTutorHintDepth) => updateFormState({ hintDepth }),
      [updateFormState]
    ),
    setProactiveNudges: useCallback(
      (proactiveNudges: KangurAiTutorProactiveNudges) => updateFormState({ proactiveNudges }),
      [updateFormState]
    ),
  };
}

function useAiTutorStoredSettings(
  activeLearnerId: string | null
): {
  settingsStoreMap: ReturnType<typeof parseKangurAiTutorSettings>;
  currentSettings: KangurAiTutorLearnerStoredSettings | null;
} {
  const settingsStore = useSettingsStore();
  const rawSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const rawAppSettings = settingsStore.get(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const settingsStoreMap = useMemo(
    () => parseKangurAiTutorSettings(rawSettings),
    [rawSettings]
  );
  const appSettings = useMemo(
    () => resolveKangurAiTutorAppSettings(rawAppSettings, settingsStoreMap),
    [rawAppSettings, settingsStoreMap]
  );
  const currentSettings = useMemo(
    () =>
      activeLearnerId
        ? getKangurAiTutorSettingsForLearner(settingsStoreMap, activeLearnerId, appSettings)
        : null,
    [activeLearnerId, appSettings, settingsStoreMap]
  );

  return { settingsStoreMap, currentSettings };
}

const resolveShouldLoadAiTutorUsage = ({
  activeLearnerId,
  canAccessDashboard,
  isUsageEnabled,
}: {
  activeLearnerId: string | null;
  canAccessDashboard: boolean;
  isUsageEnabled: boolean;
}): boolean => canAccessDashboard && Boolean(activeLearnerId) && isUsageEnabled;

const resolveAiTutorPanelCopy = ({
  activeLearner,
  aiTutorSectionContent,
  fallbackSectionTitle,
  tutorContent,
}: {
  activeLearner: KangurActiveLearner;
  aiTutorSectionContent: { title?: string | null; summary?: string | null } | null | undefined;
  fallbackSectionTitle: string;
  tutorContent: KangurAiTutorContentValue;
}): {
  sectionTitle: string;
  sectionSummary: string;
  learnerHeaderTitle: string | undefined;
  enableTutorLabel: string;
} => ({
  sectionTitle: aiTutorSectionContent?.title ?? fallbackSectionTitle,
  sectionSummary: aiTutorSectionContent?.summary ?? tutorContent.parentDashboard.subtitle,
  learnerHeaderTitle: activeLearner
    ? formatKangurAiTutorTemplate(tutorContent.parentDashboard.titleTemplate, {
      learnerName: activeLearner.displayName,
    })
    : undefined,
  enableTutorLabel:
    tutorContent.common.enableTutorLabel ?? tutorContent.navigation.restoreTutorLabel,
});

const resolveAiTutorControlsDisabled = (
  isTemporarilyDisabled: boolean,
  enabled: boolean
): boolean => isTemporarilyDisabled || !enabled;

function useAiTutorConfigPanelState() {
  const locale = useLocale();
  const translations = useTranslations('KangurParentDashboard');
  const isCoarsePointer = useKangurCoarsePointer();
  const tutorContent = useKangurAiTutorContent();
  const tutor = useOptionalKangurAiTutor();
  const { activeLearner, canAccessDashboard } = useKangurParentDashboardRuntime();
  const { entry: aiTutorSectionContent } = useKangurPageContentEntry('parent-dashboard-ai-tutor');
  const queryClient = useQueryClient();
  const activeLearnerId = activeLearner?.id ?? null;
  const isTemporarilyDisabled = PARENT_DASHBOARD_AI_TUTOR_TEMPORARILY_DISABLED;
  const isTutorHidden = useAiTutorVisibilityHidden();
  const { settingsStoreMap, currentSettings } = useAiTutorStoredSettings(activeLearnerId);
  const formBindings = useAiTutorConfigFormState({
    activeLearnerId,
    currentSettings,
    isTemporarilyDisabled,
  });
  const { formState } = formBindings;
  const isUsageEnabled = !isTemporarilyDisabled && formState.enabled;
  const shouldLoadUsage = resolveShouldLoadAiTutorUsage({
    activeLearnerId,
    canAccessDashboard,
    isUsageEnabled,
  });
  const { usageSummary, isUsagePending, hasUsageError } = useAiTutorUsageState({
    activeLearnerId,
    shouldLoadUsage,
  });
  const moodPresentation = useMemo(
    () =>
      resolveAiTutorMoodPresentation({
        activeLearner,
        locale,
        parentDashboardContent: tutorContent.parentDashboard,
        tutorContent,
      }),
    [activeLearner, locale, tutorContent]
  );
  const usagePresentation = useMemo(
    () =>
      resolveAiTutorUsagePresentation({
        parentDashboardContent: tutorContent.parentDashboard,
        usageSummary,
        isUsagePending,
        hasUsageError,
        showUsage: isUsageEnabled,
      }),
    [hasUsageError, isUsageEnabled, isUsagePending, tutorContent.parentDashboard, usageSummary]
  );
  const actionClasses = useMemo(
    () => resolveAiTutorActionClasses(isCoarsePointer),
    [isCoarsePointer]
  );
  const panelCopy = useMemo(
    () =>
      resolveAiTutorPanelCopy({
        activeLearner,
        aiTutorSectionContent,
        fallbackSectionTitle: translations('widgets.aiTutor.title'),
        tutorContent,
      }),
    [activeLearner, aiTutorSectionContent, translations, tutorContent]
  );
  const controlsDisabled = resolveAiTutorControlsDisabled(
    isTemporarilyDisabled,
    formState.enabled
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const uiModeFieldId = useId();
  const testAccessModeFieldId = useId();
  const hintDepthFieldId = useId();
  const proactiveNudgesFieldId = useId();

  const handleRestoreTutor = useCallback((): void => {
    persistTutorVisibilityHidden(false);
    if (tutor?.enabled) {
      tutor.openChat();
    }
  }, [tutor]);

  const handleToggleEnabled = useCallback((): void => {
    const nextEnabled = !formState.enabled;
    formBindings.setEnabled(nextEnabled);
    if (nextEnabled) {
      persistTutorVisibilityHidden(false);
    }
  }, [formBindings.setEnabled, formState.enabled]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!activeLearner || !canAccessDashboard || isTemporarilyDisabled) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    const next = createAiTutorStoredSettings(formState);
    const nextStore = {
      ...settingsStoreMap,
      [activeLearner.id]: next,
    };

    await withKangurClientError(
      {
        source: 'kangur-parent-dashboard',
        action: 'save-ai-tutor-settings',
        description: 'Save AI tutor settings for a learner.',
        context: {
          learnerId: activeLearner.id,
        },
      },
      async () => {
        await api.post('/api/settings', {
          key: KANGUR_AI_TUTOR_SETTINGS_KEY,
          value: serializeSetting(nextStore),
        });
        invalidateSettingsCache();
        await invalidateAllSettings(queryClient);
        if (next.enabled) {
          await queryClient.invalidateQueries({
            queryKey: kangurKeys.aiTutor.usage(activeLearner.id),
          });
        }
        setFeedback(tutorContent.parentDashboard.saveSuccess);
      },
      {
        fallback: undefined,
        onError: () => {
          setFeedback(tutorContent.parentDashboard.saveError);
        },
      }
    );
    setIsSaving(false);
  }, [
    activeLearner,
    canAccessDashboard,
    formState,
    isTemporarilyDisabled,
    queryClient,
    settingsStoreMap,
    tutorContent.parentDashboard.saveError,
    tutorContent.parentDashboard.saveSuccess,
  ]);

  return {
    actionClasses,
    activeLearner,
    controlsDisabled,
    feedback,
    formBindings,
    handleRestoreTutor,
    handleSave,
    handleToggleEnabled,
    hintDepthFieldId,
    isSaving,
    isTemporarilyDisabled,
    isTutorHidden,
    learnerHeaderTitle: panelCopy.learnerHeaderTitle,
    moodPresentation,
    proactiveNudgesFieldId,
    sectionSummary: panelCopy.sectionSummary,
    sectionTitle: panelCopy.sectionTitle,
    testAccessModeFieldId,
    tutorContent,
    uiModeFieldId,
    usagePresentation,
    enableTutorLabel: panelCopy.enableTutorLabel,
  };
}

type AiTutorConfigPanelState = ReturnType<typeof useAiTutorConfigPanelState>;

function AiTutorPanelHeader({
  sectionSummary,
  sectionTitle,
  title,
}: {
  sectionSummary: string;
  sectionTitle: string;
  title: string;
}): React.JSX.Element {
  return (
    <KangurPanelRow className='items-start sm:items-center'>
      <BrainCircuit aria-hidden='true' className='h-5 w-5 text-orange-500' />
      <KangurPanelIntro
        className='min-w-0'
        description={sectionSummary}
        descriptionClassName='text-xs'
        eyebrow={sectionTitle}
        eyebrowClassName='tracking-[0.18em]'
        title={title}
        titleClassName='mt-1 text-sm font-bold'
      />
    </KangurPanelRow>
  );
}

function AiTutorNoActiveLearnerPanel({
  state,
}: {
  state: AiTutorConfigPanelState;
}): React.JSX.Element {
  return (
    <KangurSurfacePanel accent='amber' padding='lg' className='w-full'>
      <KangurPanelStack>
        <AiTutorPanelHeader
          sectionSummary={state.sectionSummary}
          sectionTitle={state.sectionTitle}
          title={state.tutorContent.parentDashboard.noActiveLearner}
        />
        {state.isTutorHidden ? (
          <KangurButton
            className={`${state.actionClasses.compactActionClassName} ${KANGUR_PARENT_DASHBOARD_ENABLE_TUTOR_BUTTON_CLASSNAME}`}
            onClick={state.handleRestoreTutor}
            size='sm'
            variant='surface'
            data-testid='parent-dashboard-ai-tutor-enable'
          >
            {state.enableTutorLabel}
          </KangurButton>
        ) : null}
      </KangurPanelStack>
    </KangurSurfacePanel>
  );
}

function AiTutorMoodSection({
  parentDashboardContent,
  presentation,
}: {
  parentDashboardContent: KangurParentDashboardTutorContent;
  presentation: KangurAiTutorMoodPresentation;
}): React.JSX.Element {
  return (
    <div
      className='rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3'
      data-testid='parent-dashboard-ai-tutor-mood'
    >
      <KangurPanelRow className='sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <KangurSectionEyebrow className='text-xs tracking-wide text-emerald-700'>
            {parentDashboardContent.moodTitle}
          </KangurSectionEyebrow>
          <KangurCardDescription
            as='p'
            className='mt-1 leading-relaxed'
            data-testid='parent-dashboard-ai-tutor-mood-description'
            size='sm'
          >
            {presentation.currentMoodDescription}
          </KangurCardDescription>
        </div>
        <KangurStatusChip
          accent={presentation.currentMoodAccent}
          className='w-fit self-start sm:self-auto'
          data-mood-id={presentation.currentMoodId}
          data-testid='parent-dashboard-ai-tutor-mood-current'
        >
          {presentation.currentMoodLabel}
        </KangurStatusChip>
      </KangurPanelRow>

      <div className='mt-3 grid kangur-panel-gap text-xs [color:var(--kangur-page-muted-text)] min-[420px]:grid-cols-2 lg:grid-cols-3'>
        <KangurLabeledValueSummary
          label={parentDashboardContent.baselineLabel}
          labelClassName='text-xs tracking-wide'
          value={presentation.baselineMoodLabel}
          valueClassName='mt-1'
          valueTestId='parent-dashboard-ai-tutor-mood-baseline'
        />
        <KangurLabeledValueSummary
          label={parentDashboardContent.confidenceLabel}
          labelClassName='text-xs tracking-wide'
          value={presentation.moodConfidence}
          valueClassName='mt-1'
          valueTestId='parent-dashboard-ai-tutor-mood-confidence'
        />
        <KangurLabeledValueSummary
          label={parentDashboardContent.updatedLabel}
          labelClassName='text-xs tracking-wide'
          value={presentation.moodUpdatedAt}
          valueClassName='mt-1'
          valueTestId='parent-dashboard-ai-tutor-mood-updated'
        />
      </div>
    </div>
  );
}

function AiTutorUsageSection({
  parentDashboardContent,
  presentation,
}: {
  parentDashboardContent: KangurParentDashboardTutorContent;
  presentation: KangurAiTutorUsagePresentation;
}): React.JSX.Element | null {
  if (!presentation.showUsage) {
    return null;
  }

  return (
    <div className='rounded-2xl border border-amber-100 bg-amber-50/75 px-4 py-3'>
      <KangurPanelRow className='items-start sm:justify-between'>
        <div className='min-w-0'>
          <KangurSectionEyebrow className='text-xs tracking-wide text-amber-700'>
            {parentDashboardContent.usageTitle}
          </KangurSectionEyebrow>
          <KangurCardTitle className='mt-1'>{presentation.summaryText}</KangurCardTitle>
        </div>
        {presentation.showBadge ? (
          <div className='rounded-full [background:color-mix(in_srgb,var(--kangur-soft-card-background)_90%,#ffffff)] px-3 py-1 text-xs font-semibold text-amber-700 sm:shrink-0'>
            {presentation.badgeText}
          </div>
        ) : null}
      </KangurPanelRow>
      <KangurCardDescription as='p' className='mt-2 leading-relaxed' size='xs'>
        {parentDashboardContent.usageHelp}
      </KangurCardDescription>
    </div>
  );
}

function AiTutorAvailabilityRow({
  compactActionClassName,
  enabled,
  isTemporarilyDisabled,
  onToggleEnabled,
  parentDashboardContent,
}: {
  compactActionClassName: string;
  enabled: boolean;
  isTemporarilyDisabled: boolean;
  onToggleEnabled: () => void;
  parentDashboardContent: KangurParentDashboardTutorContent;
}): React.JSX.Element {
  return (
    <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
      <span className='text-sm font-medium [color:var(--kangur-page-text)]'>
        {enabled
          ? parentDashboardContent.toggleEnabledLabel
          : parentDashboardContent.toggleDisabledLabel}
      </span>
      <KangurButton
        className={compactActionClassName}
        onClick={onToggleEnabled}
        size='sm'
        variant={enabled ? 'surface' : 'primary'}
        disabled={isTemporarilyDisabled}
      >
        {enabled
          ? parentDashboardContent.toggleDisableActionLabel
          : parentDashboardContent.toggleEnableActionLabel}
      </KangurButton>
    </div>
  );
}

function AiTutorGuardrailsSection({
  controlsDisabled,
  formBindings,
  hintDepthFieldId,
  parentDashboardContent,
  proactiveNudgesFieldId,
  testAccessModeFieldId,
}: {
  controlsDisabled: boolean;
  formBindings: AiTutorConfigPanelState['formBindings'];
  hintDepthFieldId: string;
  parentDashboardContent: KangurParentDashboardTutorContent;
  proactiveNudgesFieldId: string;
  testAccessModeFieldId: string;
}): React.JSX.Element {
  return (
    <div className='space-y-3'>
      <KangurSectionEyebrow className='text-xs tracking-wide'>
        {parentDashboardContent.guardrailsTitle}
      </KangurSectionEyebrow>
      <TutorToggleField
        checked={formBindings.formState.allowLessons}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.allowLessonsLabel}
        description={parentDashboardContent.toggles.allowLessonsDescription}
        onChange={formBindings.setAllowLessons}
      />
      <TutorToggleField
        checked={formBindings.formState.allowGames}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.allowGamesLabel}
        description={parentDashboardContent.toggles.allowGamesDescription}
        onChange={formBindings.setAllowGames}
      />
      <AiTutorSelectFieldRow
        id={testAccessModeFieldId}
        value={formBindings.formState.testAccessMode}
        onChange={(event) =>
          formBindings.setTestAccessMode(event.target.value as KangurAiTutorTestAccessMode)}
        label={parentDashboardContent.selects.testAccessModeLabel}
        description={parentDashboardContent.selects.testAccessModeDescription}
        disabled={controlsDisabled}
      >
        <option value='disabled'>{parentDashboardContent.selects.testAccessModeDisabled}</option>
        <option value='guided'>{parentDashboardContent.selects.testAccessModeGuided}</option>
        <option value='review_after_answer'>
          {parentDashboardContent.selects.testAccessModeReview}
        </option>
      </AiTutorSelectFieldRow>
      <div className='grid kangur-panel-gap min-[420px]:grid-cols-2'>
        <AiTutorSelectFieldRow
          id={hintDepthFieldId}
          value={formBindings.formState.hintDepth}
          onChange={(event) =>
            formBindings.setHintDepth(event.target.value as KangurAiTutorHintDepth)}
          label={parentDashboardContent.selects.hintDepthLabel}
          description={parentDashboardContent.selects.hintDepthDescription}
          disabled={controlsDisabled}
        >
          <option value='brief'>{parentDashboardContent.selects.hintDepthBrief}</option>
          <option value='guided'>{parentDashboardContent.selects.hintDepthGuided}</option>
          <option value='step_by_step'>
            {parentDashboardContent.selects.hintDepthStepByStep}
          </option>
        </AiTutorSelectFieldRow>
        <AiTutorSelectFieldRow
          id={proactiveNudgesFieldId}
          value={formBindings.formState.proactiveNudges}
          onChange={(event) =>
            formBindings.setProactiveNudges(
              event.target.value as KangurAiTutorProactiveNudges
            )}
          label={parentDashboardContent.selects.proactiveNudgesLabel}
          description={parentDashboardContent.selects.proactiveNudgesDescription}
          disabled={controlsDisabled}
        >
          <option value='off'>{parentDashboardContent.selects.proactiveNudgesOff}</option>
          <option value='gentle'>{parentDashboardContent.selects.proactiveNudgesGentle}</option>
          <option value='coach'>{parentDashboardContent.selects.proactiveNudgesCoach}</option>
        </AiTutorSelectFieldRow>
      </div>
      <TutorToggleField
        checked={formBindings.formState.showSources}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.showSourcesLabel}
        description={parentDashboardContent.toggles.showSourcesDescription}
        onChange={formBindings.setShowSources}
      />
      <TutorToggleField
        checked={formBindings.formState.allowSelectedTextSupport}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.allowSelectedTextSupportLabel}
        description={parentDashboardContent.toggles.allowSelectedTextSupportDescription}
        onChange={formBindings.setAllowSelectedTextSupport}
      />
      <TutorToggleField
        checked={formBindings.formState.allowCrossPagePersistence}
        disabled={controlsDisabled}
        label={parentDashboardContent.toggles.allowCrossPagePersistenceLabel}
        description={parentDashboardContent.toggles.allowCrossPagePersistenceDescription}
        onChange={formBindings.setAllowCrossPagePersistence}
      />
      <TutorToggleField
        checked={formBindings.formState.rememberTutorContext}
        disabled={controlsDisabled || !formBindings.formState.allowCrossPagePersistence}
        label={parentDashboardContent.toggles.rememberTutorContextLabel}
        description={parentDashboardContent.toggles.rememberTutorContextDescription}
        onChange={formBindings.setRememberTutorContext}
      />
    </div>
  );
}

function AiTutorUiModeSection({
  controlsDisabled,
  formBindings,
  parentDashboardContent,
  uiModeFieldId,
}: {
  controlsDisabled: boolean;
  formBindings: AiTutorConfigPanelState['formBindings'];
  parentDashboardContent: KangurParentDashboardTutorContent;
  uiModeFieldId: string;
}): React.JSX.Element {
  return (
    <AiTutorSelectFieldRow
      id={uiModeFieldId}
      value={formBindings.formState.uiMode}
      onChange={(event) =>
        formBindings.setUiMode(event.target.value as KangurAiTutorUiMode)}
      label={parentDashboardContent.selects.uiModeLabel}
      description={parentDashboardContent.selects.uiModeDescription}
      disabled={controlsDisabled}
    >
      <option value='anchored'>{parentDashboardContent.selects.uiModeAnchored}</option>
      <option value='freeform'>{parentDashboardContent.selects.uiModeFreeform}</option>
      <option value='static'>{parentDashboardContent.selects.uiModeStatic}</option>
    </AiTutorSelectFieldRow>
  );
}

function AiTutorSaveAction({
  feedback,
  fullWidthActionClassName,
  isSaving,
  isTemporarilyDisabled,
  onSave,
  parentDashboardContent,
}: {
  feedback: string | null;
  fullWidthActionClassName: string | undefined;
  isSaving: boolean;
  isTemporarilyDisabled: boolean;
  onSave: () => Promise<void>;
  parentDashboardContent: KangurParentDashboardTutorContent;
}): React.JSX.Element {
  return (
    <>
      <KangurButton
        type='button'
        variant='primary'
        size='sm'
        onClick={() => void onSave()}
        disabled={isSaving || isTemporarilyDisabled}
        fullWidth
        className={fullWidthActionClassName}
      >
        {isSaving
          ? parentDashboardContent.savePendingLabel
          : parentDashboardContent.saveIdleLabel}
      </KangurButton>

      {feedback ? (
        <p
          className='text-xs text-center [color:var(--kangur-page-muted-text)]'
          role='status'
          aria-live='polite'
        >
          {feedback}
        </p>
      ) : null}
    </>
  );
}

function AiTutorConfiguredPanel({
  state,
}: {
  state: AiTutorConfigPanelState;
}): React.JSX.Element {
  const parentDashboardContent = state.tutorContent.parentDashboard;

  return (
    <KangurSurfacePanel accent='amber' padding='lg' className='w-full'>
      <KangurPanelStack>
        <AiTutorPanelHeader
          sectionSummary={state.sectionSummary}
          sectionTitle={state.sectionTitle}
          title={state.learnerHeaderTitle ?? parentDashboardContent.noActiveLearner}
        />
        <AiTutorMoodSection
          parentDashboardContent={parentDashboardContent}
          presentation={state.moodPresentation}
        />
        <AiTutorUsageSection
          parentDashboardContent={parentDashboardContent}
          presentation={state.usagePresentation}
        />
        <AiTutorAvailabilityRow
          compactActionClassName={state.actionClasses.compactActionClassName}
          enabled={state.formBindings.formState.enabled}
          isTemporarilyDisabled={state.isTemporarilyDisabled}
          onToggleEnabled={state.handleToggleEnabled}
          parentDashboardContent={parentDashboardContent}
        />
        <AiTutorGuardrailsSection
          controlsDisabled={state.controlsDisabled}
          formBindings={state.formBindings}
          hintDepthFieldId={state.hintDepthFieldId}
          parentDashboardContent={parentDashboardContent}
          proactiveNudgesFieldId={state.proactiveNudgesFieldId}
          testAccessModeFieldId={state.testAccessModeFieldId}
        />
        <AiTutorUiModeSection
          controlsDisabled={state.controlsDisabled}
          formBindings={state.formBindings}
          parentDashboardContent={parentDashboardContent}
          uiModeFieldId={state.uiModeFieldId}
        />
        <AiTutorSaveAction
          feedback={state.feedback}
          fullWidthActionClassName={state.actionClasses.fullWidthActionClassName}
          isSaving={state.isSaving}
          isTemporarilyDisabled={state.isTemporarilyDisabled}
          onSave={state.handleSave}
          parentDashboardContent={parentDashboardContent}
        />
      </KangurPanelStack>
    </KangurSurfacePanel>
  );
}

function AiTutorConfigPanel(): React.JSX.Element | null {
  const state = useAiTutorConfigPanelState();

  if (!state.activeLearner) {
    return <AiTutorNoActiveLearnerPanel state={state} />;
  }

  return <AiTutorConfiguredPanel state={state} />;
}

export function KangurParentDashboardAiTutorWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeTab, canAccessDashboard } = useKangurParentDashboardRuntime();

  if (!canAccessDashboard) return null;
  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'ai-tutor')) return null;

  return <AiTutorConfigPanel />;
}
