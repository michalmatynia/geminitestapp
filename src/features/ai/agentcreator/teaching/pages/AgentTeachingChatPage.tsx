'use client';

import Link from 'next/link';
import React from 'react';

import type { AgentTeachingAgentRecord, AgentTeachingChatSource, AgentTeachingEmbeddingCollectionRecord } from '@/shared/types/agent-teaching';
import type { ChatMessage } from '@/shared/types/chatbot';
import { Button, Label, SectionHeader, SectionPanel, Textarea, useToast } from '@/shared/ui';

import { useAgentTeachingContext } from '../context/AgentTeachingContext';

type ChatResponse = { message: string; sources: AgentTeachingChatSource[] };

export function AgentTeachingChatPage(): React.JSX.Element {
  const { toast } = useToast();
  const { agents, collections, isLoading: loadingAgents } = useAgentTeachingContext();

  const [selectedAgentId, setSelectedAgentId] = React.useState<string>('');
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [lastSources, setLastSources] = React.useState<AgentTeachingChatSource[]>([]);

  const selectedAgent: AgentTeachingAgentRecord | null =
    selectedAgentId
      ? agents.find((a: AgentTeachingAgentRecord) => a.id === selectedAgentId) ?? null
      : null;

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

    setSending(true);
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLastSources([]);

    try {
      const res = await fetch('/api/agentcreator/teaching/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId, messages: nextMessages }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Chat failed.');
      }
      const data = (await res.json()) as ChatResponse;
      setMessages((prev: ChatMessage[]) => [...prev, { role: 'assistant', content: data.message }]);
      setLastSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Chat failed.', { variant: 'error' });
      setMessages((prev: ChatMessage[]) => [...prev, { role: 'assistant', content: 'Error: failed to generate response.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <SectionHeader
        title="Learner Chat"
        description="Chat with a learner agent. The response is generated with retrieved embedded sources."
        eyebrow={(
          <Link href="/admin/agentcreator/teaching" className="text-blue-300 hover:text-blue-200">
            ← Back to learners
          </Link>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionPanel className="p-4 lg:col-span-1 space-y-4">
          <div className="text-sm font-semibold text-white">Learner Agents</div>
          {loadingAgents ? (
            <div className="text-sm text-gray-400">Loading agents…</div>
          ) : agents.length === 0 ? (
            <div className="text-sm text-gray-400">
              No learner agents yet. Create one first.
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent: AgentTeachingAgentRecord) => (
                <button
                  key={agent.id}
                  type="button"
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    agent.id === selectedAgentId
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                      : 'border-border bg-card/40 text-gray-200 hover:bg-card/60'
                  }`}
                  onClick={(): void => {
                    setSelectedAgentId(agent.id);
                    setMessages([]);
                    setLastSources([]);
                  }}
                >
                  <div className="font-medium">{agent.name}</div>
                  <div className="mt-1 text-[11px] text-gray-400">
                    LLM: {agent.llmModel} • Embed: {agent.embeddingModel}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Collections: {(agent.collectionIds ?? []).map(resolveCollectionName).join(', ') || '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel className="p-4 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Chat</div>
              <div className="text-[11px] text-gray-500">
                {selectedAgent ? `Agent: ${selectedAgent.name}` : 'Select an agent to start'}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={(): void => {
                setMessages([]);
                setLastSources([]);
              }}
              disabled={sending || messages.length === 0}
            >
              Clear
            </Button>
          </div>

          <div className="h-[360px] overflow-auto rounded-md border border-border bg-card/30 p-3">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-400">
                Start chatting. The server will embed your question, retrieve top sources, and answer with citations.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg: ChatMessage, idx: number) => (
                  <div key={`${msg.role}-${idx}`} className="space-y-1">
                    <div className="text-[11px] text-gray-500">{msg.role}</div>
                    <div className="whitespace-pre-wrap text-sm text-gray-200">{msg.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              placeholder="Ask something that should be answered from your embedded knowledge…"
              className="min-h-[90px]"
              disabled={sending || !selectedAgentId}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => void handleSend()} disabled={sending || !selectedAgentId || !input.trim()}>
                {sending ? 'Thinking…' : 'Send'}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card/40 p-3">
            <div className="text-sm font-semibold text-white">Retrieved sources</div>
            {lastSources.length === 0 ? (
              <div className="mt-2 text-sm text-gray-400">
                No sources retrieved yet (or below min score).
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {lastSources.map((src: AgentTeachingChatSource) => (
                  <div key={src.documentId} className="rounded-md border border-border bg-card/50 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-300">
                        [doc:{src.documentId}] • {resolveCollectionName(src.collectionId)}
                      </div>
                      <div className="text-[11px] text-gray-500">score {src.score.toFixed(3)}</div>
                    </div>
                    {src.metadata?.title ? (
                      <div className="mt-1 text-[11px] text-gray-400">Title: {src.metadata.title}</div>
                    ) : null}
                    <div className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-gray-200">
                      {src.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
