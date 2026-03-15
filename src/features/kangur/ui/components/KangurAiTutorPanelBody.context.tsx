import { createContext, useContext, type JSX, type KeyboardEvent, type ReactNode } from 'react';

import type { KangurNarratorSettings } from '@/features/kangur/settings';
import type { KangurLessonNarrationScript } from '@/features/kangur/tts/contracts';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type {
  KangurAiTutorFollowUpAction,
  KangurAiTutorInteractionIntent,
  KangurAiTutorPromptMode,
  KangurAiTutorRuntimeMessage as TutorRenderedMessage,
  KangurAiTutorUsageSummary,
  KangurAiTutorWebsiteHelpTarget,
} from '@/shared/contracts/kangur-ai-tutor';
import { internalError } from '@/shared/errors/app-error';

import type { ActiveTutorFocus, TutorQuickAction } from './KangurAiTutorWidget.shared';
import type { TutorSurface } from './KangurAiTutorWidget.types';

export type TutorProactiveNudge = {
  mode: 'gentle' | 'coach';
  title: string;
  description: string;
  action: TutorQuickAction;
};

export type KangurAiTutorPanelBodyContextValue = {
  activeFocus: ActiveTutorFocus;
  activeSectionRect: DOMRect | null;
  activeSelectedText: string | null;
  activeSelectionPageRect: DOMRect | null;
  askModalHelperText: string;
  basePath: string;
  bridgeQuickActionId: string | null;
  bridgeSummaryChipLabel: string | null;
  canNarrateTutorText: boolean;
  canSendMessages: boolean;
  canStartHomeOnboardingManually: boolean;
  drawingImageData: string | null;
  drawingMode: boolean;
  drawingPanelOpen: boolean;
  drawingPanelAvailable: boolean;
  guestAuthFormVisible: boolean;
  emptyStateMessage: string;
  focusChipLabel: string | null;
  handleClearDrawing: () => void;
  handleCloseDrawingPanel: () => void;
  handleDetachHighlightedSection: () => void;
  handleDetachSelectedFragment: () => void;
  handleFocusHighlightedSection: () => void;
  handleFocusSelectedFragment: () => void;
  handleFollowUpClick: (
    action: KangurAiTutorFollowUpAction,
    messageIndex: number,
    href: string
  ) => void;
  handleWebsiteHelpTargetClick: (
    target: KangurAiTutorWebsiteHelpTarget,
    messageIndex: number,
    href: string
  ) => void;
  handleDrawingComplete: (dataUrl: string) => void;
  handleOpenDrawingPanel: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleMessageFeedback: (
    messageIndex: number,
    message: TutorRenderedMessage,
    feedback: 'helpful' | 'not_helpful'
  ) => void;
  handleQuickAction: (
    action: TutorQuickAction,
    options?: {
      source?: 'quick_action' | 'proactive_nudge';
    }
  ) => Promise<void>;
  handleSend: () => Promise<void>;
  handleStartHomeOnboarding: () => void;
  handleToggleDrawing: () => void;
  homeOnboardingReplayLabel: string;
  inputPlaceholder: string;
  isAskModalMode: boolean;
  isLoading: boolean;
  isMinimalPanelMode: boolean;
  lastInteractionIntent: KangurAiTutorInteractionIntent | null;
  lastPromptMode: KangurAiTutorPromptMode | null;
  isSectionExplainPendingMode: boolean;
  isSelectionExplainPendingMode: boolean;
  isUsageLoading: boolean;
  messages: TutorRenderedMessage[];
  narratorSettings: KangurNarratorSettings;
  panelEmptyStateMessage: string;
  remainingMessages: number | null;
  selectedTextPreview: string | null;
  sessionSurface: TutorSurface | null;
  showToolboxLayout: boolean;
  shouldRenderAuxiliaryPanelControls: boolean;
  showSectionExplainCompleteState: boolean;
  showSelectionExplainCompleteState: boolean;
  showSources: boolean;
  tutorNarrationScript: KangurLessonNarrationScript;
  tutorNarratorContextRegistry: ContextRegistryConsumerEnvelope | null;
  tutorSessionKey: string | null;
  usageSummary: KangurAiTutorUsageSummary | null | undefined;
  visibleProactiveNudge: TutorProactiveNudge | null;
  visibleQuickActions: TutorQuickAction[];
};

const KangurAiTutorPanelBodyContext = createContext<KangurAiTutorPanelBodyContextValue | null>(
  null
);

type KangurAiTutorPanelBodyProviderProps = {
  children: ReactNode;
  value: KangurAiTutorPanelBodyContextValue;
};

export function KangurAiTutorPanelBodyProvider({
  children,
  value,
}: KangurAiTutorPanelBodyProviderProps): JSX.Element {
  return (
    <KangurAiTutorPanelBodyContext.Provider value={value}>
      {children}
    </KangurAiTutorPanelBodyContext.Provider>
  );
}

export function useKangurAiTutorPanelBodyContext(): KangurAiTutorPanelBodyContextValue {
  const ctx = useContext(KangurAiTutorPanelBodyContext);
  if (!ctx) {
    throw internalError(
      'useKangurAiTutorPanelBodyContext must be used within a KangurAiTutorPanelBodyProvider'
    );
  }

  return ctx;
}
