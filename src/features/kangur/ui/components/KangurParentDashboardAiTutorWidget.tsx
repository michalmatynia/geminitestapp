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
} from '@/features/kangur/settings-ai-tutor';
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

function AiTutorConfigPanel(): React.JSX.Element | null {
  const locale = useLocale();
  const translations = useTranslations('KangurParentDashboard');
  const tutorContent = useKangurAiTutorContent();
  const tutor = useOptionalKangurAiTutor();
  const { activeLearner, canAccessDashboard } = useKangurParentDashboardRuntime();
  const { entry: aiTutorSectionContent } = useKangurPageContentEntry('parent-dashboard-ai-tutor');
  const settingsStore = useSettingsStore();
  const queryClient = useQueryClient();
  const activeLearnerId = activeLearner?.id ?? null;
  const isTemporarilyDisabled = PARENT_DASHBOARD_AI_TUTOR_TEMPORARILY_DISABLED;
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());

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
    [appSettings, settingsStoreMap, activeLearnerId]
  );
  const isUsageEnabled = isTemporarilyDisabled ? false : currentSettings?.enabled ?? false;
  const shouldLoadUsage = canAccessDashboard && Boolean(activeLearnerId) && isUsageEnabled;

  const [enabled, setEnabled] = useState(isUsageEnabled);
  const [uiMode, setUiMode] = useState<KangurAiTutorUiMode>(
    currentSettings?.uiMode ?? 'anchored'
  );
  const [allowCrossPagePersistence, setAllowCrossPagePersistence] = useState(
    currentSettings?.allowCrossPagePersistence ?? true
  );
  const [rememberTutorContext, setRememberTutorContext] = useState(
    currentSettings?.rememberTutorContext ?? true
  );
  const [allowLessons, setAllowLessons] = useState(currentSettings?.allowLessons ?? true);
  const [allowGames, setAllowGames] = useState(currentSettings?.allowGames ?? true);
  const [testAccessMode, setTestAccessMode] = useState<KangurAiTutorTestAccessMode>(
    currentSettings?.testAccessMode ?? 'guided'
  );
  const [showSources, setShowSources] = useState(currentSettings?.showSources ?? true);
  const [allowSelectedTextSupport, setAllowSelectedTextSupport] = useState(
    currentSettings?.allowSelectedTextSupport ?? true
  );
  const [hintDepth, setHintDepth] = useState<KangurAiTutorHintDepth>(
    currentSettings?.hintDepth ?? 'guided'
  );
  const [proactiveNudges, setProactiveNudges] = useState<KangurAiTutorProactiveNudges>(
    currentSettings?.proactiveNudges ?? 'gentle'
  );

  useEffect(() => {
    setEnabled(isTemporarilyDisabled ? false : currentSettings?.enabled ?? false);
    setUiMode(currentSettings?.uiMode ?? 'anchored');
    setAllowCrossPagePersistence(currentSettings?.allowCrossPagePersistence ?? true);
    setRememberTutorContext(currentSettings?.rememberTutorContext ?? true);
    setAllowLessons(currentSettings?.allowLessons ?? true);
    setAllowGames(currentSettings?.allowGames ?? true);
    setTestAccessMode(currentSettings?.testAccessMode ?? 'guided');
    setShowSources(currentSettings?.showSources ?? true);
    setAllowSelectedTextSupport(currentSettings?.allowSelectedTextSupport ?? true);
    setHintDepth(currentSettings?.hintDepth ?? 'guided');
    setProactiveNudges(currentSettings?.proactiveNudges ?? 'gentle');
  }, [activeLearner?.id, currentSettings, isTemporarilyDisabled]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const uiModeFieldId = useId();
  const testAccessModeFieldId = useId();
  const hintDepthFieldId = useId();
  const proactiveNudgesFieldId = useId();
  const {
    data: tutorUsageResponse,
    isLoading: isUsageLoading,
    isError: hasUsageError,
  } = createSingleQueryV2<KangurAiTutorUsageResponse>({
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
    enabled: shouldLoadUsage,
    staleTime: 10_000,
    refetchInterval: shouldLoadUsage ? 30_000 : false,
    refetchOnWindowFocus: true,
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
  const usageSummary = tutorUsageResponse?.usage ?? null;
  const usageSummaryText = (() => {
    if (isUsageLoading) return tutorContent.parentDashboard.usageLoading;
    if (hasUsageError || !usageSummary) return tutorContent.parentDashboard.usageError;
    if (usageSummary.dailyMessageLimit === null) {
      return formatKangurAiTutorTemplate(
        tutorContent.parentDashboard.usageUnlimitedTemplate,
        { messageCount: usageSummary.messageCount }
      );
    }
    return formatKangurAiTutorTemplate(
      tutorContent.parentDashboard.usageLimitedTemplate,
      {
        messageCount: usageSummary.messageCount,
        dailyMessageLimit: usageSummary.dailyMessageLimit,
      }
    );
  })();
  const usageBadgeText = (() => {
    if (!usageSummary) return null;
    if (usageSummary.dailyMessageLimit === null) {
      return tutorContent.parentDashboard.usageUnlimitedBadge;
    }
    if (usageSummary.remainingMessages === 0) {
      return tutorContent.parentDashboard.usageExhaustedBadge;
    }
    return formatKangurAiTutorTemplate(
      tutorContent.parentDashboard.usageRemainingBadgeTemplate,
      { remainingMessages: usageSummary.remainingMessages }
    );
  })();
  const learnerMood = activeLearner?.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
  const currentMoodPreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.currentMoodId);
  const baselineMoodPreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.baselineMoodId);
  const currentMoodAccent = KANGUR_PARENT_TUTOR_MOOD_ACCENTS[learnerMood.currentMoodId];
  const moodConfidence = `${Math.round(learnerMood.confidence * 100)}%`;
  const moodUpdatedAt = formatTutorMoodTimestamp(
    learnerMood.lastComputedAt,
    tutorContent.parentDashboard.updatedFallback,
    locale
  );
  const learnerHeaderTitle = activeLearner
    ? formatKangurAiTutorTemplate(tutorContent.parentDashboard.titleTemplate, {
      learnerName: activeLearner.displayName,
    })
    : undefined;
  const sectionTitle = aiTutorSectionContent?.title ?? translations('widgets.aiTutor.title');
  const sectionSummary = aiTutorSectionContent?.summary ?? tutorContent.parentDashboard.subtitle;
  const controlsDisabled = isTemporarilyDisabled || !enabled;
  const enableTutorLabel =
    tutorContent.common.enableTutorLabel ?? tutorContent.navigation.restoreTutorLabel;

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!activeLearner || !canAccessDashboard || isTemporarilyDisabled) return;

    setIsSaving(true);
    setFeedback(null);

    const next: KangurAiTutorLearnerStoredSettings = {
      enabled,
      uiMode,
      allowCrossPagePersistence,
      rememberTutorContext,
      allowLessons,
      allowGames,
      testAccessMode,
      showSources,
      allowSelectedTextSupport,
      hintDepth,
      proactiveNudges,
      experimentFlags: { coachingMode: null, contextStrategy: null },
    };

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
    isTemporarilyDisabled,
    enabled,
    uiMode,
    allowCrossPagePersistence,
    rememberTutorContext,
    allowLessons,
    allowGames,
    testAccessMode,
    showSources,
    allowSelectedTextSupport,
    hintDepth,
    proactiveNudges,
    settingsStoreMap,
    queryClient,
    tutorContent.parentDashboard.saveError,
    tutorContent.parentDashboard.saveSuccess,
  ]);

  if (!activeLearner) {
    return (
      <KangurSurfacePanel
        accent='amber'
        padding='lg'
        className='w-full'
      >
        <KangurPanelStack>
          <KangurPanelRow className='items-start sm:items-center'>
            <BrainCircuit aria-hidden='true' className='h-5 w-5 text-orange-500' />
            <KangurPanelIntro
              className='min-w-0'
              description={sectionSummary}
              descriptionClassName='text-xs'
              eyebrow={sectionTitle}
              eyebrowClassName='tracking-[0.18em]'
              title={tutorContent.parentDashboard.noActiveLearner}
              titleClassName='mt-1 text-sm font-bold'
            />
          </KangurPanelRow>
          {isTutorHidden ? (
            <KangurButton
              className='w-full border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800 sm:w-auto'
              onClick={() => {
                persistTutorVisibilityHidden(false);
                if (tutor?.enabled) {
                  tutor.openChat();
                }
              }}
              size='sm'
              variant='surface'
              data-testid='parent-dashboard-ai-tutor-enable'
            >
              {enableTutorLabel}
            </KangurButton>
          ) : null}
        </KangurPanelStack>
      </KangurSurfacePanel>
    );
  }

  return (
    <KangurSurfacePanel
      accent='amber'
      padding='lg'
      className='w-full'
    >
      <KangurPanelStack>
        <KangurPanelRow className='items-start sm:items-center'>
          <BrainCircuit aria-hidden='true' className='h-5 w-5 text-orange-500' />
          <KangurPanelIntro
            className='min-w-0'
            description={sectionSummary}
            descriptionClassName='text-xs'
            eyebrow={sectionTitle}
            eyebrowClassName='tracking-[0.18em]'
            title={learnerHeaderTitle}
            titleClassName='mt-1 text-sm font-bold'
          />
        </KangurPanelRow>

        <div
          className='rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3'
          data-testid='parent-dashboard-ai-tutor-mood'
        >
          <KangurPanelRow className='sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <KangurSectionEyebrow className='text-xs tracking-wide text-emerald-700'>
                {tutorContent.parentDashboard.moodTitle}
              </KangurSectionEyebrow>
              <KangurCardDescription
                as='p'
                className='mt-1 leading-relaxed'
                data-testid='parent-dashboard-ai-tutor-mood-description'
                size='sm'
              >
                {currentMoodPreset.description}
              </KangurCardDescription>
            </div>
            <KangurStatusChip
              accent={currentMoodAccent}
              className='w-fit self-start sm:self-auto'
              data-mood-id={learnerMood.currentMoodId}
              data-testid='parent-dashboard-ai-tutor-mood-current'
            >
              {currentMoodPreset.label}
            </KangurStatusChip>
          </KangurPanelRow>

          <div className='mt-3 grid kangur-panel-gap text-xs [color:var(--kangur-page-muted-text)] min-[420px]:grid-cols-2 lg:grid-cols-3'>
            <KangurLabeledValueSummary
              label={tutorContent.parentDashboard.baselineLabel}
              labelClassName='text-xs tracking-wide'
              value={baselineMoodPreset.label}
              valueClassName='mt-1'
              valueTestId='parent-dashboard-ai-tutor-mood-baseline'
            />
            <KangurLabeledValueSummary
              label={tutorContent.parentDashboard.confidenceLabel}
              labelClassName='text-xs tracking-wide'
              value={moodConfidence}
              valueClassName='mt-1'
              valueTestId='parent-dashboard-ai-tutor-mood-confidence'
            />
            <KangurLabeledValueSummary
              label={tutorContent.parentDashboard.updatedLabel}
              labelClassName='text-xs tracking-wide'
              value={moodUpdatedAt}
              valueClassName='mt-1'
              valueTestId='parent-dashboard-ai-tutor-mood-updated'
            />
          </div>
        </div>

      {isUsageEnabled ? (
        <div className='rounded-2xl border border-amber-100 bg-amber-50/75 px-4 py-3'>
          <KangurPanelRow className='items-start sm:justify-between'>
            <div className='min-w-0'>
              <KangurSectionEyebrow className='text-xs tracking-wide text-amber-700'>
                {tutorContent.parentDashboard.usageTitle}
              </KangurSectionEyebrow>
              <KangurCardTitle className='mt-1'>{usageSummaryText}</KangurCardTitle>
            </div>
            {!isUsageLoading && !hasUsageError && usageSummary ? (
              <div className='rounded-full [background:color-mix(in_srgb,var(--kangur-soft-card-background)_90%,#ffffff)] px-3 py-1 text-xs font-semibold text-amber-700 sm:shrink-0'>
                {usageBadgeText}
              </div>
            ) : null}
          </KangurPanelRow>
          <KangurCardDescription as='p' className='mt-2 leading-relaxed' size='xs'>
            {tutorContent.parentDashboard.usageHelp}
          </KangurCardDescription>
        </div>
      ) : null}

      <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
        <span className='text-sm font-medium [color:var(--kangur-page-text)]'>
          {enabled
            ? tutorContent.parentDashboard.toggleEnabledLabel
            : tutorContent.parentDashboard.toggleDisabledLabel}
        </span>
        <KangurButton
          className='w-full sm:w-auto'
          onClick={() => {
            setEnabled((current) => {
              const nextEnabled = !current;
              if (nextEnabled) {
                persistTutorVisibilityHidden(false);
                setIsTutorHidden(false);
              }
              return nextEnabled;
            });
          }}
          size='sm'
          variant={enabled ? 'surface' : 'primary'}
          disabled={isTemporarilyDisabled}
        >
          {enabled
            ? tutorContent.parentDashboard.toggleDisableActionLabel
            : tutorContent.parentDashboard.toggleEnableActionLabel}
        </KangurButton>
      </div>

      <div className='space-y-3'>
        <KangurSectionEyebrow className='text-xs tracking-wide'>
          {tutorContent.parentDashboard.guardrailsTitle}
        </KangurSectionEyebrow>
        <TutorToggleField
          checked={allowLessons}
          disabled={controlsDisabled}
          label={tutorContent.parentDashboard.toggles.allowLessonsLabel}
          description={tutorContent.parentDashboard.toggles.allowLessonsDescription}
          onChange={setAllowLessons}
        />
        <TutorToggleField
          checked={allowGames}
          disabled={controlsDisabled}
          label={tutorContent.parentDashboard.toggles.allowGamesLabel}
          description={tutorContent.parentDashboard.toggles.allowGamesDescription}
          onChange={setAllowGames}
        />
        <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
          <label
            htmlFor={testAccessModeFieldId}
            className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
          >
            {tutorContent.parentDashboard.selects.testAccessModeLabel}
          </label>
          <KangurSelectField
            id={testAccessModeFieldId}
            value={testAccessMode}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setTestAccessMode(event.target.value as KangurAiTutorTestAccessMode)}
            accent='amber'
            size='md'
            disabled={controlsDisabled}
          >
            <option value='disabled'>{tutorContent.parentDashboard.selects.testAccessModeDisabled}</option>
            <option value='guided'>{tutorContent.parentDashboard.selects.testAccessModeGuided}</option>
            <option value='review_after_answer'>
              {tutorContent.parentDashboard.selects.testAccessModeReview}
            </option>
          </KangurSelectField>
          <p className='text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
            {tutorContent.parentDashboard.selects.testAccessModeDescription}
          </p>
        </div>
        <div className='grid kangur-panel-gap min-[420px]:grid-cols-2'>
          <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
            <label
              htmlFor={hintDepthFieldId}
              className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
            >
              {tutorContent.parentDashboard.selects.hintDepthLabel}
            </label>
            <KangurSelectField
              id={hintDepthFieldId}
              value={hintDepth}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setHintDepth(event.target.value as KangurAiTutorHintDepth)}
              accent='amber'
              size='md'
              disabled={controlsDisabled}
            >
              <option value='brief'>{tutorContent.parentDashboard.selects.hintDepthBrief}</option>
              <option value='guided'>{tutorContent.parentDashboard.selects.hintDepthGuided}</option>
              <option value='step_by_step'>
                {tutorContent.parentDashboard.selects.hintDepthStepByStep}
              </option>
            </KangurSelectField>
            <p className='text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
              {tutorContent.parentDashboard.selects.hintDepthDescription}
            </p>
          </div>
          <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
            <label
              htmlFor={proactiveNudgesFieldId}
              className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
            >
              {tutorContent.parentDashboard.selects.proactiveNudgesLabel}
            </label>
            <KangurSelectField
              id={proactiveNudgesFieldId}
              value={proactiveNudges}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setProactiveNudges(event.target.value as KangurAiTutorProactiveNudges)}
              accent='amber'
              size='md'
              disabled={controlsDisabled}
            >
              <option value='off'>{tutorContent.parentDashboard.selects.proactiveNudgesOff}</option>
              <option value='gentle'>
                {tutorContent.parentDashboard.selects.proactiveNudgesGentle}
              </option>
              <option value='coach'>
                {tutorContent.parentDashboard.selects.proactiveNudgesCoach}
              </option>
            </KangurSelectField>
            <p className='text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
              {tutorContent.parentDashboard.selects.proactiveNudgesDescription}
            </p>
          </div>
        </div>
        <TutorToggleField
          checked={showSources}
          disabled={controlsDisabled}
          label={tutorContent.parentDashboard.toggles.showSourcesLabel}
          description={tutorContent.parentDashboard.toggles.showSourcesDescription}
          onChange={setShowSources}
        />
        <TutorToggleField
          checked={allowSelectedTextSupport}
          disabled={controlsDisabled}
          label={tutorContent.parentDashboard.toggles.allowSelectedTextSupportLabel}
          description={tutorContent.parentDashboard.toggles.allowSelectedTextSupportDescription}
          onChange={setAllowSelectedTextSupport}
        />
        <TutorToggleField
          checked={allowCrossPagePersistence}
          disabled={controlsDisabled}
          label={tutorContent.parentDashboard.toggles.allowCrossPagePersistenceLabel}
          description={tutorContent.parentDashboard.toggles.allowCrossPagePersistenceDescription}
          onChange={(checked) => {
            setAllowCrossPagePersistence(checked);
            if (!checked) {
              setRememberTutorContext(false);
            }
          }}
        />
        <TutorToggleField
          checked={rememberTutorContext}
          disabled={controlsDisabled || !allowCrossPagePersistence}
          label={tutorContent.parentDashboard.toggles.rememberTutorContextLabel}
          description={tutorContent.parentDashboard.toggles.rememberTutorContextDescription}
          onChange={setRememberTutorContext}
        />
      </div>

      <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
        <label
          htmlFor={uiModeFieldId}
          className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
        >
          {tutorContent.parentDashboard.selects.uiModeLabel}
        </label>
        <KangurSelectField
          id={uiModeFieldId}
          value={uiMode}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setUiMode(event.target.value as KangurAiTutorUiMode)}
          accent='amber'
          size='md'
          disabled={controlsDisabled}
        >
          <option value='anchored'>{tutorContent.parentDashboard.selects.uiModeAnchored}</option>
          <option value='freeform'>{tutorContent.parentDashboard.selects.uiModeFreeform}</option>
          <option value='static'>{tutorContent.parentDashboard.selects.uiModeStatic}</option>
        </KangurSelectField>
        <p className='text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
          {tutorContent.parentDashboard.selects.uiModeDescription}
        </p>
      </div>

      {/* Save */}
      <KangurButton
        type='button'
        variant='primary'
        size='sm'
        onClick={() => void handleSave()}
        disabled={isSaving || isTemporarilyDisabled}
        fullWidth
      >
        {isSaving
          ? tutorContent.parentDashboard.savePendingLabel
          : tutorContent.parentDashboard.saveIdleLabel}
      </KangurButton>

      {feedback && (
        <p
          className='text-xs text-center [color:var(--kangur-page-muted-text)]'
          role='status'
          aria-live='polite'
        >
          {feedback}
        </p>
      )}
      </KangurPanelStack>
    </KangurSurfacePanel>
  );
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
