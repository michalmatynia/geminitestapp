'use client';

import React, { createContext, useContext, ReactNode } from 'react';

import { useChatbotLogic, UseChatbotLogicReturn } from '../hooks/useChatbotLogic';

const ChatbotContext = createContext<UseChatbotLogicReturn | undefined>(undefined);

export function ChatbotProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const logic = useChatbotLogic();
  return (
    <ChatbotContext.Provider value={logic}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot(): UseChatbotLogicReturn {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}
