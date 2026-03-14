import { useMemo } from 'react';

import { buildKangurLessonNarrationScriptFromText } from '@/features/kangur/tts/script';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';

import { isAuthGuidedTutorTarget } from './KangurAiTutorWidget.helpers';
import { getTutorSurfaceLabel } from './KangurAiTutorWidget.coordinator.helpers';

import type { KangurAiTutorRuntimeMessage as TutorRenderedMessage } from '@/shared/contracts/kangur-ai-tutor';
import type { TutorProactiveNudge } from './KangurAiTutorPanelBody.context';
import type { ActiveTutorFocus } from './KangurAiTutorWidget.shared';
import type {
  GuidedTutorTarget,
  SectionExplainContext,
  TutorSurface,
} from './KangurAiTutorWidget.types';

type TutorUsageSummary = {
  dateKey: string;
  dailyMessageLimit: number | null;
  messageCount: number;
  remainingMessages: number | null;
} | null | undefined;

type TutorContextSwitchNotice = {
  title: string;
  target: string;
  detail: string | null;
} | null;

type TutorSessionContext = {
  contentId: string | null | undefined;
  surface: TutorSurface | null | undefined;
  title: string | null | undefined;
};

type UseKangurAiTutorPanelDerivedStateInput = {
  activeFocus: Pick<ActiveTutorFocus, 'kind' | 'label'>;
  activeSelectedText: string | null;
  askModalHelperText: string;
  bubblePlacementLaunchOrigin: string;
  bubblePlacementMode: 'bubble' | 'sheet';
  canStartHomeOnboardingManually: boolean;
  contextSwitchNotice: TutorContextSwitchNotice;
  emptyStateMessage: string;
  focusChipLabel: string | null;
  guidedTutorTarget: GuidedTutorTarget | null;
  highlightedSection: SectionExplainContext | null;
  inputValue: string;
  isAskModalMode: boolean;
  isGuidedTutorMode: boolean;
  isOpen: boolean;
  isSectionExplainPendingMode: boolean;
  isSelectionExplainPendingMode: boolean;
  messages: TutorRenderedMessage[];
  sessionContext: TutorSessionContext;
  showSectionExplainCompleteState: boolean;
  showSelectionExplainCompleteState: boolean;
  showSources: boolean;
  shouldRenderGuestIntroUi: boolean;
  tutorContent: KangurAiTutorContent;
  tutorName: string;
  tutorNarrationObservedText: string;
  usageSummary: TutorUsageSummary;
  viewportWidth: number;
  visibleProactiveNudge: TutorProactiveNudge | null;
};

export function useKangurAiTutorPanelDerivedState({
  activeFocus,
  activeSelectedText,
  askModalHelperText,
  bubblePlacementLaunchOrigin,
  bubblePlacementMode,
  canStartHomeOnboardingManually,
  contextSwitchNotice,
  emptyStateMessage,
  focusChipLabel,
  guidedTutorTarget,
  highlightedSection,
  inputValue,
  isAskModalMode,
  isGuidedTutorMode,
  isOpen,
  isSectionExplainPendingMode,
  isSelectionExplainPendingMode,
  messages,
  sessionContext,
  showSectionExplainCompleteState,
  showSelectionExplainCompleteState,
  showSources,
  shouldRenderGuestIntroUi,
  tutorContent,
  tutorName,
  tutorNarrationObservedText,
  usageSummary,
  viewportWidth,
  visibleProactiveNudge,
}: UseKangurAiTutorPanelDerivedStateInput) {
  const shouldEnableTutorNarration = (isOpen || shouldRenderGuestIntroUi) && !isGuidedTutorMode;
  const panelEmptyStateMessage = isSelectionExplainPendingMode
    ? tutorContent.emptyStates.selectionPending
    : isSectionExplainPendingMode
      ? tutorContent.emptyStates.sectionPending
      : emptyStateMessage;
  const selectedTextPreview = activeSelectedText?.slice(0, 140) ?? null;

  const tutorNarrationScriptId = useMemo(() => {
    const base = [
      'kangur-ai-tutor',
      sessionContext.surface ?? 'general',
      sessionContext.contentId ?? 'root',
      isAskModalMode ? 'ask-modal' : 'chat',
    ]
      .join('-')
      .replace(/[^a-zA-Z0-9:_-]+/g, '-');

    return base.slice(0, 120);
  }, [isAskModalMode, sessionContext.contentId, sessionContext.surface]);

  const tutorNarrationFallbackText = useMemo(() => {
    const parts: string[] = [];
    const pushPart = (value: string | null | undefined): void => {
      if (typeof value !== 'string') {
        return;
      }

      const trimmed = value.trim();
      if (trimmed.length > 0) {
        parts.push(trimmed);
      }
    };

    if (isAskModalMode) {
      pushPart(askModalHelperText);
    }

    if (contextSwitchNotice) {
      pushPart(contextSwitchNotice.title);
      pushPart(contextSwitchNotice.target);
      pushPart(contextSwitchNotice.detail);
    }

    pushPart(focusChipLabel);
    if (activeFocus.kind !== 'selection') {
      pushPart(activeFocus.label);
    }

    if (activeSelectedText) {
      pushPart(tutorContent.panelContext.selectedTitle);
      pushPart(activeSelectedText);
      pushPart(
        showSelectionExplainCompleteState
          ? tutorContent.panelContext.selectedCompleteDetail
          : tutorContent.panelContext.selectedDefaultDetail
      );
    }

    if (highlightedSection) {
      pushPart(tutorContent.panelContext.sectionTitle);
      pushPart(highlightedSection.label ?? highlightedSection.kind);
      pushPart(
        isSectionExplainPendingMode
          ? tutorContent.panelContext.sectionPendingDetail
          : showSectionExplainCompleteState
            ? tutorContent.panelContext.sectionCompleteDetail
            : tutorContent.panelContext.sectionDefaultDetail
      );
    }

    if (isSelectionExplainPendingMode) {
      pushPart(tutorContent.panelContext.selectedPendingStatus);
    } else if (isSectionExplainPendingMode) {
      pushPart(tutorContent.panelContext.sectionPendingStatus);
    } else if (visibleProactiveNudge) {
      pushPart(visibleProactiveNudge.title);
      pushPart(visibleProactiveNudge.description);
    }

    if (messages.length === 0) {
      pushPart(isAskModalMode ? askModalHelperText : emptyStateMessage);
    } else {
      messages.forEach((message) => {
        if (message.role === 'user') {
          message.artifacts?.forEach((artifact) => {
            if (artifact.type === 'user_drawing') {
              pushPart(tutorContent.drawing?.messageLabel ?? 'Narysowano');
              pushPart(artifact.caption);
            }
          });
          pushPart(message.content);
          return;
        }

        if (message.coachingFrame) {
          pushPart(message.coachingFrame.label);
          pushPart(message.coachingFrame.description);
          pushPart(message.coachingFrame.rationale);
        }

        message.artifacts?.forEach((artifact) => {
          if (artifact.type === 'assistant_drawing') {
            pushPart(artifact.title);
            pushPart(artifact.caption);
            pushPart(artifact.alt);
          }
        });
        pushPart(message.content);
        message.followUpActions?.forEach((action) => {
          pushPart(action.reason);
        });

        if (showSources) {
          message.sources?.slice(0, 3).forEach((source) => {
            pushPart(source.metadata?.title?.trim() || `[doc:${source.documentId}]`);
            pushPart(source.text?.trim());
          });
        }
      });
    }

    return parts.join('\n\n');
  }, [
    activeFocus.kind,
    activeFocus.label,
    activeSelectedText,
    askModalHelperText,
    contextSwitchNotice,
    emptyStateMessage,
    focusChipLabel,
    highlightedSection,
    isAskModalMode,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    messages,
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
    showSources,
    tutorContent,
    visibleProactiveNudge,
  ]);

  const trimmedInputValue = inputValue.trim();
  const shouldNarrateModalOnly = isAskModalMode || shouldRenderGuestIntroUi;
  const observedNarrationText = tutorNarrationObservedText.trim();
  const fallbackNarrationText = tutorNarrationFallbackText.trim();
  const modalNarrationSeed = observedNarrationText || fallbackNarrationText;
  const baseNarrationText = shouldNarrateModalOnly
    ? [modalNarrationSeed, trimmedInputValue].filter(Boolean).join('\n\n')
    : observedNarrationText || fallbackNarrationText;
  const tutorNarrationText = baseNarrationText;

  const tutorNarrationScript = useMemo(
    () =>
      buildKangurLessonNarrationScriptFromText({
        lessonId: tutorNarrationScriptId,
        title: shouldNarrateModalOnly
          ? ''
          : isAskModalMode
            ? `${tutorName} - ${tutorContent.narrator.helpTitleSuffix}`
            : `${tutorName} - ${tutorContent.narrator.chatTitleSuffix}`,
        description: shouldNarrateModalOnly ? null : sessionContext.title ?? null,
        text: tutorNarrationText,
        locale: 'pl-PL',
      }),
    [
      isAskModalMode,
      sessionContext.title,
      shouldNarrateModalOnly,
      tutorContent.narrator.chatTitleSuffix,
      tutorContent.narrator.helpTitleSuffix,
      tutorName,
      tutorNarrationScriptId,
      tutorNarrationText,
    ]
  );

  const canNarrateTutorText = tutorNarrationText.trim().length > 0;

  const isCompactDockedTutorPanel =
    !isAskModalMode &&
    bubblePlacementMode === 'bubble' &&
    bubblePlacementLaunchOrigin === 'dock-bottom-right' &&
    messages.length === 0 &&
    !activeSelectedText &&
    !highlightedSection &&
    !contextSwitchNotice;
  const compactDockedTutorPanelWidth = Math.min(Math.max(viewportWidth - 24, 280), 360);
  const shouldRenderAuxiliaryPanelControls =
    canStartHomeOnboardingManually ||
    Boolean(visibleProactiveNudge) ||
    (!isCompactDockedTutorPanel &&
      (canStartHomeOnboardingManually ||
        Boolean(usageSummary && usageSummary.dailyMessageLimit !== null)));

  const sessionSurfaceLabel =
    !isCompactDockedTutorPanel && (sessionContext.title || sessionContext.contentId)
      ? `${
        getTutorSurfaceLabel(sessionContext.surface, tutorContent)
      }: ${sessionContext.title ?? sessionContext.contentId}`
      : null;

  const narrationObservationKey = [
    askModalHelperText,
    sessionContext.contentId ?? 'none',
    sessionContext.surface ?? 'none',
    isAuthGuidedTutorTarget(guidedTutorTarget) ? guidedTutorTarget.kind : 'context',
  ].join(':');

  return {
    canNarrateTutorText,
    compactDockedTutorPanelWidth,
    isCompactDockedTutorPanel,
    narrationObservationKey,
    panelEmptyStateMessage,
    selectedTextPreview,
    sessionSurfaceLabel,
    shouldEnableTutorNarration,
    shouldRenderAuxiliaryPanelControls,
    tutorNarrationScript,
  };
}
