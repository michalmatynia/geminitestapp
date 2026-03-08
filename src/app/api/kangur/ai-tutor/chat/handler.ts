import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import {
  buildPersonaChatMemoryContext,
  persistAgentPersonaExchangeMemory,
} from '@/features/ai/agentcreator/server/persona-memory';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { buildKangurAiTutorAdaptiveGuidance } from '@/features/kangur/server/ai-tutor-adaptive';
import { resolveKangurAiTutorRuntimeDocuments } from '@/features/kangur/server/context-registry';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  parseKangurAiTutorSettings,
  getKangurAiTutorSettingsForLearner,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  resolveKangurAiTutorAvailability,
  resolveKangurAiTutorAppSettings,
  type KangurAiTutorAvailabilityReason,
} from '@/features/kangur/settings-ai-tutor';
import { consumeKangurAiTutorDailyUsage } from '@/features/kangur/server/ai-tutor-usage';
import {
  buildKangurAiTutorLearnerMood,
  resolveKangurActor,
  setKangurLearnerAiTutorState,
} from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  AGENT_PERSONA_SETTINGS_KEY,
  type AgentPersona,
  type AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import {
  kangurAiTutorChatRequestSchema,
  type KangurAiTutorChatResponse,
  type KangurAiTutorConversationContext,
  type KangurAiTutorInteractionIntent,
  type KangurAiTutorPromptMode,
} from '@/shared/contracts/kangur-ai-tutor';
import { createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
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
import prisma from '@/shared/lib/db/prisma';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import type { ContextRegistryResolutionBundle, ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';

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
  email_unverified: 'Verify your parent email to unlock AI Tutor.',
  missing_context: 'AI tutor context is required for Kangur tutoring sessions.',
  lessons_disabled: 'AI tutor is disabled for lessons for this learner.',
  tests_disabled: 'AI tutor is disabled for tests for this learner.',
  review_after_answer_only:
    'AI tutor is available in tests only after the answer has been revealed.',
};
const KANGUR_AI_TUTOR_BRAIN_CAPABILITY = 'kangur_ai_tutor.chat';

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
  const existing = await prisma.chatbotSession.findFirst({
    where: {
      personaId: input.personaId,
      title,
    },
    select: {
      id: true,
    },
  });

  if (existing?.id) {
    return existing.id;
  }

  const created = await prisma.chatbotSession.create({
    data: {
      title,
      personaId: input.personaId,
      settings: {
        personaId: input.personaId,
      } as never,
    },
    select: {
      id: true,
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

  const { learnerSnapshot, surfaceContext, assignmentContext } =
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
  const rawAppSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const appSettings = resolveKangurAiTutorAppSettings(rawAppSettings, settingsStore);
  const tutorSettings = getKangurAiTutorSettingsForLearner(settingsStore, learnerId, appSettings);
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
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === 'user')?.content ?? null;

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

    const usage = await consumeKangurAiTutorDailyUsage({
      learnerId,
      dailyMessageLimit: tutorSettings.dailyMessageLimit,
    });
    const contextRegistryBundle = context
      ? await contextRegistryEngine.resolveRefs({
        refs: buildKangurAiTutorContextRegistryRefs({
          learnerId,
          context,
        }),
        maxNodes: 24,
        depth: 1,
      })
      : null;

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
    const contextInstructions = buildContextInstructions({
      context,
      registryBundle: contextRegistryBundle,
      options: {
        testAccessMode: tutorSettings.testAccessMode,
      },
    });
    if (contextInstructions) systemParts.push(contextInstructions);
    const adaptiveGuidance = await buildKangurAiTutorAdaptiveGuidance({
      learnerId,
      context,
      registryBundle: contextRegistryBundle,
    });
    const adaptiveInstructions = adaptiveGuidance.instructions;
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
          content: res.text.trim(),
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
          assistantMessage: res.text.trim(),
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

    try {
      await setKangurLearnerAiTutorState(learnerId, tutorMood);
    } catch (error) {
      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.mood-persist-failed',
        service: 'kangur.ai-tutor',
        message: 'Failed to persist learner-specific Kangur tutor mood.',
        level: 'warn',
        request: req,
        requestContext: ctx,
        actor,
        error,
        statusCode: 500,
        context: {
          learnerId,
          tutorMoodId: tutorMood.currentMoodId,
          tutorBaselineMoodId: tutorMood.baselineMoodId,
          tutorMoodReasonCode: tutorMood.lastReasonCode,
          surface: context?.surface ?? null,
          contentId: context?.contentId ?? null,
        },
      });
    }

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
        retrievedSourceCount: 0,
        returnedSourceCount: 0,
        showSources: tutorSettings.showSources,
        allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
        allowLessons: tutorSettings.allowLessons,
        testAccessMode: tutorSettings.testAccessMode,
        adaptiveGuidanceApplied,
        contextRegistryRefCount: contextRegistryBundle?.refs.length ?? 0,
        contextRegistryDocumentCount: contextRegistryBundle?.documents.length ?? 0,
        followUpActionCount: adaptiveGuidance.followUpActions.length,
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
      message: res.text.trim(),
      sources: [],
      followUpActions: adaptiveGuidance.followUpActions,
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
        testAccessMode: tutorSettings.testAccessMode,
        adaptiveGuidanceApplied,
        contextRegistryRefCount: context ? buildKangurAiTutorContextRegistryRefs({ learnerId, context }).length : 0,
        personaId: tutorSettings.agentPersonaId,
        dailyMessageLimit: tutorSettings.dailyMessageLimit,
        messageCount: messages.length,
      },
    });
    throw error;
  }
}
