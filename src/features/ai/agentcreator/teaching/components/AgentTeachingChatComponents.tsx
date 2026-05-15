'use client';

import React from 'react';
import type {
  AgentTeachingAgentRecord,
  AgentTeachingChatSource,
} from '@/shared/contracts/agent-teaching';
import type { SimpleChatMessage } from '@/shared/contracts/chatbot';
import { Button, Textarea, Card } from '@/shared/ui/primitives.public';
import { FormSection, FormField } from '@/shared/ui/forms-and-actions.public';
import {
  LoadingState,
  CompactEmptyState,
  UI_CENTER_ROW_SPACED_CLASSNAME,
} from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';

export type ResolveCollectionFn = (id: string) => string;

export function AgentListItem(props: {
  agent: AgentTeachingAgentRecord;
  isSelected: boolean;
  onSelect: (id: string) => void;
  resolveCollectionName: ResolveCollectionFn;
}): React.JSX.Element {
  const { agent, isSelected, onSelect, resolveCollectionName } = props;
  const collectionNames = agent.collectionIds.map(resolveCollectionName).join(', ');

  return (
    <Button
      variant='ghost'
      className={cn(
        'w-full flex-col items-start gap-1 rounded-md border p-3 text-left transition h-auto font-normal',
        isSelected
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15'
          : 'border-border bg-card/40 text-gray-200 hover:bg-card/60'
      )}
      onClick={() => onSelect(agent.id)}
    >
      <div className='font-medium text-sm'>{agent.name}</div>
      <div className='text-[11px] text-gray-400'>
        LLM: {agent.llmModel} • Embed: {agent.embeddingModel}
      </div>
      <div className='text-[11px] text-gray-500'>
        Collections: {collectionNames.length > 0 ? collectionNames : '—'}
      </div>
    </Button>
  );
}

export function ChatMessageList(props: { messages: SimpleChatMessage[] }): React.JSX.Element {
  const { messages } = props;
  return (
    <div className='h-[360px] overflow-auto rounded-md border border-border bg-card/30 p-3 mt-4'>
      {messages.length === 0 ? (
        <div className='text-sm text-gray-400'>
          Start chatting. The server will embed your question, retrieve top sources, and answer with
          citations.
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
  );
}

export function SourceCard(props: {
  src: AgentTeachingChatSource;
  resolveCollectionName: ResolveCollectionFn;
}): React.JSX.Element {
  const { src, resolveCollectionName } = props;
  const title = src.metadata?.title ?? '';
  return (
    <Card variant='subtle-compact' padding='sm' className='bg-card/50'>
      <div className='flex items-center justify-between gap-2'>
        <div className='text-xs text-gray-300'>
          [doc:{src.documentId}] • {resolveCollectionName(src.collectionId)}
        </div>
        <div className='text-[11px] text-gray-500'>score {src.score.toFixed(3)}</div>
      </div>
      {title.length > 0 && <div className='mt-1 text-[11px] text-gray-400'>Title: {title}</div>}
      <div className='mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-gray-200'>
        {src.text}
      </div>
    </Card>
  );
}

export function AgentSidebar(props: {
  agents: AgentTeachingAgentRecord[];
  loadingAgents: boolean;
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;
  resolveCollectionName: ResolveCollectionFn;
  setMessages: (msgs: SimpleChatMessage[]) => void;
  setLastSources: (sources: AgentTeachingChatSource[]) => void;
}): React.JSX.Element {
  const {
    agents,
    loadingAgents,
    selectedAgentId,
    setSelectedAgentId,
    resolveCollectionName,
    setMessages,
    setLastSources,
  } = props;

  if (loadingAgents) {
    return (
      <FormSection title='Learner Agents' className='p-4 lg:col-span-1 space-y-4'>
        <LoadingState message='Loading agents…' className='py-8' size='sm' />
      </FormSection>
    );
  }

  if (agents.length === 0) {
    return (
      <FormSection title='Learner Agents' className='p-4 lg:col-span-1 space-y-4'>
        <CompactEmptyState
          title='No agents'
          description='Create a learner agent first.'
          className='py-8'
        />
      </FormSection>
    );
  }

  return (
    <FormSection title='Learner Agents' className='p-4 lg:col-span-1 space-y-4'>
      <div className='space-y-2'>
        {agents.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            isSelected={agent.id === selectedAgentId}
            resolveCollectionName={resolveCollectionName}
            onSelect={(id) => {
              setSelectedAgentId(id);
              setMessages([]);
              setLastSources([]);
            }}
          />
        ))}
      </div>
    </FormSection>
  );
}

export function ChatHeader(props: {
  sending: boolean;
  hasMessages: boolean;
  onClear: () => void;
}): React.JSX.Element {
  const { sending, hasMessages, onClear } = props;
  return (
    <div className={cn(UI_CENTER_ROW_SPACED_CLASSNAME, 'justify-between')}>
      <div className='text-sm font-semibold text-white'>Chat</div>
      <Button
        type='button'
        variant='outline'
        onClick={onClear}
        disabled={sending || !hasMessages}
      >
        Clear
      </Button>
    </div>
  );
}

export function ChatInput(props: {
  input: string;
  setInput: (val: string) => void;
  sending: boolean;
  selectedAgent: AgentTeachingAgentRecord | null;
  handleSend: () => void;
}): React.JSX.Element {
  const { input, setInput, sending, selectedAgent, handleSend } = props;
  return (
    <FormField label='Message'>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Ask something that should be answered from your embedded knowledge…'
        className='min-h-[90px]'
        disabled={sending || selectedAgent === null}
        aria-label='Ask something that should be answered from your embedded knowledge…'
        title='Ask something that should be answered from your embedded knowledge…'
      />
      <div className='flex justify-end gap-2 mt-2'>
        <Button
          type='button'
          onClick={handleSend}
          disabled={sending || selectedAgent === null || input.trim().length === 0}
          loading={sending}
          loadingText='Thinking…'
        >
          Send
        </Button>
      </div>
    </FormField>
  );
}

export function ChatSources(props: {
  lastSources: AgentTeachingChatSource[];
  resolveCollectionName: ResolveCollectionFn;
}): React.JSX.Element {
  const { lastSources, resolveCollectionName } = props;
  return (
    <FormSection title='Retrieved sources' variant='subtle' className='p-3'>
      {lastSources.length === 0 ? (
        <div className='mt-2 text-sm text-gray-400'>
          No sources retrieved yet (or below min score).
        </div>
      ) : (
        <div className='mt-2 space-y-2'>
          {lastSources.map((src) => (
            <SourceCard
              key={src.documentId}
              src={src}
              resolveCollectionName={resolveCollectionName}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}

export function ChatPane(props: {
  selectedAgent: AgentTeachingAgentRecord | null;
  messages: SimpleChatMessage[];
  setMessages: (msgs: SimpleChatMessage[]) => void;
  lastSources: AgentTeachingChatSource[];
  setLastSources: (sources: AgentTeachingChatSource[]) => void;
  sending: boolean;
  input: string;
  setInput: (val: string) => void;
  handleSend: () => void;
  resolveCollectionName: ResolveCollectionFn;
}): React.JSX.Element {
  const {
    selectedAgent,
    messages,
    setMessages,
    lastSources,
    setLastSources,
    sending,
    input,
    setInput,
    handleSend,
    resolveCollectionName,
  } = props;

  return (
    <FormSection
      title='Chat'
      description={
        selectedAgent !== null ? `Agent: ${selectedAgent.name}` : 'Select an agent to start'
      }
      className='p-4 lg:col-span-2 space-y-4'
    >
      <ChatHeader
        sending={sending}
        hasMessages={messages.length > 0}
        onClear={() => {
          setMessages([]);
          setLastSources([]);
        }}
      />

      <ChatMessageList messages={messages} />

      <ChatInput
        input={input}
        setInput={setInput}
        sending={sending}
        selectedAgent={selectedAgent}
        handleSend={handleSend}
      />

      <ChatSources lastSources={lastSources} resolveCollectionName={resolveCollectionName} />
    </FormSection>
  );
}

