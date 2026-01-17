export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
  timestamp?: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: {
    model?: string;
    webSearchEnabled?: boolean;
    useGlobalContext?: boolean;
    useLocalContext?: boolean;
  };
}

export interface CreateSessionInput {
  title: string;
  settings?: ChatSession["settings"];
}

export interface UpdateSessionInput {
  title?: string;
  messages?: ChatMessage[];
  settings?: ChatSession["settings"];
}

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

export type AgentSnapshot = {
  id: string;
  url: string;
  title: string | null;
  domText: string;
  screenshotData: string | null;
  screenshotPath: string | null;
  mouseX: number | null;
  mouseY: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  createdAt: string;
};

export type AgentAuditLog = {
  id: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  level: "info" | "warning" | "error";
};

export type AgentBrowserLog = {
  id: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type TimelineEntry = {
  id: string;
  source: "audit" | "browser";
  level?: string | null;
  message: string;
  createdAt: string;
};

export type AgentPlanStep = {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  snapshotId?: string | null;
  logCount?: number | null;
  dependsOn?: string[] | null;
  phase?: string | null;
  priority?: number | null;
};

export type ExtractionPlan = {
  target?: string | null;
  fields?: string[];
  primarySelectors?: string[];
  fallbackSelectors?: string[];
  notes?: string | null;
};

export type PlannerMeta = {
  critique?: {
    assumptions?: string[];
    risks?: string[];
    unknowns?: string[];
    safetyChecks?: string[];
    questions?: string[];
  };
  safetyChecks?: string[];
  questions?: string[];
  alternatives?: Array<{
    title: string;
    rationale?: string | null;
    steps?: Array<{ title?: string | null }>;
  }>;
};

export type AgentSettingsPayload = {
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

export type ModelProfile = {
  name: string;
  normalized: string;
  size: number | null;
  isEmbedding: boolean;
  isRerank: boolean;
  isVision: boolean;
  isCode: boolean;
  isInstruct: boolean;
  isChat: boolean;
  isReasoning: boolean;
};

export type ModelTaskRule = {
  targetSize?: number;
  preferLarge?: boolean;
  preferSmall?: boolean;
  minSize?: number;
  maxSize?: number;
  preferReasoning?: boolean;
};
