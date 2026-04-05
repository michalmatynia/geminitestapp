import type { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import type { KangurAiTutorUsageResponse } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import type {
  KangurAiTutorHintDepth,
  KangurAiTutorProactiveNudges,
  KangurAiTutorTestAccessMode,
  KangurAiTutorUiMode,
} from '@/features/kangur/ai-tutor/settings';
import type { KangurTutorMoodId } from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';

export type KangurAiTutorContentValue = ReturnType<typeof useKangurAiTutorContent>;
export type KangurParentDashboardTutorContent = KangurAiTutorContentValue['parentDashboard'];
export type KangurAiTutorUsageSummary = KangurAiTutorUsageResponse['usage'];
export type KangurActiveLearner = ReturnType<typeof useKangurParentDashboardRuntime>['activeLearner'];

export type KangurAiTutorFormState = {
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

export type KangurAiTutorActionClasses = {
  compactActionClassName: string;
  fullWidthActionClassName: string | undefined;
};

export type KangurAiTutorUsagePresentation = {
  showUsage: boolean;
  summaryText: string;
  badgeText: string | null;
  showBadge: boolean;
};

export type KangurAiTutorMoodPresentation = {
  currentMoodAccent: 'slate' | 'indigo' | 'sky' | 'violet' | 'amber' | 'teal' | 'emerald' | 'rose';
  currentMoodId: KangurTutorMoodId;
  currentMoodLabel: string;
  currentMoodDescription: string;
  baselineMoodLabel: string;
  moodConfidence: string;
  moodUpdatedAt: string;
};

export type KangurAiTutorFormBindings = {
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

export type AiTutorConfigPanelState = {
  actionClasses: KangurAiTutorActionClasses;
  activeLearner: KangurActiveLearner;
  controlsDisabled: boolean;
  feedback: string | null;
  formBindings: KangurAiTutorFormBindings;
  handleRestoreTutor: () => void;
  handleSave: () => Promise<void>;
  handleToggleEnabled: () => void;
  hintDepthFieldId: string;
  isSaving: boolean;
  isTemporarilyDisabled: boolean;
  isTutorHidden: boolean;
  learnerHeaderTitle: string | undefined;
  moodPresentation: KangurAiTutorMoodPresentation;
  proactiveNudgesFieldId: string;
  sectionSummary: string;
  sectionTitle: string;
  testAccessModeFieldId: string;
  tutorContent: KangurAiTutorContentValue;
  uiModeFieldId: string;
  usagePresentation: KangurAiTutorUsagePresentation;
  enableTutorLabel: string;
};
