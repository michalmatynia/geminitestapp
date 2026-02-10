import { DEFAULT_AGENT_SETTINGS } from '@/features/ai/agentcreator';
import type { ChatbotSettingsPayload } from '@/shared/types/domain/chatbot';

export const CHATBOT_SETTINGS_KEY = 'default';
export const CHATBOT_SETTINGS_STORAGE_KEY = 'chatbot.settings.v1';

export const DEFAULT_CHATBOT_SETTINGS: ChatbotSettingsPayload = {
  model: '',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: '',
  enableMemory: false,
  enableContext: false,
  webSearchEnabled: false,
  useGlobalContext: false,
  useLocalContext: false,
  localContextMode: 'override',
  searchProvider: 'serpapi',
  playwrightPersonaId: null,
  agentModeEnabled: false,
  ...DEFAULT_AGENT_SETTINGS,
};
