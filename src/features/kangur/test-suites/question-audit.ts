import type {
  KangurTestChoice,
  KangurTestQuestionAuditFlag,
  KangurTestQuestionPresentation,
  KangurTestQuestionReviewStatus,
} from '@/features/kangur/shared/contracts/kangur-tests';
import type { KangurExamQuestion } from '@/features/kangur/shared/contracts/kangur';

export type LegacyKangurQuestionAudit = {
  flags: KangurTestQuestionAuditFlag[];
  reviewStatus: KangurTestQuestionReviewStatus;
  note?: string;
  presentation: KangurTestQuestionPresentation;
};

const VISUAL_PROMPT_PATTERN =
  /(patrz|rysun(?:ek|ku)?|obraz(?:ek|ku)?|diagram|schemat|widoczne|zobacz|plansz|tabel|figu|klo(?:cek|cki)|plytk|płytk)/i;

const INCONSISTENT_REASONING_PATTERN =
  /(hmm|nie calkowite|nie całkowite|ale odpowiedz to|ale odpowiedź to|poprawna odpowiedz to|poprawna odpowiedź to)/i;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uniqueFlags = (flags: KangurTestQuestionAuditFlag[]): KangurTestQuestionAuditFlag[] =>
  Array.from(new Set(flags));

const extractReferencedAnswerLabel = (explanation: string): string | null => {
  const labelMatch = explanation.match(
    /(?:odpowied[zź]|prawid[łl]owa odpowied[zź]|poprawna odpowied[zź])[^A-E0-9]{0,16}([A-E])\)?/i
  );
  return labelMatch?.[1]?.toUpperCase() ?? null;
};

const explanationMentionsConflictingChoiceText = (
  explanation: string,
  choices: KangurTestChoice[],
  correctChoiceLabel: string
): boolean => {
  const anchoredPrefix =
    /(?:odpowied[zź]|prawid[łl]owa odpowied[zź]|poprawna odpowied[zź])[^.]{0,60}/i;
  const prefixMatch = explanation.match(anchoredPrefix)?.[0];
  const searchWindow = prefixMatch ?? explanation;
  const normalizedSearch = searchWindow.toLowerCase();
  const correctChoice = choices.find((choice) => choice.label === correctChoiceLabel);

  return choices.some((choice) => {
    const normalizedChoice = choice.text.trim().toLowerCase();
    if (!normalizedChoice) return false;
    if (correctChoice?.text.trim().toLowerCase() === normalizedChoice) return false;
    return new RegExp(`\\b${escapeRegExp(normalizedChoice)}\\b`, 'i').test(normalizedSearch);
  });
};

export const auditLegacyKangurQuestion = (
  question: KangurExamQuestion,
  choices: KangurTestChoice[],
  correctChoiceLabel: string
): LegacyKangurQuestionAudit => {
  const flags: KangurTestQuestionAuditFlag[] = [];

  if (VISUAL_PROMPT_PATTERN.test(question.question)) {
    flags.push('legacy_visual_prompt');
  }

  if (question.choiceDescriptions?.some((description) => description.trim().length > 0)) {
    flags.push('legacy_choice_descriptions');
  }

  if (question.image && question.image.trim().length > 0) {
    flags.push('legacy_image_reference');
  }

  if (!choices.some((choice) => choice.label === correctChoiceLabel)) {
    flags.push('answer_not_in_choices');
  }

  if (question.explanation?.trim()) {
    const referencedLabel = extractReferencedAnswerLabel(question.explanation);
    if (referencedLabel && referencedLabel !== correctChoiceLabel) {
      flags.push('explanation_answer_mismatch');
    } else if (explanationMentionsConflictingChoiceText(question.explanation, choices, correctChoiceLabel)) {
      flags.push('explanation_answer_mismatch');
    }

    if (INCONSISTENT_REASONING_PATTERN.test(question.explanation)) {
      flags.push('explanation_inconsistent_reasoning');
    }
  }

  const resolvedFlags = uniqueFlags(flags);
  const reviewStatus: KangurTestQuestionReviewStatus = resolvedFlags.some(
    (flag) => flag === 'answer_not_in_choices' || flag.startsWith('explanation_')
  )
    ? 'needs-fix'
    : resolvedFlags.length > 0
      ? 'needs-review'
      : 'ready';

  const note =
    reviewStatus === 'ready'
      ? undefined
      : reviewStatus === 'needs-fix'
        ? 'Legacy question needs editorial repair before publishing.'
        : 'Legacy question should be reviewed before publishing.';

  return {
    flags: resolvedFlags,
    reviewStatus,
    note,
    presentation: {
      layout: question.image ? 'split-illustration-right' : 'classic',
      choiceStyle: question.choiceDescriptions?.some((description) => description.trim().length > 0)
        ? 'grid'
        : 'list',
    },
  };
};
