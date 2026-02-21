'use client';

import { Plus, Trash2, MessageSquare } from 'lucide-react';

import type { ChatbotSessionDto as ChatSession } from '@/shared/contracts/chatbot';
import { Button } from '@/shared/ui';

import { useChatbot } from '../context/ChatbotContext';

export function SessionSidebar(): React.JSX.Element {
  const {
    sessions,
    currentSessionId,
    selectSession: onSelectSession,
    createNewSession: onNewSession,
    deleteSession: onDeleteSession,
  } = useChatbot();

  return (
    <div className='flex h-full flex-col bg-card/80 border-r border-border'>
      <div className='p-4 border-b border-border'>
        <Button
          onClick={() => { void onNewSession(); }}
          className='w-full'
        >
          <Plus className='mr-2 size-4' />
          New Chat
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto p-2'>
        {sessions.length === 0 ? (
          <div className='p-4 text-center text-sm text-gray-500'>
            No chat sessions yet
          </div>
        ) : (
          <div className='space-y-1'>
            {sessions.map((session: ChatSession): React.JSX.Element => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 rounded-lg p-3 cursor-pointer transition ${
                  currentSessionId === session.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-400 hover:bg-muted/50 hover:text-white'
                }`}
                onClick={(): void => onSelectSession(session.id)}
              >
                <MessageSquare className='size-4 flex-shrink-0' />
                <div className='flex-1 overflow-hidden'>
                  <div className='truncate text-sm font-medium'>
                    {session.title}
                  </div>
                  <div className='truncate text-xs text-gray-500'>
                    {session.messages?.length ?? 0} messages
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={(e: React.MouseEvent): void => {
                    e.stopPropagation();
                    void onDeleteSession(session.id);
                  }}
                  className='opacity-0 group-hover:opacity-100 transition h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10'
                  aria-label='Delete session'
                >
                  <Trash2 className='size-3.5' />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

