'use client';

import type {
  ChatMessageDto as ChatMessage,
  ChatbotDebugStateDto as ChatbotDebugState,
  ChatbotSessionDto as ChatSession,
} from '@/shared/contracts/chatbot';

export interface UseChatbotLogicReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => Promise<void>;
  attachments: File[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  isSending: boolean;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  webSearchEnabled: boolean;
  setWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  useGlobalContext: boolean;
  setUseGlobalContext: React.Dispatch<React.SetStateAction<boolean>>;
  useLocalContext: boolean;
  setUseLocalContext: React.Dispatch<React.SetStateAction<boolean>>;
  agentModeEnabled: boolean;
  setAgentModeEnabled: (enabled: boolean) => void;
  searchProvider: string;
  setSearchProvider: React.Dispatch<React.SetStateAction<string>>;
  playwrightPersonaId: string | null;
  setPlaywrightPersonaId: (id: string | null) => void;
  agentBrowser: string;
  setAgentBrowser: (browser: string) => void;
  agentRunHeadless: boolean;
  setAgentRunHeadless: (headless: boolean) => void;

  // Agent Detail Models
  agentMemoryValidationModel: string | null;
  setAgentMemoryValidationModel: (model: string | null) => void;
  agentPlannerModel: string | null;
  setAgentPlannerModel: (model: string | null) => void;
  agentSelfCheckModel: string | null;
  setAgentSelfCheckModel: (model: string | null) => void;
  agentExtractionValidationModel: string | null;
  setAgentExtractionValidationModel: (model: string | null) => void;
  agentToolRouterModel: string | null;
  setAgentToolRouterModel: (model: string | null) => void;
  agentLoopGuardModel: string | null;
  setAgentLoopGuardModel: (model: string | null) => void;
  agentApprovalGateModel: string | null;
  setAgentApprovalGateModel: (model: string | null) => void;
  agentMemorySummarizationModel: string | null;
  setAgentMemorySummarizationModel: (model: string | null) => void;
  agentSelectorInferenceModel: string | null;
  setAgentSelectorInferenceModel: (model: string | null) => void;
  agentOutputNormalizationModel: string | null;
  setAgentOutputNormalizationModel: (model: string | null) => void;

  // Agent Detail Settings
  agentMaxSteps: number;
  setAgentMaxSteps: (steps: number) => void;
  agentMaxStepAttempts: number;
  setAgentMaxStepAttempts: (attempts: number) => void;
  agentMaxReplanCalls: number;
  setAgentMaxReplanCalls: (calls: number) => void;
  agentReplanEverySteps: number;
  setAgentReplanEverySteps: (steps: number) => void;
  agentMaxSelfChecks: number;
  setAgentMaxSelfChecks: (checks: number) => void;
  agentLoopGuardThreshold: number;
  setAgentLoopGuardThreshold: (threshold: number) => void;
  agentLoopBackoffBaseMs: number;
  setAgentLoopBackoffBaseMs: (ms: number) => void;
  agentLoopBackoffMaxMs: number;
  setAgentLoopBackoffMaxMs: (ms: number) => void;
  agentIgnoreRobotsTxt: boolean;
  setAgentIgnoreRobotsTxt: (ignore: boolean) => void;
  agentRequireHumanApproval: boolean;
  setAgentRequireHumanApproval: (require: boolean) => void;

  latestAgentRunId: string | null;
  setLatestAgentRunId: React.Dispatch<React.SetStateAction<string | null>>;
  debugState: ChatbotDebugState;
  setDebugState: React.Dispatch<React.SetStateAction<ChatbotDebugState>>;
  globalContext: string;
  setGlobalContext: React.Dispatch<React.SetStateAction<string>>;
  localContext: string;
  setLocalContext: React.Dispatch<React.SetStateAction<string>>;
  localContextMode: 'override' | 'append';
  setLocalContextMode: React.Dispatch<React.SetStateAction<'override' | 'append'>>;
  settingsDirty: boolean;
  setSettingsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  settingsSaving: boolean;
  setSettingsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  sessionId: string | null;
  loadChatbotSettings: () => Promise<void>;
  saveChatbotSettings: () => Promise<void>;
  sessions: ChatSession[];
  currentSessionId: string | null;
  sessionsLoading: boolean;
  createNewSession: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: React.Dispatch<React.SetStateAction<string | null>>;
}
