/**
 * Chatbot Constants
 * 
 * Configuration constants for chatbot settings and behavior.
 * Provides:
 * - Default chatbot settings
 * - Storage key definitions
 * - Model configuration defaults
 * - Feature flag defaults
 * - Context and memory settings
 */

import { DEFAULT_AGENT_SETTINGS } from '@/shared/contracts/chatbot';
import type { CreateChatbotSettingsDto as ChatbotSettingsPayload } from '@/shared/contracts/chatbot';

/** Storage key for chatbot settings */
export const CHATBOT_SETTINGS_KEY = 'default';
/** Storage key for persisting chatbot settings */
export const CHATBOT_SETTINGS_STORAGE_KEY = 'chatbot.settings.v1';

/** Default chatbot configuration settings */
export const DEFAULT_CHATBOT_SETTINGS: ChatbotSettingsPayload = {
  model: '',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: '',
  personaId: null,
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
