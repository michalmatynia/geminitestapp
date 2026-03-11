import {
  kangurAiTutorConversationContextSchema,
  type KangurAiTutorConversationContext,
} from '@/shared/contracts/kangur-ai-tutor';

export type KangurKnowledgeGraphQueryCliOptions = {
  latestUserMessage: string;
  learnerId: string;
  locale: string;
  context?: KangurAiTutorConversationContext;
};

const readFlagValue = (argv: string[], name: string): string | undefined => {
  const prefix = `--${name}=`;
  const match = argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length).trim();
};

const readBooleanFlagValue = (argv: string[], name: string): boolean | undefined => {
  const raw = readFlagValue(argv, name);
  if (!raw) {
    return undefined;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};

const readNumberFlagValue = (argv: string[], name: string): number | undefined => {
  const raw = readFlagValue(argv, name);
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseKangurKnowledgeGraphQueryArgs = (
  argv: string[]
): KangurKnowledgeGraphQueryCliOptions => {
  const latestUserMessage =
    readFlagValue(argv, 'message') ?? readFlagValue(argv, 'latest-user-message') ?? '';
  if (!latestUserMessage.trim()) {
    throw new Error('Missing required --message="..." flag for Kangur knowledge graph query.');
  }

  const learnerId = readFlagValue(argv, 'learner-id') || 'preview-learner';
  const locale = readFlagValue(argv, 'locale') || 'pl';

  const contextInput = {
    surface: readFlagValue(argv, 'surface'),
    contentId: readFlagValue(argv, 'content-id'),
    title: readFlagValue(argv, 'title'),
    description: readFlagValue(argv, 'description'),
    masterySummary: readFlagValue(argv, 'mastery-summary'),
    assignmentSummary: readFlagValue(argv, 'assignment-summary'),
    questionId: readFlagValue(argv, 'question-id'),
    selectedText: readFlagValue(argv, 'selected-text'),
    currentQuestion: readFlagValue(argv, 'current-question'),
    questionProgressLabel: readFlagValue(argv, 'question-progress-label'),
    answerRevealed: readBooleanFlagValue(argv, 'answer-revealed'),
    promptMode: readFlagValue(argv, 'prompt-mode'),
    focusKind: readFlagValue(argv, 'focus-kind'),
    focusId: readFlagValue(argv, 'focus-id'),
    focusLabel: readFlagValue(argv, 'focus-label'),
    assignmentId: readFlagValue(argv, 'assignment-id'),
    interactionIntent: readFlagValue(argv, 'interaction-intent'),
    repeatedQuestionCount: readNumberFlagValue(argv, 'repeated-question-count'),
    recentHintRecoverySignal: readFlagValue(argv, 'recent-hint-recovery-signal'),
    previousCoachingMode: readFlagValue(argv, 'previous-coaching-mode'),
  };

  const hasContextFlags = Object.values(contextInput).some((value) => value !== undefined);
  if (!hasContextFlags) {
    return {
      latestUserMessage,
      learnerId,
      locale,
    };
  }

  if (!contextInput.surface) {
    throw new Error('The --surface flag is required when passing Kangur tutor context flags.');
  }

  const context = kangurAiTutorConversationContextSchema.parse(contextInput);

  return {
    latestUserMessage,
    learnerId,
    locale,
    context,
  };
};
