export type AgentDecision = {
  action: "respond" | "tool" | "wait_human";
  reason: string;
  toolName?: string;
};

export type PlanStep = {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  tool?: "playwright" | "none";
  expectedObservation?: string | null;
  successCriteria?: string | null;
  goalId?: string | null;
  subgoalId?: string | null;
  phase?: "observe" | "act" | "verify" | "recover" | null;
  priority?: number | null;
  dependsOn?: string[] | null;
  attempts?: number;
  maxAttempts?: number;
  snapshotId?: string | null;
  logCount?: number | null;
};

export type PlannerCritique = {
  assumptions?: string[];
  risks?: string[];
  unknowns?: string[];
  safetyChecks?: string[];
  questions?: string[];
};

export type PlannerAlternative = {
  title: string;
  rationale?: string | null;
  steps: Array<{
    title?: string;
    tool?: string;
    expectedObservation?: string;
    successCriteria?: string;
    phase?: string;
    priority?: number;
    dependsOn?: number[] | string[];
  }>;
};

export type PlannerMeta = {
  critique?: PlannerCritique | null;
  alternatives?: PlannerAlternative[] | null;
  safetyChecks?: string[];
  questions?: string[];
  taskType?: "web_task" | "extract_info";
  summary?: string | null;
  constraints?: string[];
  successSignals?: string[];
};

export type AgentPlanSettings = {
  maxSteps: number;
  maxStepAttempts: number;
  maxReplanCalls: number;
  replanEverySteps: number;
  maxSelfChecks: number;
  loopGuardThreshold: number;
  loopBackoffBaseMs: number;
  loopBackoffMaxMs: number;
};

export type AgentPlanPreferences = {
  ignoreRobotsTxt?: boolean | undefined;
  requireHumanApproval?: boolean | undefined;
  memoryValidationModel?: string | undefined;
  plannerModel?: string | undefined;
  selfCheckModel?: string | undefined;
  loopGuardModel?: string | undefined;
  approvalGateModel?: string | undefined;
  memorySummarizationModel?: string | undefined;
};

export type AgentCheckpoint = {
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  taskType?: PlannerMeta["taskType"] | null;
  resumeRequestedAt?: string | null;
  resumeProcessedAt?: string | null;
  approvalRequestedStepId?: string | null;
  approvalGrantedStepId?: string | null;
  checkpointBrief?: string | null;
  checkpointNextActions?: string[] | null;
  checkpointRisks?: string[] | null;
  checkpointStepId?: string | null;
  checkpointCreatedAt?: string | null;
  summaryCheckpoint?: number | null;
  settings?: AgentPlanSettings | null;
  preferences?: AgentPlanPreferences | null;
  updatedAt: string;
};

export type LoopSignal = {
  reason: string;
  pattern: string;
  titles: string[];
  urls: Array<string | null>;
  statuses: Array<PlanStep["status"]>;
};

export type ApprovalRequest = {
  id: string;
  runId: string;
  stepId: string;
  action: string;
  context?: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  requestedAt: Date;
  decidedAt?: Date;
};

export type AuditLevel = "info" | "warning" | "error";

export type PlanHierarchy = {
  goals: Array<{
    id: string;
    title: string;
    description?: string;
    subgoals: string[];
  }>;
  subgoals: Array<{
    id: string;
    title: string;
    steps: string[];
  }>;
};

export type MemoryScope = "session" | "longterm";

export type AgentToolRequest = {
  tool: string;
  input: unknown;
  runId: string;
  stepId: string;
};

export type AgentToolResult = {
  success: boolean;
  output?: unknown;
  error?: string;
  observation?: string;
};
