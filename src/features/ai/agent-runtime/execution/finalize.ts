import 'server-only';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { addAgentMemory } from '@/features/ai/agent-runtime/memory';
import { buildSelfImprovementReviewWithLLM, verifyPlanWithLLM } from '@/features/ai/agent-runtime/planning/llm';
import { updateChatbotRunStatus } from './finalize/finalize-utils';
import { type ImprovementReview, type FinalizeRunInput } from './finalize/finalize-types';
import type { AgentVerification } from '@/shared/contracts/agent-runtime';
import { logAgentAudit } from '@/features/ai/agent-runtime/audit';

async function processReview(runId: string, review: ImprovementReview): Promise<void> {
  const { summary: s, mistakes: m, improvements: i, guardrails: g, toolAdjustments: t, confidence: c } = review;
  await logAgentAudit(runId, 'info', 'Self-improvement completed.', { type: 'self-improvement', summary: s, mistakes: m, improvements: i, guardrails: g, toolAdjustments: t, confidence: c });
  const content = [
    'Self-improvement review',
    s,
    m.length > 0 ? `Mistakes: ${m.join(' | ')}` : null,
    i.length > 0 ? `Improvements: ${i.join(' | ')}` : null,
    g.length > 0 ? `Guardrails: ${g.join(' | ')}` : null,
    t.length > 0 ? `Tool adjustments: ${t.join(' | ')}` : null
  ].filter((v): v is string => v !== null && v.length > 0).join('\n');
  await addAgentMemory({ runId, scope: 'session', content, metadata: { type: 'self-improvement', confidence: c } });
}

function resolveModelId(configs: Record<string, unknown> | undefined, key: string, fallback: string): string {
  if (configs === undefined) return fallback;
  const config = configs[key];
  if (config !== null && typeof config === 'object' && 'modelId' in config) {
    const modelId = (config as Record<string, unknown>).modelId;
    if (typeof modelId === 'string') {
      return modelId;
    }
  }
  return fallback;
}

export interface FinalizeAgentRunResult {
  verificationContext: string | null;
  verification: AgentVerification;
  improvementReview: ImprovementReview | null;
}

export async function finalizeAgentRun(input: FinalizeRunInput): Promise<FinalizeAgentRunResult> {
  const { context: ctx, planSteps: steps, taskType, overallOk: ok, requiresHuman: human, lastError: err, summaryCheckpoint: cp } = input;
  const { run, settings, preferences, contextRegistry: reg, memoryContext: mem, configs: cnf, plannerModel: pm, memorySummarizationModel: msm } = ctx;
  
  await updateChatbotRunStatus({
    runId: run.id,
    runPrompt: run.prompt,
    settings,
    preferences,
    contextRegistry: reg ?? null,
    planSteps: steps,
    requiresHuman: human,
    overallOk: ok,
    lastError: err,
    summaryCheckpoint: cp
  });
  
  const vCtx = await getBrowserContextSummary(run.id);
  
  const plannerModel = resolveModelId(cnf, 'agent_runtime.planner', pm);
  const v = await verifyPlanWithLLM({
    prompt: run.prompt,
    model: plannerModel,
    memory: mem,
    steps,
    browserContext: vCtx,
    runId: run.id
  });
  
  const summarizerModel = resolveModelId(cnf, 'agent_runtime.memory_summarization', msm);
  const ir = await buildSelfImprovementReviewWithLLM({
    prompt: run.prompt,
    model: summarizerModel,
    memory: mem,
    steps,
    verification: v,
    ...(taskType !== null ? { taskType } : {}),
    lastError: err,
    browserContext: vCtx,
    runId: run.id
  });
  
  if (ir !== null) {
    await processReview(run.id, ir);
  }
  
  return { verificationContext: vCtx, verification: v, improvementReview: ir };
}
