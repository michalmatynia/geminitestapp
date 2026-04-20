import { 
  normalizePlanStepSpecs, 
  buildPlanStepsFromSpecs, 
  parsePlanJson 
} from '@/features/ai/agent-runtime/planning/utils';
import { runPlanningPostprocessTask } from '../core';
import type { PlanStep } from '@/shared/contracts/agent-runtime';

export interface BuildPlanWithLLMResult {
  steps: PlanStep[];
  decision: any;
  source: 'llm' | 'heuristic';
}

export interface BuildPlanParams {
  prompt: string;
  memory: string[];
  model: string;
  maxSteps: number;
}

export async function buildPlanWithLLM(params: BuildPlanParams): Promise<BuildPlanWithLLMResult> {
  const content = await runPlanningPostprocessTask({
    model: params.model,
    systemPrompt: 'You are an agent planner. Output JSON plan steps.',
    userContent: JSON.stringify({
      prompt: params.prompt,
      memory: params.memory,
      maxSteps: params.maxSteps,
    }),
  });

  const parsed = parsePlanJson(content) as { steps?: unknown[] } | null;
  const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
  
  return {
    steps: buildPlanStepsFromSpecs(normalizePlanStepSpecs(rawSteps as any[]), {}, false, 3).slice(0, params.maxSteps),
    decision: { action: 'tool', reason: 'LLM generated plan' },
    source: 'llm',
  };
}
