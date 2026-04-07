import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurTestQuestion } from '@/features/kangur/shared/contracts/kangur-tests';
import { readTrimmedString, truncate } from '../kangur-registry-utils';

export const buildKangurTestResultSummaryFromContext = (
  context: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (context?.surface !== 'test') {
    return null;
  }

  const currentQuestion = readTrimmedString(context.currentQuestion);
  const questionId = readTrimmedString(context.questionId);
  if (currentQuestion || questionId || context.answerRevealed !== true) {
    return null;
  }

  return readTrimmedString(context.description);
};

export const buildKangurTestReviewSummaryFromContext = (
  context: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (context?.surface !== 'test' || context.answerRevealed !== true) {
    return null;
  }

  const currentQuestion = readTrimmedString(context.currentQuestion);
  const questionId = readTrimmedString(context.questionId);
  if (!currentQuestion || !questionId) {
    return null;
  }

  return readTrimmedString(context.description);
};

export const buildKangurTestSelectedChoiceFactsFromContext = (
  context: KangurAiTutorConversationContext | null | undefined
): {
  selectedChoiceLabel: string;
  selectedChoiceText?: string;
  selectedChoiceSummary: string;
} | null => {
  if (context?.surface !== 'test') {
    return null;
  }

  const selectedChoiceLabel = readTrimmedString(context.selectedChoiceLabel);
  if (!selectedChoiceLabel) {
    return null;
  }

  const selectedChoiceText = readTrimmedString(context.selectedChoiceText);
  return {
    selectedChoiceLabel,
    ...(selectedChoiceText ? { selectedChoiceText } : {}),
    selectedChoiceSummary: selectedChoiceText
      ? `Wybrana odpowiedź: ${selectedChoiceLabel} - ${selectedChoiceText}.`
      : `Wybrana odpowiedź: ${selectedChoiceLabel}.`,
  };
};

export const buildQuestionChoiceItems = (
  question: KangurTestQuestion,
  answerRevealed: boolean
): Array<Record<string, unknown>> =>
  question.choices.map((choice) => ({
    label: choice.label,
    text: choice.text,
    ...(choice.description?.trim() ? { description: choice.description.trim() } : {}),
    ...(answerRevealed ? { isCorrect: choice.label === question.correctChoiceLabel } : {}),
  }));

export const buildQuestionChoiceSummary = (question: KangurTestQuestion): string =>
  `Opcje odpowiedzi: ${question.choices
    .map((choice) =>
      [
        `${choice.label} - ${truncate(choice.text.trim(), 80)}`,
        choice.description?.trim() ? truncate(choice.description.trim(), 80) : null,
      ]
        .filter(Boolean)
        .join(': ')
    )
    .join('; ')}.`;
