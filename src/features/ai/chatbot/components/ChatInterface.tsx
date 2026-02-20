'use client';

import React, { useRef, useEffect } from 'react';

import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { Button, Input } from '@/shared/ui';

import { ChatMessageContent } from './ChatMessageContent';
import { useChatbot } from '../context/ChatbotContext';

export function ChatInterface(): React.JSX.Element {
  const {
    messages,
    input,
    setInput,
    isSending,
    sendMessage,
  } = useChatbot();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const defaultOnSend = (e: React.FormEvent): void => {
    e.preventDefault();
    void sendMessage();
  };

  return (
    <div className='flex h-full flex-col'>
      <div className='flex-1 overflow-y-auto p-4'>
        {messages.length === 0 ? (
          <div className='flex h-full items-center justify-center text-gray-500'>
            <p>Start a conversation...</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {messages.map((msg: ChatMessage, index: number): React.JSX.Element => (
              <div
                key={index}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
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
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className='border-t border-border p-4'>
        <form onSubmit={defaultOnSend} className='flex gap-2'>
          <Input
            className='flex-1 border-border bg-card/40 text-white focus:border-primary focus:outline-none'
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setInput(e.target.value)}
            placeholder='Type your message...'
            disabled={isSending}
          />
          <Button
            type='submit'
            variant='solid'
            className='px-4 py-2 font-medium'
            loading={isSending}
            disabled={!input.trim()}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
