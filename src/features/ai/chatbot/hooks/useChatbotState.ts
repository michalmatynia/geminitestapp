'use client';

import { useState, useRef, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import type {
  ChatMessageDto as ChatMessage,
  CreateChatbotSettingsDto as ChatbotSettingsPayload,
  ChatbotDebugStateDto as ChatbotDebugState,
  ChatbotSessionDto as ChatSession,
} from '@/shared/contracts/chatbot';

export interface ChatbotState {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  attachments: File[];
  setAttachments: Dispatch<SetStateAction<File[]>>;
  isSending: boolean;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  model: string;
  setModelState: Dispatch<SetStateAction<string>>;
  personaId: string | null;
  setPersonaId: Dispatch<SetStateAction<string | null>>;
  webSearchEnabled: boolean;
  setWebSearchEnabled: Dispatch<SetStateAction<boolean>>;
  useGlobalContext: boolean;
  setUseGlobalContext: Dispatch<SetStateAction<boolean>>;
  useLocalContext: boolean;
  setUseLocalContext: Dispatch<SetStateAction<boolean>>;
  searchProvider: string;
  setSearchProvider: Dispatch<SetStateAction<string>>;
  playwrightPersonaId: string | null;
  setPlaywrightPersonaId: Dispatch<SetStateAction<string | null>>;
  latestAgentRunId: string | null;
  setLatestAgentRunId: Dispatch<SetStateAction<string | null>>;
  debugState: ChatbotDebugState;
  setDebugState: Dispatch<SetStateAction<ChatbotDebugState>>;
  globalContext: string;
  setGlobalContext: Dispatch<SetStateAction<string>>;
  localContext: string;
  setLocalContext: Dispatch<SetStateAction<string>>;
  localContextMode: 'override' | 'append';
  setLocalContextMode: Dispatch<SetStateAction<'override' | 'append'>>;
  settingsDirty: boolean;
  setSettingsDirty: Dispatch<SetStateAction<boolean>>;
  settingsSaving: boolean;
  setSettingsSaving: Dispatch<SetStateAction<boolean>>;
  settingsSnapshot: ChatbotSettingsPayload | null;
  setSettingsSnapshot: Dispatch<SetStateAction<ChatbotSettingsPayload | null>>;
  settingsLoadedRef: MutableRefObject<boolean>;
  sessions: ChatSession[];
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  currentSessionId: string | null;
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>;
  sessionsLoading: boolean;
  setSessionsLoading: Dispatch<SetStateAction<boolean>>;
}

export function useChatbotState(): ChatbotState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [model, setModelState] = useState<string>('');
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [useGlobalContext, setUseGlobalContext] = useState<boolean>(false);
  const [useLocalContext, setUseLocalContext] = useState<boolean>(false);
  const [searchProvider, setSearchProvider] = useState<string>('serpapi');
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(null);

  const [latestAgentRunId, setLatestAgentRunId] = useState<string | null>(null);
  const [debugState, setDebugState] = useState<ChatbotDebugState>({
    activeRunId: null,
    isPaused: false,
    stepMode: false,
    lastUpdateAt: new Date().toISOString(),
  });
  const [globalContext, setGlobalContext] = useState<string>('');
  const [localContext, setLocalContext] = useState<string>('');
  const [localContextMode, setLocalContextMode] = useState<'override' | 'append'>('override');
  const [settingsDirty, setSettingsDirty] = useState<boolean>(false);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [settingsSnapshot, setSettingsSnapshot] = useState<ChatbotSettingsPayload | null>(null);
  const settingsLoadedRef = useRef<boolean>(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(true);

  return {
    messages, setMessages,
    input, setInput,
    attachments, setAttachments,
    isSending, setIsSending,
    model, setModelState,
    personaId, setPersonaId,
    webSearchEnabled, setWebSearchEnabled,
    useGlobalContext, setUseGlobalContext,
    useLocalContext, setUseLocalContext,
    searchProvider, setSearchProvider,
    playwrightPersonaId, setPlaywrightPersonaId,
    latestAgentRunId, setLatestAgentRunId,
    debugState, setDebugState,
    globalContext, setGlobalContext,
    localContext, setLocalContext,
    localContextMode, setLocalContextMode,
    settingsDirty, setSettingsDirty,
    settingsSaving, setSettingsSaving,
    settingsSnapshot, setSettingsSnapshot,
    settingsLoadedRef,
    sessions, setSessions,
    currentSessionId, setCurrentSessionId,
    sessionsLoading, setSessionsLoading,
  };
}
