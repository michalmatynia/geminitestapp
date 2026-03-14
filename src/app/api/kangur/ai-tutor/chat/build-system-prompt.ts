import 'server-only';

import { resolveKangurAiTutorRuntimeDocuments } from '@/features/kangur/server/context-registry';
import type {
  KangurAiTutorHintDepth,
  KangurAiTutorProactiveNudges,
} from '@/features/kangur/settings-ai-tutor';
import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorInteractionIntent,
  KangurAiTutorLearnerMemory,
  KangurAiTutorPromptMode,
} from '@/shared/contracts/kangur-ai-tutor';

// ---------------------------------------------------------------------------
// Prompt constants
// ---------------------------------------------------------------------------

export const SOCRATIC_CONSTRAINT = [
  'You are a friendly AI Tutor helping a child (age 6–12) learn.',
  'IMPORTANT RULES:',
  '- NEVER give direct answers to exercises or problems.',
  '- Instead, ask guiding questions or provide process hints.',
  '- Acknowledge what the child says correctly.',
  '- Keep responses short and encouraging.',
  '- If the child is stuck, hint at the next thinking step, not the answer.',
].join('\n');

export const PROMPT_MODE_INSTRUCTIONS: Record<KangurAiTutorPromptMode, string> = {
  chat: 'Answer as a concise tutor conversation.',
  hint: 'The learner asked for a hint. Give only the next helpful step or one guiding question.',
  explain:
    'The learner asked for an explanation. Explain the concept simply with a tiny example, but do not solve the exact task for them.',
  selected_text:
    'The learner selected a specific excerpt. Focus on that excerpt first and relate your response back to it.',
};

export const INTERACTION_INTENT_INSTRUCTIONS: Record<KangurAiTutorInteractionIntent, string> = {
  hint: 'Prioritize a single hint, checkpoint, or guiding question.',
  explain: 'Prioritize a short, clear explanation before suggesting the next step.',
  review: 'Prioritize reviewing what happened, why, and what to try next time.',
  next_step: 'Prioritize the learner\'s next best practice step.',
};

export const HINT_DEPTH_INSTRUCTIONS: Record<KangurAiTutorHintDepth, string> = {
  brief: 'Parent preference: keep hints very short and stop after one small nudge.',
  guided: 'Parent preference: give one hint plus one quick checkpoint question when helpful.',
  step_by_step:
    'Parent preference: guide the learner step by step without giving the final answer.',
};

export const PROACTIVE_NUDGE_INSTRUCTIONS: Record<KangurAiTutorProactiveNudges, string> = {
  off: 'Parent preference: do not proactively push extra practice unless the learner asks.',
  gentle:
    'Parent preference: it is okay to gently suggest one next step or one small review activity.',
  coach:
    'Parent preference: be comfortable proactively recommending the next practice move when the learner seems stuck.',
};

// ---------------------------------------------------------------------------
// Fact / string reading helpers
// ---------------------------------------------------------------------------

export const readStringFact = (
  document: ContextRuntimeDocument | null | undefined,
  key: string
): string | null => {
  const value = document?.facts?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

export const readContextString = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

export const buildRegistryPolicyInstructions = (
  bundle: ContextRegistryResolutionBundle | null | undefined
): string[] =>
  (bundle?.nodes ?? [])
    .filter((node) => node.kind === 'policy' && node.id.startsWith('policy:kangur-ai-tutor'))
    .map((node) => node.description.trim())
    .filter(Boolean);

export const buildParentPreferenceInstructions = (input: {
  hintDepth: KangurAiTutorHintDepth;
  proactiveNudges: KangurAiTutorProactiveNudges;
  rememberTutorContext: boolean;
}): string =>
  [
    HINT_DEPTH_INSTRUCTIONS[input.hintDepth],
    PROACTIVE_NUDGE_INSTRUCTIONS[input.proactiveNudges],
    input.rememberTutorContext
      ? 'Parent preference: you may use compact learner memory from recent tutor sessions when it is provided.'
      : 'Parent preference: do not rely on memory from previous tutor sessions.',
  ].join('\n');

export const buildLearnerMemoryInstructions = (
  memory: KangurAiTutorLearnerMemory | null | undefined
): string => {
  if (!memory) {
    return '';
  }

  const lines = ['Compact learner memory from recent Kangur tutor sessions:'];
  if (memory.lastSurface) {
    lines.push(`Recent surface: ${memory.lastSurface}.`);
  }
  if (memory.lastFocusLabel) {
    lines.push(`Recent focus: ${memory.lastFocusLabel}`);
  }
  if (memory.lastUnresolvedBlocker) {
    lines.push(`Last unresolved blocker: ${memory.lastUnresolvedBlocker}`);
  }
  if (memory.lastRecommendedAction) {
    lines.push(`Last recommended action: ${memory.lastRecommendedAction}`);
  }
  if (memory.lastSuccessfulIntervention) {
    lines.push(`Last successful intervention: ${memory.lastSuccessfulIntervention}`);
  }
  if (memory.lastCoachingMode) {
    lines.push(`Previous coaching mode: ${memory.lastCoachingMode}.`);
  }
  if (memory.lastGivenHints?.length) {
    lines.push(
      `Recent hints given (vary your approach, do not repeat these verbatim): ${memory.lastGivenHints.join(' | ')}`
    );
  }

  return lines.length > 1 ? lines.join('\n') : '';
};

export const buildContextInstructions = (input: {
  context: KangurAiTutorConversationContext | undefined;
  registryBundle: ContextRegistryResolutionBundle | null;
  options?: {
    testAccessMode?: 'disabled' | 'guided' | 'review_after_answer';
  };
}): string => {
  const { context, registryBundle, options } = input;
  if (!context) {
    return '';
  }

  const { learnerSnapshot, loginActivity, surfaceContext, assignmentContext } =
    resolveKangurAiTutorRuntimeDocuments(registryBundle, context);
  const policyInstructions = buildRegistryPolicyInstructions(registryBundle);
  const surfaceLabel =
    context.surface === 'test'
      ? 'test practice'
      : context.surface === 'game'
        ? 'game practice'
        : 'lesson learning';
  const lines: string[] = [`Current Kangur surface: ${surfaceLabel}.`];

  const title = readStringFact(surfaceContext, 'title') ?? readContextString(context.title);
  if (title) {
    lines.push(`Current title: ${title}`);
  }

  const description =
    readStringFact(surfaceContext, 'description') ?? readContextString(context.description);
  if (description) {
    lines.push(`Current description: ${description}`);
  }

  const learnerSummary = readStringFact(learnerSnapshot, 'learnerSummary');
  if (learnerSummary) {
    lines.push(`Learner snapshot: ${learnerSummary}`);
  }

  const loginActivitySummary = readStringFact(loginActivity, 'recentLoginActivitySummary');
  if (loginActivitySummary) {
    lines.push(`Recent Kangur login activity: ${loginActivitySummary}`);
  }

  const masterySummary =
    readStringFact(surfaceContext, 'masterySummary') ?? readContextString(context.masterySummary);
  if (masterySummary) {
    lines.push(`Learner mastery snapshot: ${masterySummary}`);
  }

  const assignmentSummary =
    readStringFact(assignmentContext, 'assignmentSummary') ??
    readStringFact(surfaceContext, 'assignmentSummary') ??
    readContextString(context.assignmentSummary);
  if (assignmentSummary) {
    lines.push(`Active assignment or focus: ${assignmentSummary}`);
  }
  if (context.focusKind) {
    lines.push(`Tutor visual focus: ${context.focusKind}.`);
  }
  if (context.focusLabel) {
    lines.push(`Tutor focus label: ${context.focusLabel}`);
  }
  if (context.assignmentId) {
    lines.push(`Assignment id in focus: ${context.assignmentId}`);
  }

  const currentQuestion =
    readStringFact(surfaceContext, 'currentQuestion') ??
    readContextString(context.currentQuestion);
  if (currentQuestion) {
    lines.push(`Current question: ${currentQuestion}`);
  }

  const questionProgressLabel =
    readStringFact(surfaceContext, 'questionProgressLabel') ??
    readContextString(context.questionProgressLabel);
  if (questionProgressLabel) {
    lines.push(`Question progress: ${questionProgressLabel}`);
  }

  const revealedExplanation = readStringFact(surfaceContext, 'revealedExplanation');
  if (context.answerRevealed && revealedExplanation) {
    lines.push(`Review context: ${revealedExplanation}`);
  }
  if (context.selectedText) {
    lines.push(`Learner selected this text: """${context.selectedText}"""`);
  }
  if (context.drawingImageData) {
    lines.push(
      'The learner attached a drawing to this tutor turn. You cannot inspect the image pixels directly here, so never pretend that you can see the uploaded sketch.'
    );
  }
  if ((context.repeatedQuestionCount ?? 0) > 0) {
    lines.push(
      `Repeat signal: the learner has asked essentially the same question ${(context.repeatedQuestionCount ?? 0) + 1} times in this session. Do not repeat the same hint unchanged; change strategy and diagnose the sticking point.`
    );
  }
  if (context.previousCoachingMode) {
    lines.push(`Previous coaching mode in this tutor thread: ${context.previousCoachingMode}.`);
  }
  if (context.recentHintRecoverySignal === 'answer_revealed') {
    lines.push(
      'Recent hint recovery: the learner moved from a hint into review after seeing the answer. Focus on reflection, reasoning, and one improvement for the next attempt.'
    );
  } else if (context.recentHintRecoverySignal === 'focus_advanced') {
    lines.push(
      'Recent hint recovery: the learner progressed after the previous hint. Acknowledge that progress and give one clear next step instead of repeating the same hint.'
    );
  }
  if (context.promptMode) {
    lines.push(PROMPT_MODE_INSTRUCTIONS[context.promptMode]);
  }
  if (context.interactionIntent) {
    lines.push(INTERACTION_INTENT_INSTRUCTIONS[context.interactionIntent]);
  }
  policyInstructions.forEach((instruction) => {
    lines.push(`Registry policy: ${instruction}`);
  });
  if (context.surface === 'test') {
    if (options?.testAccessMode === 'review_after_answer' && context.answerRevealed) {
      lines.push(
        'The parent only allows post-answer review in tests. Keep the focus on reasoning, mistakes, and what to watch next time.'
      );
    }
    lines.push(
      context.answerRevealed
        ? 'The learner has already answered or revealed this question. You may explain the reasoning, but still avoid doing the whole test for them.'
        : 'The learner is in an active test question. Do not reveal the final answer, the correct option label, or solve the problem outright.'
    );
  }

  if (context.surface === 'game' && currentQuestion) {
    lines.push(
      context.answerRevealed
        ? 'The learner has already seen the practice outcome. You may review the reasoning and next step, but avoid doing future problems for them.'
        : 'The learner is in an active practice question. Do not reveal the final answer or solve the problem outright.'
    );
  }

  return lines.join('\n');
};

// Re-export for handler convenience
export type { AgentTeachingChatSource, ContextRuntimeDocument };
