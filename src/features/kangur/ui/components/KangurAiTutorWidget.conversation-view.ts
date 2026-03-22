'use client';

import { useMemo } from 'react';

import type { KangurAiTutorLearnerMemory } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import {
  formatKangurAiTutorTemplate,
  type KangurAiTutorContent,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

import type { KangurAiTutorRuntimeMessage as TutorRenderedMessage } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
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
  const isSelectionExplainPendingMode = Boolean(
    input.selectionResponsePending && !input.isAskModalMode
  );
  const isSectionExplainPendingMode = Boolean(
    input.sectionResponsePending && !input.isAskModalMode
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
    isSelectionExplainPendingMode || isSectionExplainPendingMode ? [] : quickActions;
  const visibleProactiveNudge = null;
  const emptyStateMessage = getEmptyStateMessage({
    answerRevealed: input.sessionContext.answerRevealed,
    bridgeQuickAction,
    hasAssignmentSummary: input.hasAssignmentSummary,
    hasCurrentQuestion: input.hasCurrentQuestion,
    hasSelectedText: Boolean(input.activeSelectedText),
    surface: input.sessionContext.surface,
    tutorContent: input.tutorContent,
  });
  const inputPlaceholder = getInputPlaceholder({
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
