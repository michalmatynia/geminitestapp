import { useMemo } from 'react';

import type { KangurAiTutorLearnerMemory } from '@/shared/contracts/kangur-ai-tutor';
import {
  formatKangurAiTutorTemplate,
  type KangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';

import type { KangurAiTutorRuntimeMessage as TutorRenderedMessage } from '@/shared/contracts/kangur-ai-tutor';
import type { TutorProactiveNudge } from './KangurAiTutorPanelBody.context';
import { areTutorSelectionTextsEquivalent } from './KangurAiTutorWidget.helpers';
import type { ActiveTutorFocus, TutorQuickAction } from './KangurAiTutorWidget.shared';
import type { TutorSurface } from './KangurAiTutorWidget.types';

const getFocusChipLabel = (
  tutorContent: KangurAiTutorContent,
  focus: Pick<ActiveTutorFocus, 'kind'>,
  selectedText: string | null,
  surface: TutorSurface | null | undefined
): string | null => {
  if (focus.kind === 'selection') {
    if (surface === 'test') {
      return selectedText
        ? tutorContent.focusChips.selection.testWithText
        : tutorContent.focusChips.selection.testWithoutText;
    }
    if (surface === 'game') {
      return selectedText
        ? tutorContent.focusChips.selection.gameWithText
        : tutorContent.focusChips.selection.gameWithoutText;
    }
    return selectedText
      ? tutorContent.focusChips.selection.lessonWithText
      : tutorContent.focusChips.selection.lessonWithoutText;
  }

  return focus.kind ? tutorContent.focusChips.kinds[focus.kind] ?? null : null;
};

const getLastAssistantCoachingMode = (messages: TutorRenderedMessage[]): string | null =>
  [...messages].reverse().find((message) => message.role === 'assistant')?.coachingFrame?.mode ??
  null;

const parseCompletedTutorFollowUp = (
  learnerMemory: KangurAiTutorLearnerMemory | null | undefined
): { label: string; reason: string | null } | null => {
  const rawAction = learnerMemory?.lastRecommendedAction?.trim();
  if (rawAction?.startsWith('Completed follow-up:') !== true) {
    return null;
  }

  const payload = rawAction.slice('Completed follow-up:'.length).trim();
  if (!payload) {
    return null;
  }

  const separatorIndex = payload.indexOf(':');
  const label = separatorIndex === -1 ? payload.trim() : payload.slice(0, separatorIndex).trim();
  const reason = separatorIndex === -1 ? null : payload.slice(separatorIndex + 1).trim() || null;

  return label ? { label, reason } : null;
};

const buildCompletedFollowUpBridgeQuickAction = (input: {
  answerRevealed: boolean | undefined;
  hasCurrentQuestion: boolean;
  learnerMemory: KangurAiTutorLearnerMemory | null | undefined;
  surface: TutorSurface | null | undefined;
  title: string | null | undefined;
  tutorContent: KangurAiTutorContent;
}): TutorQuickAction | null => {
  const completedFollowUp = parseCompletedTutorFollowUp(input.learnerMemory);
  if (!completedFollowUp) {
    return null;
  }

  if (input.surface === 'lesson') {
    const lessonTitle = input.title?.trim();
    const bridgePrompt = formatKangurAiTutorTemplate(input.tutorContent.bridge.toGame.prompt, {
      title: lessonTitle ?? '',
    }).replace(/\s*:\s*\.$/, '.');
    return {
      id: 'bridge-to-game',
      interactionIntent: 'next_step',
      label: input.tutorContent.bridge.toGame.label,
      prompt: bridgePrompt,
      promptMode: 'chat',
    };
  }

  return null;
};

const getBridgeSummaryChipLabel = (
  tutorContent: KangurAiTutorContent,
  bridgeQuickAction: TutorQuickAction | null
): string | null => {
  if (!bridgeQuickAction) {
    return null;
  }

  return bridgeQuickAction.id === 'bridge-to-game'
    ? tutorContent.bridge.toGame.summaryChip
    : null;
};

const buildQuickActions = (input: {
  answerRevealed: boolean | undefined;
  focusKind: ActiveTutorFocus['kind'];
  hasAssignmentSummary: boolean;
  hasCurrentQuestion: boolean;
  hasMessages: boolean;
  hasSelectedText: boolean;
  isLoading: boolean;
  lastAssistantCoachingMode: string | null;
  learnerMemory: KangurAiTutorLearnerMemory | null | undefined;
  surface: TutorSurface | null | undefined;
  title: string | null | undefined;
  tutorContent: KangurAiTutorContent;
}): TutorQuickAction[] => {
  const actions: TutorQuickAction[] = [];
  const isQuestionSurface =
    input.surface === 'test' || (input.surface === 'game' && input.hasCurrentQuestion);
  const isReviewSurface =
    (input.surface === 'test' || input.surface === 'game') && input.answerRevealed;
  const bridgeAction = buildCompletedFollowUpBridgeQuickAction({
    answerRevealed: input.answerRevealed,
    hasCurrentQuestion: input.hasCurrentQuestion,
    learnerMemory: input.learnerMemory,
    surface: input.surface,
    title: input.title,
    tutorContent: input.tutorContent,
  });

  if (isReviewSurface) {
    if (bridgeAction) {
      actions.push(bridgeAction);
    }
    actions.push({
      id: 'review',
      interactionIntent: 'review',
      label: input.hasCurrentQuestion
        ? input.tutorContent.quickActions.review.questionLabel
        : input.surface === 'game'
          ? input.tutorContent.quickActions.review.gameLabel
          : input.tutorContent.quickActions.review.resultLabel,
      prompt: input.hasCurrentQuestion
        ? input.tutorContent.quickActions.review.questionPrompt
        : input.surface === 'game'
          ? input.tutorContent.quickActions.review.gamePrompt
          : input.tutorContent.quickActions.review.resultPrompt,
      promptMode: 'explain',
    });
    actions.push({
      id: 'next-step',
      interactionIntent: 'next_step',
      label: input.hasCurrentQuestion
        ? input.tutorContent.quickActions.nextStep.reviewQuestionLabel
        : input.tutorContent.quickActions.nextStep.reviewOtherLabel,
      prompt: input.hasCurrentQuestion
        ? input.tutorContent.quickActions.nextStep.reviewQuestionPrompt
        : input.surface === 'game'
          ? input.tutorContent.quickActions.nextStep.reviewGamePrompt
          : input.tutorContent.quickActions.nextStep.reviewTestPrompt,
      promptMode: 'chat',
    });
  } else if (isQuestionSurface) {
    if (input.lastAssistantCoachingMode === 'misconception_check') {
      actions.push({
        id: 'how-think',
        interactionIntent: 'explain',
        label: input.tutorContent.quickActions.howThink.misconceptionLabel,
        prompt: input.tutorContent.quickActions.howThink.misconceptionPrompt,
        promptMode: 'explain',
      });
      actions.push({
        id: 'hint',
        interactionIntent: 'hint',
        label: input.tutorContent.quickActions.hint.altLabel,
        prompt: input.tutorContent.quickActions.hint.altPrompt,
        promptMode: 'hint',
      });
    } else if (input.lastAssistantCoachingMode === 'hint_ladder') {
      actions.push({
        id: 'how-think',
        interactionIntent: 'explain',
        label: input.tutorContent.quickActions.howThink.ladderLabel,
        prompt: input.tutorContent.quickActions.howThink.ladderPrompt,
        promptMode: 'explain',
      });
      actions.push({
        id: 'hint',
        interactionIntent: 'hint',
        label: input.tutorContent.quickActions.hint.altLabel,
        prompt: input.tutorContent.quickActions.hint.altPrompt,
        promptMode: 'hint',
      });
    } else {
      actions.push({
        id: 'hint',
        interactionIntent: 'hint',
        label: input.tutorContent.quickActions.hint.defaultLabel,
        prompt: input.tutorContent.quickActions.hint.defaultPrompt,
        promptMode: 'hint',
      });
      actions.push({
        id: 'how-think',
        interactionIntent: 'explain',
        label: input.tutorContent.quickActions.howThink.defaultLabel,
        prompt: input.tutorContent.quickActions.howThink.defaultPrompt,
        promptMode: 'explain',
      });
    }
  } else {
    const explainAction: TutorQuickAction = {
      id: 'explain',
      interactionIntent: 'explain',
      label:
        input.focusKind === 'assignment' || input.hasAssignmentSummary
          ? input.tutorContent.quickActions.explain.assignmentLabel
          : input.tutorContent.quickActions.explain.defaultLabel,
      prompt: input.hasSelectedText
        ? input.tutorContent.quickActions.explain.selectedPrompt
        : input.tutorContent.quickActions.explain.defaultPrompt,
      promptMode: 'explain',
    };
    const nextStepAction: TutorQuickAction = {
      id: 'next-step',
      interactionIntent: 'next_step',
      label:
        input.focusKind === 'assignment' || input.hasAssignmentSummary
          ? input.tutorContent.quickActions.nextStep.assignmentLabel
          : input.tutorContent.quickActions.nextStep.defaultLabel,
      prompt:
        input.focusKind === 'assignment' || input.hasAssignmentSummary
          ? input.surface === 'game'
            ? input.tutorContent.quickActions.nextStep.assignmentGamePrompt
            : input.tutorContent.quickActions.nextStep.assignmentLessonPrompt
          : input.surface === 'game'
            ? input.tutorContent.quickActions.nextStep.gamePrompt
            : input.tutorContent.quickActions.nextStep.defaultPrompt,
      promptMode: 'chat',
    };
    const hintAction: TutorQuickAction = {
      id: 'hint',
      interactionIntent: 'hint',
      label: input.tutorContent.quickActions.hint.defaultLabel,
      prompt: input.tutorContent.quickActions.hint.defaultPrompt,
      promptMode: 'hint',
    };

    if (bridgeAction) {
      actions.push(bridgeAction);
    }
    if (input.lastAssistantCoachingMode === 'next_best_action') {
      actions.push(nextStepAction, explainAction, hintAction);
    } else {
      actions.push(hintAction, explainAction, nextStepAction);
    }
  }

  if (input.hasSelectedText && !input.hasMessages && !input.isLoading) {
    actions.push({
      id: 'selected-text',
      interactionIntent: 'explain',
      label: input.tutorContent.quickActions.selectedText.label,
      prompt: input.tutorContent.quickActions.selectedText.prompt,
      promptMode: 'selected_text',
    });
  }

  return actions;
};

const pickQuickAction = (
  actions: TutorQuickAction[],
  preferredIds: string[]
): TutorQuickAction | null => {
  for (const id of preferredIds) {
    const action = actions.find((candidate) => candidate.id === id);
    if (action) {
      return action;
    }
  }

  return actions[0] ?? null;
};

const buildProactiveNudge = (input: {
  answerRevealed: boolean | undefined;
  canSendMessages: boolean;
  hasAssignmentSummary: boolean;
  hasCurrentQuestion: boolean;
  hasMessages: boolean;
  hasSelectedText: boolean;
  hintDepth: 'brief' | 'guided' | 'step_by_step';
  proactiveNudges: 'off' | 'gentle' | 'coach';
  quickActions: TutorQuickAction[];
  surface: TutorSurface | null | undefined;
  tutorContent: KangurAiTutorContent;
}): TutorProactiveNudge | null => {
  if (
    input.proactiveNudges === 'off' ||
    input.hasMessages ||
    !input.canSendMessages ||
    input.quickActions.length === 0
  ) {
    return null;
  }

  const isQuestionSurface =
    input.surface === 'test' || (input.surface === 'game' && input.hasCurrentQuestion);
  const isReviewSurface =
    (input.surface === 'test' || input.surface === 'game') && input.answerRevealed;
  const title =
    input.proactiveNudges === 'coach'
      ? input.tutorContent.proactiveNudges.coachTitle
      : input.tutorContent.proactiveNudges.gentleTitle;
  const bridgeAction = pickQuickAction(input.quickActions, ['bridge-to-game']);

  if (input.hasSelectedText) {
    const action = pickQuickAction(input.quickActions, ['selected-text', 'explain']);
    return action
      ? {
        action,
        description:
            input.proactiveNudges === 'coach'
              ? input.tutorContent.proactiveNudges.selectedTextCoach
              : input.tutorContent.proactiveNudges.selectedTextGentle,
        mode: input.proactiveNudges,
        title,
      }
      : null;
  }

  if (bridgeAction) {
    return {
      action: bridgeAction,
      description:
        input.proactiveNudges === 'coach'
          ? input.tutorContent.proactiveNudges.bridgeToGameCoach
          : input.tutorContent.proactiveNudges.bridgeToGameGentle,
      mode: input.proactiveNudges,
      title,
    };
  }

  if (isReviewSurface) {
    const action = pickQuickAction(input.quickActions, ['review', 'next-step']);
    return action
      ? {
        action,
        description:
            input.proactiveNudges === 'coach'
              ? input.tutorContent.proactiveNudges.reviewCoach
              : input.tutorContent.proactiveNudges.reviewGentle,
        mode: input.proactiveNudges,
        title,
      }
      : null;
  }

  if (isQuestionSurface) {
    const action = pickQuickAction(
      input.quickActions,
      input.hintDepth === 'step_by_step' ? ['how-think', 'hint'] : ['hint', 'how-think']
    );
    return action
      ? {
        action,
        description:
            input.hintDepth === 'step_by_step'
              ? input.proactiveNudges === 'coach'
                ? input.tutorContent.proactiveNudges.stepByStepCoach
                : input.tutorContent.proactiveNudges.stepByStepGentle
              : input.proactiveNudges === 'coach'
                ? input.tutorContent.proactiveNudges.hintCoach
                : input.tutorContent.proactiveNudges.hintGentle,
        mode: input.proactiveNudges,
        title,
      }
      : null;
  }

  if (input.hasAssignmentSummary) {
    const action = pickQuickAction(input.quickActions, ['next-step', 'explain']);
    return action
      ? {
        action,
        description:
            input.proactiveNudges === 'coach'
              ? input.tutorContent.proactiveNudges.assignmentCoach
              : input.tutorContent.proactiveNudges.assignmentGentle,
        mode: input.proactiveNudges,
        title,
      }
      : null;
  }

  const action = pickQuickAction(
    input.quickActions,
    input.proactiveNudges === 'coach'
      ? ['next-step', 'explain', 'hint']
      : ['explain', 'hint', 'next-step']
  );
  return action
    ? {
      action,
      description:
          input.proactiveNudges === 'coach'
            ? input.tutorContent.proactiveNudges.defaultCoach
            : input.tutorContent.proactiveNudges.defaultGentle,
      mode: input.proactiveNudges,
      title,
    }
    : null;
};

const getEmptyStateMessage = (input: {
  answerRevealed: boolean | undefined;
  bridgeQuickAction: TutorQuickAction | null;
  hasAssignmentSummary: boolean;
  hasCurrentQuestion: boolean;
  hasSelectedText: boolean;
  surface: TutorSurface | null | undefined;
  tutorContent: KangurAiTutorContent;
}): string => {
  if (input.hasSelectedText) {
    return input.tutorContent.emptyStates.selectedText;
  }

  if (
    (input.surface === 'test' || input.surface === 'game') &&
    !input.answerRevealed &&
    input.hasCurrentQuestion
  ) {
    return input.tutorContent.emptyStates.activeQuestion;
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-game') {
    return input.tutorContent.emptyStates.bridgeToGame;
  }

  if ((input.surface === 'test' || input.surface === 'game') && input.answerRevealed) {
    return input.hasCurrentQuestion
      ? input.tutorContent.emptyStates.reviewQuestion
      : input.surface === 'game'
        ? input.tutorContent.emptyStates.reviewGame
        : input.tutorContent.emptyStates.reviewTest;
  }

  if (input.hasAssignmentSummary) {
    return input.tutorContent.emptyStates.assignment;
  }

  if (input.surface === 'game') {
    return '';
  }

  return input.tutorContent.emptyStates.lesson;
};

const getInputPlaceholder = (input: {
  answerRevealed: boolean | undefined;
  bridgeQuickAction: TutorQuickAction | null;
  canSendMessages: boolean;
  hasAssignmentSummary: boolean;
  hasCurrentQuestion: boolean;
  hasSelectedText: boolean;
  surface: TutorSurface | null | undefined;
  tutorContent: KangurAiTutorContent;
}): string => {
  if (!input.canSendMessages) {
    return input.tutorContent.placeholders.limitReached;
  }

  if (input.hasSelectedText) {
    return input.tutorContent.placeholders.selectedText;
  }

  if (
    (input.surface === 'test' || input.surface === 'game') &&
    !input.answerRevealed &&
    input.hasCurrentQuestion
  ) {
    return input.tutorContent.placeholders.activeQuestion;
  }

  if (input.bridgeQuickAction?.id === 'bridge-to-game') {
    return input.tutorContent.placeholders.bridgeToGame;
  }

  if ((input.surface === 'test' || input.surface === 'game') && input.answerRevealed) {
    return input.hasCurrentQuestion
      ? input.tutorContent.placeholders.reviewQuestion
      : input.surface === 'game'
        ? input.tutorContent.placeholders.reviewGame
        : input.tutorContent.placeholders.reviewTest;
  }

  if (input.hasAssignmentSummary) {
    return input.tutorContent.placeholders.assignment;
  }

  if (input.surface === 'game') {
    return input.tutorContent.placeholders.game;
  }

  return input.tutorContent.placeholders.lesson;
};

type UseKangurAiTutorConversationViewStateInput = {
  activeFocus: Pick<ActiveTutorFocus, 'kind'>;
  activeSelectedText: string | null;
  canSendMessages: boolean;
  contextlessDisabledPlaceholder: string;
  contextlessEmptyStateMessage: string;
  hasAssignmentSummary: boolean;
  hasCurrentQuestion: boolean;
  highlightedSection: { anchorId: string } | null;
  hintDepth: 'brief' | 'guided' | 'step_by_step';
  isAskModalMode: boolean;
  isLoading: boolean;
  isOpen: boolean;
  learnerMemory: KangurAiTutorLearnerMemory | null | undefined;
  messages: TutorRenderedMessage[];
  proactiveNudges: 'off' | 'gentle' | 'coach';
  sectionResponseComplete: { anchorId: string } | null;
  sectionResponsePending: unknown;
  selectionResponseComplete: { selectedText: string } | null;
  selectionResponsePending: unknown;
  sessionContext: {
    answerRevealed: boolean | undefined;
    surface: TutorSurface | null | undefined;
    title: string | null | undefined;
  };
  shouldRenderContextlessTutorUi: boolean;
  tutorContent: KangurAiTutorContent;
};

export function useKangurAiTutorConversationViewState(
  input: UseKangurAiTutorConversationViewStateInput
) {
  const focusChipLabel = useMemo(
    () =>
      getFocusChipLabel(
        input.tutorContent,
        input.activeFocus,
        input.activeSelectedText,
        input.sessionContext.surface
      ),
    [
      input.activeFocus,
      input.activeSelectedText,
      input.sessionContext.surface,
      input.tutorContent,
    ]
  );

  const quickActions = useMemo(
    () =>
      buildQuickActions({
        answerRevealed: input.sessionContext.answerRevealed,
        focusKind: input.activeFocus.kind,
        hasAssignmentSummary: input.hasAssignmentSummary,
        hasCurrentQuestion: input.hasCurrentQuestion,
        hasMessages: input.messages.length > 0,
        hasSelectedText: Boolean(input.activeSelectedText),
        isLoading: input.isLoading,
        lastAssistantCoachingMode: getLastAssistantCoachingMode(input.messages),
        learnerMemory: input.learnerMemory,
        surface: input.sessionContext.surface,
        title: input.sessionContext.title,
        tutorContent: input.tutorContent,
      }),
    [
      input.activeFocus.kind,
      input.activeSelectedText,
      input.hasAssignmentSummary,
      input.hasCurrentQuestion,
      input.isLoading,
      input.learnerMemory,
      input.messages,
      input.sessionContext.answerRevealed,
      input.sessionContext.surface,
      input.sessionContext.title,
      input.tutorContent,
    ]
  );

  const bridgeQuickAction = useMemo(
    () => pickQuickAction(quickActions, ['bridge-to-game']),
    [quickActions]
  );
  const bridgeSummaryChipLabel = useMemo(
    () => getBridgeSummaryChipLabel(input.tutorContent, bridgeQuickAction),
    [bridgeQuickAction, input.tutorContent]
  );
  const proactiveNudge = useMemo(
    () =>
      buildProactiveNudge({
        answerRevealed: input.sessionContext.answerRevealed,
        canSendMessages: input.canSendMessages,
        hasAssignmentSummary: input.hasAssignmentSummary,
        hasCurrentQuestion: input.hasCurrentQuestion,
        hasMessages: input.messages.length > 0,
        hasSelectedText: Boolean(input.activeSelectedText),
        hintDepth: input.hintDepth,
        proactiveNudges: input.proactiveNudges,
        quickActions,
        surface: input.sessionContext.surface,
        tutorContent: input.tutorContent,
      }),
    [
      input.activeSelectedText,
      input.canSendMessages,
      input.hasAssignmentSummary,
      input.hasCurrentQuestion,
      input.hintDepth,
      input.messages.length,
      input.proactiveNudges,
      input.sessionContext.answerRevealed,
      input.sessionContext.surface,
      input.tutorContent,
      quickActions,
    ]
  );

  const isSelectionExplainPendingMode = Boolean(
    input.selectionResponsePending && input.isOpen && !input.isAskModalMode
  );
  const isSectionExplainPendingMode = Boolean(
    input.sectionResponsePending && input.isOpen && !input.isAskModalMode
  );
  const showSelectionExplainCompleteState = Boolean(
    input.activeSelectedText &&
      areTutorSelectionTextsEquivalent(
        input.selectionResponseComplete?.selectedText ?? null,
        input.activeSelectedText
      ) &&
      !isSelectionExplainPendingMode
  );
  const showSectionExplainCompleteState = Boolean(
    input.highlightedSection &&
      input.sectionResponseComplete?.anchorId === input.highlightedSection.anchorId &&
      !isSectionExplainPendingMode
  );
  const visibleQuickActions =
    input.shouldRenderContextlessTutorUi ||
    isSelectionExplainPendingMode ||
    isSectionExplainPendingMode
      ? []
      : quickActions;
  const navigationNudge = useMemo((): TutorProactiveNudge | null => {
    if (input.messages.length === 0 || input.proactiveNudges === 'off') {
      return null;
    }

    const lastAssistant = [...input.messages]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (!lastAssistant?.websiteHelpTarget) {
      return null;
    }

    const target = lastAssistant.websiteHelpTarget;
    return {
      mode: 'gentle',
      title: 'Mogę Ci pokazać',
      description: `Chcesz zobaczyć gdzie to jest? Poprowadzę Cię do: ${target.label}`,
      action: {
        id: 'navigate_to_target',
        label: target.label,
        prompt: `Pokaż mi "${target.label}"`,
        promptMode: 'chat',
      },
    };
  }, [input.messages, input.proactiveNudges]);

  const visibleProactiveNudge =
    input.shouldRenderContextlessTutorUi ||
    isSelectionExplainPendingMode ||
    isSectionExplainPendingMode
      ? null
      : (navigationNudge ?? proactiveNudge);
  const emptyStateMessage = input.shouldRenderContextlessTutorUi
    ? input.contextlessEmptyStateMessage
    : getEmptyStateMessage({
      answerRevealed: input.sessionContext.answerRevealed,
      bridgeQuickAction,
      hasAssignmentSummary: input.hasAssignmentSummary,
      hasCurrentQuestion: input.hasCurrentQuestion,
      hasSelectedText: Boolean(input.activeSelectedText),
      surface: input.sessionContext.surface,
      tutorContent: input.tutorContent,
    });
  const inputPlaceholder = input.shouldRenderContextlessTutorUi
    ? input.contextlessDisabledPlaceholder
    : getInputPlaceholder({
      answerRevealed: input.sessionContext.answerRevealed,
      bridgeQuickAction,
      canSendMessages: input.canSendMessages,
      hasAssignmentSummary: input.hasAssignmentSummary,
      hasCurrentQuestion: input.hasCurrentQuestion,
      hasSelectedText: Boolean(input.activeSelectedText),
      surface: input.sessionContext.surface,
      tutorContent: input.tutorContent,
    });

  return {
    bridgeQuickAction,
    bridgeSummaryChipLabel,
    emptyStateMessage,
    focusChipLabel,
    inputPlaceholder,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
    visibleProactiveNudge,
    visibleQuickActions,
  };
}
