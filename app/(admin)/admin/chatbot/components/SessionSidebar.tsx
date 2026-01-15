"use client";

import React from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatSession } from "../types";

interface SessionSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-gray-900 border-r border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <Button
          onClick={onNewSession}
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
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 rounded-lg p-3 cursor-pointer transition ${
                  currentSessionId === session.id
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                }`}
                onClick={() => onSelectSession(session.id)}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-600 rounded"
                  aria-label="Delete session"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
