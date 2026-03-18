'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { summarizeKangurAiTutorFollowUpActions } from '@/features/kangur/ai-tutor/follow-up-reporting';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import {
  kangurAiTutorAnswerResolutionModeSchema,
  kangurAiTutorCoachingFrameSchema,
  kangurAiTutorKnowledgeGraphSummarySchema,
  kangurAiTutorUsageSummarySchema,
  kangurAiTutorWebsiteHelpTargetSchema,
  type KangurAiTutorChatResponse,
  type KangurAiTutorFocusKind,
  type KangurAiTutorInteractionIntent,
  type KangurAiTutorKnowledgeReference,
  type KangurAiTutorLearnerMemory,
  type KangurAiTutorPromptMode,
  type KangurAiTutorRuntimeMessage as ChatMessage,
  type KangurAiTutorSurface,
  type KangurAiTutorUsageResponse,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  getKangurAiTutorMoodCopy,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurAiTutorLearnerMood,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';
import { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import { ApiError, api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

import { useKangurAiTutorContent } from './KangurAiTutorContentContext';
import {
  areSessionRegistrationsEqual,
  buildHintRecoveryCandidate,
  buildLearnerMemoryFromCompletedFollowUp,
  buildNextLearnerMemory,
  buildUserDrawingArtifacts,
  countRepeatedUserMessages,
  getLastAssistantCoachingMode,
  isLearnerMemoryKeyForLearner,
  mergeLearnerTutorMood,
  normalizeMessageArtifacts,
  omitUndefinedFields,
  resolveHintRecoverySignal,
  type KangurAiTutorHintRecoveryCandidate,
  type KangurAiTutorSessionRegistration,
  type KangurAiTutorSessionRegistrationSetter,
} from './kangur-ai-tutor-runtime.helpers';
import {
  clearPersistedRuntimeState,
  createEmptySessionState,
  loadPersistedRuntimeState,
  persistRuntimeState,
  type KangurAiTutorSessionState,
} from './kangur-ai-tutor-runtime.storage';
import {
  useKangurTutorPersonaVisuals,
  useKangurTutorSettingsState,
} from './kangur-ai-tutor-runtime.sub-hooks';
import type {
  KangurAiTutorContextValue,
  KangurAiTutorSessionRegistryContextValue,
} from './KangurAiTutorRuntime.types';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type KangurAiTutorRuntimeResult = {
  value: KangurAiTutorContextValue;
  sessionRegistryValue: KangurAiTutorSessionRegistryContextValue;
};

const trimReplayableTelemetryText = (
  value: string | null | undefined,
  maxLength: number
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
};

// ---------------------------------------------------------------------------
// Main runtime hook
// ---------------------------------------------------------------------------

export const useKangurAiTutorRuntime = (): KangurAiTutorRuntimeResult => {
  const tutorContent = useKangurAiTutorContent() ?? DEFAULT_KANGUR_AI_TUTOR_CONTENT;
  const settingsStore = useSettingsStore();
  const initialRuntimeStateRef = useRef<ReturnType<typeof loadPersistedRuntimeState> | null>(null);
  if (initialRuntimeStateRef.current === null) {
    initialRuntimeStateRef.current = loadPersistedRuntimeState();
  }

  const [isOpen, setIsOpen] = useState(initialRuntimeStateRef.current.isOpen);
  const [activeRegistration, setActiveRegistration] =
    useState<KangurAiTutorSessionRegistration | null>(null);
  const [sessionStates, setSessionStates] = useState<Record<string, KangurAiTutorSessionState>>(
    initialRuntimeStateRef.current.sessionStates
  );
  const [learnerMemories, setLearnerMemories] = useState<
    Record<string, KangurAiTutorLearnerMemory>
  >(initialRuntimeStateRef.current.learnerMemories);
  const [learnerMoodById, setLearnerMoodById] = useState<Record<string, KangurAiTutorLearnerMood>>(
    {}
  );
  const selectionExplainRequestIdRef = useRef(0);
  const [selectionExplainRequest, setSelectionExplainRequest] = useState<{
    id: number;
    selectedText: string;
  } | null>(null);
  const authState = useOptionalKangurAuth();
  const authUser = authState?.user ?? null;
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();

  const activeLearnerId = activeRegistration?.learnerId ?? authUser?.activeLearner?.id ?? null;
  const activeSessionContext = activeRegistration?.sessionContext ?? null;
  const activeSessionKey = activeRegistration?.sessionKey ?? null;

  useEffect(() => {
    const nextEntries = [
      ...(authUser?.learners ?? []),
      ...(authUser?.activeLearner ? [authUser.activeLearner] : []),
    ];

    if (nextEntries.length === 0) {
      return;
    }

    setLearnerMoodById((current) => {
      let changed = false;
      const nextState = { ...current };

      nextEntries.forEach((learner) => {
        const merged = mergeLearnerTutorMood(nextState[learner.id], learner.aiTutor);
        if (merged !== nextState[learner.id]) {
          nextState[learner.id] = merged;
          changed = true;
        }
      });

      return changed ? nextState : current;
    });
  }, [authUser]);

  const {
    appSettings,
    tutorSettings,
    enabled,
    allowCrossPagePersistence,
    allowLearnerMemory,
    allowSelectedTextSupport,
    showSources,
    activeLearnerMemoryKey,
  } = useKangurTutorSettingsState({
    settingsStore,
    activeLearnerId,
    activeSessionContext,
    authUserOwnerEmailVerified: authUser?.ownerEmailVerified,
  });
  const activeLearnerMemory =
    activeLearnerMemoryKey && allowLearnerMemory
      ? learnerMemories[activeLearnerMemoryKey] ?? null
      : null;

  const activeSessionState = activeSessionKey
    ? (sessionStates[activeSessionKey] ?? createEmptySessionState())
    : createEmptySessionState();
  const {
    messages,
    isLoading,
    isUsageLoading,
    highlightedText,
    suggestedMoodId,
    usageSummary,
  } = activeSessionState;
  const tutorBehaviorMood = useMemo(
    () =>
      activeLearnerId
        ? mergeLearnerTutorMood(learnerMoodById[activeLearnerId], null)
        : createDefaultKangurAiTutorLearnerMood(),
    [activeLearnerId, learnerMoodById]
  );
  const tutorBehaviorMoodCopy = useMemo(
    () => getKangurAiTutorMoodCopy(tutorContent, tutorBehaviorMood.currentMoodId),
    [tutorContent.moods, tutorBehaviorMood.currentMoodId]
  );

  const updateSessionState = useCallback(
    (
      sessionKey: string | null,
      updater: (state: KangurAiTutorSessionState) => KangurAiTutorSessionState
    ) => {
      if (!sessionKey) {
        return;
      }

      setSessionStates((prev) => {
        const currentState = prev[sessionKey] ?? createEmptySessionState();
        const nextState = updater(currentState);
        if (nextState === currentState) {
          return prev;
        }

        return {
          ...prev,
          [sessionKey]: nextState,
        };
      });
    },
    []
  );

  const updateLearnerMemory = useCallback(
    (
      memoryKey: string | null,
      updater: (memory: KangurAiTutorLearnerMemory | null) => KangurAiTutorLearnerMemory | null
    ) => {
      if (!memoryKey) {
        return;
      }

      setLearnerMemories((prev) => {
        const currentMemory = prev[memoryKey] ?? null;
        const nextMemory = updater(currentMemory);
        if (nextMemory === currentMemory) {
          return prev;
        }

        if (!nextMemory) {
          if (!(memoryKey in prev)) {
            return prev;
          }

          const nextState = { ...prev };
          delete nextState[memoryKey];
          return nextState;
        }

        return {
          ...prev,
          [memoryKey]: nextMemory,
        };
      });
    },
    []
  );

  const { tutorPersona, tutorName, tutorMoodId, tutorAvatarSvg, tutorAvatarImageUrl } =
    useKangurTutorPersonaVisuals({
      tutorSettings,
      appSettings,
      defaultTutorName: tutorContent.common.defaultTutorName,
      isLoading,
      suggestedMoodId,
      lastMessageRole: messages.length > 0 ? (messages[messages.length - 1]?.role ?? null) : null,
    });

  const previousSessionKeyRef = useRef<string | null>(null);
  const pendingHintRecoveryBySessionKeyRef = useRef<
    Record<string, KangurAiTutorHintRecoveryCandidate>
  >({});
  const recentHintRecoverySignalBySessionKeyRef = useRef<
    Record<string, ReturnType<typeof resolveHintRecoverySignal>>
  >({});

  useEffect(() => {
    if (!allowCrossPagePersistence) {
      clearPersistedRuntimeState();
      return;
    }

    persistRuntimeState({
      isOpen,
      sessionStates,
      learnerMemories,
    });
  }, [allowCrossPagePersistence, isOpen, learnerMemories, sessionStates]);

  useLayoutEffect(() => {
    if (allowCrossPagePersistence) {
      return;
    }

    clearPersistedRuntimeState();
    setIsOpen(false);
    setSessionStates((currentStates) =>
      Object.keys(currentStates).length === 0 ? currentStates : {}
    );
    setLearnerMemories((currentMemories) =>
      Object.keys(currentMemories).length === 0 ? currentMemories : {}
    );
  }, [activeSessionKey, allowCrossPagePersistence]);

  useEffect(() => {
    if (allowLearnerMemory || !activeLearnerId) {
      return;
    }

    setLearnerMemories((prev) => {
      let changed = false;
      const nextState = { ...prev };

      Object.keys(prev).forEach((memoryKey) => {
        if (!isLearnerMemoryKeyForLearner(memoryKey, activeLearnerId)) {
          return;
        }

        delete nextState[memoryKey];
        changed = true;
      });

      return changed ? nextState : prev;
    });
  }, [activeLearnerId, allowLearnerMemory]);

  useEffect(() => {
    const previousSessionKey = previousSessionKeyRef.current;
    if (previousSessionKey && activeSessionKey && previousSessionKey !== activeSessionKey) {
      trackKangurClientEvent('kangur_ai_tutor_context_switched', {
        previousSessionKey,
        nextSessionKey: activeSessionKey,
        surface: activeSessionContext?.surface ?? null,
        contentId: activeSessionContext?.contentId ?? null,
      });
    }

    if (activeSessionKey) {
      previousSessionKeyRef.current = activeSessionKey;
    }
  }, [activeSessionContext?.contentId, activeSessionContext?.surface, activeSessionKey]);

  useEffect(() => {
    if (!activeSessionKey || !activeSessionContext) {
      return;
    }

    const pendingCandidate = pendingHintRecoveryBySessionKeyRef.current[activeSessionKey];
    if (!pendingCandidate) {
      return;
    }

    const recoverySignal = resolveHintRecoverySignal({
      candidate: pendingCandidate,
      nextContext: activeSessionContext,
    });
    if (!recoverySignal) {
      return;
    }

    trackKangurClientEvent('kangur_ai_tutor_recovery_after_hint', {
      surface: pendingCandidate.surface,
      contentId: pendingCandidate.contentId,
      questionId: pendingCandidate.questionId,
      focusKind: pendingCandidate.focusKind,
      coachingMode: pendingCandidate.coachingMode,
      interactionIntent: pendingCandidate.interactionIntent,
      recoverySignal,
      nextQuestionId: activeSessionContext.questionId ?? null,
      nextFocusKind: activeSessionContext.focusKind ?? null,
    });
    recentHintRecoverySignalBySessionKeyRef.current[activeSessionKey] = recoverySignal;
    delete pendingHintRecoveryBySessionKeyRef.current[activeSessionKey];
  }, [
    activeSessionContext,
    activeSessionContext?.answerRevealed,
    activeSessionContext?.assignmentId,
    activeSessionContext?.currentQuestion,
    activeSessionContext?.focusId,
    activeSessionContext?.focusKind,
    activeSessionContext?.focusLabel,
    activeSessionContext?.questionId,
    activeSessionKey,
  ]);

  useLayoutEffect(() => {
    if (!activeSessionKey) {
      return;
    }

    if (!enabled) {
      setIsOpen(false);
      updateSessionState(activeSessionKey, (currentState) =>
        currentState.isLoading || currentState.isUsageLoading
          ? {
            ...currentState,
            isLoading: false,
            isUsageLoading: false,
          }
          : currentState
      );
    }
  }, [activeSessionKey, enabled, updateSessionState]);

  useEffect(() => {
    if (!activeSessionKey) {
      return;
    }

    if (!enabled || !activeLearnerId || tutorSettings?.dailyMessageLimit === null) {
      updateSessionState(activeSessionKey, (currentState) => ({
        ...currentState,
        isUsageLoading: false,
        usageSummary: null,
      }));
      return;
    }

    let cancelled = false;
    updateSessionState(activeSessionKey, (currentState) => ({
      ...currentState,
      isUsageLoading: true,
    }));

    void api
      .get<KangurAiTutorUsageResponse>('/api/kangur/ai-tutor/usage')
      .then((result) => {
        if (cancelled) {
          return;
        }

        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          usageSummary: result.usage,
        }));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        void ErrorSystem.captureException(error);
        logKangurClientError(error, {
          source: 'KangurAiTutorContext',
          action: 'loadUsage',
          surface: activeSessionContext?.surface ?? null,
          contentId: activeSessionContext?.contentId ?? null,
        });
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          isUsageLoading: false,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeLearnerId,
    activeSessionContext?.contentId,
    activeSessionContext?.surface,
    activeSessionKey,
    enabled,
    tutorSettings?.dailyMessageLimit,
    updateSessionState,
  ]);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const setHighlightedText = useCallback(
    (text: string | null) =>
      updateSessionState(activeSessionKey, (currentState) => ({
        ...currentState,
        highlightedText: text,
      })),
    [activeSessionKey, updateSessionState]
  );

  const recordFollowUpCompletion = useCallback(
    (input: {
      actionId: string;
      actionLabel: string;
      actionReason?: string | null;
      actionPage: string;
      targetPath: string;
      targetSearch?: string | null;
    }) => {
      if (!allowLearnerMemory || !activeLearnerMemoryKey || !activeSessionContext) {
        return;
      }

      updateLearnerMemory(activeLearnerMemoryKey, (currentMemory) =>
        buildLearnerMemoryFromCompletedFollowUp({
          current: currentMemory,
          context: activeSessionContext,
          actionLabel: input.actionLabel,
          actionReason: input.actionReason ?? null,
          actionPage: input.actionPage,
        })
      );

      trackKangurClientEvent('kangur_ai_tutor_follow_up_memory_recorded', {
        surface: activeSessionContext.surface,
        contentId: activeSessionContext.contentId ?? null,
        actionId: input.actionId,
        actionPage: input.actionPage,
        targetPath: input.targetPath,
        targetSearch: input.targetSearch ?? null,
      });
    },
    [
      activeLearnerMemoryKey,
      activeSessionContext,
      allowLearnerMemory,
      updateLearnerMemory,
    ]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      options?: {
        promptMode?: KangurAiTutorPromptMode;
        selectedText?: string | null;
        drawingImageData?: string | null;
        contentId?: string | null;
        focusKind?: KangurAiTutorFocusKind;
        focusId?: string | null;
        focusLabel?: string | null;
        assignmentId?: string | null;
        knowledgeReference?: KangurAiTutorKnowledgeReference | null;
        interactionIntent?: KangurAiTutorInteractionIntent;
        surface?: KangurAiTutorSurface;
        suppressUserMessage?: boolean;
      }
    ): Promise<void> => {
      if (!text.trim() || !enabled || !activeSessionContext || !activeSessionKey) {
        return;
      }

      const userDrawingArtifacts = buildUserDrawingArtifacts(options?.drawingImageData);
      const userMessage: ChatMessage = {
        role: 'user',
        content: text.trim(),
        ...(userDrawingArtifacts ? { artifacts: userDrawingArtifacts } : {}),
        ...(options?.drawingImageData ? { drawingImageData: options.drawingImageData } : {}),
      };
      const shouldSuppressUserMessage = options?.suppressUserMessage === true;
      const requestMessages: ChatMessage[] = [...messages, userMessage];
      const outgoingMessages: ChatMessage[] = shouldSuppressUserMessage
        ? messages
        : requestMessages;
      const requestedPromptMode = options?.promptMode ?? 'chat';
      const resolvedPromptMode =
        requestedPromptMode === 'selected_text' && !allowSelectedTextSupport
          ? 'chat'
          : requestedPromptMode;
      const resolvedSelectedText = allowSelectedTextSupport
        ? (options?.selectedText ?? highlightedText)?.trim() || null
        : null;
      const repeatCount = countRepeatedUserMessages(messages, userMessage.content);
      const previousCoachingMode = getLastAssistantCoachingMode(messages, activeLearnerMemory);
      const recentHintRecoverySignal =
        recentHintRecoverySignalBySessionKeyRef.current[activeSessionKey] ?? null;
      const nextContext = omitUndefinedFields({
        ...activeSessionContext,
        ...(options?.surface ? { surface: options.surface } : {}),
        ...(options?.contentId ? { contentId: options.contentId } : {}),
        promptMode: resolvedPromptMode,
        ...(resolvedSelectedText ? { selectedText: resolvedSelectedText } : {}),
        ...(options?.focusKind ? { focusKind: options.focusKind } : {}),
        ...(options?.focusId ? { focusId: options.focusId } : {}),
        ...(options?.focusLabel ? { focusLabel: options.focusLabel } : {}),
        ...(options?.assignmentId ? { assignmentId: options.assignmentId } : {}),
        ...(options?.knowledgeReference
          ? { knowledgeReference: options.knowledgeReference }
          : {}),
        ...(options?.interactionIntent ? { interactionIntent: options.interactionIntent } : {}),
        ...(options?.drawingImageData
          ? { drawingImageData: options.drawingImageData.trim() }
          : {}),
        ...(repeatCount > 0 ? { repeatedQuestionCount: repeatCount } : {}),
        ...(recentHintRecoverySignal
          ? { recentHintRecoverySignal }
          : {}),
        ...(previousCoachingMode
          ? { previousCoachingMode }
          : {}),
      });
      const telemetryContext = {
        surface: nextContext.surface ?? null,
        contentId: nextContext.contentId ?? null,
        title: trimReplayableTelemetryText(nextContext.title, 200),
        description: trimReplayableTelemetryText(nextContext.description, 600),
        promptMode: nextContext.promptMode ?? resolvedPromptMode,
        selectedText: trimReplayableTelemetryText(nextContext.selectedText, 1_000),
        hasSelectedText: Boolean(nextContext.selectedText),
        hasLearnerMemory: Boolean(activeLearnerMemory),
        contextRegistryRefCount: pageContextRegistry?.refs.length ?? 0,
        focusKind: nextContext.focusKind ?? null,
        focusId: trimReplayableTelemetryText(nextContext.focusId, 120),
        focusLabel: trimReplayableTelemetryText(nextContext.focusLabel, 240),
        assignmentId: trimReplayableTelemetryText(nextContext.assignmentId, 120),
        questionId: trimReplayableTelemetryText(nextContext.questionId, 120),
        interactionIntent: nextContext.interactionIntent ?? null,
        answerRevealed:
          typeof nextContext.answerRevealed === 'boolean' ? nextContext.answerRevealed : null,
        selectedChoiceLabel: trimReplayableTelemetryText(nextContext.selectedChoiceLabel, 16),
        selectedChoiceText: trimReplayableTelemetryText(nextContext.selectedChoiceText, 240),
        latestUserMessage: trimReplayableTelemetryText(userMessage.content, 1_000),
        hasDrawingAttachment: Boolean(userDrawingArtifacts?.length),
        messageCount: requestMessages.length,
        isRepeatedQuestion: repeatCount > 0,
        repeatCount,
        previousCoachingMode,
        recentHintRecoverySignal,
      };
      updateSessionState(activeSessionKey, (currentState) => ({
        ...currentState,
        messages: outgoingMessages,
        isLoading: true,
      }));
      if (repeatCount > 0) {
        trackKangurClientEvent('kangur_ai_tutor_repeat_question_detected', telemetryContext);
      }
      trackKangurClientEvent('kangur_ai_tutor_message_sent', telemetryContext);

      try {
        const result = await api.post<KangurAiTutorChatResponse>('/api/kangur/ai-tutor/chat', {
          messages: requestMessages.map((message) => ({
            role: message.role,
            content: message.content,
            ...(message.artifacts?.length ? { artifacts: message.artifacts } : {}),
          })),
          context: nextContext,
          ...(pageContextRegistry ? { contextRegistry: pageContextRegistry } : {}),
          ...(activeLearnerMemory ? { memory: activeLearnerMemory } : {}),
        });
        const sources = showSources && Array.isArray(result.sources) ? result.sources : [];
        const followUpActions = Array.isArray(result.followUpActions)
          ? result.followUpActions
          : [];
        const followUpReporting = summarizeKangurAiTutorFollowUpActions(followUpActions);
        const coachingFrame =
          kangurAiTutorCoachingFrameSchema.safeParse(result.coachingFrame).data ?? null;
        const knowledgeGraph =
          kangurAiTutorKnowledgeGraphSummarySchema.safeParse(result.knowledgeGraph).data ?? null;
        const websiteHelpTarget =
          kangurAiTutorWebsiteHelpTargetSchema.safeParse(result.websiteHelpTarget).data ?? null;
        const answerResolutionMode =
          kangurAiTutorAnswerResolutionModeSchema.safeParse(result.answerResolutionMode).data ??
          null;
        const artifacts = normalizeMessageArtifacts(result.artifacts);
        trackKangurClientEvent('kangur_ai_tutor_message_succeeded', {
          ...telemetryContext,
          sourcesCount: sources.length,
          hasSources: sources.length > 0,
          followUpActionCount: followUpActions.length,
          primaryFollowUpActionId: followUpReporting.primaryFollowUpActionId,
          primaryFollowUpPage: followUpReporting.primaryFollowUpPage,
          hasBridgeFollowUpAction: followUpReporting.hasBridgeFollowUpAction,
          bridgeFollowUpActionCount: followUpReporting.bridgeFollowUpActionCount,
          bridgeFollowUpDirection: followUpReporting.bridgeFollowUpDirection,
          coachingMode: coachingFrame?.mode ?? null,
          knowledgeGraphApplied: knowledgeGraph?.applied ?? false,
          knowledgeGraphQueryMode: knowledgeGraph?.queryMode ?? null,
          knowledgeGraphRecallStrategy: knowledgeGraph?.recallStrategy ?? null,
          knowledgeGraphLexicalHitCount: knowledgeGraph?.lexicalHitCount ?? 0,
          knowledgeGraphVectorHitCount: knowledgeGraph?.vectorHitCount ?? 0,
          knowledgeGraphVectorRecallAttempted: knowledgeGraph?.vectorRecallAttempted ?? false,
          websiteHelpGraphApplied: knowledgeGraph?.websiteHelpApplied ?? false,
          websiteHelpGraphTargetNodeId: knowledgeGraph?.websiteHelpTargetNodeId ?? null,
          answerResolutionMode,
          hasDrawingArtifact: Boolean(artifacts?.length),
        });
        if (resolvedPromptMode === 'hint') {
          pendingHintRecoveryBySessionKeyRef.current[activeSessionKey] = buildHintRecoveryCandidate({
            context: nextContext,
            coachingFrame,
          });
        } else {
          delete pendingHintRecoveryBySessionKeyRef.current[activeSessionKey];
        }
        delete recentHintRecoverySignalBySessionKeyRef.current[activeSessionKey];
        if (result.tutorMood && activeLearnerId) {
          setLearnerMoodById((current) => ({
            ...current,
            [activeLearnerId]: mergeLearnerTutorMood(current[activeLearnerId], result.tutorMood),
          }));
        }
        if (allowLearnerMemory && activeLearnerMemoryKey) {
          updateLearnerMemory(activeLearnerMemoryKey, (currentMemory) =>
            buildNextLearnerMemory({
              current: currentMemory,
              context: nextContext,
              userMessage: userMessage.content,
              assistantMessage: result.message,
              followUpActions,
              coachingFrame,
            })
          );
        }
        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          messages: [
            ...outgoingMessages,
            {
              role: 'assistant',
              content: result.message,
              ...(artifacts ? { artifacts } : {}),
              sources,
              followUpActions,
              ...(coachingFrame ? { coachingFrame } : {}),
              ...(websiteHelpTarget ? { websiteHelpTarget } : {}),
              ...(answerResolutionMode ? { answerResolutionMode } : {}),
            },
          ],
          suggestedMoodId: result.suggestedMoodId ?? null,
          usageSummary: result.usage ?? currentState.usageSummary,
        }));
      } catch (error) {
        void ErrorSystem.captureException(error);
        trackKangurClientEvent('kangur_ai_tutor_message_failed', telemetryContext);
        logKangurClientError(error, {
          source: 'KangurAiTutorContext',
          action: 'sendMessage',
          ...telemetryContext,
        });
        const usageFromError =
          error instanceof ApiError && error.payload && typeof error.payload === 'object'
            ? kangurAiTutorUsageSummarySchema
              .safeParse((error.payload as Record<string, unknown>)['details'])
              .data ?? null
            : null;
        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          suggestedMoodId: null,
          usageSummary: usageFromError ?? currentState.usageSummary,
          messages: [
            ...outgoingMessages,
            {
              role: 'assistant',
              content:
                error instanceof ApiError && error.message.trim()
                  ? error.message
                  : tutorContent.common.sendFailureFallback,
            },
          ],
        }));
      } finally {
        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          isLoading: false,
        }));
      }
    },
    [
      activeLearnerId,
      activeLearnerMemoryKey,
      activeLearnerMemory,
      activeSessionContext,
      activeSessionKey,
      allowLearnerMemory,
      allowSelectedTextSupport,
      enabled,
      highlightedText,
      messages,
      pageContextRegistry,
      showSources,
      updateLearnerMemory,
      updateSessionState,
    ]
  );

  const setRegistration = useCallback((registration: KangurAiTutorSessionRegistrationSetter) => {
    setActiveRegistration((current) => {
      const next = typeof registration === 'function' ? registration(current) : registration;
      return areSessionRegistrationsEqual(current, next) ? current : next;
    });
  }, []);
  const sessionRegistryValue = useMemo<KangurAiTutorSessionRegistryContextValue>(
    () => ({ setRegistration }),
    [setRegistration]
  );
  const requestSelectionExplain = useCallback((selectedText: string): void => {
    const trimmed = selectedText.trim();
    if (!trimmed) {
      return;
    }

    selectionExplainRequestIdRef.current += 1;
    setSelectionExplainRequest({
      id: selectionExplainRequestIdRef.current,
      selectedText: trimmed,
    });
  }, []);

  const value = useMemo<KangurAiTutorContextValue>(
    () => ({
      enabled,
      appSettings,
      tutorSettings,
      tutorPersona,
      tutorName,
      tutorMoodId,
      tutorBehaviorMoodId: tutorBehaviorMood.currentMoodId,
      tutorBehaviorMoodLabel: tutorBehaviorMoodCopy.label,
      tutorBehaviorMoodDescription: tutorBehaviorMoodCopy.description,
      tutorAvatarSvg,
      tutorAvatarImageUrl,
      sessionContext: activeSessionContext,
      learnerMemory: activeLearnerMemory,
      isOpen,
      messages,
      isLoading,
      isUsageLoading,
      highlightedText,
      usageSummary,
      openChat,
      closeChat,
      sendMessage,
      recordFollowUpCompletion,
      setHighlightedText,
      requestSelectionExplain,
      selectionExplainRequest,
    }),
    [
      activeSessionContext,
      appSettings,
      closeChat,
      enabled,
      highlightedText,
      isLoading,
      isOpen,
      isUsageLoading,
      messages,
      openChat,
      recordFollowUpCompletion,
      requestSelectionExplain,
      selectionExplainRequest,
      sendMessage,
      setHighlightedText,
      tutorAvatarImageUrl,
      tutorAvatarSvg,
      tutorBehaviorMood.currentMoodId,
      tutorBehaviorMoodCopy.description,
      tutorBehaviorMoodCopy.label,
      tutorMoodId,
      tutorName,
      tutorPersona,
      tutorSettings,
      activeLearnerMemory,
      usageSummary,
    ]
  );

  return {
    value,
    sessionRegistryValue,
  };
};
