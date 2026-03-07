'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import {
  DEFAULT_AGENT_PERSONA_MOOD_ID,
  type AgentPersona,
  type AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import {
  resolveAgentPersonaMood,
} from '@/features/ai/agentcreator/utils/personas';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import {
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAvailability,
  type KangurAiTutorLearnerSettings,
} from '@/features/kangur/settings-ai-tutor';
import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type {
  KangurAiTutorChatResponse,
  KangurAiTutorConversationContext,
  KangurAiTutorFocusKind,
  KangurAiTutorFollowUpAction,
  KangurAiTutorInteractionIntent,
  KangurAiTutorPromptMode,
  KangurAiTutorUsageSummary,
  KangurAiTutorUsageResponse,
} from '@/shared/contracts/kangur-ai-tutor';
import { kangurAiTutorUsageSummarySchema } from '@/shared/contracts/kangur-ai-tutor';
import { ApiError, api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  sources?: AgentTeachingChatSource[];
  followUpActions?: KangurAiTutorFollowUpAction[];
};

type KangurAiTutorSessionState = {
  messages: ChatMessage[];
  isLoading: boolean;
  isUsageLoading: boolean;
  highlightedText: string | null;
  usageSummary: KangurAiTutorUsageSummary | null;
};

type KangurAiTutorSessionRegistration = {
  token: symbol;
  learnerId: string | null;
  sessionContext: KangurAiTutorConversationContext | null;
  sessionKey: string;
};

type KangurAiTutorSessionRegistrationSetter =
  | KangurAiTutorSessionRegistration
  | null
  | ((
      current: KangurAiTutorSessionRegistration | null
    ) => KangurAiTutorSessionRegistration | null);

type KangurAiTutorContextValue = {
  enabled: boolean;
  tutorSettings: KangurAiTutorLearnerSettings | null;
  tutorPersona: AgentPersona | null;
  tutorName: string;
  tutorMoodId: AgentPersonaMoodId;
  tutorAvatarSvg: string | null;
  sessionContext: KangurAiTutorConversationContext | null;
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  isUsageLoading: boolean;
  highlightedText: string | null;
  usageSummary: KangurAiTutorUsageSummary | null;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (
    text: string,
    options?: {
      promptMode?: KangurAiTutorPromptMode;
      selectedText?: string | null;
      focusKind?: KangurAiTutorFocusKind;
      focusId?: string | null;
      focusLabel?: string | null;
      assignmentId?: string | null;
      interactionIntent?: KangurAiTutorInteractionIntent;
    }
  ) => Promise<void>;
  setHighlightedText: (text: string | null) => void;
};

const KangurAiTutorContext = createContext<KangurAiTutorContextValue | null>(null);
const KangurAiTutorSessionRegistryContext = createContext<{
  setRegistration: (registration: KangurAiTutorSessionRegistrationSetter) => void;
    } | null>(null);

type Props = {
  learnerId?: string | null;
  sessionContext?: KangurAiTutorConversationContext | null;
  children: ReactNode;
};

type PersistedKangurAiTutorRuntimeState = {
  isOpen: boolean;
  sessionStates: Record<string, KangurAiTutorSessionState>;
};

const KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY = 'kangur-ai-tutor-runtime-v1';

const createEmptySessionState = (): KangurAiTutorSessionState => ({
  messages: [],
  isLoading: false,
  isUsageLoading: false,
  highlightedText: null,
  usageSummary: null,
});

const createEmptyPersistedRuntimeState = (): PersistedKangurAiTutorRuntimeState => ({
  isOpen: false,
  sessionStates: {},
});

const normalizePersistedMessage = (value: unknown): ChatMessage | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const role = input['role'];
  const content = input['content'];
  if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
    return null;
  }

  return {
    role,
    content,
    ...(Array.isArray(input['sources']) ? { sources: input['sources'] as AgentTeachingChatSource[] } : {}),
    ...(Array.isArray(input['followUpActions'])
      ? { followUpActions: input['followUpActions'] as KangurAiTutorFollowUpAction[] }
      : {}),
  };
};

const normalizePersistedSessionState = (value: unknown): KangurAiTutorSessionState | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const messages = Array.isArray(input['messages'])
    ? input['messages']
      .map(normalizePersistedMessage)
      .filter((message): message is ChatMessage => message !== null)
    : [];
  const usageSummary = kangurAiTutorUsageSummarySchema.safeParse(input['usageSummary']).data ?? null;

  return {
    messages,
    isLoading: false,
    isUsageLoading: false,
    highlightedText: typeof input['highlightedText'] === 'string' ? input['highlightedText'] : null,
    usageSummary,
  };
};

const loadPersistedRuntimeState = (): PersistedKangurAiTutorRuntimeState => {
  if (typeof window === 'undefined') {
    return createEmptyPersistedRuntimeState();
  }

  try {
    const raw = window.sessionStorage.getItem(KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY);
    if (!raw) {
      return createEmptyPersistedRuntimeState();
    }

    const parsed = JSON.parse(raw) as Partial<PersistedKangurAiTutorRuntimeState> | null;
    if (!parsed || typeof parsed !== 'object') {
      return createEmptyPersistedRuntimeState();
    }

    return {
      isOpen: parsed.isOpen === true,
      sessionStates:
        parsed.sessionStates && typeof parsed.sessionStates === 'object'
          ? Object.entries(parsed.sessionStates).reduce<Record<string, KangurAiTutorSessionState>>(
            (acc, [sessionKey, sessionState]) => {
              const normalized = normalizePersistedSessionState(sessionState);
              if (!normalized) {
                return acc;
              }

              acc[sessionKey] = normalized;
              return acc;
            },
            {}
          )
          : {},
    };
  } catch {
    return createEmptyPersistedRuntimeState();
  }
};

const persistRuntimeState = (state: PersistedKangurAiTutorRuntimeState): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures so the tutor still works when storage is unavailable.
  }
};

const buildSessionKey = (
  learnerId: string | null,
  sessionContext: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (!sessionContext) {
    return null;
  }

  return `${learnerId ?? 'guest'}:${sessionContext.surface}:${sessionContext.contentId ?? 'none'}`;
};

const areConversationContextsEqual = (
  left: KangurAiTutorConversationContext | null,
  right: KangurAiTutorConversationContext | null
): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  return (
    left.surface === right.surface &&
    left.contentId === right.contentId &&
    left.title === right.title &&
    left.description === right.description &&
    left.masterySummary === right.masterySummary &&
    left.assignmentSummary === right.assignmentSummary &&
    left.selectedText === right.selectedText &&
    left.currentQuestion === right.currentQuestion &&
    left.questionProgressLabel === right.questionProgressLabel &&
    left.answerRevealed === right.answerRevealed &&
    left.promptMode === right.promptMode &&
    left.focusKind === right.focusKind &&
    left.focusId === right.focusId &&
    left.focusLabel === right.focusLabel &&
    left.assignmentId === right.assignmentId &&
    left.interactionIntent === right.interactionIntent
  );
};

const areSessionRegistrationsEqual = (
  left: KangurAiTutorSessionRegistration | null,
  right: KangurAiTutorSessionRegistration | null
): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  return (
    left.token === right.token &&
    left.learnerId === right.learnerId &&
    left.sessionKey === right.sessionKey &&
    areConversationContextsEqual(left.sessionContext, right.sessionContext)
  );
};

function KangurAiTutorSessionSyncInner({
  learnerId,
  sessionContext,
}: {
  learnerId: string | null;
  sessionContext?: KangurAiTutorConversationContext | null;
}): JSX.Element | null {
  const registry = useContext(KangurAiTutorSessionRegistryContext);
  if (!registry) {
    return null;
  }
  const tokenRef = useRef(Symbol('kangur-ai-tutor-session'));
  const setRegistration = registry.setRegistration;
  const normalizedSessionContext = useMemo<KangurAiTutorConversationContext | null>(() => {
    if (!sessionContext) {
      return null;
    }

    return {
      surface: sessionContext.surface,
      contentId: sessionContext.contentId,
      title: sessionContext.title,
      description: sessionContext.description,
      masterySummary: sessionContext.masterySummary,
      assignmentSummary: sessionContext.assignmentSummary,
      selectedText: sessionContext.selectedText,
      currentQuestion: sessionContext.currentQuestion,
      questionProgressLabel: sessionContext.questionProgressLabel,
      answerRevealed: sessionContext.answerRevealed,
      promptMode: sessionContext.promptMode,
      focusKind: sessionContext.focusKind,
      focusId: sessionContext.focusId,
      focusLabel: sessionContext.focusLabel,
      assignmentId: sessionContext.assignmentId,
      interactionIntent: sessionContext.interactionIntent,
    };
  }, [
    sessionContext?.answerRevealed,
    sessionContext?.assignmentId,
    sessionContext?.assignmentSummary,
    sessionContext?.contentId,
    sessionContext?.currentQuestion,
    sessionContext?.description,
    sessionContext?.focusId,
    sessionContext?.focusKind,
    sessionContext?.focusLabel,
    sessionContext?.interactionIntent,
    sessionContext?.masterySummary,
    sessionContext?.promptMode,
    sessionContext?.questionProgressLabel,
    sessionContext?.selectedText,
    sessionContext?.surface,
    sessionContext?.title,
  ]);
  const sessionKey = useMemo(
    () => buildSessionKey(learnerId, normalizedSessionContext),
    [learnerId, normalizedSessionContext]
  );

  useEffect(() => {
    const registration =
      sessionKey === null
        ? null
        : {
          token: tokenRef.current,
          learnerId,
          sessionContext: normalizedSessionContext,
          sessionKey,
        };

    setRegistration(registration);

    return () => {
      setRegistration((current) =>
        current?.token === tokenRef.current ? null : current
      );
    };
  }, [learnerId, normalizedSessionContext, sessionKey, setRegistration]);

  return null;
}

export function KangurAiTutorProvider({
  learnerId = undefined,
  sessionContext = undefined,
  children,
}: Props): JSX.Element {
  const settingsStore = useSettingsStore();
  const initialRuntimeStateRef = useRef<PersistedKangurAiTutorRuntimeState | null>(null);
  if (initialRuntimeStateRef.current === null) {
    initialRuntimeStateRef.current = loadPersistedRuntimeState();
  }
  const [isOpen, setIsOpen] = useState(initialRuntimeStateRef.current.isOpen);
  const [activeRegistration, setActiveRegistration] =
    useState<KangurAiTutorSessionRegistration | null>(null);
  const [sessionStates, setSessionStates] = useState<Record<string, KangurAiTutorSessionState>>(
    initialRuntimeStateRef.current.sessionStates
  );

  const activeLearnerId = activeRegistration?.learnerId ?? null;
  const activeSessionContext = activeRegistration?.sessionContext ?? null;
  const activeSessionKey = activeRegistration?.sessionKey ?? null;

  const rawSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore_ = useMemo(
    () => parseKangurAiTutorSettings(rawSettings),
    [rawSettings]
  );
  const tutorSettings = useMemo(
    () =>
      activeLearnerId
        ? getKangurAiTutorSettingsForLearner(settingsStore_, activeLearnerId)
        : null,
    [settingsStore_, activeLearnerId]
  );
  const availability = useMemo(
    () => resolveKangurAiTutorAvailability(tutorSettings, activeSessionContext),
    [activeSessionContext, tutorSettings]
  );
  const enabled = availability.allowed;
  const allowSelectedTextSupport = tutorSettings?.allowSelectedTextSupport ?? true;
  const showSources = tutorSettings?.showSources ?? true;

  const activeSessionState = activeSessionKey
    ? (sessionStates[activeSessionKey] ?? createEmptySessionState())
    : createEmptySessionState();
  const {
    messages,
    isLoading,
    isUsageLoading,
    highlightedText,
    usageSummary,
  } = activeSessionState;

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

  const { data: agentPersonas = [] } = useAgentPersonas();
  const tutorPersona = useMemo<AgentPersona | null>(() => {
    const personaId = tutorSettings?.agentPersonaId;
    if (!personaId) return null;
    return agentPersonas.find((p) => p.id === personaId) ?? null;
  }, [tutorSettings?.agentPersonaId, agentPersonas]);
  const tutorName = tutorPersona?.name ?? 'Pomocnik';
  const requestedTutorMoodId = useMemo<AgentPersonaMoodId>(() => {
    if (isLoading) {
      return 'thinking';
    }

    if (messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      return 'encouraging';
    }

    return DEFAULT_AGENT_PERSONA_MOOD_ID;
  }, [isLoading, messages]);
  const resolvedTutorMood = useMemo(
    () => resolveAgentPersonaMood(tutorPersona, requestedTutorMoodId),
    [requestedTutorMoodId, tutorPersona]
  );
  const tutorMoodId = resolvedTutorMood.id;
  const tutorAvatarSvg = resolvedTutorMood.svgContent.trim() || null;

  const previousSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    persistRuntimeState({
      isOpen,
      sessionStates,
    });
  }, [isOpen, sessionStates]);

  useEffect(() => {
    const previousSessionKey = previousSessionKeyRef.current;
    if (
      previousSessionKey &&
      activeSessionKey &&
      previousSessionKey !== activeSessionKey
    ) {
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
    if (!activeSessionKey) {
      return;
    }

    if (!enabled) {
      setIsOpen(false);
      updateSessionState(activeSessionKey, (currentState) => ({
        ...currentState,
        isLoading: false,
        isUsageLoading: false,
      }));
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
        if (cancelled) return;
        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          usageSummary: result.usage,
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        logKangurClientError(error, {
          source: 'KangurAiTutorContext',
          action: 'loadUsage',
          surface: activeSessionContext?.surface ?? null,
          contentId: activeSessionContext?.contentId ?? null,
        });
      })
      .finally(() => {
        if (cancelled) return;
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

  const openChat = useCallback(
    () => setIsOpen(true),
    []
  );
  const closeChat = useCallback(
    () => setIsOpen(false),
    []
  );
  const setHighlightedText = useCallback(
    (text: string | null) =>
      updateSessionState(activeSessionKey, (currentState) => ({
        ...currentState,
        highlightedText: text,
      })),
    [activeSessionKey, updateSessionState]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      options?: {
        promptMode?: KangurAiTutorPromptMode;
        selectedText?: string | null;
        focusKind?: KangurAiTutorFocusKind;
        focusId?: string | null;
        focusLabel?: string | null;
        assignmentId?: string | null;
        interactionIntent?: KangurAiTutorInteractionIntent;
      }
    ): Promise<void> => {
      if (!text.trim() || !enabled || !activeSessionContext || !activeSessionKey) return;

      const userMessage: ChatMessage = { role: 'user', content: text.trim() };
      const outgoingMessages: ChatMessage[] = [...messages, userMessage];
      const requestedPromptMode = options?.promptMode ?? 'chat';
      const resolvedPromptMode =
        requestedPromptMode === 'selected_text' && !allowSelectedTextSupport
          ? 'chat'
          : requestedPromptMode;
      const resolvedSelectedText = allowSelectedTextSupport
        ? (options?.selectedText ?? highlightedText)?.trim() || null
        : null;
      const telemetryContext = {
        surface: activeSessionContext?.surface ?? null,
        contentId: activeSessionContext?.contentId ?? null,
        promptMode: resolvedPromptMode,
        hasSelectedText: Boolean(resolvedSelectedText),
        focusKind: options?.focusKind ?? null,
        interactionIntent: options?.interactionIntent ?? null,
        messageCount: outgoingMessages.length,
      };
      updateSessionState(activeSessionKey, (currentState) => ({
        ...currentState,
        messages: outgoingMessages,
        isLoading: true,
      }));
      trackKangurClientEvent('kangur_ai_tutor_message_sent', telemetryContext);

      try {
        const nextContext = {
          ...activeSessionContext,
          promptMode: resolvedPromptMode,
          ...(resolvedSelectedText ? { selectedText: resolvedSelectedText } : {}),
          ...(options?.focusKind ? { focusKind: options.focusKind } : {}),
          ...(options?.focusId ? { focusId: options.focusId } : {}),
          ...(options?.focusLabel ? { focusLabel: options.focusLabel } : {}),
          ...(options?.assignmentId ? { assignmentId: options.assignmentId } : {}),
          ...(options?.interactionIntent ? { interactionIntent: options.interactionIntent } : {}),
        };
        const result = await api.post<KangurAiTutorChatResponse>('/api/kangur/ai-tutor/chat', {
          messages: outgoingMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          context: nextContext,
        });
        const sources = showSources && Array.isArray(result.sources) ? result.sources : [];
        const followUpActions = Array.isArray(result.followUpActions)
          ? result.followUpActions
          : [];
        trackKangurClientEvent('kangur_ai_tutor_message_succeeded', {
          ...telemetryContext,
          sourcesCount: sources.length,
          hasSources: sources.length > 0,
          followUpActionCount: followUpActions.length,
        });
        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          messages: [
            ...outgoingMessages,
            {
              role: 'assistant',
              content: result.message,
              sources,
              followUpActions,
            },
          ],
          usageSummary: result.usage ?? currentState.usageSummary,
        }));
      } catch (error) {
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
          usageSummary: usageFromError ?? currentState.usageSummary,
          messages: [
            ...outgoingMessages,
            {
              role: 'assistant',
              content:
                error instanceof ApiError && error.message.trim()
                  ? error.message
                  : 'Przepraszam, coś poszło nie tak. Spróbuj ponownie.',
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
      activeSessionContext,
      activeSessionKey,
      allowSelectedTextSupport,
      enabled,
      highlightedText,
      messages,
      showSources,
      updateSessionState,
    ]
  );

  const setRegistration = useCallback(
    (registration: KangurAiTutorSessionRegistrationSetter) => {
      setActiveRegistration((current) => {
        const next = typeof registration === 'function' ? registration(current) : registration;
        return areSessionRegistrationsEqual(current, next) ? current : next;
      });
    },
    []
  );
  const sessionRegistryValue = useMemo(
    () => ({ setRegistration }),
    [setRegistration]
  );

  const value = useMemo<KangurAiTutorContextValue>(
    () => ({
      enabled,
      tutorSettings,
      tutorPersona,
      tutorName,
      tutorMoodId,
      tutorAvatarSvg,
      sessionContext: activeSessionContext,
      isOpen,
      messages,
      isLoading,
      isUsageLoading,
      highlightedText,
      usageSummary,
      openChat,
      closeChat,
      sendMessage,
      setHighlightedText,
    }),
    [
      activeSessionContext,
      enabled,
      tutorSettings,
      tutorPersona,
      tutorName,
      tutorMoodId,
      tutorAvatarSvg,
      isOpen,
      messages,
      isLoading,
      isUsageLoading,
      highlightedText,
      usageSummary,
      openChat,
      closeChat,
      sendMessage,
    ]
  );

  return (
    <KangurAiTutorSessionRegistryContext.Provider value={sessionRegistryValue}>
      <KangurAiTutorContext.Provider value={value}>
        {learnerId !== undefined || sessionContext !== undefined ? (
          <KangurAiTutorSessionSyncInner
            learnerId={learnerId ?? null}
            sessionContext={sessionContext ?? null}
          />
        ) : null}
        {children}
      </KangurAiTutorContext.Provider>
    </KangurAiTutorSessionRegistryContext.Provider>
  );
}

export function KangurAiTutorSessionSync({
  learnerId,
  sessionContext,
}: {
  learnerId: string | null;
  sessionContext?: KangurAiTutorConversationContext | null;
}): JSX.Element | null {
  return (
    <KangurAiTutorSessionSyncInner
      learnerId={learnerId}
      sessionContext={sessionContext ?? null}
    />
  );
}

export function useKangurAiTutor(): KangurAiTutorContextValue {
  const ctx = useContext(KangurAiTutorContext);
  if (!ctx) {
    throw new Error('useKangurAiTutor must be used within a KangurAiTutorProvider');
  }
  return ctx;
}

export function useOptionalKangurAiTutor(): KangurAiTutorContextValue | null {
  return useContext(KangurAiTutorContext);
}
