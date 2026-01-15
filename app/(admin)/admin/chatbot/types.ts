export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatbotDebugState = {
  lastRequest?: {
    model: string;
    tools: string[];
    messageCount: number;
    hasLocalContext: boolean;
    hasGlobalContext: boolean;
    localContextMode: "override" | "append";
    attachmentCount: number;
    searchUsed: boolean;
    searchProvider?: string;
    agentBrowser?: string;
    agentRunHeadless?: boolean;
    ignoreRobotsTxt?: boolean;
    requireHumanApproval?: boolean;
    memoryValidationModel?: string;
    plannerModel?: string;
    selfCheckModel?: string;
    extractionValidationModel?: string;
    loopGuardModel?: string;
    approvalGateModel?: string;
    memorySummarizationModel?: string;
    selectorInferenceModel?: string;
    outputNormalizationModel?: string;
    agentPlanSettings?: {
      maxSteps: number;
      maxStepAttempts: number;
      maxReplanCalls: number;
      replanEverySteps: number;
      maxSelfChecks: number;
      loopGuardThreshold: number;
      loopBackoffBaseMs: number;
      loopBackoffMaxMs: number;
    };
  };
  lastResponse?: {
    ok: boolean;
    durationMs: number;
    error?: string;
    errorId?: string;
  };
};

export type ChatbotSettingsPayload = {
  model: string;
  webSearchEnabled: boolean;
  useGlobalContext: boolean;
  useLocalContext: boolean;
  localContextMode: "override" | "append";
  searchProvider: string;
  agentModeEnabled: boolean;
  agentBrowser: string;
  runHeadless: boolean;
  ignoreRobotsTxt: boolean;
  requireHumanApproval: boolean;
  memoryValidationModel: string;
  plannerModel: string;
  selfCheckModel: string;
  extractionValidationModel: string;
  loopGuardModel: string;
  approvalGateModel: string;
  memorySummarizationModel: string;
  selectorInferenceModel: string;
  outputNormalizationModel: string;
  maxSteps: number;
  maxStepAttempts: number;
  maxReplanCalls: number;
  replanEverySteps: number;
  maxSelfChecks: number;
  loopGuardThreshold: number;
  loopBackoffBaseMs: number;
  loopBackoffMaxMs: number;
};
