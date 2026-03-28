import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { mergeContextRegistryRefs } from '@/features/ai/ai-context-registry/context/page-context-shared';
import { resolveKangurAiTutorContextRegistryBundle } from '@/features/kangur/server/ai-tutor-context-registry-cache';
import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { summarizeKangurAiTutorFollowUpActions } from '@/features/kangur/ai-tutor/follow-up-reporting';
import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  buildKangurAiTutorLearnerMood,
  requireActiveLearner,
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
} from '@/features/kangur/settings-ai-tutor';
import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import {
  kangurAiTutorChatRequestSchema,
  type KangurAiTutorChatResponse,
  type KangurAiTutorCoachingMode,
  type KangurAiTutorConversationContext,
} from '@/shared/contracts/kangur-ai-tutor';
import { createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import {
  resolveBrainExecutionConfigForCapability,
  readStoredSettingValue,
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
  analyzeLearnerDrawingWithBrain,
  buildTutorDrawingInstructions,
  extractTutorDrawingArtifactsFromJson,
  extractTutorDrawingArtifactsFromResponse,
  shouldEnableTutorDrawingSupport,
} from './drawing';
import { buildLearnerSegmentation } from './segmentation';
import {
  buildPersonaChatMemoryContext,
  persistAgentPersonaExchangeMemory,
  resolveKangurPersonaSessionId,
  resolvePersonaInstructions,
} from './persona';
import { buildSectionExplainMessage, readContextString } from './runtime-overlays';
import { resolveKangurAiTutorSectionKnowledgeBundle } from './section-knowledge';
import {
  buildKangurTutorResponseSources,
  buildKnowledgeGraphResponseSummary,
  mergeFollowUpActions,
} from './sources';
import { persistConversationExchange } from './conversation-history';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { AVAILABILITY_ERROR_MESSAGES, KANGUR_AI_TUTOR_BRAIN_CAPABILITY } from './handler-logic/chat-constants';
import { persistTutorMoodState } from './handler-logic/chat-mood';

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
  const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? null;
  const requestedContextRegistryRefs = mergeContextRegistryRefs(
    context ? buildKangurAiTutorContextRegistryRefs({ learnerId, context }) : [],
    contextRegistry?.refs ?? []
  );

  const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore = parseKangurAiTutorSettings(rawSettings);
  const rawAppSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const appSettings = resolveKangurAiTutorAppSettings(rawAppSettings, settingsStore);
  const tutorSettings = getKangurAiTutorSettingsForLearner(settingsStore, learnerId, appSettings);

  const availability = resolveKangurAiTutorAvailability(tutorSettings, context, { ownerEmailVerified: actor.ownerEmailVerified });
  if (!availability.allowed) {
    throw badRequestError(AVAILABILITY_ERROR_MESSAGES[availability.reason], { reason: availability.reason });
  }

  await ensureKangurAiTutorDailyUsageAvailable({ learnerId, dailyMessageLimit: tutorSettings.dailyMessageLimit });

  const contextRegistryBundle = tutorSettings.knowledgeGraphEnabled && requestedContextRegistryRefs.length > 0
    ? await resolveKangurAiTutorContextRegistryBundle({ refs: requestedContextRegistryRefs, maxNodes: tutorSettings.contextRegistryMaxNodes, depth: tutorSettings.contextRegistryDepth })
    : null;
  const resolvedRuntimeDocuments = resolveKangurAiTutorRuntimeDocuments(contextRegistryBundle, context);

  const systemParts: string[] = [SOCRATIC_CONSTRAINT];
  const personaInstructions = await resolvePersonaInstructions(tutorSettings.agentPersonaId);
  if (personaInstructions) systemParts.push(personaInstructions);

  let personaMemorySessionId: string | null = null;
  let suggestedPersonaMoodId: AgentPersonaMoodId | null = null;
  if (tutorSettings.agentPersonaId) {
    const personaContext = await buildPersonaChatMemoryContext({ personaId: tutorSettings.agentPersonaId, latestUserMessage });
    if (personaContext.systemPrompt) systemParts.push(personaContext.systemPrompt);
    suggestedPersonaMoodId = personaContext.suggestedMoodId ?? null;
    personaMemorySessionId = await resolveKangurPersonaSessionId({ learnerId, personaId: tutorSettings.agentPersonaId, personaName: personaContext.persona.name ?? null });
  }

  let tutorMood = activeLearner.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
  tutorMood = await buildKangurAiTutorLearnerMood({ learnerId, context, messages, latestUserMessage, personaSuggestedMoodId: suggestedPersonaMoodId, previousMood: activeLearner.aiTutor ?? null });

  systemParts.push(buildContextInstructions({ context, mood: tutorMood }));
  systemParts.push(buildLearnerMemoryInstructions({ memory }));
  systemParts.push(buildParentPreferenceInstructions({ settings: tutorSettings }));

  const sectionKnowledge = await resolveKangurAiTutorSectionKnowledgeBundle({ context, documents: resolvedRuntimeDocuments });
  if (sectionKnowledge.instruction) systemParts.push(sectionKnowledge.instruction);

  const brainConfig = await resolveBrainExecutionConfigForCapability(KANGUR_AI_TUTOR_BRAIN_CAPABILITY);
  const brainMessages: BrainChatMessage[] = [
    { role: 'system', content: systemParts.join('\n\n') },
    ...messages.map((m) => ({ role: m.role as any, content: m.content })),
  ];

  const brainResponse = await runBrainChatCompletion({
    capability: KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
    messages: brainMessages,
    config: brainConfig,
    jsonMode: supportsBrainJsonMode(brainConfig.modelId),
  });

  const responseContent = brainResponse.choices[0]?.message.content ?? '';
  const response: KangurAiTutorChatResponse = {
    message: { role: 'assistant', content: responseContent, timestamp: new Date().toISOString() },
    mood: tutorMood,
    sources: buildKangurTutorResponseSources({ sectionKnowledge }),
  };

  await Promise.all([
    persistTutorMoodState({ learnerId, tutorMood, actor, context, req, ctx }),
    consumeKangurAiTutorDailyUsage({ learnerId }),
    persistConversationExchange({ learnerId, messages, response }),
    personaMemorySessionId ? persistAgentPersonaExchangeMemory({ sessionId: personaMemorySessionId, userMessage: latestUserMessage ?? '', assistantMessage: responseContent }) : Promise.resolve(),
  ]);

  return NextResponse.json(response);
}
