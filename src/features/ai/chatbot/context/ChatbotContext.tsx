'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';

import { useChatbotLogic, UseChatbotLogicReturn } from '../hooks/useChatbotLogic';
import type {
  ChatMessageDto as ChatMessage,
  ChatbotDebugStateDto as ChatbotDebugState,
  ChatbotSessionDto as ChatSession,
} from '@/shared/contracts/chatbot';

// --- Messages Context ---
export interface ChatbotMessagesData {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => Promise<void>;
  attachments: File[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  isSending: boolean;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
}
const MessagesContext = createContext<ChatbotMessagesData | null>(null);
export const useChatbotMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) throw new Error('useChatbotMessages must be used within ChatbotProvider');
  return context;
};

// --- Settings Context ---
export interface ChatbotSettingsData {
  modelOptions: string[];
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  modelLoading: boolean;
  webSearchEnabled: boolean;
  setWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  useGlobalContext: boolean;
  setUseGlobalContext: React.Dispatch<React.SetStateAction<boolean>>;
  useLocalContext: boolean;
  setUseLocalContext: React.Dispatch<React.SetStateAction<boolean>>;
  searchProvider: string;
  setSearchProvider: React.Dispatch<React.SetStateAction<string>>;
  playwrightPersonaId: string | null;
  setPlaywrightPersonaId: (id: string | null) => void;
  globalContext: string;
  setGlobalContext: React.Dispatch<React.SetStateAction<string>>;
  localContext: string;
  setLocalContext: React.Dispatch<React.SetStateAction<string>>;
  localContextMode: 'override' | 'append';
  setLocalContextMode: React.Dispatch<React.SetStateAction<'override' | 'append'>>;
  settingsDirty: boolean;
  settingsSaving: boolean;
  loadChatbotSettings: () => Promise<void>;
  saveChatbotSettings: () => Promise<void>;
}
const SettingsContext = createContext<ChatbotSettingsData | null>(null);
export const useChatbotSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useChatbotSettings must be used within ChatbotProvider');
  return context;
};

// --- Sessions Context ---
export interface ChatbotSessionsData {
  sessions: ChatSession[];
  currentSessionId: string | null;
  sessionsLoading: boolean;
  sessionId: string | null;
  createNewSession: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: React.Dispatch<React.SetStateAction<string | null>>;
}
const SessionsContext = createContext<ChatbotSessionsData | null>(null);
export const useChatbotSessions = () => {
  const context = useContext(SessionsContext);
  if (!context) throw new Error('useChatbotSessions must be used within ChatbotProvider');
  return context;
};

// --- UI / Debug Context ---
export interface ChatbotUIData {
  debugState: ChatbotDebugState;
  setDebugState: React.Dispatch<React.SetStateAction<ChatbotDebugState>>;
  latestAgentRunId: string | null;
  setLatestAgentRunId: React.Dispatch<React.SetStateAction<string | null>>;
}
const UIContext = createContext<ChatbotUIData | null>(null);
export const useChatbotUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useChatbotUI must be used within ChatbotProvider');
  return context;
};

// --- Legacy Aggregator ---
export const ChatbotContext = createContext<UseChatbotLogicReturn | undefined>(undefined);

export function ChatbotProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const logic = useChatbotLogic();

  const messagesValue = useMemo<ChatbotMessagesData>(
    () => ({
      messages: logic.messages,
      setMessages: logic.setMessages,
      input: logic.input,
      setInput: logic.setInput,
      sendMessage: logic.sendMessage,
      attachments: logic.attachments,
      setAttachments: logic.setAttachments,
      isSending: logic.isSending,
      setIsSending: logic.setIsSending,
    }),
    [
      logic.messages,
      logic.setMessages,
      logic.input,
      logic.setInput,
      logic.sendMessage,
      logic.attachments,
      logic.setAttachments,
      logic.isSending,
      logic.setIsSending,
    ]
  );

  const settingsValue = useMemo<ChatbotSettingsData>(
    () => ({
      modelOptions: logic.modelOptions,
      model: logic.model,
      setModel: logic.setModel,
      modelLoading: logic.modelLoading,
      webSearchEnabled: logic.webSearchEnabled,
      setWebSearchEnabled: logic.setWebSearchEnabled,
      useGlobalContext: logic.useGlobalContext,
      setUseGlobalContext: logic.setUseGlobalContext,
      useLocalContext: logic.useLocalContext,
      setUseLocalContext: logic.setUseLocalContext,
      searchProvider: logic.searchProvider,
      setSearchProvider: logic.setSearchProvider,
      playwrightPersonaId: logic.playwrightPersonaId,
      setPlaywrightPersonaId: logic.setPlaywrightPersonaId,
      globalContext: logic.globalContext,
      setGlobalContext: logic.setGlobalContext,
      localContext: logic.localContext,
      setLocalContext: logic.setLocalContext,
      localContextMode: logic.localContextMode,
      setLocalContextMode: logic.setLocalContextMode,
      settingsDirty: logic.settingsDirty,
      settingsSaving: logic.settingsSaving,
      loadChatbotSettings: logic.loadChatbotSettings,
      saveChatbotSettings: logic.saveChatbotSettings,
    }),
    [
      logic.modelOptions,
      logic.model,
      logic.setModel,
      logic.modelLoading,
      logic.webSearchEnabled,
      logic.setWebSearchEnabled,
      logic.useGlobalContext,
      logic.setUseGlobalContext,
      logic.useLocalContext,
      logic.setUseLocalContext,
      logic.searchProvider,
      logic.setSearchProvider,
      logic.playwrightPersonaId,
      logic.setPlaywrightPersonaId,
      logic.globalContext,
      logic.setGlobalContext,
      logic.localContext,
      logic.setLocalContext,
      logic.localContextMode,
      logic.setLocalContextMode,
      logic.settingsDirty,
      logic.settingsSaving,
      logic.loadChatbotSettings,
      logic.saveChatbotSettings,
    ]
  );

  const sessionsValue = useMemo<ChatbotSessionsData>(
    () => ({
      sessions: logic.sessions,
      currentSessionId: logic.currentSessionId,
      sessionsLoading: logic.sessionsLoading,
      sessionId: logic.sessionId,
      createNewSession: logic.createNewSession,
      deleteSession: logic.deleteSession,
      selectSession: logic.selectSession,
    }),
    [
      logic.sessions,
      logic.currentSessionId,
      logic.sessionsLoading,
      logic.sessionId,
      logic.createNewSession,
      logic.deleteSession,
      logic.selectSession,
    ]
  );

  const uiValue = useMemo<ChatbotUIData>(
    () => ({
      debugState: logic.debugState,
      setDebugState: logic.setDebugState,
      latestAgentRunId: logic.latestAgentRunId,
      setLatestAgentRunId: logic.setLatestAgentRunId,
    }),
    [logic.debugState, logic.setDebugState, logic.latestAgentRunId, logic.setLatestAgentRunId]
  );

  return (
    <MessagesContext.Provider value={messagesValue}>
      <SettingsContext.Provider value={settingsValue}>
        <SessionsContext.Provider value={sessionsValue}>
          <UIContext.Provider value={uiValue}>
            <ChatbotContext.Provider value={logic}>{children}</ChatbotContext.Provider>
          </UIContext.Provider>
        </SessionsContext.Provider>
      </SettingsContext.Provider>
    </MessagesContext.Provider>
  );
}

export function useChatbot(): UseChatbotLogicReturn {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}
