import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { runTeachingChat } from '@/features/ai/agentcreator/teaching/server/chat';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { buildKangurAiTutorAdaptiveGuidance } from '@/features/kangur/server/ai-tutor-adaptive';
import {
  parseKangurAiTutorSettings,
  getKangurAiTutorSettingsForLearner,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  resolveKangurAiTutorAvailability,
  type KangurAiTutorAvailabilityReason,
} from '@/features/kangur/settings-ai-tutor';
import { consumeKangurAiTutorDailyUsage } from '@/features/kangur/server/ai-tutor-usage';
import { resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  AGENT_PERSONA_SETTINGS_KEY,
  type AgentPersona,
} from '@/shared/contracts/agents';
import {
  kangurAiTutorChatRequestSchema,
  type KangurAiTutorChatResponse,
  type KangurAiTutorConversationContext,
  type KangurAiTutorInteractionIntent,
  type KangurAiTutorPromptMode,
} from '@/shared/contracts/kangur-ai-tutor';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  type BrainChatMessage,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { isAppError } from '@/shared/errors/app-error';
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

const AVAILABILITY_ERROR_MESSAGES: Record<KangurAiTutorAvailabilityReason, string> = {
  disabled: 'AI tutor is not enabled for this learner.',
  missing_context: 'AI tutor context is required for Kangur tutoring sessions.',
  lessons_disabled: 'AI tutor is disabled for lessons for this learner.',
  tests_disabled: 'AI tutor is disabled for tests for this learner.',
  review_after_answer_only:
    'AI tutor is available in tests only after the answer has been revealed.',
};

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

const buildContextInstructions = (
  context: KangurAiTutorConversationContext | undefined,
  options?: {
    testAccessMode?: 'disabled' | 'guided' | 'review_after_answer';
  }
): string => {
  if (!context) {
    return '';
  }

  const lines: string[] = [
    `Current Kangur surface: ${context.surface === 'test' ? 'test practice' : 'lesson learning'}.`,
  ];

  if (context.title) {
    lines.push(`Current title: ${context.title}`);
  }
  if (context.description) {
    lines.push(`Current description: ${context.description}`);
  }
  if (context.masterySummary) {
    lines.push(`Learner mastery snapshot: ${context.masterySummary}`);
  }
  if (context.assignmentSummary) {
    lines.push(`Active assignment or focus: ${context.assignmentSummary}`);
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
  if (context.currentQuestion) {
    lines.push(`Current question: ${context.currentQuestion}`);
  }
  if (context.questionProgressLabel) {
    lines.push(`Question progress: ${context.questionProgressLabel}`);
  }
  if (context.selectedText) {
    lines.push(`Learner selected this text: """${context.selectedText}"""`);
  }
  if (context.promptMode) {
    lines.push(PROMPT_MODE_INSTRUCTIONS[context.promptMode]);
  }
  if (context.interactionIntent) {
    lines.push(INTERACTION_INTENT_INSTRUCTIONS[context.interactionIntent]);
  }
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

  return lines.join('\n');
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

  const { messages, context } = parsed.data;
  const resolvedPromptMode = context?.promptMode ?? 'chat';

  const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore = parseKangurAiTutorSettings(rawSettings);
  const tutorSettings = getKangurAiTutorSettingsForLearner(settingsStore, learnerId);
  const sessionId = `kangur-ai-tutor:${learnerId}`;
  const baseTimestamp = new Date().toISOString();
  const chatMessages: ChatMessage[] = messages.map((message, index) => ({
    id: `${sessionId}:message:${index}`,
    sessionId,
    role: message.role,
    content: message.content,
    timestamp: baseTimestamp,
  }));
  let adaptiveGuidanceApplied = false;

  try {
    const availability = resolveKangurAiTutorAvailability(tutorSettings, context);
    if (!availability.allowed) {
      throw badRequestError(AVAILABILITY_ERROR_MESSAGES[availability.reason], {
        reason: availability.reason,
      });
    }

    if (
      !tutorSettings.allowSelectedTextSupport &&
      (context?.promptMode === 'selected_text' || Boolean(context?.selectedText?.trim()))
    ) {
      throw badRequestError('Selected-text tutor help is disabled for this learner.');
    }

    const usage = await consumeKangurAiTutorDailyUsage({
      learnerId,
      dailyMessageLimit: tutorSettings.dailyMessageLimit,
    });

    const personaInstructions = await resolvePersonaInstructions(tutorSettings.agentPersonaId);
    const systemParts: string[] = [SOCRATIC_CONSTRAINT];
    if (personaInstructions) systemParts.push(personaInstructions);
    const contextInstructions = buildContextInstructions(context, {
      testAccessMode: tutorSettings.testAccessMode,
    });
    if (contextInstructions) systemParts.push(contextInstructions);
    const adaptiveGuidance = await buildKangurAiTutorAdaptiveGuidance({
      learnerId,
      context,
    });
    const adaptiveInstructions = adaptiveGuidance.instructions;
    if (adaptiveInstructions) {
      systemParts.push(adaptiveInstructions);
      adaptiveGuidanceApplied = true;
    }
    const systemPrompt = systemParts.join('\n\n');

    if (tutorSettings.teachingAgentId) {
      // Use RAG-backed teaching agent — inject system prompt as first message
      const augmentedMessages: ChatMessage[] = [
        {
          id: `${sessionId}:system`,
          sessionId,
          role: 'system',
          content: systemPrompt,
          timestamp: baseTimestamp,
        },
        ...chatMessages.filter((m) => m.role !== 'system'),
      ];
      const result = await runTeachingChat({
        agentId: tutorSettings.teachingAgentId,
        messages: augmentedMessages,
      });
      const visibleSources = tutorSettings.showSources ? result.sources : [];
      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.completed',
        service: 'kangur.ai-tutor',
        message: 'Kangur AI tutor chat completed with teaching agent.',
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
          usedTeachingAgent: true,
          retrievedSourceCount: result.sources.length,
          returnedSourceCount: visibleSources.length,
          showSources: tutorSettings.showSources,
          allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
          allowLessons: tutorSettings.allowLessons,
          testAccessMode: tutorSettings.testAccessMode,
          adaptiveGuidanceApplied,
          followUpActionCount: adaptiveGuidance.followUpActions.length,
          dailyMessageLimit: usage.dailyMessageLimit,
          dailyUsageCount: usage.messageCount,
          dailyUsageRemaining: usage.remainingMessages,
          usageDateKey: usage.dateKey,
          messageCount: messages.length,
        },
      });
      return NextResponse.json({
        message: result.message,
        sources: visibleSources,
        followUpActions: adaptiveGuidance.followUpActions,
        usage,
      } satisfies KangurAiTutorChatResponse);
    }

    // Fallback: direct Brain call with agent_teaching.chat capability
    const brainConfig = await resolveBrainExecutionConfigForCapability('agent_teaching.chat', {
      defaultTemperature: 0.4,
      defaultMaxTokens: 600,
      runtimeKind: 'chat',
    });

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

    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.completed',
      service: 'kangur.ai-tutor',
      message: 'Kangur AI tutor chat completed with Brain fallback.',
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
        usedTeachingAgent: false,
        retrievedSourceCount: 0,
        returnedSourceCount: 0,
        showSources: tutorSettings.showSources,
        allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
        allowLessons: tutorSettings.allowLessons,
        testAccessMode: tutorSettings.testAccessMode,
        adaptiveGuidanceApplied,
        followUpActionCount: adaptiveGuidance.followUpActions.length,
        dailyMessageLimit: usage.dailyMessageLimit,
        dailyUsageCount: usage.messageCount,
        dailyUsageRemaining: usage.remainingMessages,
        usageDateKey: usage.dateKey,
        messageCount: messages.length,
      },
    });

    return NextResponse.json({
      message: res.text.trim(),
      sources: [],
      followUpActions: adaptiveGuidance.followUpActions,
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
        usedTeachingAgent: Boolean(tutorSettings.teachingAgentId),
        showSources: tutorSettings.showSources,
        allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
        allowLessons: tutorSettings.allowLessons,
        testAccessMode: tutorSettings.testAccessMode,
        adaptiveGuidanceApplied,
        dailyMessageLimit: tutorSettings.dailyMessageLimit,
        messageCount: messages.length,
      },
    });
    throw error;
  }
}
