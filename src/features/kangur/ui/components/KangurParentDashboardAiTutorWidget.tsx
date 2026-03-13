'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit } from 'lucide-react';
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
  KangurGlassPanel,
  KangurPanelIntro,
  KangurSelectField,
  KangurSectionEyebrow,
  KangurStatusChip,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import type { KangurAiTutorUsageResponse } from '@/shared/contracts/kangur-ai-tutor';
import {
  formatKangurAiTutorTemplate,
  getKangurAiTutorMoodCopy,
} from '@/shared/contracts/kangur-ai-tutor-content';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurTutorMoodId,
} from '@/shared/contracts/kangur-ai-tutor-mood';
import { api } from '@/shared/lib/api-client';
import { invalidateAllSettings } from '@/shared/lib/query-invalidation';
import { kangurKeys } from '@/shared/lib/query-key-exports';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { serializeSetting } from '@/shared/utils/settings-json';

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

const formatTutorMoodTimestamp = (value: string | null, fallback: string): string => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleString('pl-PL', {
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
      className={`flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors ${
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

function AiTutorConfigPanel(): React.JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const { activeLearner, canAccessDashboard } = useKangurParentDashboardRuntime();
  const { entry: aiTutorSectionContent } = useKangurPageContentEntry('parent-dashboard-ai-tutor');
  const settingsStore = useSettingsStore();
  const queryClient = useQueryClient();
  const activeLearnerId = activeLearner?.id ?? null;

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
  const shouldLoadUsage = canAccessDashboard && Boolean(activeLearnerId) && currentSettings?.enabled;

  const [enabled, setEnabled] = useState(currentSettings?.enabled ?? false);
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
    setEnabled(currentSettings?.enabled ?? false);
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
  }, [activeLearner?.id, currentSettings]);
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
  } = useQuery({
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
  });
  const usageSummary = tutorUsageResponse?.usage ?? null;
  const learnerMood = activeLearner?.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
  const currentMoodPreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.currentMoodId);
  const baselineMoodPreset = getKangurAiTutorMoodCopy(tutorContent, learnerMood.baselineMoodId);
  const currentMoodAccent = KANGUR_PARENT_TUTOR_MOOD_ACCENTS[learnerMood.currentMoodId];
  const moodConfidence = `${Math.round(learnerMood.confidence * 100)}%`;
  const moodUpdatedAt = formatTutorMoodTimestamp(
    learnerMood.lastComputedAt,
    tutorContent.parentDashboard.updatedFallback
  );
  const [settingsManagedNoticeBefore, settingsManagedNoticeAfter] = useMemo(() => {
    const [before, after = ''] =
      tutorContent.parentDashboard.settingsManagedNotice.split('{highlight}');
    return [before, after] as const;
  }, [tutorContent.parentDashboard.settingsManagedNotice]);
  const learnerHeaderTitle = activeLearner
    ? formatKangurAiTutorTemplate(tutorContent.parentDashboard.titleTemplate, {
      learnerName: activeLearner.displayName,
    })
    : undefined;
  const sectionTitle = aiTutorSectionContent?.title ?? 'Tutor-AI dla rodzica';
  const sectionSummary = aiTutorSectionContent?.summary ?? tutorContent.parentDashboard.subtitle;

  const handleSave = useCallback(async (): Promise<void> => {
    if (!activeLearner || !canAccessDashboard) return;

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
    };

    const nextStore = {
      ...settingsStoreMap,
      [activeLearner.id]: next,
    };

    try {
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
    } catch {
      setFeedback(tutorContent.parentDashboard.saveError);
    } finally {
      setIsSaving(false);
    }
  }, [
    activeLearner,
    canAccessDashboard,
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
      <KangurGlassPanel padding='lg' surface='solid' variant='soft' className='w-full text-center'>
        <div className='flex flex-col gap-2'>
          {aiTutorSectionContent ? (
            <KangurPanelIntro description={sectionSummary} title={sectionTitle} titleAs='p' />
          ) : null}
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>
            {tutorContent.parentDashboard.noActiveLearner}
          </p>
        </div>
      </KangurGlassPanel>
    );
  }

  return (
    <KangurSurfacePanel
      accent='amber'
      padding='lg'
      className='w-full flex flex-col gap-5'
    >
      <div className='flex items-center gap-3'>
        <BrainCircuit className='h-5 w-5 text-orange-500' />
        <KangurPanelIntro
          className='min-w-0'
          description={sectionSummary}
          descriptionClassName='text-xs'
          eyebrow={sectionTitle}
          eyebrowClassName='tracking-[0.18em]'
          title={learnerHeaderTitle}
          titleClassName='mt-1 text-sm font-bold'
        />
      </div>

      <div
        className='rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3'
        data-testid='parent-dashboard-ai-tutor-mood'
      >
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
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
            className='w-fit'
            data-mood-id={learnerMood.currentMoodId}
            data-testid='parent-dashboard-ai-tutor-mood-current'
          >
            {currentMoodPreset.label}
          </KangurStatusChip>
        </div>

        <div className='mt-3 grid gap-3 text-xs [color:var(--kangur-page-muted-text)] min-[360px]:grid-cols-2 lg:grid-cols-3'>
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

      {currentSettings?.enabled ? (
        <div className='rounded-2xl border border-amber-100 bg-amber-50/75 px-4 py-3'>
          <div className='flex flex-col items-start gap-3 sm:flex-row sm:justify-between'>
            <div className='min-w-0'>
              <KangurSectionEyebrow className='text-xs tracking-wide text-amber-700'>
                {tutorContent.parentDashboard.usageTitle}
              </KangurSectionEyebrow>
              <KangurCardTitle className='mt-1'>
                {isUsageLoading
                  ? tutorContent.parentDashboard.usageLoading
                  : hasUsageError || !usageSummary
                    ? tutorContent.parentDashboard.usageError
                    : usageSummary.dailyMessageLimit === null
                      ? formatKangurAiTutorTemplate(
                        tutorContent.parentDashboard.usageUnlimitedTemplate,
                        { messageCount: usageSummary.messageCount }
                      )
                      : formatKangurAiTutorTemplate(
                        tutorContent.parentDashboard.usageLimitedTemplate,
                        {
                          messageCount: usageSummary.messageCount,
                          dailyMessageLimit: usageSummary.dailyMessageLimit,
                        }
                      )}
              </KangurCardTitle>
            </div>
            {!isUsageLoading && !hasUsageError && usageSummary ? (
              <div className='rounded-full [background:color-mix(in_srgb,var(--kangur-soft-card-background)_90%,#ffffff)] px-3 py-1 text-xs font-semibold text-amber-700 sm:shrink-0'>
                {usageSummary.dailyMessageLimit === null
                  ? tutorContent.parentDashboard.usageUnlimitedBadge
                  : usageSummary.remainingMessages === 0
                    ? tutorContent.parentDashboard.usageExhaustedBadge
                    : formatKangurAiTutorTemplate(
                      tutorContent.parentDashboard.usageRemainingBadgeTemplate,
                      { remainingMessages: usageSummary.remainingMessages }
                    )}
              </div>
            ) : null}
          </div>
          <KangurCardDescription as='p' className='mt-2 leading-relaxed' size='xs'>
            {tutorContent.parentDashboard.usageHelp}
          </KangurCardDescription>
        </div>
      ) : null}

      <div className='rounded-2xl border [border-color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_84%,var(--kangur-page-background))] px-4 py-3 text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
        {settingsManagedNoticeBefore}
        <span className='font-semibold [color:var(--kangur-page-text)]'>
          {tutorContent.parentDashboard.settingsManagedHighlight}
        </span>
        {settingsManagedNoticeAfter}
      </div>

      {/* Enable toggle */}
      <label className='flex items-center gap-3 cursor-pointer select-none'>
        <div className='relative'>
          <input
            type='checkbox'
            className='sr-only'
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <div
            className={`w-10 h-5 rounded-full transition-all ${
              enabled
                ? 'bg-gradient-to-r kangur-gradient-accent-amber shadow-[0_8px_18px_-14px_rgba(249,115,22,0.72)]'
                : '[background:color-mix(in_srgb,var(--kangur-soft-card-border)_86%,#94a3b8)]'
            }`}
          />
          <div
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full [background:var(--kangur-soft-card-background)] shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </div>
        <span className='text-sm font-medium [color:var(--kangur-page-text)]'>
          {enabled
            ? tutorContent.parentDashboard.toggleEnabledLabel
            : tutorContent.parentDashboard.toggleDisabledLabel}
        </span>
      </label>

      <div className='space-y-3'>
        <KangurSectionEyebrow className='text-xs tracking-wide'>
          {tutorContent.parentDashboard.guardrailsTitle}
        </KangurSectionEyebrow>
        <TutorToggleField
          checked={allowLessons}
          disabled={!enabled}
          label={tutorContent.parentDashboard.toggles.allowLessonsLabel}
          description={tutorContent.parentDashboard.toggles.allowLessonsDescription}
          onChange={setAllowLessons}
        />
        <TutorToggleField
          checked={allowGames}
          disabled={!enabled}
          label={tutorContent.parentDashboard.toggles.allowGamesLabel}
          description={tutorContent.parentDashboard.toggles.allowGamesDescription}
          onChange={setAllowGames}
        />
        <div className='flex flex-col gap-1'>
          <label
            htmlFor={testAccessModeFieldId}
            className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
          >
            {tutorContent.parentDashboard.selects.testAccessModeLabel}
          </label>
          <KangurSelectField
            id={testAccessModeFieldId}
            value={testAccessMode}
            onChange={(event) => setTestAccessMode(event.target.value as KangurAiTutorTestAccessMode)}
            accent='amber'
            size='md'
            disabled={!enabled}
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
        <div className='grid gap-3 min-[420px]:grid-cols-2'>
          <div className='flex flex-col gap-1'>
            <label
              htmlFor={hintDepthFieldId}
              className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
            >
              {tutorContent.parentDashboard.selects.hintDepthLabel}
            </label>
            <KangurSelectField
              id={hintDepthFieldId}
              value={hintDepth}
              onChange={(event) => setHintDepth(event.target.value as KangurAiTutorHintDepth)}
              accent='amber'
              size='md'
              disabled={!enabled}
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
          <div className='flex flex-col gap-1'>
            <label
              htmlFor={proactiveNudgesFieldId}
              className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
            >
              {tutorContent.parentDashboard.selects.proactiveNudgesLabel}
            </label>
            <KangurSelectField
              id={proactiveNudgesFieldId}
              value={proactiveNudges}
              onChange={(event) =>
                setProactiveNudges(event.target.value as KangurAiTutorProactiveNudges)}
              accent='amber'
              size='md'
              disabled={!enabled}
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
          disabled={!enabled}
          label={tutorContent.parentDashboard.toggles.showSourcesLabel}
          description={tutorContent.parentDashboard.toggles.showSourcesDescription}
          onChange={setShowSources}
        />
        <TutorToggleField
          checked={allowSelectedTextSupport}
          disabled={!enabled}
          label={tutorContent.parentDashboard.toggles.allowSelectedTextSupportLabel}
          description={tutorContent.parentDashboard.toggles.allowSelectedTextSupportDescription}
          onChange={setAllowSelectedTextSupport}
        />
        <TutorToggleField
          checked={allowCrossPagePersistence}
          disabled={!enabled}
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
          disabled={!enabled || !allowCrossPagePersistence}
          label={tutorContent.parentDashboard.toggles.rememberTutorContextLabel}
          description={tutorContent.parentDashboard.toggles.rememberTutorContextDescription}
          onChange={setRememberTutorContext}
        />
      </div>

      <div className='flex flex-col gap-1'>
        <label
          htmlFor={uiModeFieldId}
          className='text-xs font-semibold [color:var(--kangur-page-muted-text)] uppercase tracking-wide'
        >
          {tutorContent.parentDashboard.selects.uiModeLabel}
        </label>
        <KangurSelectField
          id={uiModeFieldId}
          value={uiMode}
          onChange={(event) => setUiMode(event.target.value as KangurAiTutorUiMode)}
          accent='amber'
          size='md'
          disabled={!enabled}
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
        disabled={isSaving}
        fullWidth
      >
        {isSaving
          ? tutorContent.parentDashboard.savePendingLabel
          : tutorContent.parentDashboard.saveIdleLabel}
      </KangurButton>

      {feedback && (
        <p className='text-xs text-center [color:var(--kangur-page-muted-text)]'>{feedback}</p>
      )}
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
