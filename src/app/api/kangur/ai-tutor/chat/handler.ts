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
  resolveKangurAiTutorAppSettings,
  resolveKangurAiTutorAvailability,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import {
  kangurAiTutorChatRequestSchema,
  type KangurAiTutorChatResponse,
  type KangurAiTutorCoachingMode,
} from '@/shared/contracts/kangur-ai-tutor';
import { createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, isAppError } from '@/shared/errors/app-error';
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
import {
  AVAILABILITY_ERROR_MESSAGES,
  buildKgTelemetry,
  buildMoodTelemetry,
  buildSettingsTelemetry,
  KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
  persistTutorMoodState,
} from './handler.helpers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

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
  let knowledgeGraphQueryStatus: 'hit' | 'miss' | 'skipped' | 'disabled' = 'skipped';
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
    const contextRegistryBundle =
      tutorSettings.knowledgeGraphEnabled && requestedContextRegistryRefs.length > 0
        ? await resolveKangurAiTutorContextRegistryBundle({
          refs: requestedContextRegistryRefs,
          maxNodes: tutorSettings.contextRegistryMaxNodes,
          depth: tutorSettings.contextRegistryDepth,
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
        void ErrorSystem.captureException(error);
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
    let tutorMood = activeLearner.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
    try {
      tutorMood = await buildKangurAiTutorLearnerMood({
        learnerId,
        context,
        messages,
        latestUserMessage,
        personaSuggestedMoodId: suggestedPersonaMoodId,
        previousMood: activeLearner.aiTutor ?? null,
      });
    } catch (error) {
      void ErrorSystem.captureException(error);
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
          previousTutorMoodId: activeLearner.aiTutor?.currentMoodId ?? null,
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
        void ErrorSystem.captureException(error);
        await logKangurServerEvent({
          source: 'kangur.ai-tutor.chat.drawing-analysis.failed',
          service: 'kangur.ai-tutor',
          message: 'Failed to analyze the learner drawing for Kangur AI Tutor.',
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
    const shouldAttemptPageContentAnswer =
      !learnerDrawingImageData &&
      (
        context?.interactionIntent === 'explain' ||
        context?.promptMode === 'selected_text'
      ) &&
      (
        context?.knowledgeReference?.sourceCollection === 'kangur_page_content' ||
        context?.promptMode === 'selected_text'
      );
    const sectionKnowledgeBundle = shouldAttemptPageContentAnswer
      ? await resolveKangurAiTutorSectionKnowledgeBundle({
        latestUserMessage,
        context,
        locale: 'pl',
      })
      : null;

    if (sectionKnowledgeBundle) {
      const sectionExplainResponse = extractTutorDrawingArtifactsFromResponse(
        buildSectionExplainMessage({
          sectionKnowledgeBundle,
          context,
          runtimeDocuments: resolvedRuntimeDocuments,
        })
      );
      const usage = await consumeKangurAiTutorDailyUsage({
        learnerId,
        dailyMessageLimit: tutorSettings.dailyMessageLimit,
      });
      const resolvedSources = buildKangurTutorResponseSources({
        ...resolvedRuntimeDocuments,
        extraSources: sectionKnowledgeBundle.sources,
      });
      const responseSources = tutorSettings.showSources ? resolvedSources : [];

      // Fire-and-forget conversation history persistence
      void persistConversationExchange({
        learnerId,
        surface: context?.surface,
        contentId: context?.contentId,
        userMessage: latestUserMessage ?? '',
        assistantMessage: sectionExplainResponse.message,
        answerResolutionMode: 'page_content',
        tutorMoodId: tutorMood.currentMoodId,
      });

      await persistTutorMoodState({
        learnerId,
        tutorMood,
        actor,
        context,
        req,
        ctx,
      });

      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.page-content.completed',
        service: 'kangur.ai-tutor',
        message: 'Kangur AI Tutor answered from canonical page-content knowledge.',
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
          pageContentEntryId: sectionKnowledgeBundle.section.id,
          pageContentFragmentId: sectionKnowledgeBundle.fragment?.id ?? null,
          linkedNativeGuideIds: sectionKnowledgeBundle.linkedNativeGuides.map((entry) => entry.id),
          retrievedSourceCount: resolvedSources.length,
          returnedSourceCount: responseSources.length,
          followUpActionCount: sectionKnowledgeBundle.followUpActions.length,
          showSources: tutorSettings.showSources,
          allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
          allowLessons: tutorSettings.allowLessons,
          allowGames: tutorSettings.allowGames,
          testAccessMode: tutorSettings.testAccessMode,
          hintDepth: tutorSettings.hintDepth,
          proactiveNudges: tutorSettings.proactiveNudges,
          rememberTutorContext: tutorSettings.rememberTutorContext,
          tutorMoodId: tutorMood.currentMoodId,
          tutorBaselineMoodId: tutorMood.baselineMoodId,
          tutorMoodReasonCode: tutorMood.lastReasonCode,
          tutorMoodConfidence: tutorMood.confidence,
          knowledgeGraphApplied,
          knowledgeGraphQueryMode,
          knowledgeGraphRecallStrategy,
          knowledgeGraphLexicalHitCount,
          knowledgeGraphVectorHitCount,
          knowledgeGraphVectorRecallAttempted,
          contextRegistryRefCount: contextRegistryBundle?.refs.length ?? 0,
          contextRegistryDocumentCount: contextRegistryBundle?.documents.length ?? 0,
          dailyMessageLimit: usage.dailyMessageLimit,
          dailyUsageCount: usage.messageCount,
          dailyUsageRemaining: usage.remainingMessages,
          usageDateKey: usage.dateKey,
          messageCount: messages.length,
        },
      });

      return NextResponse.json({
        message: sectionExplainResponse.message,
        sources: responseSources,
        followUpActions: sectionKnowledgeBundle.followUpActions,
        artifacts: sectionExplainResponse.artifacts,
        answerResolutionMode: 'page_content',
        knowledgeGraph: buildKnowledgeGraphResponseSummary({
          knowledgeGraphApplied,
          knowledgeGraphQueryStatus,
          knowledgeGraphQueryMode,
          knowledgeGraphRecallStrategy,
          knowledgeGraphLexicalHitCount,
          knowledgeGraphVectorHitCount,
          knowledgeGraphVectorRecallAttempted,
          websiteHelpGraphApplied,
          websiteHelpGraphTargetNodeId: null,
        }),
        tutorMood,
        usage,
      } satisfies KangurAiTutorChatResponse);
    }
    const [nativeGuideResolution, knowledgeGraphContext, adaptiveGuidance] = await Promise.all([
      learnerDrawingImageData
        ? Promise.resolve({
          status: 'skipped' as const,
          message: null,
          followUpActions: [],
          entryId: null,
          matchedSignals: [],
          coverageLevel: null,
        })
        : resolveKangurAiTutorNativeGuideResolution({
          latestUserMessage,
          context,
          locale: 'pl',
        }),
      resolveKangurAiTutorSemanticGraphContext({
        latestUserMessage,
        context,
        locale: 'pl',
        runtimeDocuments: [
          resolvedRuntimeDocuments.learnerSnapshot,
          resolvedRuntimeDocuments.loginActivity,
          resolvedRuntimeDocuments.surfaceContext,
          resolvedRuntimeDocuments.assignmentContext,
        ].filter((document): document is ContextRuntimeDocument => Boolean(document)),
      }),
      buildKangurAiTutorAdaptiveGuidance({
        learnerId,
        context,
        registryBundle: contextRegistryBundle,
        memory,
      }),
    ]);
    knowledgeGraphApplied = knowledgeGraphContext.status === 'hit';
    knowledgeGraphQueryStatus = knowledgeGraphContext.status;
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
    const knowledgeGraphFollowUpActions =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.graphFollowUpActions : [];

    const kgTelemetry = buildKgTelemetry({
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
      knowledgeGraphWebsiteHelpTargetNodeId,
      knowledgeGraphWebsiteHelpTargetRoute,
      knowledgeGraphWebsiteHelpTargetAnchorId,
    });
    const settingsTelemetry = buildSettingsTelemetry(tutorSettings);
    const moodTelemetry = buildMoodTelemetry(tutorMood);

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

      // Fire-and-forget conversation history persistence
      void persistConversationExchange({
        learnerId,
        surface: context?.surface,
        contentId: context?.contentId,
        userMessage: latestUserMessage ?? '',
        assistantMessage: nativeGuideResponse.message,
        answerResolutionMode: 'native_guide',
        knowledgeGraphApplied,
        tutorMoodId: tutorMood.currentMoodId,
      });

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
            'Kangur AI Tutor used a generic overview entry for a section-specific request.',
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
            ...kgTelemetry,
          },
        });
      }

      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.native-guide.completed',
        service: 'kangur.ai-tutor',
        message: 'Kangur AI Tutor answered from the native guide repository.',
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
          ...settingsTelemetry,
          nativeGuideApplied: true,
          nativeGuideCoverageLevel: nativeGuideResolution.coverageLevel,
          nativeGuideEntryId: nativeGuideResolution.entryId,
          nativeGuideMatchSignals: nativeGuideResolution.matchedSignals,
          ...kgTelemetry,
          contextRegistryRefCount: contextRegistryBundle?.refs.length ?? 0,
          contextRegistryDocumentCount: contextRegistryBundle?.documents.length ?? 0,
          followUpActionCount: nativeGuideResolution.followUpActions.length,
          ...moodTelemetry,
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
        followUpActions: mergeFollowUpActions(
          nativeGuideResolution.followUpActions,
          knowledgeGraphFollowUpActions
        ),
        artifacts: nativeGuideResponse.artifacts,
        answerResolutionMode: 'native_guide',
        knowledgeGraph: buildKnowledgeGraphResponseSummary({
          knowledgeGraphApplied,
          knowledgeGraphQueryStatus,
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
        message: 'Kangur AI Tutor did not find a native guide entry for an eligible request.',
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
          ...kgTelemetry,
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
    if (knowledgeGraphWebsiteHelpTarget) {
      systemParts.push(
        [
          `You have a resolved navigation target for this query: "${knowledgeGraphWebsiteHelpTarget.label}".`,
          'Reference this specific page or section by name in your answer.',
          'The learner will see a navigation button below your message to go there directly.',
          'Guide them on what they will find there, not just that they should go there.',
        ].join(' ')
      );
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

    const useJsonMode = supportsBrainJsonMode(brainConfig.modelId) && drawingSupportEnabled;
    const res = await runBrainChatCompletion({
      modelId: brainConfig.modelId,
      temperature: brainConfig.temperature,
      maxTokens: brainConfig.maxTokens,
      ...(useJsonMode ? { jsonMode: true } : {}),
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
    const parsedTutorResponse = useJsonMode
      ? extractTutorDrawingArtifactsFromJson(res.text)
      : extractTutorDrawingArtifactsFromResponse(res.text);
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
        void ErrorSystem.captureException(error);
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

    // Fire-and-forget conversation history persistence
    void persistConversationExchange({
      learnerId,
      surface: context?.surface,
      contentId: context?.contentId,
      userMessage: latestUserMessage ?? '',
      assistantMessage: parsedTutorResponse.message,
      answerResolutionMode: 'brain',
      knowledgeGraphApplied,
      tutorMoodId: tutorMood.currentMoodId,
      ...(adaptiveCoachingMode ? { coachingFrameMode: adaptiveCoachingMode } : {}),
    });

    await persistTutorMoodState({
      learnerId,
      tutorMood,
      actor,
      context,
      req,
      ctx,
    });

    const learnerSegmentation = buildLearnerSegmentation(
      context,
      adaptiveCoachingMode,
      drawingSupportEnabled
    );
    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.completed',
      service: 'kangur.ai-tutor',
      message: 'Kangur AI Tutor chat completed through Brain routing.',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        // Learner segmentation dimensions for analytics aggregation
        ...learnerSegmentation,
        brainCapability: KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
        retrievedSourceCount: resolvedSources.length,
        returnedSourceCount: responseSources.length,
        ...settingsTelemetry,
        adaptiveGuidanceApplied,
        ...kgTelemetry,
        contextRegistryRefCount: contextRegistryBundle?.refs.length ?? 0,
        contextRegistryDocumentCount: contextRegistryBundle?.documents.length ?? 0,
        followUpActionCount: adaptiveGuidance.followUpActions.length,
        primaryFollowUpActionId: followUpReporting.primaryFollowUpActionId,
        primaryFollowUpPage: followUpReporting.primaryFollowUpPage,
        hasBridgeFollowUpAction: followUpReporting.hasBridgeFollowUpAction,
        bridgeFollowUpActionCount: followUpReporting.bridgeFollowUpActionCount,
        bridgeFollowUpDirection: followUpReporting.bridgeFollowUpDirection,
        hasLearnerMemory: Boolean(memory),
        personaId: tutorSettings.agentPersonaId,
        suggestedPersonaMoodId,
        personaMemorySessionId,
        ...moodTelemetry,
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
      followUpActions: mergeFollowUpActions(
        adaptiveGuidance.followUpActions,
        knowledgeGraphFollowUpActions
      ),
      artifacts: parsedTutorResponse.artifacts,
      answerResolutionMode: 'brain',
      knowledgeGraph: buildKnowledgeGraphResponseSummary({
        knowledgeGraphApplied,
        knowledgeGraphQueryStatus,
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
    void ErrorSystem.captureException(error);
    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.failed',
      service: 'kangur.ai-tutor',
      message: 'Kangur AI Tutor chat failed.',
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
