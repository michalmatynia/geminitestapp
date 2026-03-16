'use client';

import React, { useRef, useEffect, useMemo } from 'react';

import { AgentPersonaMoodAvatar } from '@/features/ai/agentcreator/components/AgentPersonaMoodAvatar';
import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import { resolveAgentPersonaMood } from '@/features/ai/agentcreator/utils/personas';
import {
  DEFAULT_AGENT_PERSONA_MOOD_ID,
  agentPersonaMoodIdSchema,
  type AgentPersona,
  type AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { Button, Input } from '@/shared/ui';
import { getMotionSafeScrollBehavior } from '@/shared/utils';

import { ChatMessageContent } from './ChatMessageContent';
import {
  useChatbotMessages,
  useChatbotSessions,
  useChatbotSettings,
} from '../context/ChatbotContext';

export function ChatInterface(): React.JSX.Element {
  const { messages, input, setInput, isSending, sendMessage } = useChatbotMessages();
  const { personaId: defaultPersonaId } = useChatbotSettings();
  const { sessions, currentSessionId } = useChatbotSessions();
  const { data: agentPersonas = [] } = useAgentPersonas();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect((): void => {
    messagesEndRef.current?.scrollIntoView({
      behavior: getMotionSafeScrollBehavior('smooth'),
    });
  }, [messages]);

  const activeSessionPersonaId = useMemo(() => {
    if (!currentSessionId) {
      return null;
    }
    return sessions.find((session) => session.id === currentSessionId)?.personaId ?? null;
  }, [currentSessionId, sessions]);

  const activePersonaId = activeSessionPersonaId ?? defaultPersonaId;
  const activePersona = useMemo<AgentPersona | null>(() => {
    if (!activePersonaId) {
      return null;
    }
    return agentPersonas.find((persona) => persona.id === activePersonaId) ?? null;
  }, [activePersonaId, agentPersonas]);

  const suggestedMoodId = useMemo<AgentPersonaMoodId | null>(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role !== 'assistant') {
        continue;
      }

      const parsed = agentPersonaMoodIdSchema.safeParse(
        message.metadata?.['suggestedPersonaMoodId']
      );
      if (parsed.success) {
        return parsed.data;
      }
    }

    return null;
  }, [messages]);

  const requestedMoodId = useMemo<AgentPersonaMoodId>(() => {
    if (isSending) {
      return 'thinking';
    }

    return suggestedMoodId ?? DEFAULT_AGENT_PERSONA_MOOD_ID;
  }, [isSending, suggestedMoodId]);

  const resolvedPersonaMood = useMemo(
    () => resolveAgentPersonaMood(activePersona, requestedMoodId),
    [activePersona, requestedMoodId]
  );

  const defaultOnSend = (e: React.FormEvent): void => {
    e.preventDefault();
    void sendMessage();
  };

  return (
    <div className='flex h-full flex-col'>
      {activePersona ? (
        <div className='border-b border-border/60 bg-muted/30 px-4 py-3'>
          <div className='flex items-center gap-3'>
            <AgentPersonaMoodAvatar
              className='h-10 w-10 border border-border/60 bg-slate-900/70'
              imgClassName='object-cover'
              label={`${activePersona.name} ${resolvedPersonaMood.label}`}
              svgContent={resolvedPersonaMood.svgContent}
              avatarImageUrl={resolvedPersonaMood.avatarImageUrl}
              data-testid='chatbot-persona-avatar'
            />
            <div className='min-w-0'>
              <div className='truncate text-sm font-semibold text-white' data-testid='chatbot-persona-name'>
                {activePersona.name}
              </div>
              <div className='text-xs text-gray-400' data-testid='chatbot-persona-mood'>
                Memory mood: {resolvedPersonaMood.label}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className='flex-1 overflow-y-auto p-4'>
        {messages.length === 0 ? (
          <div className='flex h-full items-center justify-center text-gray-500'>
            <p>Start a conversation...</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {messages.map(
              (msg: ChatMessage, index: number): React.JSX.Element => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <ChatMessageContent content={msg.content} />
                  </div>
                </div>
              )
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className='border-t border-border p-4'>
        <form onSubmit={defaultOnSend} className='flex gap-2'>
          <Input
            className='flex-1 border-border bg-card/40 text-white focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setInput(e.target.value)}
            placeholder='Type your message...'
            disabled={isSending}
           aria-label='Type your message...' title='Type your message...'/>
          <Button
            type='submit'
            variant='solid'
            className='px-4 py-2 font-medium'
            loading={isSending}
            loadingText='Sending...'
            disabled={!input.trim()}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
