'use client';

import { Plus, Trash2, MessageSquare } from 'lucide-react';

import type { ChatbotSessionListItem } from '@/shared/contracts/chatbot';
import { Button } from '@/shared/ui/primitives.public';

import { useChatbotSessions } from '../context/ChatbotContext';

export function SessionSidebar(): React.JSX.Element {
  const {
    sessions,
    currentSessionId,
    selectSession,
    createNewSession,
    deleteSession,
  } = useChatbotSessions();

  return (
    <div className='flex h-full flex-col bg-card/80 border-r border-border'>
      <div className='p-4 border-b border-border'>
        <Button onClick={() => void createNewSession()} className='w-full'>
          <Plus className='mr-2 size-4' />
          New Chat
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto p-2'>
        {sessions.length === 0 ? (
          <div className='p-4 text-center text-sm text-gray-500'>No chat sessions yet</div>
        ) : (
          <div className='space-y-1'>
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={currentSessionId === session.id}
                onSelect={() => selectSession(session.id)}
                onDelete={() => void deleteSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: ChatbotSessionListItem;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg p-3 transition',
        isActive ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-muted/50 hover:text-white'
      )}
    >
      <button
        type='button'
        onClick={onSelect}
        aria-pressed={isActive}
        className='flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
      >
        <MessageSquare className='size-4 flex-shrink-0' />
        <div className='min-w-0 flex-1 overflow-hidden'>
          <div className='truncate text-sm font-medium'>{session.title}</div>
          <div className='truncate text-xs text-gray-500'>
            {session.messageCount ?? 0} messages
          </div>
        </div>
      </button>
      <Button
        variant='ghost'
        size='icon'
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onDelete();
        }}
        className='opacity-0 group-hover:opacity-100 transition h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10'
        aria-label='Delete session'
        title='Delete session'
      >
        <Trash2 className='size-3.5' />
      </Button>
    </div>
  );
}
