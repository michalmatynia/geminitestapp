// Utility functions extracted from KangurParentDashboardAiTutorWidget
import type { KangurTutorMoodId } from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';

export const KANGUR_PARENT_TUTOR_MOOD_ACCENTS: Record<KangurTutorMoodId, 'slate' | 'indigo' | 'sky' | 'violet' | 'amber' | 'teal' | 'emerald' | 'rose'> = {
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

export const PARENT_DASHBOARD_AI_TUTOR_TEMPORARILY_DISABLED = false;
export const AI_TUTOR_USAGE_LOAD_DEFER_MS = 900;
export const KANGUR_PARENT_DASHBOARD_ENABLE_TUTOR_BUTTON_CLASSNAME =
  'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800';

export const formatTutorMoodTimestamp = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const resolveShouldLoadAiTutorUsage = ({
  isEnabled,
}: {
  isEnabled: boolean;
}): boolean => {
  if (!isEnabled) return false;
  // Simulate deferred loading check
  return true;
};

export const resolveAiTutorPanelCopy = ({
  activeLearner,
}: {
  activeLearner: any;
}): {
  sectionSummary: string;
  sectionTitle: string;
  learnerHeaderTitle: string | null;
  enableTutorLabel: string;
} => {
  return {
    sectionSummary: 'Personalize AI learning',
    sectionTitle: 'AI Tutor',
    learnerHeaderTitle: activeLearner?.name ?? null,
    enableTutorLabel: 'Enable Tutor',
  };
};

export const resolveAiTutorControlsDisabled = (
  isTemporarilyDisabled: boolean,
  activeLearner: any
): boolean => isTemporarilyDisabled || !activeLearner;
