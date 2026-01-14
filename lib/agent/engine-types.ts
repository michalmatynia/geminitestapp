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
  ignoreRobotsTxt?: boolean;
  requireHumanApproval?: boolean;
  memoryValidationModel?: string;
  plannerModel?: string;
  selfCheckModel?: string;
  loopGuardModel?: string;
  approvalGateModel?: string;
  memorySummarizationModel?: string;
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
