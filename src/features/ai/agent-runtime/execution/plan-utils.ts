import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { persistCheckpoint } from '@/features/ai/agent-runtime/memory/checkpoint';
import type { 
  AgentExecutionContext, 
  PlanStep, 
  PlannerMeta 
} from '@/shared/contracts/agent-runtime';
import type { BrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';

type PlannerBrowserContext = {
  url: string;
  title: string | null;
  domTextSample: string;
  logs: { level: string; message: string }[];
  uiInventory?: unknown;
};

export const buildResumeBrowserContext = (
  raw?: AgentExecutionContext['browserContext'] | BrowserContextSummary | null
): PlannerBrowserContext | null => {
  if (raw === null || raw === undefined) return null;
  return {
    url: raw.url ?? '',
    title: raw.title ?? null,
    domTextSample: raw.domTextSample ?? '',
    logs: raw.logs ?? [],
    uiInventory: raw.uiInventory,
  };
};

export const recordResumeAudit = async (args: {
  runId: string;
  shouldReplan: boolean;
  planSteps: PlanStep[];
  reason?: string;
  meta?: PlannerMeta | null;
  hierarchy?: unknown;
  summary?: string | null;
}): Promise<void> => {
  const { runId, shouldReplan, planSteps, reason, meta, hierarchy, summary } = args;
  if (shouldReplan && planSteps.length > 0) {
    await logAgentAudit(runId, 'warning', 'Resume plan refreshed.', {
      type: 'resume-plan',
      steps: planSteps,
      reason,
      plannerMeta: meta ?? null,
      hierarchy: hierarchy ?? null,
    });
  } else {
    await logAgentAudit(runId, 'info', 'Resume summary prepared.', {
      type: 'resume-summary',
      summary: summary ?? null,
      reason,
      plannerMeta: meta ?? null,
    });
  }
};

export const persistResumeCheckpoint = async (args: {
  runId: string;
  planSteps: PlanStep[];
  stepIndex: number;
  lastError: string | null;
  taskType: PlannerMeta['taskType'] | null;
  resumeRequestedAt: string | null;
  approvalRequestedStepId: string | null;
  approvalGrantedStepId: string | null;
  summaryCheckpoint: number;
  settings: AgentExecutionContext['settings'];
  preferences: AgentExecutionContext['preferences'];
  contextRegistry: AgentExecutionContext['contextRegistry'];
}): Promise<void> => {
  await persistCheckpoint({
    runId: args.runId,
    steps: args.planSteps,
    activeStepId: args.planSteps[args.stepIndex]?.id ?? null,
    lastError: args.lastError,
    taskType: args.taskType,
    resumeRequestedAt: args.resumeRequestedAt,
    resumeProcessedAt: new Date().toISOString(),
    approvalRequestedStepId: args.approvalRequestedStepId,
    approvalGrantedStepId: args.approvalGrantedStepId,
    summaryCheckpoint: args.summaryCheckpoint,
    settings: args.settings,
    preferences: args.preferences,
    contextRegistry: args.contextRegistry,
  });
};
