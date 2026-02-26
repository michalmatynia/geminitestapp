'use client';

import { useState } from 'react';
import type { ChatbotDebugStateDto as ChatbotDebugState } from '@/shared/contracts/chatbot';

export interface UseChatbotUIStateReturn {
  debugState: ChatbotDebugState;
  setDebugState: React.Dispatch<React.SetStateAction<ChatbotDebugState>>;
  latestAgentRunId: string | null;
  setLatestAgentRunId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useChatbotUIState(): UseChatbotUIStateReturn {
  const [latestAgentRunId, setLatestAgentRunId] = useState<string | null>(null);
  const [debugState, setDebugState] = useState<ChatbotDebugState>({
    activeRunId: null,
    isPaused: false,
    stepMode: false,
    lastUpdateAt: new Date().toISOString(),
  });

  return {
    debugState,
    setDebugState,
    latestAgentRunId,
    setLatestAgentRunId,
  };
}
