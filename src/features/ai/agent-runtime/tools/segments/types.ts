export type AgentToolRequest = {
  name: 'playwright';
  input: {
    prompt?: string;
    browser?: string;
    runId?: string;
    runHeadless?: boolean;
    stepId?: string;
    stepLabel?: string;
  };
};

export type ToolOutput = {
  url?: string;
  domText?: string;
  snapshotId?: string | null;
  logCount?: number | null;
  extractedNames?: string[];
  extractedTotal?: number;
  extractedItems?: string[];
  extractionType?: 'product_names' | 'emails';
  extractionPlan?: unknown;
  cloudflareDetected?: boolean;
};

export type AgentToolResult = {
  ok: boolean;
  output?: ToolOutput;
  error?: string;
  errorId?: string;
};

export type FailureRecoveryPlan = {
  reason: string | null;
  selectors: string[];
  listingUrls: string[];
  clickSelector: string | null;
  loginUrl: string | null;
  usernameSelector: string | null;
  passwordSelector: string | null;
  submitSelector: string | null;
  notes: string | null;
};

export type ToolLlmContext = {
  model: string;
  runId: string;
  log: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>;
  activeStepId?: string | null;
  stepLabel?: string;
};
