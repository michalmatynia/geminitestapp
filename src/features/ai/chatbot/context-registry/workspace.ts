import { PAGE_CONTEXT_ENGINE_VERSION } from '@/features/ai/ai-context-registry/context/page-context-shared';
import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type {
  ChatMessageDto as ChatMessage,
  ChatbotSessionListItem,
} from '@/shared/contracts/chatbot';

export const CHATBOT_CONTEXT_ROOT_IDS = [
  'page:admin-chatbot',
  'component:chatbot-chat-interface',
  'component:chatbot-session-sidebar',
  'component:chatbot-settings-panel',
  'component:chatbot-debug-panel',
  'action:chatbot-chat',
  'collection:chatbot-sessions',
] as const;

export const CHATBOT_CONTEXT_RUNTIME_REF = {
  id: 'runtime:chatbot:workspace',
  kind: 'runtime_document' as const,
  providerId: 'chatbot-page-local',
  entityType: 'chatbot_workspace_state',
};

type BuildChatbotWorkspaceContextBundleInput = {
  activeTab: string;
  messages: ChatMessage[];
  sessions: ChatbotSessionListItem[];
  currentSessionId: string | null;
  personaId: string | null;
  webSearchEnabled: boolean;
  useGlobalContext: boolean;
  useLocalContext: boolean;
  globalContext: string;
  localContext: string;
  localContextMode: 'override' | 'append';
  latestAgentRunId: string | null;
};

const trimText = (value: string, maxLength: number): string => {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

const summarizeSession = (session: ChatbotSessionListItem): Record<string, unknown> => ({
  id: session.id,
  title: session.title ?? null,
  personaId: session.personaId ?? null,
  lastMessageAt: session.lastMessageAt ?? null,
  messageCount: session.messageCount ?? null,
  isActive: session.isActive ?? true,
});

const summarizeMessage = (message: ChatMessage): Record<string, unknown> => ({
  id: message.id,
  role: message.role,
  content: trimText(message.content, 500),
  timestamp: message.timestamp,
  imageCount: message.images?.length ?? 0,
});

const buildOptionalContextSections = (
  input: Pick<
    BuildChatbotWorkspaceContextBundleInput,
    'globalContext' | 'localContext' | 'useGlobalContext' | 'useLocalContext' | 'localContextMode'
  >
): ContextRuntimeDocumentSection[] => {
  const sections: ContextRuntimeDocumentSection[] = [];

  if (input.useGlobalContext && input.globalContext.trim()) {
    sections.push({
      kind: 'text',
      title: 'Global context',
      summary: 'Operator-authored global context enabled for the current chatbot workspace.',
      text: trimText(input.globalContext, 1600),
    });
  }

  if (input.useLocalContext && input.localContext.trim()) {
    sections.push({
      kind: 'text',
      title: 'Local context',
      summary: `Operator-authored local context using ${input.localContextMode} mode.`,
      text: trimText(input.localContext, 1600),
    });
  }

  return sections;
};

export const buildChatbotWorkspaceRuntimeDocument = (
  input: BuildChatbotWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const activeSession =
    input.sessions.find((session) => session.id === input.currentSessionId) ?? null;
  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Workspace snapshot',
      items: [
        {
          activeTab: input.activeTab,
          currentSessionId: input.currentSessionId,
          currentSessionTitle: activeSession?.title ?? null,
          sessionCount: input.sessions.length,
          messageCount: input.messages.length,
          personaId: input.personaId,
          webSearchEnabled: input.webSearchEnabled,
          useGlobalContext: input.useGlobalContext,
          useLocalContext: input.useLocalContext,
          localContextMode: input.localContextMode,
          latestAgentRunId: input.latestAgentRunId,
        },
      ],
    },
    {
      kind: 'items',
      title: 'Sessions',
      summary: 'Recent chatbot sessions visible in the sidebar.',
      items: input.sessions.slice(0, 12).map(summarizeSession),
    },
  ];

  if (input.messages.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Recent messages',
      summary: 'Latest messages visible in the active chatbot conversation.',
      items: input.messages.slice(-8).map(summarizeMessage),
    });
  }

  sections.push(...buildOptionalContextSections(input));

  return {
    id: CHATBOT_CONTEXT_RUNTIME_REF.id,
    kind: 'runtime_document',
    entityType: CHATBOT_CONTEXT_RUNTIME_REF.entityType,
    title: activeSession?.title
      ? `Chatbot workspace state for ${activeSession.title}`
      : 'Admin chatbot workspace state',
    summary:
      'Live operator context for the admin chatbot page, including session state, visible ' +
      'conversation, and operator-authored global or local context.',
    status: null,
    tags: ['chatbot', 'admin', 'chat', 'live-state'],
    relatedNodeIds: [...CHATBOT_CONTEXT_ROOT_IDS],
    facts: {
      activeTab: input.activeTab,
      currentSessionId: input.currentSessionId,
      currentSessionTitle: activeSession?.title ?? null,
      sessionCount: input.sessions.length,
      messageCount: input.messages.length,
      personaId: input.personaId,
      webSearchEnabled: input.webSearchEnabled,
      useGlobalContext: input.useGlobalContext,
      useLocalContext: input.useLocalContext,
      localContextMode: input.localContextMode,
      hasGlobalContext: Boolean(input.globalContext.trim()),
      hasLocalContext: Boolean(input.localContext.trim()),
      latestAgentRunId: input.latestAgentRunId,
    },
    sections,
    provenance: {
      source: 'chatbot.admin.client-state',
      persisted: false,
    },
  };
};

export const buildChatbotWorkspaceContextBundle = (
  input: BuildChatbotWorkspaceContextBundleInput
): ContextRegistryResolutionBundle => ({
  refs: [CHATBOT_CONTEXT_RUNTIME_REF],
  nodes: [],
  documents: [buildChatbotWorkspaceRuntimeDocument(input)],
  truncated: false,
  engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
});
