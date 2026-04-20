import { 
  parsePlanJson, 
  normalizePlanStepSpecs, 
  buildPlanStepsFromSpecs 
} from '@/features/ai/agent-runtime/planning/utils';
import { runPlanningEvaluationTask } from '../core';
import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';

export interface EvaluationResult {
  score: number;
  revisedSteps: PlanStep[];
}

const runEvaluationTask = async (params: {
  model: string;
  prompt: string;
  memory: string[];
  steps: PlanStep[];
  maxSteps: number;
}): Promise<string> => {
  return await runPlanningEvaluationTask({
    model: params.model,
    systemPrompt: 'You evaluate plans. Return only JSON with keys: score (0-100), revisedSteps.',
    userContent: JSON.stringify({
      prompt: params.prompt,
      memory: params.memory,
      steps: params.steps.map((s) => ({ title: s.title, tool: s.tool })),
      maxSteps: params.maxSteps,
    }),
  });
};

export async function evaluatePlanWithLLM(params: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  meta: PlannerMeta | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<EvaluationResult | null> {
  const { prompt, model, memory, steps, meta, runId, maxSteps, maxStepAttempts } = params;
  if (steps.length < 2) return null;

  try {
    const content = await runEvaluationTask({ prompt, model, memory, steps, maxSteps });
    const parsed = parsePlanJson(content) as { score?: unknown; revisedSteps?: unknown[] } | null;
    if (!parsed) return null;

    const score = (typeof parsed.score === 'number' && parsed.score >= 0) ? parsed.score : 100;
    const revisedSpecs = Array.isArray(parsed.revisedSteps) ? parsed.revisedSteps : [];

    const revisedSteps = revisedSpecs.length > 0
      ? buildPlanStepsFromSpecs(
          normalizePlanStepSpecs(revisedSpecs as any[]),
          meta ?? {},
          true,
          maxStepAttempts
        ).slice(0, maxSteps)
      : [];

    const agentAuditLog = getAgentAuditLogDelegate();
    if (agentAuditLog !== null && runId !== undefined) {
      await agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Plan evaluated.',
          metadata: { score, revisedSteps: revisedSteps.length },
        },
      });
    }

    return { score, revisedSteps };
  } catch (error) {
    await ErrorSystem.captureException(error);
    return null;
  }
}
