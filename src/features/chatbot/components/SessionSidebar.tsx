"use client";

import { Button } from "@/shared/ui";
import { Plus, Trash2, MessageSquare } from "lucide-react";

import type { ChatSession } from "@/shared/types/chatbot";

interface SessionSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionSidebarProps): React.JSX.Element {
  return (
    <div className="flex h-full flex-col bg-gray-900 border-r border-border">
      <div className="p-4 border-b border-border">
        <Button
          onClick={() => { void onNewSession(); }}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="mr-2 size-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No chat sessions yet
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session: ChatSession): React.JSX.Element => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 rounded-lg p-3 cursor-pointer transition ${
                  currentSessionId === session.id
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-muted/50/50 hover:text-white"
                }`}
                onClick={(): void => onSelectSession(session.id)}
              >
                <MessageSquare className="size-4 flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium">
                    {session.title}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {session.messages.length} messages
                  </div>
                </div>
                <Button
                  onClick={(e: React.MouseEvent): void => {
                    e.stopPropagation();
                    void onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-600 rounded"
                  aria-label="Delete session"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
