'use client';

import React from 'react';

import {
  ContextRegistryPageProvider,
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/features/ai/ai-context-registry/context/page-context';
import type {
  AgentTeachingAgentRecord,
  AgentTeachingChatSource,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import type { SimpleChatMessage } from '@/shared/contracts/chatbot';
import { AdminAgentTeachingBreadcrumbs } from '@/shared/ui/admin.public';
import { useToast } from '@/shared/ui/primitives.public';
import { PageLayout, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { useAgentTeachingQueriesContext } from '../context/AgentTeachingContext';
import {
  AGENT_TEACHING_CHAT_CONTEXT_ROOT_IDS,
  buildAgentTeachingChatContextBundle,
} from '../context-registry/chat-page';
import { useTeachingChatMutation } from '../hooks/useAgentTeachingQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { AgentSidebar, ChatPane } from '../components/AgentTeachingChatComponents';

function AgentTeachingChatPageContent(): React.JSX.Element {
  const { toast } = useToast();
  const {
    agents,
    collections,
    chatModelId,
    embeddingModelId,
    isLoading: loadingAgents,
  } = useAgentTeachingQueriesContext();
  const chatMutation = useTeachingChatMutation();
  const contextRegistry = useOptionalContextRegistryPageEnvelope();

  const [selectedAgentId, setSelectedAgentId] = React.useState<string>('');
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<SimpleChatMessage[]>([]);
  const [lastSources, setLastSources] = React.useState<AgentTeachingChatSource[]>([]);

  const sending = chatMutation.isPending;

  const selectedAgent = React.useMemo(
    () =>
      selectedAgentId.length > 0
        ? (agents.find((a: AgentTeachingAgentRecord) => a.id === selectedAgentId) ?? null)
        : null,
    [agents, selectedAgentId]
  );

  const registrySource = React.useMemo(
    () => ({
      label: 'Agent Teaching Chat',
      resolved: buildAgentTeachingChatContextBundle({
        agents,
        collections,
        chatModelId,
        embeddingModelId,
        selectedAgent,
        messages,
        lastSources,
      }),
    }),
    [agents, chatModelId, collections, embeddingModelId, lastSources, messages, selectedAgent]
  );

  useRegisterContextRegistryPageSource('agent-teaching-chat-state', registrySource);

  const resolveCollectionName = (id: string): string => {
    const found = collections.find((c: AgentTeachingEmbeddingCollectionRecord) => c.id === id);
    return found?.name ?? id;
  };

  const handleSend = async (): Promise<void> => {
    if (selectedAgentId.length === 0) {
      toast('Select a learner agent first.', { variant: 'error' });
      return;
    }
    const content = input.trim();
    if (content.length === 0) return;

    const nextMessages: SimpleChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLastSources([]);

    try {
      const data = await chatMutation.mutateAsync({
        agentId: selectedAgentId,
        messages: nextMessages,
        contextRegistry,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      setLastSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Chat failed.', { variant: 'error' });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: failed to generate response.' },
      ]);
    }
  };

  return (
    <PageLayout
      title='Learner Chat'
      eyebrow={<AdminAgentTeachingBreadcrumbs current='Chat' className='mb-2' />}
      description='Chat with a learner agent. The response is generated with retrieved embedded sources.'
    >
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
        <AgentSidebar
          agents={agents}
          loadingAgents={loadingAgents}
          selectedAgentId={selectedAgentId}
          setSelectedAgentId={setSelectedAgentId}
          resolveCollectionName={resolveCollectionName}
          setMessages={setMessages}
          setLastSources={setLastSources}
        />

        <ChatPane
          selectedAgent={selectedAgent}
          messages={messages}
          setMessages={setMessages}
          lastSources={lastSources}
          setLastSources={setLastSources}
          sending={sending}
          input={input}
          setInput={setInput}
          handleSend={() => {
            void handleSend();
          }}
          resolveCollectionName={resolveCollectionName}
        />
      </div>
    </PageLayout>
  );
}

export function AgentTeachingChatPage(): React.JSX.Element {
  return (
    <ContextRegistryPageProvider
      pageId='agentcreator:teaching-chat'
      title='Agent Creator Teaching Chat'
      rootNodeIds={[...AGENT_TEACHING_CHAT_CONTEXT_ROOT_IDS]}
    >
      <AgentTeachingChatPageContent />
    </ContextRegistryPageProvider>
  );
}
