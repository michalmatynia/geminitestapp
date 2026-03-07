'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import {
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  type KangurAiTutorLearnerSettings,
} from '@/features/kangur/settings-ai-tutor';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type KangurAiTutorContextValue = {
  enabled: boolean;
  tutorSettings: KangurAiTutorLearnerSettings | null;
  tutorName: string;
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  highlightedText: string | null;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  setHighlightedText: (text: string | null) => void;
};

const KangurAiTutorContext = createContext<KangurAiTutorContextValue | null>(null);

type Props = {
  learnerId: string | null;
  lessonContext?: string;
  children: ReactNode;
};

export function KangurAiTutorProvider({ learnerId, lessonContext, children }: Props): JSX.Element {
  const settingsStore = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);

  const rawSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore_ = useMemo(
    () => parseKangurAiTutorSettings(rawSettings),
    [rawSettings]
  );
  const tutorSettings = useMemo(
    () => (learnerId ? getKangurAiTutorSettingsForLearner(settingsStore_, learnerId) : null),
    [settingsStore_, learnerId]
  );
  const enabled = Boolean(tutorSettings?.enabled);

  const { data: agentPersonas = [] } = useAgentPersonas();
  const tutorName = useMemo(() => {
    const personaId = tutorSettings?.agentPersonaId;
    if (!personaId) return 'Pomocnik';
    return agentPersonas.find((p) => p.id === personaId)?.name ?? 'Pomocnik';
  }, [tutorSettings?.agentPersonaId, agentPersonas]);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim() || !enabled) return;

      const userMessage: ChatMessage = { role: 'user', content: text.trim() };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const outgoing: ChatMessage[] = [...messages, userMessage];
        const result = await api.post<{ message: string }>(
          '/api/kangur/ai-tutor/chat',
          {
            messages: outgoing,
            ...(lessonContext ? { lessonContext } : {}),
          }
        );
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.message },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Przepraszam, coś poszło nie tak. Spróbuj ponownie.' },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, messages, lessonContext]
  );

  const value = useMemo<KangurAiTutorContextValue>(
    () => ({
      enabled,
      tutorSettings,
      tutorName,
      isOpen,
      messages,
      isLoading,
      highlightedText,
      openChat,
      closeChat,
      sendMessage,
      setHighlightedText,
    }),
    [
      enabled,
      tutorSettings,
      tutorName,
      isOpen,
      messages,
      isLoading,
      highlightedText,
      openChat,
      closeChat,
      sendMessage,
    ]
  );

  return (
    <KangurAiTutorContext.Provider value={value}>
      {children}
    </KangurAiTutorContext.Provider>
  );
}

export function useKangurAiTutor(): KangurAiTutorContextValue {
  const ctx = useContext(KangurAiTutorContext);
  if (!ctx) {
    throw new Error('useKangurAiTutor must be used within a KangurAiTutorProvider');
  }
  return ctx;
}

export function useOptionalKangurAiTutor(): KangurAiTutorContextValue | null {
  return useContext(KangurAiTutorContext);
}
