import { Browser, BrowserContext } from 'playwright';

import { AgentExecutionContext, PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';

export type StepLoopInput = {
  context: AgentExecutionContext;
  sharedBrowser: Browser | null;
  sharedContext: BrowserContext | null;
  planSteps: PlanStep[];
  stepIndex: number;
  taskType: PlannerMeta['taskType'] | null;
  summaryCheckpoint: number;
  checkpoint?: {
    approvalRequestedStepId?: string | null;
    approvalGrantedStepId?: string | null;
    checkpointStepId?: string | null;
    lastError?: string | null;
  } | null;
};

export type StepLoopResult = {
  planSteps: PlanStep[];
  stepIndex: number;
  taskType: PlannerMeta['taskType'] | null;
  memoryContext: string[];
  summaryCheckpoint: number;
  overallOk: boolean;
  lastError: string | null;
  requiresHuman: boolean;
};
