import type { AgentExecutionContext, PlanStep } from '@/shared/contracts/agent-runtime';

export interface ImprovementReview {
  summary: string;
  mistakes: string[];
  improvements: string[];
  guardrails: string[];
  toolAdjustments: string[];
  confidence: number | null;
}

export interface FinalizeRunInput {
  context: AgentExecutionContext;
  planSteps: PlanStep[];
  taskType: string | null;
  overallOk: boolean;
  requiresHuman: boolean;
  lastError: string | null;
  summaryCheckpoint: number;
}
