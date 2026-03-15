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
import {
  AdminAgentTeachingPageLayout,
  Button,
  Textarea,
  useToast,
  FormSection,
  FormField,
  LoadingState,
  EmptyState,
  Card,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useAgentTeachingQueriesContext } from '../context/AgentTeachingContext';
import {
  AGENT_TEACHING_CHAT_CONTEXT_ROOT_IDS,
  buildAgentTeachingChatContextBundle,
} from '../context-registry/chat-page';
import { useTeachingChatMutation } from '../hooks/useAgentTeachingQueries';

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

  const selectedAgent: AgentTeachingAgentRecord | null = selectedAgentId
    ? (agents.find((a: AgentTeachingAgentRecord) => a.id === selectedAgentId) ?? null)
    : null;

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
    [
      agents,
      chatModelId,
      collections,
      embeddingModelId,
      lastSources,
      messages,
      selectedAgent,
    ]
  );

  useRegisterContextRegistryPageSource('agent-teaching-chat-state', registrySource);

  const resolveCollectionName = (id: string): string => {
    const found = collections.find((c: AgentTeachingEmbeddingCollectionRecord) => c.id === id);
    return found?.name ?? id;
  };

  const handleSend = async (): Promise<void> => {
    if (!selectedAgentId) {
      toast('Select a learner agent first.', { variant: 'error' });
      return;
    }
    const content = input.trim();
    if (!content) return;

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
      setMessages((prev: SimpleChatMessage[]) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ]);
      setLastSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Chat failed.', { variant: 'error' });
      setMessages((prev: SimpleChatMessage[]) => [
        ...prev,
        { role: 'assistant', content: 'Error: failed to generate response.' },
      ]);
    }
  };

  return (
    <AdminAgentTeachingPageLayout
      title='Learner Chat'
      current='Chat'
      description='Chat with a learner agent. The response is generated with retrieved embedded sources.'
    >

      <div className='grid gap-6 lg:grid-cols-3'>
        <FormSection title='Learner Agents' className='p-4 lg:col-span-1 space-y-4'>
          {loadingAgents ? (
            <LoadingState message='Loading agents…' className='py-8' size='sm' />
          ) : agents.length === 0 ? (
            <EmptyState
              variant='compact'
              title='No agents'
              description='Create a learner agent first.'
              className='py-8'
            />
          ) : (
            <div className='space-y-2'>
              {agents.map((agent: AgentTeachingAgentRecord) => (
                <Button
                  key={agent.id}
                  variant='ghost'
                  className={cn(
                    'w-full flex-col items-start gap-1 rounded-md border p-3 text-left transition h-auto font-normal',
                    agent.id === selectedAgentId
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15'
                      : 'border-border bg-card/40 text-gray-200 hover:bg-card/60'
                  )}
                  onClick={(): void => {
                    setSelectedAgentId(agent.id);
                    setMessages([]);
                    setLastSources([]);
                  }}
                >
                  <div className='font-medium text-sm'>{agent.name}</div>
                  <div className='text-[11px] text-gray-400'>
                    LLM: {agent.llmModel} • Embed: {agent.embeddingModel}
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    Collections:{' '}
                    {(agent.collectionIds ?? []).map(resolveCollectionName).join(', ') || '—'}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection
          title='Chat'
          description={selectedAgent ? `Agent: ${selectedAgent.name}` : 'Select an agent to start'}
          className='p-4 lg:col-span-2 space-y-4'
        >
          <div className='flex items-center justify-between gap-3'>
            <div className='text-sm font-semibold text-white'>Chat</div>
            <Button
              type='button'
              variant='outline'
              onClick={(): void => {
                setMessages([]);
                setLastSources([]);
              }}
              disabled={sending || messages.length === 0}
            >
              Clear
            </Button>
          </div>

          <div className='h-[360px] overflow-auto rounded-md border border-border bg-card/30 p-3 mt-4'>
            {messages.length === 0 ? (
              <div className='text-sm text-gray-400'>
                Start chatting. The server will embed your question, retrieve top sources, and
                answer with citations.
              </div>
            ) : (
              <div className='space-y-3'>
                {messages.map((msg: SimpleChatMessage, idx: number) => (
                  <div key={`${msg.role}-${idx}`} className='space-y-1'>
                    <div className='text-[11px] text-gray-500'>{msg.role}</div>
                    <div className='whitespace-pre-wrap text-sm text-gray-200'>{msg.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <FormField label='Message'>
            <Textarea
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              placeholder='Ask something that should be answered from your embedded knowledge…'
              className='min-h-[90px]'
              disabled={sending || !selectedAgentId}
             aria-label='Ask something that should be answered from your embedded knowledge…' title='Ask something that should be answered from your embedded knowledge…'/>
            <div className='flex justify-end gap-2 mt-2'>
              <Button
                type='button'
                onClick={() => void handleSend()}
                disabled={sending || !selectedAgentId || !input.trim()}
                loading={sending}
                loadingText='Thinking…'
              >
                Send
              </Button>
            </div>
          </FormField>

          <FormSection title='Retrieved sources' variant='subtle' className='p-3'>
            {lastSources.length === 0 ? (
              <div className='mt-2 text-sm text-gray-400'>
                No sources retrieved yet (or below min score).
              </div>
            ) : (
              <div className='mt-2 space-y-2'>
                {lastSources.map((src: AgentTeachingChatSource) => (
                  <Card
                    key={src.documentId}
                    variant='subtle-compact'
                    padding='sm'
                    className='bg-card/50'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <div className='text-xs text-gray-300'>
                        [doc:{src.documentId}] • {resolveCollectionName(src.collectionId)}
                      </div>
                      <div className='text-[11px] text-gray-500'>score {src.score.toFixed(3)}</div>
                    </div>
                    {src.metadata?.title ? (
                      <div className='mt-1 text-[11px] text-gray-400'>
                        Title: {src.metadata.title}
                      </div>
                    ) : null}
                    <div className='mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-gray-200'>
                      {src.text}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </FormSection>
        </FormSection>
      </div>
    </AdminAgentTeachingPageLayout>
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
