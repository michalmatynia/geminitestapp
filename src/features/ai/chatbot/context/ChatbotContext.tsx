'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';

import { useChatbotLogic } from '../hooks/useChatbotLogic';
import type {
  ChatbotMessagesData,
  ChatbotSettingsData,
  ChatbotSessionsData,
  ChatbotUIData,
} from '@/shared/contracts/chatbot';

// --- Messages Context ---
const MessagesContext = createContext<ChatbotMessagesData | null>(null);
export const useChatbotMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) throw new Error('useChatbotMessages must be used within ChatbotProvider');
  return context;
};

// --- Settings Context ---
const SettingsContext = createContext<ChatbotSettingsData | null>(null);
export const useChatbotSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useChatbotSettings must be used within ChatbotProvider');
  return context;
};

// --- Sessions Context ---
const SessionsContext = createContext<ChatbotSessionsData | null>(null);
export const useChatbotSessions = () => {
  const context = useContext(SessionsContext);
  if (!context) throw new Error('useChatbotSessions must be used within ChatbotProvider');
  return context;
};

// --- UI / Debug Context ---
const UIContext = createContext<ChatbotUIData | null>(null);
export const useChatbotUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useChatbotUI must be used within ChatbotProvider');
  return context;
};

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
      model: logic.model,
      setModel: logic.setModel,
      personaId: logic.personaId,
      setPersonaId: logic.setPersonaId,
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
      logic.model,
      logic.setModel,
      logic.personaId,
      logic.setPersonaId,
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
          <UIContext.Provider value={uiValue}>{children}</UIContext.Provider>
        </SessionsContext.Provider>
      </SettingsContext.Provider>
    </MessagesContext.Provider>
  );
}
