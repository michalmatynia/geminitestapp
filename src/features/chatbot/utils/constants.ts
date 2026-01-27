import type { ChatbotSettingsPayload } from "@/types/chatbot";
import { DEFAULT_AGENT_SETTINGS } from "@/features/agentcreator/utils/constants";

export const CHATBOT_SETTINGS_KEY = "default";
export const CHATBOT_SETTINGS_STORAGE_KEY = "chatbot.settings.v1";

export const DEFAULT_CHATBOT_SETTINGS: ChatbotSettingsPayload = {
  model: "",
  webSearchEnabled: false,
  useGlobalContext: false,
  useLocalContext: false,
  localContextMode: "override",
  searchProvider: "serpapi",
  playwrightPersonaId: null,
  agentModeEnabled: false,
  ...DEFAULT_AGENT_SETTINGS,
};
