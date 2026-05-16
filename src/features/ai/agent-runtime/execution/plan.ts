import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { persistCheckpoint, type parseCheckpoint } from '@/features/ai/agent-runtime/memory/checkpoint';
import { buildPlanWithLLM, buildResumePlanReview } from '@/features/ai/agent-runtime/planning/llm';
import { buildBranchStepsFromAlternatives } from '@/features/ai/agent-runtime/planning/utils';
import type { PlanHierarchy } from '@/features/ai/agent-runtime/planning/utils';
import type {
  AgentDecision,
  AgentExecutionContext,
  PlanStep,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';
import { 
  buildResumeBrowserContext, 
  recordResumeAudit, 
  persistResumeCheckpoint 
} from './plan-utils';

type CheckpointState = ReturnType<typeof parseCheckpoint>;
type ParsedCheckpointState = NonNullable<CheckpointState>;

type PlanInitializationResult = {
  planSteps: PlanStep[];
  planHierarchy: PlanHierarchy | null;
  taskType: PlannerMeta['taskType'] | null;
  decision: AgentDecision;
  stepIndex: number;
  summaryCheckpoint: number;
  preferences: Record<string, unknown>;
};

type InitializePlanInput = {
  context: AgentExecutionContext;
  checkpoint: CheckpointState;
};

interface HandleResumeInput {
  runId: string;
  checkpoint: ParsedCheckpointState;
  planSteps: PlanStep[];
  stepIndex: number;
  context: AgentExecutionContext;
  summaryCheckpoint: number;
  preferences: AgentExecutionContext['preferences'];
}

const getNextPlanState = (
  resumeReview: Awaited<ReturnType<typeof buildResumePlanReview>>,
  planSteps: PlanStep[],
  stepIndex: number,
  taskType: PlannerMeta['taskType'] | null
): { nextPlanSteps: PlanStep[]; nextStepIndex: number; nextTaskType: PlannerMeta['taskType'] | null } => {
  const shouldReplan = resumeReview.shouldReplan && resumeReview.steps.length > 0;
  return {
    nextPlanSteps: shouldReplan ? resumeReview.steps : planSteps,
    nextStepIndex: shouldReplan ? 0 : stepIndex,
    nextTaskType: resumeReview.meta?.taskType ?? taskType ?? null,
  };
};


const handleResumeRequest = async (
  input: HandleResumeInput
): Promise<{ planSteps: PlanStep[]; stepIndex: number; taskType: PlannerMeta['taskType'] | null }> => {
  const { runId, checkpoint, planSteps, stepIndex, context, summaryCheckpoint, preferences } = input;
  const { run, memoryContext, settings, memorySummarizationModel, contextRegistry } = context;
  
  const rawResumeContext = await getBrowserContextSummary(runId);
  const resumeContext = buildResumeBrowserContext(rawResumeContext);

  const resumeReview = await buildResumePlanReview({
    prompt: run.prompt,
    memory: memoryContext,
    model: memorySummarizationModel,
    browserContext: resumeContext,
    currentPlan: planSteps,
    completedIndex: Math.max(stepIndex, 0),
    lastError: checkpoint.lastError ?? null,
    runId: run.id,
    maxSteps: settings.maxSteps,
    maxStepAttempts: settings.maxStepAttempts,
  });

  const { nextPlanSteps, nextStepIndex, nextTaskType } = getNextPlanState(
    resumeReview, 
    planSteps, 
    stepIndex, 
    checkpoint.taskType ?? null
  );

  await recordResumeAudit({
    runId: run.id, 
    shouldReplan: resumeReview.shouldReplan, 
    planSteps: nextPlanSteps, 
    reason: resumeReview.reason, 
    meta: resumeReview.meta, 
    hierarchy: resumeReview.hierarchy, 
    summary: resumeReview.summary
  });

  await persistResumeCheckpoint({
    runId: run.id,
    planSteps: nextPlanSteps,
    stepIndex: nextStepIndex,
    lastError: checkpoint.lastError ?? null,
    taskType: nextTaskType,
    resumeRequestedAt: checkpoint.resumeRequestedAt ?? null,
    approvalRequestedStepId: checkpoint.approvalRequestedStepId ?? null,
    approvalGrantedStepId: checkpoint.approvalGrantedStepId ?? null,
    summaryCheckpoint,
    settings,
    preferences,
    contextRegistry,
  });

  return { planSteps: nextPlanSteps, stepIndex: nextStepIndex, taskType: nextTaskType };
};


const resolveStepIndex = (checkpoint: ParsedCheckpointState, planSteps: PlanStep[]): number => {
  if (checkpoint.activeStepId !== null && checkpoint.activeStepId !== '') {
    const activeIndex = planSteps.findIndex(
      (step: PlanStep) => step.id === checkpoint.activeStepId
    );
    return activeIndex === -1 ? 0 : activeIndex;
  }
  const firstPending = planSteps.findIndex((step: PlanStep) => step.status !== 'completed');
  return firstPending === -1 ? 0 : firstPending;
};

const mergeCheckpointPreferences = (
  base: AgentExecutionContext['preferences'],
  checkpointPrefs: ParsedCheckpointState['preferences']
): AgentExecutionContext['preferences'] => {
  const next = { ...base };
  const prefs = checkpointPrefs as Record<string, unknown> | undefined;
  if (prefs?.['ignoreRobotsTxt'] !== undefined) {
    next.ignoreRobotsTxt = Boolean(prefs['ignoreRobotsTxt']);
  }
  if (prefs?.['requireHumanApproval'] !== undefined) {
    next.requireHumanApproval = Boolean(prefs['requireHumanApproval']);
  }
  return next;
};


const checkResumeRequested = (checkpoint: ParsedCheckpointState): boolean => {
  return (
    checkpoint.resumeRequestedAt !== null &&
    checkpoint.resumeRequestedAt !== undefined &&
    checkpoint.resumeRequestedAt !== '' &&
    checkpoint.resumeRequestedAt !== checkpoint.resumeProcessedAt
  );
};

const initializeFromCheckpoint = async (
  checkpoint: ParsedCheckpointState,
  context: AgentExecutionContext,
  basePreferences: AgentExecutionContext['preferences']
): Promise<PlanInitializationResult> => {
  const { run } = context;
  let planSteps = checkpoint.steps;
  const nextPreferences = mergeCheckpointPreferences(basePreferences, checkpoint.preferences);

  let stepIndex = 0;
  let taskType = checkpoint.taskType ?? null;
  const summaryCheckpoint = typeof checkpoint.summaryCheckpoint === 'number' ? checkpoint.summaryCheckpoint : 0;

  if (checkResumeRequested(checkpoint)) {
    const resumeResult = await handleResumeRequest({
      runId: run.id,
      checkpoint,
      planSteps,
      stepIndex: 0,
      context,
      summaryCheckpoint,
      preferences: nextPreferences
    });
    planSteps = resumeResult.planSteps;
    stepIndex = resumeResult.stepIndex;
    taskType = resumeResult.taskType ?? null;
  } else {
    stepIndex = resolveStepIndex(checkpoint, planSteps);
  }


  await logAgentAudit(run.id, 'info', 'Checkpoint loaded.', {
    type: 'checkpoint-load',
    activeStepId: checkpoint.activeStepId ?? null,
    stepCount: planSteps.length,
  });

  return {
    planSteps,
    planHierarchy: null,
    taskType,
    decision: {
      action: 'tool',
      reason: 'Resuming from checkpoint.',
      toolName: 'playwright',
    },
    stepIndex,
    summaryCheckpoint,
    preferences: nextPreferences,
  };
};

const recordScratchAudit = async (args: { 
  runId: string; 
  planResult: { 
    steps: PlanStep[]; 
    hierarchy?: PlanHierarchy | null; 
    meta?: PlannerMeta | null; 
    source?: string 
  }; 
  settings: AgentExecutionContext['settings'] 
}): Promise<void> => {
  const { runId, planResult, settings } = args;
  const { steps, hierarchy, meta, source } = planResult;
  if (steps.length > 0) {
    await logAgentAudit(runId, 'info', 'Plan created.', {
      type: 'plan',
      steps,
      source,
      hierarchy: hierarchy ?? null,
      plannerMeta: meta ?? null,
    });

    const branchAlternatives = buildBranchStepsFromAlternatives(
      meta?.alternatives ?? undefined,
      settings.maxStepAttempts,
      Math.min(6, settings.maxSteps)
    );

    if (branchAlternatives.length > 0) {
      await logAgentAudit(runId, 'info', 'Plan branch created.', {
        type: 'plan-branch',
        branchSteps: branchAlternatives,
        reason: 'planner-alternatives',
        plannerMeta: meta ?? null,
      });
    }
  }
};

const initializeFromScratch = async (
  context: AgentExecutionContext,
  nextPreferences: AgentExecutionContext['preferences']
): Promise<PlanInitializationResult> => {
  const {
    run,
    memoryContext,
    browserContext,
    settings,
    contextRegistry,
    plannerModel,
    loopGuardModel,
  } = context;

  const planResult = await buildPlanWithLLM({
    prompt: run.prompt,
    memory: memoryContext,
    model: plannerModel,
    guardModel: loopGuardModel,
    browserContext: buildResumeBrowserContext(browserContext),
    maxSteps: settings.maxSteps,
    maxStepAttempts: settings.maxStepAttempts,
  });

  const planSteps = planResult.steps;
  const planHierarchy = planResult.hierarchy ?? null;
  const taskType = planResult.meta?.taskType ?? null;

  await recordScratchAudit({ runId: run.id, planResult, settings });

  await persistCheckpoint({
    runId: run.id,
    steps: planSteps,
    activeStepId: planSteps[0]?.id ?? null,
    lastError: null,
    taskType,
    summaryCheckpoint: 0,
    approvalRequestedStepId: null,
    approvalGrantedStepId: null,
    settings,
    preferences: nextPreferences,
    contextRegistry,
  });

  return {
    planSteps,
    planHierarchy,
    taskType,
    decision: planResult.decision,
    stepIndex: 0,
    summaryCheckpoint: 0,
    preferences: nextPreferences,
  };
};

export async function initializePlanState(
  input: InitializePlanInput
): Promise<PlanInitializationResult> {
  const { context, checkpoint } = input;
  const { preferences } = context;

  const nextPreferences: AgentExecutionContext['preferences'] = {
    ignoreRobotsTxt: Boolean(preferences.ignoreRobotsTxt),
    requireHumanApproval: Boolean(preferences.requireHumanApproval),
  };

  if (checkpoint !== null && checkpoint.steps.length > 0) {
    return await initializeFromCheckpoint(checkpoint, context, nextPreferences);
  }

  return await initializeFromScratch(context, nextPreferences);
}
