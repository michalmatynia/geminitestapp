'use client';

import React, { useMemo, ReactNode } from 'react';

import type {
  ChatbotMessagesData,
  ChatbotSettingsData,
  ChatbotSessionsData,
  ChatbotUIData,
} from '@/shared/contracts/chatbot';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useChatbotLogic } from '../hooks/useChatbotLogic';

const createChatbotStrictContext = <T,>(hookName: string, displayName: string) =>
  createStrictContext<T>({
    hookName,
    providerName: 'a ChatbotProvider',
    displayName,
    errorFactory: internalError,
  });

// --- Messages Context ---
export const {
  Context: MessagesContext,
  useStrictContext: useChatbotMessages,
} = createChatbotStrictContext<ChatbotMessagesData>(
  'useChatbotMessages',
  'ChatbotMessagesContext'
);

// --- Settings Context ---
export const {
  Context: SettingsContext,
  useStrictContext: useChatbotSettings,
} = createChatbotStrictContext<ChatbotSettingsData>(
  'useChatbotSettings',
  'ChatbotSettingsContext'
);

// --- Sessions Context ---
export const {
  Context: SessionsContext,
  useStrictContext: useChatbotSessions,
} = createChatbotStrictContext<ChatbotSessionsData>(
  'useChatbotSessions',
  'ChatbotSessionsContext'
);

// --- UI / Debug Context ---
export const {
  Context: UIContext,
  useStrictContext: useChatbotUI,
} = createChatbotStrictContext<ChatbotUIData>(
  'useChatbotUI',
  'ChatbotUIContext'
);

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
