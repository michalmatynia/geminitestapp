import type { KangurAiTutorLearnerStoredSettings } from '@/features/kangur/ai-tutor/settings';
import {
  formatKangurAiTutorTemplate,
  getKangurAiTutorMoodCopy,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { createDefaultKangurAiTutorLearnerMood } from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';
import {
  DEFAULT_AI_TUTOR_FORM_STATE,
  KANGUR_PARENT_TUTOR_MOOD_ACCENTS,
} from './KangurParentDashboardAiTutorWidget.constants';
import type {
  KangurActiveLearner,
  KangurAiTutorActionClasses,
  KangurAiTutorContentValue,
  KangurAiTutorFormState,
  KangurAiTutorMoodPresentation,
  KangurAiTutorUsagePresentation,
  KangurAiTutorUsageSummary,
  KangurParentDashboardTutorContent,
} from './KangurParentDashboardAiTutorWidget.types';

export const formatTutorMoodTimestamp = (
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

export const resolveAiTutorActionClasses = (isCoarsePointer: boolean): KangurAiTutorActionClasses => ({
  compactActionClassName: isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto',
  fullWidthActionClassName: isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
    : undefined,
});

export const resolveAiTutorEnabled = (
  currentSettings: KangurAiTutorLearnerStoredSettings | null,
  isTemporarilyDisabled: boolean
): boolean => (isTemporarilyDisabled ? false : currentSettings?.enabled ?? false);

export const createAiTutorFormState = (
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

export const resolveCrossPagePersistenceFormState = (
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

export const createAiTutorStoredSettings = (
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

export const resolveAiTutorUsageSummaryText = (
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

export const resolveAiTutorUsageBadgeText = (
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

export const resolveAiTutorUsagePresentation = ({
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

export const resolveAiTutorMoodPresentation = ({
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

export const resolveShouldLoadAiTutorUsage = ({
  activeLearnerId,
  canAccessDashboard,
  isUsageEnabled,
}: {
  activeLearnerId: string | null;
  canAccessDashboard: boolean;
  isUsageEnabled: boolean;
}): boolean => canAccessDashboard && Boolean(activeLearnerId) && isUsageEnabled;

export const resolveAiTutorPanelCopy = ({
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

export const resolveAiTutorControlsDisabled = (
  isTemporarilyDisabled: boolean,
  enabled: boolean
): boolean => isTemporarilyDisabled || !enabled;
