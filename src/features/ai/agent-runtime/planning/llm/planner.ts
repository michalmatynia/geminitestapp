import type { PlanStep } from '@/shared/contracts/agent-runtime';
import { normalizePlanStepSpecs } from '../llm-step-specs';
import { parsePlanJson } from '../utils/json-parse';
import type { PlanStepSpecInput } from '../llm-step-specs';
import { buildPlanStepsFromSpecs } from '../utils/specs';
import { runPlannerTask } from './core';

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const asDependencies = (value: unknown): number[] | string[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  if (value.every((item: unknown): item is number => typeof item === 'number')) {
    return value;
  }
  if (value.every((item: unknown): item is string => typeof item === 'string')) {
    return value;
  }
  return undefined;
};

const asPlanStepSpec = (value: unknown): PlanStepSpecInput | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    title: asString(record['title']),
    tool: asString(record['tool']),
    expectedObservation: asString(record['expectedObservation']),
    successCriteria: asString(record['successCriteria']),
    phase: asString(record['phase']),
    priority: asNumber(record['priority']),
    dependsOn: asDependencies(record['dependsOn']),
    goalId: asString(record['goalId']),
    subgoalId: asString(record['subgoalId']),
  };
};

const normalizePlanStepSpecsFromUnknown = (value: unknown): PlanStepSpecInput[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries = value as unknown[];
  return entries
    .map((entry: unknown) => asPlanStepSpec(entry))
    .filter((item): item is PlanStepSpecInput => item !== null);
};

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

  const parsed = parsePlanJson(content);
  const parsedObject =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  const specs = normalizePlanStepSpecs(
    parsedObject === null ? [] : normalizePlanStepSpecsFromUnknown(parsedObject['steps'])
  );
  
  return buildPlanStepsFromSpecs(
    specs, 
    {}, 
    true, 
    params.maxStepAttempts
  ).slice(0, params.maxSteps);
}
