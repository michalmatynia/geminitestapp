import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { mergeContextRegistryRefs } from '@/features/ai/ai-context-registry/context/page-context-shared';
import { resolveKangurAiTutorContextRegistryBundle } from '@/features/kangur/server/ai-tutor-context-registry-cache';
import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  buildKangurAiTutorLearnerMood,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import {
  consumeKangurAiTutorDailyUsage,
  ensureKangurAiTutorDailyUsageAvailable,
} from '@/features/kangur/server/ai-tutor-usage';
import { resolveKangurAiTutorRuntimeDocuments } from '@/features/kangur/server/context-registry';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
  resolveKangurAiTutorAvailability,
} from '@/features/kangur/settings-ai-tutor';
import { createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
import type {
  KangurAiTutorChatResponse,
} from '@/shared/contracts/kangur-ai-tutor';
import {
  kangurAiTutorChatRequestSchema,
} from '@/shared/contracts/kangur-ai-tutor';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import {
  readStoredSettingValue,
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
  type BrainChatMessage,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

import {
  SOCRATIC_CONSTRAINT,
  buildContextInstructions,
  buildLearnerMemoryInstructions,
  buildParentPreferenceInstructions,
} from './build-system-prompt';
import {
  buildPersonaChatMemoryContext,
  persistAgentPersonaExchangeMemory,
  resolveKangurPersonaSessionId,
  resolvePersonaInstructions,
} from './persona';
import { buildSectionExplainMessage } from './runtime-overlays';
import { resolveKangurAiTutorSectionKnowledgeBundle } from './section-knowledge';
import { buildKangurTutorResponseSources } from './sources';
import { persistConversationExchange } from './conversation-history';
import {
  AVAILABILITY_ERROR_MESSAGES,
  KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
} from './handler-logic/chat-constants';
import { persistTutorMoodState } from './handler-logic/chat-mood';

const resolveTestAccessMode = (
  value: string | null | undefined
): 'disabled' | 'guided' | 'review_after_answer' | undefined => {
  switch (value) {
    case 'guided':
      return 'guided';
    case 'review_after_answer_only':
      return 'review_after_answer';
    case 'disabled':
      return 'disabled';
    default:
      return undefined;
  }
};

const buildFallbackTutorMessage = (): string =>
  'Przyjrzyjmy sie temu razem krok po kroku. Od czego chcesz zaczac?';

export async function postKangurAiTutorChatHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const learnerId = activeLearner.id;

  const parsed = await parseJsonBody(req, kangurAiTutorChatRequestSchema, {
    logPrefix: 'kangur.ai-tutor.chat.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { messages, context, contextRegistry, memory } = parsed.data;
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === 'user')?.content ?? null;

  const requestedContextRegistryRefs = mergeContextRegistryRefs(
    context ? buildKangurAiTutorContextRegistryRefs({ learnerId, context }) : [],
    contextRegistry?.refs ?? []
  );

  const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore = parseKangurAiTutorSettings(rawSettings);
  const rawAppSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const appSettings = resolveKangurAiTutorAppSettings(rawAppSettings, settingsStore);
  const tutorSettings = getKangurAiTutorSettingsForLearner(
    settingsStore,
    learnerId,
    appSettings
  );

  const availability = resolveKangurAiTutorAvailability(tutorSettings, context, {
    ownerEmailVerified: actor.ownerEmailVerified,
  });
  if (!availability.allowed) {
    throw badRequestError(AVAILABILITY_ERROR_MESSAGES[availability.reason], {
      reason: availability.reason,
    });
  }

  await ensureKangurAiTutorDailyUsageAvailable({
    learnerId,
    dailyMessageLimit: tutorSettings.dailyMessageLimit,
  });

  const contextRegistryBundle =
    tutorSettings.knowledgeGraphEnabled && requestedContextRegistryRefs.length > 0
      ? await resolveKangurAiTutorContextRegistryBundle({
          refs: requestedContextRegistryRefs,
          maxNodes: tutorSettings.contextRegistryMaxNodes,
          depth: tutorSettings.contextRegistryDepth,
        })
      : null;
  const runtimeDocuments = resolveKangurAiTutorRuntimeDocuments(contextRegistryBundle, context);
  const sectionKnowledgeBundle = await resolveKangurAiTutorSectionKnowledgeBundle({
    context,
    latestUserMessage,
  });

  const personaInstructions = await resolvePersonaInstructions(tutorSettings.agentPersonaId);
  const personaContext = tutorSettings.agentPersonaId
    ? await buildPersonaChatMemoryContext({
        personaId: tutorSettings.agentPersonaId,
        latestUserMessage,
      })
    : null;
  const suggestedPersonaMoodId = personaContext?.suggestedMoodId ?? null;
  const personaMemorySessionId =
    tutorSettings.agentPersonaId && personaContext
      ? await resolveKangurPersonaSessionId({
          learnerId,
          personaId: tutorSettings.agentPersonaId,
          personaName: personaContext.persona.name ?? null,
        })
      : null;

  const tutorMood = await buildKangurAiTutorLearnerMood({
    learnerId,
    context,
    messages,
    latestUserMessage,
    personaSuggestedMoodId: suggestedPersonaMoodId,
    previousMood: activeLearner.aiTutor ?? createDefaultKangurAiTutorLearnerMood(),
  });

  const buildBaseResponse = (overrides: Partial<KangurAiTutorChatResponse>): KangurAiTutorChatResponse => ({
    message: buildFallbackTutorMessage(),
    sources: buildKangurTutorResponseSources({
      learnerSnapshot: runtimeDocuments.learnerSnapshot,
      surfaceContext: runtimeDocuments.surfaceContext,
      assignmentContext: runtimeDocuments.assignmentContext,
      extraSources: sectionKnowledgeBundle?.sources ?? [],
    }),
    followUpActions: sectionKnowledgeBundle?.followUpActions ?? [],
    artifacts: [],
    suggestedMoodId: suggestedPersonaMoodId,
    tutorMood,
    ...overrides,
  });

  const shouldAnswerFromPageContent =
    Boolean(sectionKnowledgeBundle) &&
    context?.promptMode === 'selected_text';

  let response = shouldAnswerFromPageContent && sectionKnowledgeBundle
    ? buildBaseResponse({
        message: buildSectionExplainMessage({
          sectionKnowledgeBundle,
          context,
          runtimeDocuments,
        }),
        answerResolutionMode: 'page_content',
        followUpActions: sectionKnowledgeBundle.followUpActions,
      })
    : null;

  if (response && sectionKnowledgeBundle) {
    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.page-content.completed',
      service: 'kangur.ai-tutor',
      message: 'Answered Kangur AI Tutor request from canonical page-content.',
      level: 'info',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        learnerId,
        surface: context?.surface ?? null,
        contentId: context?.contentId ?? null,
        pageContentEntryId: sectionKnowledgeBundle.section.id,
        pageContentFragmentId: sectionKnowledgeBundle.fragment?.id ?? null,
      },
    });
  }

  if (!response) {
    const systemParts = [SOCRATIC_CONSTRAINT];
    if (personaInstructions) systemParts.push(personaInstructions);
    if (personaContext?.systemPrompt) systemParts.push(personaContext.systemPrompt);

    const contextInstructions = buildContextInstructions({
      context,
      registryBundle: contextRegistryBundle,
      options: {
        testAccessMode: resolveTestAccessMode(tutorSettings.testAccessMode),
      },
    });
    if (contextInstructions) systemParts.push(contextInstructions);

    const learnerMemoryInstructions = buildLearnerMemoryInstructions(memory);
    if (learnerMemoryInstructions) systemParts.push(learnerMemoryInstructions);

    systemParts.push(
      buildParentPreferenceInstructions({
        hintDepth: tutorSettings.hintDepth,
        proactiveNudges: tutorSettings.proactiveNudges,
        rememberTutorContext: tutorSettings.rememberTutorContext,
      })
    );

    if (sectionKnowledgeBundle?.instructions) {
      systemParts.push(sectionKnowledgeBundle.instructions);
    }

    const brainConfig = await resolveBrainExecutionConfigForCapability(
      KANGUR_AI_TUTOR_BRAIN_CAPABILITY
    );
    const brainMessages: BrainChatMessage[] = [
      { role: 'system', content: systemParts.join('\n\n') },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];
    const brainResponse = await runBrainChatCompletion({
      modelId: brainConfig.modelId,
      messages: brainMessages,
      temperature: brainConfig.temperature,
      maxTokens: brainConfig.maxTokens,
      jsonMode: supportsBrainJsonMode(brainConfig.modelId),
    });

    response = buildBaseResponse({
      message: brainResponse.text.trim() || buildFallbackTutorMessage(),
      answerResolutionMode: 'brain',
    });
  }

  const usage = await consumeKangurAiTutorDailyUsage({
    learnerId,
    dailyMessageLimit: tutorSettings.dailyMessageLimit,
  });
  response = {
    ...response,
    usage,
  };

  await Promise.all([
    persistTutorMoodState({ learnerId, tutorMood, actor, context, req, ctx }),
    persistConversationExchange({
      learnerId,
      surface: context?.surface ?? null,
      contentId: context?.contentId ?? null,
      userMessage: latestUserMessage ?? '',
      assistantMessage: response.message,
      answerResolutionMode: response.answerResolutionMode,
      tutorMoodId: tutorMood.currentMoodId,
      coachingFrameMode: response.coachingFrame?.mode,
    }),
    tutorSettings.agentPersonaId && personaMemorySessionId
      ? persistAgentPersonaExchangeMemory({
          personaId: tutorSettings.agentPersonaId,
          sessionId: personaMemorySessionId,
          sourceType: 'chat_message',
          sourceId: `${personaMemorySessionId}:${Date.now()}`,
          userMessage: latestUserMessage,
          assistantMessage: response.message,
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json(response);
}
