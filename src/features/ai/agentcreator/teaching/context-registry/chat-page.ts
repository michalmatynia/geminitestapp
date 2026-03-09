import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type {
  AgentTeachingAgentRecord,
  AgentTeachingChatSource,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import type { SimpleChatMessage } from '@/shared/contracts/chatbot';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/features/ai/ai-context-registry/context/page-context-shared';

export const AGENT_TEACHING_CHAT_CONTEXT_ROOT_IDS = [
  'page:agent-teaching-chat',
  'component:agent-teaching-chat-panel',
  'action:agent-teaching-chat',
  'collection:agent-teaching-agents',
  'collection:agent-teaching-embedding-collections',
] as const;

export const AGENT_TEACHING_CHAT_RUNTIME_REF = {
  id: 'runtime:agent-teaching-chat:workspace',
  kind: 'runtime_document' as const,
  providerId: 'agent-teaching-chat-local',
  entityType: 'agent_teaching_chat_state',
};

type BuildAgentTeachingChatContextBundleInput = {
  agents: AgentTeachingAgentRecord[];
  collections: AgentTeachingEmbeddingCollectionRecord[];
  chatModelId: string;
  embeddingModelId: string;
  selectedAgent: AgentTeachingAgentRecord | null;
  messages: SimpleChatMessage[];
  lastSources: AgentTeachingChatSource[];
};

const summarizeAgent = (
  agent: AgentTeachingAgentRecord,
  collectionNamesById: Map<string, string>
): Record<string, unknown> => ({
  id: agent.id,
  name: agent.name,
  llmModel: agent.llmModel,
  embeddingModel: agent.embeddingModel,
  enabled: agent.enabled ?? true,
  collectionIds: agent.collectionIds,
  collectionNames: (agent.collectionIds ?? []).map((id) => collectionNamesById.get(id) ?? id),
  retrievalTopK: agent.retrievalTopK ?? agent.topK ?? null,
  retrievalMinScore: agent.retrievalMinScore ?? agent.scoreThreshold ?? null,
});

const summarizeSource = (
  source: AgentTeachingChatSource,
  collectionNamesById: Map<string, string>
): Record<string, unknown> => ({
  documentId: source.documentId,
  collectionId: source.collectionId,
  collectionName: collectionNamesById.get(source.collectionId) ?? source.collectionId,
  score: source.score,
  title: source.metadata?.title ?? null,
  sourceType: source.metadata?.source ?? null,
  textPreview: (source.text ?? '').trim().slice(0, 600),
});

export const buildAgentTeachingChatRuntimeDocument = (
  input: BuildAgentTeachingChatContextBundleInput
): ContextRuntimeDocument => {
  const collectionNamesById = new Map(
    input.collections.map((collection) => [collection.id, collection.name])
  );

  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Workspace snapshot',
      items: [
        {
          selectedAgentId: input.selectedAgent?.id ?? null,
          selectedAgentName: input.selectedAgent?.name ?? null,
          agentCount: input.agents.length,
          collectionCount: input.collections.length,
          messageCount: input.messages.length,
          lastRetrievedSourceCount: input.lastSources.length,
          configuredChatModelId: input.chatModelId || null,
          configuredEmbeddingModelId: input.embeddingModelId || null,
        },
      ],
    },
    {
      kind: 'items',
      title: 'Available agents',
      summary: 'Current learner agents visible in the teaching workspace.',
      items: input.agents.slice(0, 12).map((agent) => summarizeAgent(agent, collectionNamesById)),
    },
  ];

  if (input.selectedAgent) {
    sections.push({
      kind: 'facts',
      title: 'Selected agent',
      items: [summarizeAgent(input.selectedAgent, collectionNamesById)],
    });
  }

  if (input.messages.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Recent messages',
      summary: 'Latest chat messages on the page.',
      items: input.messages.slice(-8).map((message, index) => ({
        index: input.messages.length - Math.min(input.messages.length, 8) + index,
        role: message.role,
        content: message.content,
      })),
    });
  }

  if (input.lastSources.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Retrieved sources',
      summary: 'Latest knowledge-base sources shown in the teaching chat UI.',
      items: input.lastSources.slice(0, 8).map((source) => summarizeSource(source, collectionNamesById)),
    });
  }

  return {
    id: AGENT_TEACHING_CHAT_RUNTIME_REF.id,
    kind: 'runtime_document',
    entityType: AGENT_TEACHING_CHAT_RUNTIME_REF.entityType,
    title: input.selectedAgent
      ? `Agent teaching chat state for ${input.selectedAgent.name}`
      : 'Agent teaching chat workspace state',
    summary:
      'Live operator context for the Agent Creator teaching chat page, including selected agent, ' +
      'recent messages, and retrieved knowledge-base source previews.',
    status: null,
    tags: ['agent-creator', 'teaching', 'chat', 'live-state'],
    relatedNodeIds: [...AGENT_TEACHING_CHAT_CONTEXT_ROOT_IDS],
    facts: {
      selectedAgentId: input.selectedAgent?.id ?? null,
      selectedAgentName: input.selectedAgent?.name ?? null,
      agentCount: input.agents.length,
      collectionCount: input.collections.length,
      messageCount: input.messages.length,
      lastRetrievedSourceCount: input.lastSources.length,
      configuredChatModelId: input.chatModelId || null,
      configuredEmbeddingModelId: input.embeddingModelId || null,
    },
    sections,
    provenance: {
      source: 'agentcreator.teaching.chat.client-state',
      persisted: false,
    },
  };
};

export const buildAgentTeachingChatContextBundle = (
  input: BuildAgentTeachingChatContextBundleInput
): ContextRegistryResolutionBundle => ({
  refs: [AGENT_TEACHING_CHAT_RUNTIME_REF],
  nodes: [],
  documents: [buildAgentTeachingChatRuntimeDocument(input)],
  truncated: false,
  engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
});
