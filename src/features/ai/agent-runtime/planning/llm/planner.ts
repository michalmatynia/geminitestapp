import type { PlanStep } from '@/shared/contracts/agent-runtime';
import { 
  normalizePlanStepSpecs, 
  buildPlanStepsFromSpecs, 
  parsePlanJson,
  type PlanStepSpecInput
} from '../utils';
import { runPlannerTask } from './core';

export interface BuildPlanParams {
  prompt: string;
  memory: string[];
  model: string;
  maxSteps: number;
  maxStepAttempts: number;
}

export async function buildPlanWithLLM(params: BuildPlanParams): Promise<PlanStep[]> {
  const content = await runPlannerTask({
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
  
  const specs = normalizePlanStepSpecs(rawSteps);
  
  return buildPlanStepsFromSpecs(
    specs, 
    {}, 
    true, 
    params.maxStepAttempts
  ).slice(0, params.maxSteps);
}
