'use client';

import { useState } from 'react';
import type {
  ChatbotDebugStateDto as ChatbotDebugState,
  ChatbotUIData as UseChatbotUIStateReturn,
} from '@/shared/contracts/chatbot';

export type { UseChatbotUIStateReturn };

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
