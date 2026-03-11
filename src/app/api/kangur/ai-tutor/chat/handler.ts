import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import {
  buildPersonaChatMemoryContext,
  persistAgentPersonaExchangeMemory,
} from '@/features/ai/agentcreator/server/persona-memory';
import { mergeContextRegistryRefs } from '@/features/ai/ai-context-registry/context/page-context-shared';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { summarizeKangurAiTutorFollowUpActions } from '@/features/kangur/ai-tutor/follow-up-reporting';
import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  buildKangurAiTutorLearnerMood,
  resolveKangurActor,
  setKangurLearnerAiTutorState,
} from '@/features/kangur/server';
import { buildKangurAiTutorAdaptiveGuidance } from '@/features/kangur/server/ai-tutor-adaptive';
import { resolveKangurAiTutorNativeGuideResolution } from '@/features/kangur/server/ai-tutor-native-guide';
import { resolveKangurAiTutorSemanticGraphContext } from '@/features/kangur/server/knowledge-graph/retrieval';
import {
  consumeKangurAiTutorDailyUsage,
  ensureKangurAiTutorDailyUsageAvailable,
} from '@/features/kangur/server/ai-tutor-usage';
import { resolveKangurAiTutorRuntimeDocuments } from '@/features/kangur/server/context-registry';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  parseKangurAiTutorSettings,
  getKangurAiTutorSettingsForLearner,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  resolveKangurAiTutorAvailability,
  resolveKangurAiTutorAppSettings,
  type KangurAiTutorAvailabilityReason,
  type KangurAiTutorHintDepth,
  type KangurAiTutorProactiveNudges,
} from '@/features/kangur/settings-ai-tutor';
import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import {
  AGENT_PERSONA_SETTINGS_KEY,
  type AgentPersona,
  type AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import type { ContextRegistryResolutionBundle, ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import {
  kangurAiTutorChatRequestSchema,
  type KangurAiTutorChatResponse,
  type KangurAiTutorCoachingMode,
  type KangurAiTutorConversationContext,
  type KangurAiTutorInteractionIntent,
  type KangurAiTutorLearnerMemory,
  type KangurAiTutorMessageArtifact,
  type KangurAiTutorPromptMode,
} from '@/shared/contracts/kangur-ai-tutor';
import { createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { isAppError } from '@/shared/errors/app-error';
import {
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/server';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  type BrainChatMessage,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { sanitizeSvg } from '@/shared/utils';
import { parseJsonSetting } from '@/shared/utils/settings-json';

const SOCRATIC_CONSTRAINT = [
  'You are a friendly AI tutor helping a child (age 6–12) learn.',
  'IMPORTANT RULES:',
  '- NEVER give direct answers to exercises or problems.',
  '- Instead, ask guiding questions or provide process hints.',
  '- Acknowledge what the child says correctly.',
  '- Keep responses short and encouraging.',
  '- If the child is stuck, hint at the next thinking step, not the answer.',
].join('\n');

const PROMPT_MODE_INSTRUCTIONS: Record<KangurAiTutorPromptMode, string> = {
  chat: 'Answer as a concise tutor conversation.',
  hint: 'The learner asked for a hint. Give only the next helpful step or one guiding question.',
  explain:
    'The learner asked for an explanation. Explain the concept simply with a tiny example, but do not solve the exact task for them.',
  selected_text:
    'The learner selected a specific excerpt. Focus on that excerpt first and relate your response back to it.',
};

const INTERACTION_INTENT_INSTRUCTIONS: Record<KangurAiTutorInteractionIntent, string> = {
  hint: 'Prioritize a single hint, checkpoint, or guiding question.',
  explain: 'Prioritize a short, clear explanation before suggesting the next step.',
  review: 'Prioritize reviewing what happened, why, and what to try next time.',
  next_step: 'Prioritize the learner’s next best practice step.',
};

const HINT_DEPTH_INSTRUCTIONS: Record<KangurAiTutorHintDepth, string> = {
  brief: 'Parent preference: keep hints very short and stop after one small nudge.',
  guided: 'Parent preference: give one hint plus one quick checkpoint question when helpful.',
  step_by_step:
    'Parent preference: guide the learner step by step without giving the final answer.',
};

const PROACTIVE_NUDGE_INSTRUCTIONS: Record<KangurAiTutorProactiveNudges, string> = {
  off: 'Parent preference: do not proactively push extra practice unless the learner asks.',
  gentle:
    'Parent preference: it is okay to gently suggest one next step or one small review activity.',
  coach:
    'Parent preference: be comfortable proactively recommending the next practice move when the learner seems stuck.',
};

const AVAILABILITY_ERROR_MESSAGES: Record<KangurAiTutorAvailabilityReason, string> = {
  disabled: 'AI tutor is not enabled for this learner.',
  email_unverified: 'Verify your parent email to unlock AI Tutor.',
  missing_context: 'AI tutor context is required for Kangur tutoring sessions.',
  lessons_disabled: 'AI tutor is disabled for lessons for this learner.',
  games_disabled: 'AI tutor is disabled for games for this learner.',
  tests_disabled: 'AI tutor is disabled for tests for this learner.',
  review_after_answer_only:
    'AI tutor is available in tests only after the answer has been revealed.',
};
const KANGUR_AI_TUTOR_BRAIN_CAPABILITY = 'kangur_ai_tutor.chat';
const KANGUR_AI_TUTOR_DRAWING_ANALYSIS_BRAIN_CAPABILITY =
  'kangur_ai_tutor.drawing_analysis';
const KANGUR_TUTOR_DRAWING_BLOCK_PATTERN =
  /<kangur_tutor_drawing>([\s\S]*?)<\/kangur_tutor_drawing>/i;
const KANGUR_TUTOR_DRAWING_TITLE_PATTERN = /<title>([\s\S]*?)<\/title>/i;
const KANGUR_TUTOR_DRAWING_CAPTION_PATTERN = /<caption>([\s\S]*?)<\/caption>/i;
const KANGUR_TUTOR_DRAWING_ALT_PATTERN = /<alt>([\s\S]*?)<\/alt>/i;
const KANGUR_TUTOR_DRAWING_REQUEST_PATTERN =
  /\b(narysuj|rysuj|rysunek|szkic|schemat|diagram|pokaz .*rysun|pokaz .*schemat)\b/i;

const normalizeDrawingText = (
  value: string | null | undefined,
  maxLength: number
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.length > maxLength ? normalized.slice(0, maxLength).trimEnd() : normalized;
};

const extractTaggedTutorDrawingText = (
  value: string,
  pattern: RegExp,
  maxLength: number
): string | undefined => normalizeDrawingText(value.match(pattern)?.[1] ?? null, maxLength);

const shouldEnableTutorDrawingSupport = (input: {
  context: KangurAiTutorConversationContext | undefined;
  latestUserMessage: string | null;
  messages: Array<{
    role: string;
    artifacts?: KangurAiTutorMessageArtifact[];
  }>;
}): boolean => {
  const latestUserDrawingArtifact = [...input.messages]
    .reverse()
    .find(
      (message) =>
        message.role === 'user' &&
        message.artifacts?.some((artifact) => artifact.type === 'user_drawing')
    );

  return (
    Boolean(latestUserDrawingArtifact) ||
    input.context?.promptMode === 'explain' ||
    input.context?.promptMode === 'selected_text' ||
    input.context?.interactionIntent === 'explain' ||
    Boolean(input.latestUserMessage && KANGUR_TUTOR_DRAWING_REQUEST_PATTERN.test(input.latestUserMessage))
  );
};

const buildTutorDrawingInstructions = (): string =>
  [
    'Drawing support: when a tiny visual sketch would clearly help, append exactly one optional drawing block after the normal text reply.',
    'Always keep the normal tutor text outside the drawing block.',
    'Do not pretend to inspect learner-uploaded pixels. If the learner attached a drawing, use it only as a signal that a visual explanation may help.',
    'Use this exact format when you draw:',
    '<kangur_tutor_drawing>',
    '<title>Krotki tytul po polsku</title>',
    '<caption>Jedno krotkie objasnienie rysunku.</caption>',
    '<alt>Krotki opis dostepnosci.</alt>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">...</svg>',
    '</kangur_tutor_drawing>',
    'Use only simple SVG elements and inline attributes.',
    'Never use script, style, foreignObject, iframe, object, embed, external hrefs, or image tags.',
    'Keep the sketch child-friendly, large, and easy to read.',
  ].join('\n');

const buildLearnerDrawingAnalysisPrompt = (input: {
  context: KangurAiTutorConversationContext | undefined;
  latestUserMessage: string | null;
}): string =>
  [
    'Analyze the attached learner drawing for a math tutor.',
    'Describe only visible math-relevant structure or spatial cues.',
    'Keep the analysis short, concrete, and in Polish.',
    'If the drawing is ambiguous, say what is uncertain.',
    'Do not solve the task.',
    ...(input.latestUserMessage
      ? [`Learner message: ${input.latestUserMessage}`]
      : []),
    ...(input.context?.selectedText
      ? [`Selected text: ${input.context.selectedText}`]
      : []),
    ...(input.context?.currentQuestion
      ? [`Current question: ${input.context.currentQuestion}`]
      : []),
    ...(input.context?.title ? [`Current title: ${input.context.title}`] : []),
  ].join('\n');

const analyzeLearnerDrawingWithBrain = async (input: {
  drawingImageData: string;
  context: KangurAiTutorConversationContext | undefined;
  latestUserMessage: string | null;
}): Promise<string | null> => {
  const brainConfig = await resolveBrainExecutionConfigForCapability(
    KANGUR_AI_TUTOR_DRAWING_ANALYSIS_BRAIN_CAPABILITY,
    {
      defaultTemperature: 0.1,
      defaultMaxTokens: 220,
      defaultSystemPrompt:
        'You analyze learner sketches for the Kangur AI tutor. Return only a short Polish summary of what is visually present and mathematically relevant.',
      runtimeKind: 'vision',
    }
  );

  const response = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    messages: [
      {
        role: 'system',
        content: brainConfig.systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildLearnerDrawingAnalysisPrompt({
              context: input.context,
              latestUserMessage: input.latestUserMessage,
            }),
          },
          {
            type: 'image_url',
            image_url: {
              url: input.drawingImageData,
            },
          },
        ],
      },
    ],
  });

  return normalizeDrawingText(response.text, 320) ?? null;
};

const extractTutorDrawingArtifactsFromResponse = (value: string): {
  message: string;
  artifacts: KangurAiTutorMessageArtifact[];
} => {
  const trimmed = value.trim();
  const match = trimmed.match(KANGUR_TUTOR_DRAWING_BLOCK_PATTERN);
  if (!match) {
    return {
      message: trimmed,
      artifacts: [],
    };
  }

  const drawingBlock = match[1] ?? '';
  const svgMatch = drawingBlock.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) {
    return {
      message: trimmed.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim(),
      artifacts: [],
    };
  }

  const metadataBlock = drawingBlock.replace(svgMatch[0], '');
  const sanitizedSvg = sanitizeSvg(svgMatch[0], { viewBox: '0 0 320 200' }).trim();
  const cleanedMessage = trimmed.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim();
  const artifacts: KangurAiTutorMessageArtifact[] = sanitizedSvg
    ? [
      {
        type: 'assistant_drawing',
        svgContent: sanitizedSvg,
        ...(extractTaggedTutorDrawingText(metadataBlock, KANGUR_TUTOR_DRAWING_TITLE_PATTERN, 120)
          ? {
            title: extractTaggedTutorDrawingText(
              metadataBlock,
              KANGUR_TUTOR_DRAWING_TITLE_PATTERN,
              120
            ),
          }
          : {}),
        ...(extractTaggedTutorDrawingText(metadataBlock, KANGUR_TUTOR_DRAWING_CAPTION_PATTERN, 240)
          ? {
            caption: extractTaggedTutorDrawingText(
              metadataBlock,
              KANGUR_TUTOR_DRAWING_CAPTION_PATTERN,
              240
            ),
          }
          : {}),
        ...(extractTaggedTutorDrawingText(metadataBlock, KANGUR_TUTOR_DRAWING_ALT_PATTERN, 160)
          ? {
            alt: extractTaggedTutorDrawingText(
              metadataBlock,
              KANGUR_TUTOR_DRAWING_ALT_PATTERN,
              160
            ),
          }
          : {}),
      },
    ]
    : [];

  return {
    message: cleanedMessage || 'Sprawdz szkic ponizej.',
    artifacts,
  };
};

const buildKnowledgeGraphResponseSummary = (input: {
  knowledgeGraphApplied: boolean;
  knowledgeGraphQueryMode: 'website_help' | 'semantic' | null;
  knowledgeGraphRecallStrategy: 'metadata_only' | 'vector_only' | 'hybrid_vector' | null;
  knowledgeGraphLexicalHitCount: number;
  knowledgeGraphVectorHitCount: number;
  knowledgeGraphVectorRecallAttempted: boolean;
  websiteHelpGraphApplied: boolean;
  websiteHelpGraphTargetNodeId: string | null;
}) => ({
  applied: input.knowledgeGraphApplied,
  queryMode: input.knowledgeGraphQueryMode,
  recallStrategy: input.knowledgeGraphRecallStrategy,
  lexicalHitCount: input.knowledgeGraphLexicalHitCount,
  vectorHitCount: input.knowledgeGraphVectorHitCount,
  vectorRecallAttempted: input.knowledgeGraphVectorRecallAttempted,
  websiteHelpApplied: input.websiteHelpGraphApplied,
  websiteHelpTargetNodeId: input.websiteHelpGraphTargetNodeId,
});

const resolvePersonaInstructions = async (agentPersonaId: string | null): Promise<string> => {
  if (!agentPersonaId) return '';
  try {
    const raw = await readStoredSettingValue(AGENT_PERSONA_SETTINGS_KEY);
    const personas = parseJsonSetting<AgentPersona[]>(raw, []);
    const persona = personas.find((p) => p.id === agentPersonaId);
    if (!persona) return '';
    const parts: string[] = [];
    if (persona.name) parts.push(`You are ${persona.name}.`);
    if (persona.role) parts.push(`Role: ${persona.role}.`);
    if (persona.instructions) parts.push(persona.instructions.trim());
    return parts.join('\n');
  } catch {
    return '';
  }
};

const buildKangurPersonaSessionTitle = (learnerId: string, personaName: string | null): string => {
  const label = personaName?.trim() || 'Tutor persona';
  return `Kangur AI Tutor · ${label} · learner:${learnerId}`;
};

const resolveKangurPersonaSessionId = async (input: {
  learnerId: string;
  personaId: string | null;
  personaName: string | null;
}): Promise<string | null> => {
  if (!input.personaId) {
    return null;
  }

  const title = buildKangurPersonaSessionTitle(input.learnerId, input.personaName);
  const existingSessionId = await chatbotSessionRepository.findSessionIdByPersonaAndTitle(
    title,
    input.personaId
  );

  if (existingSessionId) {
    return existingSessionId;
  }

  const created = await chatbotSessionRepository.create({
    title,
    userId: null,
    personaId: input.personaId,
    messages: [],
    messageCount: 0,
    settings: {
      personaId: input.personaId,
    },
  });

  return created.id;
};

const readStringFact = (
  document: ContextRuntimeDocument | null | undefined,
  key: string
): string | null => {
  const value = document?.facts?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const readContextString = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const buildRegistryPolicyInstructions = (
  bundle: ContextRegistryResolutionBundle | null | undefined
): string[] =>
  (bundle?.nodes ?? [])
    .filter((node) => node.kind === 'policy' && node.id.startsWith('policy:kangur-ai-tutor'))
    .map((node) => node.description.trim())
    .filter(Boolean);

const buildParentPreferenceInstructions = (input: {
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

const buildLearnerMemoryInstructions = (
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

  return lines.length > 1 ? lines.join('\n') : '';
};

const persistTutorMoodState = async (input: {
  learnerId: string;
  tutorMood: ReturnType<typeof createDefaultKangurAiTutorLearnerMood>;
  actor: Awaited<ReturnType<typeof resolveKangurActor>>;
  context: KangurAiTutorConversationContext | undefined;
  req: NextRequest;
  ctx: ApiHandlerContext;
}): Promise<void> => {
  try {
    await setKangurLearnerAiTutorState(input.learnerId, input.tutorMood);
  } catch (error) {
    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.mood-persist-failed',
      service: 'kangur.ai-tutor',
      message: 'Failed to persist learner-specific Kangur tutor mood.',
      level: 'warn',
      request: input.req,
      requestContext: input.ctx,
      actor: input.actor,
      error,
      statusCode: 500,
      context: {
        learnerId: input.learnerId,
        tutorMoodId: input.tutorMood.currentMoodId,
        tutorBaselineMoodId: input.tutorMood.baselineMoodId,
        tutorMoodReasonCode: input.tutorMood.lastReasonCode,
        surface: input.context?.surface ?? null,
        contentId: input.context?.contentId ?? null,
      },
    });
  }
};

const buildContextInstructions = (input: {
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
  const lines: string[] = [
    `Current Kangur surface: ${surfaceLabel}.`,
  ];

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
    readStringFact(surfaceContext, 'currentQuestion') ?? readContextString(context.currentQuestion);
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

const buildRuntimeDocumentSourceText = (
  document: ContextRuntimeDocument | null | undefined
): string | null => {
  if (!document) {
    return null;
  }

  const sectionText =
    document.sections
      ?.map((section) => (typeof section.text === 'string' ? section.text.trim() : ''))
      .find(Boolean) ?? null;
  const summary = document.summary.trim();
  const currentQuestion = readStringFact(document, 'currentQuestion');
  const assignmentSummary = readStringFact(document, 'assignmentSummary');
  const masterySummary = readStringFact(document, 'masterySummary');
  const text = [summary, sectionText, currentQuestion, assignmentSummary, masterySummary]
    .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index)
    .join('\n')
    .trim();

  if (!text) {
    return null;
  }

  return text.length > 320 ? `${text.slice(0, 317).trimEnd()}...` : text;
};

const toKangurTutorChatSource = (
  document: ContextRuntimeDocument,
  score: number
): AgentTeachingChatSource | null => {
  const text = buildRuntimeDocumentSourceText(document);
  if (!text) {
    return null;
  }

  return {
    documentId: document.id,
    collectionId: 'kangur-runtime-context',
    text,
    score,
    metadata: {
      source: 'manual-text',
      sourceId: document.id,
      title: document.title,
      description: document.summary,
      tags: document.tags,
    },
  };
};

const buildKangurTutorResponseSources = (input: {
  learnerSnapshot: ContextRuntimeDocument | null;
  surfaceContext: ContextRuntimeDocument | null;
  assignmentContext: ContextRuntimeDocument | null;
  extraSources?: AgentTeachingChatSource[];
}): AgentTeachingChatSource[] => {
  const candidates = [input.surfaceContext, input.assignmentContext];
  if (!candidates.some(Boolean) && input.learnerSnapshot) {
    candidates.push(input.learnerSnapshot);
  }

  const seen = new Set<string>();

  const runtimeSources = candidates.reduce<AgentTeachingChatSource[]>((acc, document, index) => {
    if (!document || seen.has(document.id)) {
      return acc;
    }

    const source = toKangurTutorChatSource(document, Math.max(0.5, 0.98 - index * 0.06));
    if (!source) {
      return acc;
    }

    seen.add(document.id);
    acc.push(source);
    return acc;
  }, []);

  const mergedSeen = new Set<string>();
  return [...(input.extraSources ?? []), ...runtimeSources].filter((source) => {
    const key = `${source.collectionId}:${source.documentId}`;
    if (mergedSeen.has(key)) {
      return false;
    }
    mergedSeen.add(key);
    return true;
  });
};

export async function postKangurAiTutorChatHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learnerId = actor.activeLearner.id;

  const parsed = await parseJsonBody(req, kangurAiTutorChatRequestSchema, {
    logPrefix: 'kangur.ai-tutor.chat.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { messages, context, contextRegistry, memory } = parsed.data;
  const resolvedPromptMode = context?.promptMode ?? 'chat';
  const learnerDrawingImageData = readContextString(context?.drawingImageData);
  const requestedContextRegistryRefs = mergeContextRegistryRefs(
    context
      ? buildKangurAiTutorContextRegistryRefs({
        learnerId,
        context,
      })
      : [],
    contextRegistry?.refs ?? []
  );

  const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore = parseKangurAiTutorSettings(rawSettings);
  const rawAppSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const appSettings = resolveKangurAiTutorAppSettings(rawAppSettings, settingsStore);
  const tutorSettings = getKangurAiTutorSettingsForLearner(settingsStore, learnerId, appSettings);
  const sessionId = `kangur-ai-tutor:${learnerId}`;
  const baseTimestamp = new Date().toISOString();
  const chatMessages: ChatMessage[] = messages.map((message, index) => ({
    id: `${sessionId}:message:${index}`,
    sessionId,
    role: message.role,
    content:
      message.artifacts?.some((artifact) => artifact.type === 'user_drawing')
        ? `${message.content}\n\n[The learner attached a drawing to this message.]`
        : message.content,
    timestamp: baseTimestamp,
  }));
  let adaptiveGuidanceApplied = false;
  let adaptiveCoachingMode: KangurAiTutorCoachingMode | null = null;
  let knowledgeGraphApplied = false;
  let knowledgeGraphQueryMode: 'website_help' | 'semantic' | null = null;
  let knowledgeGraphRecallStrategy: 'metadata_only' | 'vector_only' | 'hybrid_vector' | null =
    null;
  let knowledgeGraphLexicalHitCount = 0;
  let knowledgeGraphVectorHitCount = 0;
  let knowledgeGraphVectorRecallAttempted = false;
  let websiteHelpGraphApplied = false;
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === 'user')?.content ?? null;
  const drawingSupportEnabled = shouldEnableTutorDrawingSupport({
    context,
    latestUserMessage,
    messages,
  });

  try {
    const availability = resolveKangurAiTutorAvailability(tutorSettings, context);
    const emailAwareAvailability = availability.allowed
      ? resolveKangurAiTutorAvailability(tutorSettings, context, {
        ownerEmailVerified: actor.ownerEmailVerified,
      })
      : availability;
    if (!emailAwareAvailability.allowed) {
      throw badRequestError(AVAILABILITY_ERROR_MESSAGES[emailAwareAvailability.reason], {
        reason: emailAwareAvailability.reason,
      });
    }

    if (
      !tutorSettings.allowSelectedTextSupport &&
      (context?.promptMode === 'selected_text' || Boolean(context?.selectedText?.trim()))
    ) {
      throw badRequestError('Selected-text tutor help is disabled for this learner.');
    }

    await ensureKangurAiTutorDailyUsageAvailable({
      learnerId,
      dailyMessageLimit: tutorSettings.dailyMessageLimit,
    });
    const contextRegistryBundle = requestedContextRegistryRefs.length > 0
      ? await contextRegistryEngine.resolveRefs({
        refs: requestedContextRegistryRefs,
        maxNodes: 24,
        depth: 1,
      })
      : null;
    const resolvedRuntimeDocuments = resolveKangurAiTutorRuntimeDocuments(contextRegistryBundle, context);

    const personaInstructions = await resolvePersonaInstructions(tutorSettings.agentPersonaId);
    const systemParts: string[] = [SOCRATIC_CONSTRAINT];
    if (personaInstructions) systemParts.push(personaInstructions);
    let personaMemorySessionId: string | null = null;
    let suggestedPersonaMoodId: AgentPersonaMoodId | null = null;
    if (tutorSettings.agentPersonaId) {
      try {
        const personaContext = await buildPersonaChatMemoryContext({
          personaId: tutorSettings.agentPersonaId,
          latestUserMessage,
        });
        if (personaContext.systemPrompt) {
          systemParts.push(personaContext.systemPrompt);
        }
        suggestedPersonaMoodId = personaContext.suggestedMoodId ?? null;
        personaMemorySessionId = await resolveKangurPersonaSessionId({
          learnerId,
          personaId: tutorSettings.agentPersonaId,
          personaName: personaContext.persona.name ?? null,
        });
      } catch (error) {
        await logKangurServerEvent({
          source: 'kangur.ai-tutor.chat.persona-memory.failed',
          service: 'kangur.ai-tutor',
          message: 'Failed to resolve Kangur tutor persona memory context.',
          level: 'warn',
          request: req,
          requestContext: ctx,
          actor,
          error,
          statusCode: 500,
          context: {
            learnerId,
            personaId: tutorSettings.agentPersonaId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
          },
        });
      }
    }
    let tutorMood = actor.activeLearner.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
    try {
      tutorMood = await buildKangurAiTutorLearnerMood({
        learnerId,
        context,
        messages,
        latestUserMessage,
        personaSuggestedMoodId: suggestedPersonaMoodId,
        previousMood: actor.activeLearner.aiTutor ?? null,
      });
    } catch (error) {
      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.mood-build-failed',
        service: 'kangur.ai-tutor',
        message: 'Failed to resolve learner-specific Kangur tutor mood.',
        level: 'warn',
        request: req,
        requestContext: ctx,
        actor,
        error,
        statusCode: 500,
        context: {
          learnerId,
          surface: context?.surface ?? null,
          contentId: context?.contentId ?? null,
          previousTutorMoodId: actor.activeLearner.aiTutor?.currentMoodId ?? null,
        },
      });
    }
    systemParts.push(
      [
        `Learner-specific tutor mood: ${tutorMood.currentMoodId}.`,
        `Baseline learner mood: ${tutorMood.baselineMoodId}.`,
        'Match this tone in your wording, but keep the answer concise and age-appropriate.',
      ].join(' ')
    );
    let learnerDrawingAnalysis: string | null = null;
    if (learnerDrawingImageData) {
      try {
        learnerDrawingAnalysis = await analyzeLearnerDrawingWithBrain({
          drawingImageData: learnerDrawingImageData,
          context,
          latestUserMessage,
        });
      } catch (error) {
        await logKangurServerEvent({
          source: 'kangur.ai-tutor.chat.drawing-analysis.failed',
          service: 'kangur.ai-tutor',
          message: 'Failed to analyze the learner drawing for Kangur AI tutor.',
          level: 'warn',
          request: req,
          requestContext: ctx,
          actor,
          error,
          statusCode: 500,
          context: {
            learnerId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
            promptMode: resolvedPromptMode,
          },
        });
      }
    }
    if (learnerDrawingAnalysis) {
      systemParts.push(
        [
          'Learner drawing analysis summary:',
          learnerDrawingAnalysis,
          'Use this as an inference from the attached sketch. If the sketch seems ambiguous, say so briefly instead of overstating certainty.',
        ].join('\n')
      );
    }
    if (drawingSupportEnabled) {
      systemParts.push(buildTutorDrawingInstructions());
    }
    const nativeGuideResolution = learnerDrawingImageData
      ? {
        status: 'skipped' as const,
        message: null,
        followUpActions: [],
        entryId: null,
        matchedSignals: [],
        coverageLevel: null,
      }
      : await resolveKangurAiTutorNativeGuideResolution({
        latestUserMessage,
        context,
        locale: 'pl',
      });
    const knowledgeGraphContext = await resolveKangurAiTutorSemanticGraphContext({
      latestUserMessage,
      context,
      locale: 'pl',
      runtimeDocuments: [
        resolvedRuntimeDocuments.learnerSnapshot,
        resolvedRuntimeDocuments.loginActivity,
        resolvedRuntimeDocuments.surfaceContext,
        resolvedRuntimeDocuments.assignmentContext,
      ].filter((document): document is ContextRuntimeDocument => Boolean(document)),
    });
    knowledgeGraphApplied = knowledgeGraphContext.status === 'hit';
    knowledgeGraphQueryMode = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.queryMode
      : null;
    knowledgeGraphRecallStrategy = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.recallStrategy
      : null;
    knowledgeGraphLexicalHitCount = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.lexicalHitCount
      : 0;
    knowledgeGraphVectorHitCount = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.vectorHitCount
      : 0;
    knowledgeGraphVectorRecallAttempted = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.vectorRecallAttempted
      : false;
    websiteHelpGraphApplied = knowledgeGraphQueryMode === 'website_help';
    const knowledgeGraphNodeIds =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.nodeIds : [];
    const knowledgeGraphSourceCollections =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.sourceCollections : [];
    const knowledgeGraphHydrationSources =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.hydrationSources : [];
    const knowledgeGraphWebsiteHelpTarget =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.websiteHelpTarget ?? null : null;
    const knowledgeGraphWebsiteHelpTargetNodeId =
      knowledgeGraphWebsiteHelpTarget?.nodeId ?? null;
    const knowledgeGraphWebsiteHelpTargetRoute =
      knowledgeGraphWebsiteHelpTarget?.route ?? null;
    const knowledgeGraphWebsiteHelpTargetAnchorId =
      knowledgeGraphWebsiteHelpTarget?.anchorId ?? null;
    if (nativeGuideResolution.status === 'hit') {
      const nativeGuideResponse = extractTutorDrawingArtifactsFromResponse(
        nativeGuideResolution.message
      );
      const usage = await consumeKangurAiTutorDailyUsage({
        learnerId,
        dailyMessageLimit: tutorSettings.dailyMessageLimit,
      });
      const resolvedSources = buildKangurTutorResponseSources({
        ...resolvedRuntimeDocuments,
        extraSources: knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.sources : [],
      });
      const responseSources = tutorSettings.showSources ? resolvedSources : [];

      await persistTutorMoodState({
        learnerId,
        tutorMood,
        actor,
        context,
        req,
        ctx,
      });

      if (nativeGuideResolution.coverageLevel === 'overview_fallback') {
        await logKangurServerEvent({
          source: 'kangur.ai-tutor.chat.native-guide.coverage-gap',
          service: 'kangur.ai-tutor',
          message:
            'Kangur AI tutor used a generic overview entry for a section-specific request.',
          level: 'warn',
          request: req,
          requestContext: ctx,
          actor,
          statusCode: 200,
          context: {
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
            title: context?.title ?? null,
            focusKind: context?.focusKind ?? null,
            focusId: context?.focusId ?? null,
            assignmentId: context?.assignmentId ?? null,
            questionId: context?.questionId ?? null,
            promptMode: resolvedPromptMode,
            interactionIntent: context?.interactionIntent ?? null,
            nativeGuideApplied: true,
            nativeGuideCoverageLevel: nativeGuideResolution.coverageLevel,
            nativeGuideEntryId: nativeGuideResolution.entryId,
            nativeGuideMatchSignals: nativeGuideResolution.matchedSignals,
            knowledgeGraphApplied,
            knowledgeGraphQueryMode,
            knowledgeGraphRecallStrategy,
            knowledgeGraphLexicalHitCount,
            knowledgeGraphVectorHitCount,
            knowledgeGraphVectorRecallAttempted,
            knowledgeGraphNodeIds,
            knowledgeGraphSourceCollections,
            knowledgeGraphHydrationSources,
            websiteHelpGraphApplied,
            websiteHelpGraphNodeIds: websiteHelpGraphApplied ? knowledgeGraphNodeIds : [],
            websiteHelpGraphSourceCollections: websiteHelpGraphApplied
              ? knowledgeGraphSourceCollections
              : [],
            websiteHelpGraphHydrationSources: websiteHelpGraphApplied
              ? knowledgeGraphHydrationSources
              : [],
            websiteHelpGraphTargetNodeId: websiteHelpGraphApplied
              ? knowledgeGraphWebsiteHelpTargetNodeId
              : null,
            websiteHelpGraphTargetRoute: websiteHelpGraphApplied
              ? knowledgeGraphWebsiteHelpTargetRoute
              : null,
            websiteHelpGraphTargetAnchorId: websiteHelpGraphApplied
              ? knowledgeGraphWebsiteHelpTargetAnchorId
              : null,
          },
        });
      }

      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.native-guide.completed',
        service: 'kangur.ai-tutor',
        message: 'Kangur AI tutor answered from the native guide repository.',
        request: req,
        requestContext: ctx,
        actor,
        statusCode: 200,
        context: {
          surface: context?.surface ?? null,
          contentId: context?.contentId ?? null,
          promptMode: resolvedPromptMode,
          focusKind: context?.focusKind ?? null,
          interactionIntent: context?.interactionIntent ?? null,
          retrievedSourceCount: resolvedSources.length,
          returnedSourceCount: responseSources.length,
          showSources: tutorSettings.showSources,
          allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
          allowLessons: tutorSettings.allowLessons,
          allowGames: tutorSettings.allowGames,
          testAccessMode: tutorSettings.testAccessMode,
          hintDepth: tutorSettings.hintDepth,
          proactiveNudges: tutorSettings.proactiveNudges,
          rememberTutorContext: tutorSettings.rememberTutorContext,
          nativeGuideApplied: true,
          nativeGuideCoverageLevel: nativeGuideResolution.coverageLevel,
          nativeGuideEntryId: nativeGuideResolution.entryId,
          nativeGuideMatchSignals: nativeGuideResolution.matchedSignals,
          knowledgeGraphApplied,
          knowledgeGraphQueryMode,
          knowledgeGraphRecallStrategy,
          knowledgeGraphLexicalHitCount,
          knowledgeGraphVectorHitCount,
          knowledgeGraphVectorRecallAttempted,
          knowledgeGraphNodeIds,
          knowledgeGraphSourceCollections,
          knowledgeGraphHydrationSources,
          websiteHelpGraphApplied,
          websiteHelpGraphNodeIds: websiteHelpGraphApplied ? knowledgeGraphNodeIds : [],
          websiteHelpGraphSourceCollections: websiteHelpGraphApplied
            ? knowledgeGraphSourceCollections
            : [],
          websiteHelpGraphHydrationSources: websiteHelpGraphApplied
            ? knowledgeGraphHydrationSources
            : [],
          websiteHelpGraphTargetNodeId: websiteHelpGraphApplied
            ? knowledgeGraphWebsiteHelpTargetNodeId
            : null,
          websiteHelpGraphTargetRoute: websiteHelpGraphApplied
            ? knowledgeGraphWebsiteHelpTargetRoute
            : null,
          websiteHelpGraphTargetAnchorId: websiteHelpGraphApplied
            ? knowledgeGraphWebsiteHelpTargetAnchorId
            : null,
          contextRegistryRefCount: contextRegistryBundle?.refs.length ?? 0,
          contextRegistryDocumentCount: contextRegistryBundle?.documents.length ?? 0,
          followUpActionCount: nativeGuideResolution.followUpActions.length,
          tutorMoodId: tutorMood.currentMoodId,
          tutorBaselineMoodId: tutorMood.baselineMoodId,
          tutorMoodReasonCode: tutorMood.lastReasonCode,
          tutorMoodConfidence: tutorMood.confidence,
          dailyMessageLimit: usage.dailyMessageLimit,
          dailyUsageCount: usage.messageCount,
          dailyUsageRemaining: usage.remainingMessages,
          usageDateKey: usage.dateKey,
          messageCount: messages.length,
        },
      });

      return NextResponse.json({
        message: nativeGuideResponse.message,
        sources: responseSources,
        followUpActions: nativeGuideResolution.followUpActions,
        artifacts: nativeGuideResponse.artifacts,
        knowledgeGraph: buildKnowledgeGraphResponseSummary({
          knowledgeGraphApplied,
          knowledgeGraphQueryMode,
          knowledgeGraphRecallStrategy,
          knowledgeGraphLexicalHitCount,
          knowledgeGraphVectorHitCount,
          knowledgeGraphVectorRecallAttempted,
          websiteHelpGraphApplied,
          websiteHelpGraphTargetNodeId: knowledgeGraphWebsiteHelpTargetNodeId,
        }),
        ...(knowledgeGraphContext.status === 'hit' && knowledgeGraphContext.websiteHelpTarget
          ? { websiteHelpTarget: knowledgeGraphContext.websiteHelpTarget }
          : {}),
        tutorMood,
        usage,
      } satisfies KangurAiTutorChatResponse);
    }
    if (nativeGuideResolution.status === 'miss') {
      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.native-guide.missing',
        service: 'kangur.ai-tutor',
        message: 'Kangur AI tutor did not find a native guide entry for an eligible request.',
        level: 'warn',
        request: req,
        requestContext: ctx,
        actor,
        statusCode: 200,
        context: {
          surface: context?.surface ?? null,
          contentId: context?.contentId ?? null,
          title: context?.title ?? null,
          focusKind: context?.focusKind ?? null,
          focusId: context?.focusId ?? null,
          assignmentId: context?.assignmentId ?? null,
          questionId: context?.questionId ?? null,
          promptMode: resolvedPromptMode,
          interactionIntent: context?.interactionIntent ?? null,
          nativeGuideApplied: false,
          knowledgeGraphApplied,
          knowledgeGraphQueryMode,
          knowledgeGraphRecallStrategy,
          knowledgeGraphLexicalHitCount,
          knowledgeGraphVectorHitCount,
          knowledgeGraphVectorRecallAttempted,
          knowledgeGraphNodeIds,
          knowledgeGraphSourceCollections,
          knowledgeGraphHydrationSources,
          websiteHelpGraphApplied,
          websiteHelpGraphNodeIds: websiteHelpGraphApplied ? knowledgeGraphNodeIds : [],
          websiteHelpGraphSourceCollections: websiteHelpGraphApplied
            ? knowledgeGraphSourceCollections
            : [],
          websiteHelpGraphHydrationSources: websiteHelpGraphApplied
            ? knowledgeGraphHydrationSources
            : [],
          websiteHelpGraphTargetNodeId: websiteHelpGraphApplied
            ? knowledgeGraphWebsiteHelpTargetNodeId
            : null,
          websiteHelpGraphTargetRoute: websiteHelpGraphApplied
            ? knowledgeGraphWebsiteHelpTargetRoute
            : null,
          websiteHelpGraphTargetAnchorId: websiteHelpGraphApplied
            ? knowledgeGraphWebsiteHelpTargetAnchorId
            : null,
        },
      });
    }
    const contextInstructions = buildContextInstructions({
      context,
      registryBundle: contextRegistryBundle,
      options: {
        testAccessMode: tutorSettings.testAccessMode,
      },
    });
    if (contextInstructions) systemParts.push(contextInstructions);
    if (knowledgeGraphContext.status === 'hit') {
      systemParts.push(knowledgeGraphContext.instructions);
    }
    systemParts.push(
      buildParentPreferenceInstructions({
        hintDepth: tutorSettings.hintDepth,
        proactiveNudges: tutorSettings.proactiveNudges,
        rememberTutorContext: tutorSettings.rememberTutorContext,
      })
    );
    const learnerMemoryInstructions = buildLearnerMemoryInstructions(memory);
    if (learnerMemoryInstructions) {
      systemParts.push(learnerMemoryInstructions);
    }
    const adaptiveGuidance = await buildKangurAiTutorAdaptiveGuidance({
      learnerId,
      context,
      registryBundle: contextRegistryBundle,
      memory,
    });
    const followUpReporting = summarizeKangurAiTutorFollowUpActions(
      adaptiveGuidance.followUpActions
    );
    const adaptiveInstructions = adaptiveGuidance.instructions;
    adaptiveCoachingMode = adaptiveGuidance.coachingFrame?.mode ?? null;
    if (adaptiveInstructions) {
      systemParts.push(adaptiveInstructions);
      adaptiveGuidanceApplied = true;
    }
    const systemPrompt = systemParts.join('\n\n');

    const brainConfig = await resolveBrainExecutionConfigForCapability(
      KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
      {
        defaultTemperature: 0.4,
        defaultMaxTokens: 600,
        runtimeKind: 'chat',
      }
    );

    const combinedSystemPrompt = [brainConfig.systemPrompt.trim(), systemPrompt]
      .filter(Boolean)
      .join('\n\n');

    const res = await runBrainChatCompletion({
      modelId: brainConfig.modelId,
      temperature: brainConfig.temperature,
      maxTokens: brainConfig.maxTokens,
      messages: [
        { role: 'system', content: combinedSystemPrompt },
        ...(chatMessages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        })) as BrainChatMessage[]),
      ],
    });
    const parsedTutorResponse = extractTutorDrawingArtifactsFromResponse(res.text);
    const usage = await consumeKangurAiTutorDailyUsage({
      learnerId,
      dailyMessageLimit: tutorSettings.dailyMessageLimit,
    });
    const resolvedSources = buildKangurTutorResponseSources({
      ...resolvedRuntimeDocuments,
      extraSources: knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.sources : [],
    });
    const responseSources = tutorSettings.showSources ? resolvedSources : [];

    if (personaMemorySessionId && tutorSettings.agentPersonaId) {
      try {
        if (latestUserMessage) {
          await chatbotSessionRepository.addMessage(personaMemorySessionId, {
            role: 'user',
            content: latestUserMessage,
            metadata: {
              source: 'kangur_ai_tutor',
              learnerId,
              surface: context?.surface ?? null,
              contentId: context?.contentId ?? null,
              questionId: context?.questionId ?? null,
              promptMode: resolvedPromptMode,
              interactionIntent: context?.interactionIntent ?? null,
            },
          });
        }

        await chatbotSessionRepository.addMessage(personaMemorySessionId, {
          role: 'assistant',
          content: parsedTutorResponse.message,
          model: brainConfig.modelId,
          metadata: {
            source: 'kangur_ai_tutor',
            learnerId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
            questionId: context?.questionId ?? null,
            promptMode: resolvedPromptMode,
            interactionIntent: context?.interactionIntent ?? null,
            ...(suggestedPersonaMoodId ? { moodHints: [suggestedPersonaMoodId] } : {}),
            ...(suggestedPersonaMoodId ? { suggestedPersonaMoodId } : {}),
          },
        });

        await persistAgentPersonaExchangeMemory({
          personaId: tutorSettings.agentPersonaId,
          sourceType: 'chat_message',
          sourceId: `kangur:${learnerId}:${context?.surface ?? 'lesson'}:${context?.contentId ?? 'unknown'}:${Date.now()}`,
          sourceLabel:
            context?.surface === 'test'
              ? `Kangur test${context?.contentId ? ` · ${context.contentId}` : ''}`
              : context?.surface === 'game'
                ? `Kangur game${context?.contentId ? ` · ${context.contentId}` : ''}`
                : `Kangur lesson${context?.contentId ? ` · ${context.contentId}` : ''}`,
          sourceCreatedAt: new Date().toISOString(),
          sessionId: personaMemorySessionId,
          userMessage: latestUserMessage,
          assistantMessage: parsedTutorResponse.message,
          tags: [
            'kangur',
            context?.surface ?? 'lesson',
            resolvedPromptMode,
            ...(context?.interactionIntent ? [context.interactionIntent] : []),
          ],
          topicHints: [
            ...(context?.selectedText ? [context.selectedText] : []),
            ...(context?.contentId ? [context.contentId] : []),
            ...(context?.questionId ? [context.questionId] : []),
          ],
          moodHints: suggestedPersonaMoodId ? [suggestedPersonaMoodId] : [],
          metadata: {
            source: 'kangur_ai_tutor',
            learnerId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
            questionId: context?.questionId ?? null,
            promptMode: resolvedPromptMode,
            interactionIntent: context?.interactionIntent ?? null,
          },
        });
      } catch (error) {
        await logKangurServerEvent({
          source: 'kangur.ai-tutor.chat.persona-memory.persist-failed',
          service: 'kangur.ai-tutor',
          message: 'Failed to persist Kangur tutor chat into persona memory.',
          level: 'warn',
          request: req,
          requestContext: ctx,
          actor,
          error,
          statusCode: 500,
          context: {
            learnerId,
            personaId: tutorSettings.agentPersonaId,
            personaMemorySessionId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
          },
        });
      }
    }

    await persistTutorMoodState({
      learnerId,
      tutorMood,
      actor,
      context,
      req,
      ctx,
    });

    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.completed',
      service: 'kangur.ai-tutor',
      message: 'Kangur AI tutor chat completed through Brain routing.',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        surface: context?.surface ?? null,
        contentId: context?.contentId ?? null,
        promptMode: resolvedPromptMode,
        focusKind: context?.focusKind ?? null,
        interactionIntent: context?.interactionIntent ?? null,
        brainCapability: KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
        retrievedSourceCount: resolvedSources.length,
        returnedSourceCount: responseSources.length,
        showSources: tutorSettings.showSources,
        allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
        allowLessons: tutorSettings.allowLessons,
        allowGames: tutorSettings.allowGames,
        testAccessMode: tutorSettings.testAccessMode,
        hintDepth: tutorSettings.hintDepth,
        proactiveNudges: tutorSettings.proactiveNudges,
        rememberTutorContext: tutorSettings.rememberTutorContext,
        adaptiveGuidanceApplied,
        knowledgeGraphApplied,
        knowledgeGraphQueryMode,
        knowledgeGraphRecallStrategy,
        knowledgeGraphLexicalHitCount,
        knowledgeGraphVectorHitCount,
        knowledgeGraphVectorRecallAttempted,
        knowledgeGraphNodeIds,
        knowledgeGraphSourceCollections,
        knowledgeGraphHydrationSources,
        websiteHelpGraphApplied,
        websiteHelpGraphNodeIds: websiteHelpGraphApplied ? knowledgeGraphNodeIds : [],
        websiteHelpGraphSourceCollections: websiteHelpGraphApplied
          ? knowledgeGraphSourceCollections
          : [],
        websiteHelpGraphHydrationSources: websiteHelpGraphApplied
          ? knowledgeGraphHydrationSources
          : [],
        websiteHelpGraphTargetNodeId: websiteHelpGraphApplied
          ? knowledgeGraphWebsiteHelpTargetNodeId
          : null,
        websiteHelpGraphTargetRoute: websiteHelpGraphApplied
          ? knowledgeGraphWebsiteHelpTargetRoute
          : null,
        websiteHelpGraphTargetAnchorId: websiteHelpGraphApplied
          ? knowledgeGraphWebsiteHelpTargetAnchorId
          : null,
        contextRegistryRefCount: contextRegistryBundle?.refs.length ?? 0,
        contextRegistryDocumentCount: contextRegistryBundle?.documents.length ?? 0,
        followUpActionCount: adaptiveGuidance.followUpActions.length,
        primaryFollowUpActionId: followUpReporting.primaryFollowUpActionId,
        primaryFollowUpPage: followUpReporting.primaryFollowUpPage,
        hasBridgeFollowUpAction: followUpReporting.hasBridgeFollowUpAction,
        bridgeFollowUpActionCount: followUpReporting.bridgeFollowUpActionCount,
        bridgeFollowUpDirection: followUpReporting.bridgeFollowUpDirection,
        coachingMode: adaptiveCoachingMode,
        hasLearnerMemory: Boolean(memory),
        personaId: tutorSettings.agentPersonaId,
        suggestedPersonaMoodId,
        personaMemorySessionId,
        tutorMoodId: tutorMood.currentMoodId,
        tutorBaselineMoodId: tutorMood.baselineMoodId,
        tutorMoodReasonCode: tutorMood.lastReasonCode,
        tutorMoodConfidence: tutorMood.confidence,
        dailyMessageLimit: usage.dailyMessageLimit,
        dailyUsageCount: usage.messageCount,
        dailyUsageRemaining: usage.remainingMessages,
        usageDateKey: usage.dateKey,
        messageCount: messages.length,
      },
    });

    return NextResponse.json({
      message: parsedTutorResponse.message,
      sources: responseSources,
      followUpActions: adaptiveGuidance.followUpActions,
      artifacts: parsedTutorResponse.artifacts,
      knowledgeGraph: buildKnowledgeGraphResponseSummary({
        knowledgeGraphApplied,
        knowledgeGraphQueryMode,
        knowledgeGraphRecallStrategy,
        knowledgeGraphLexicalHitCount,
        knowledgeGraphVectorHitCount,
        knowledgeGraphVectorRecallAttempted,
        websiteHelpGraphApplied,
        websiteHelpGraphTargetNodeId: knowledgeGraphWebsiteHelpTargetNodeId,
      }),
      ...(knowledgeGraphContext.status === 'hit' && knowledgeGraphContext.websiteHelpTarget
        ? { websiteHelpTarget: knowledgeGraphContext.websiteHelpTarget }
        : {}),
      ...(adaptiveGuidance.coachingFrame
        ? { coachingFrame: adaptiveGuidance.coachingFrame }
        : {}),
      ...(suggestedPersonaMoodId ? { suggestedMoodId: suggestedPersonaMoodId } : {}),
      tutorMood,
      usage,
    } satisfies KangurAiTutorChatResponse);
  } catch (error) {
    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.failed',
      service: 'kangur.ai-tutor',
      message: 'Kangur AI tutor chat failed.',
      level: isAppError(error) && error.expected ? 'warn' : 'error',
      request: req,
      requestContext: ctx,
      actor,
      error,
      statusCode: isAppError(error) ? error.httpStatus : 500,
      context: {
        surface: context?.surface ?? null,
        contentId: context?.contentId ?? null,
        promptMode: resolvedPromptMode,
        focusKind: context?.focusKind ?? null,
        interactionIntent: context?.interactionIntent ?? null,
        brainCapability: KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
        showSources: tutorSettings.showSources,
        allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
        allowLessons: tutorSettings.allowLessons,
        allowGames: tutorSettings.allowGames,
        testAccessMode: tutorSettings.testAccessMode,
        hintDepth: tutorSettings.hintDepth,
        proactiveNudges: tutorSettings.proactiveNudges,
        rememberTutorContext: tutorSettings.rememberTutorContext,
        adaptiveGuidanceApplied,
        knowledgeGraphApplied,
        knowledgeGraphQueryMode,
        knowledgeGraphRecallStrategy,
        knowledgeGraphLexicalHitCount,
        knowledgeGraphVectorHitCount,
        knowledgeGraphVectorRecallAttempted,
        websiteHelpGraphApplied,
        contextRegistryRefCount: requestedContextRegistryRefs.length,
        coachingMode: adaptiveCoachingMode,
        hasLearnerMemory: Boolean(memory),
        personaId: tutorSettings.agentPersonaId,
        dailyMessageLimit: tutorSettings.dailyMessageLimit,
        messageCount: messages.length,
      },
    });
    throw error;
  }
}
