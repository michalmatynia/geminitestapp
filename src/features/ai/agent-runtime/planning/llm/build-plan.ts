import 'server-only';

import {
  buildPlanStepsFromSpecs,
  flattenPlanHierarchy,
  normalizePlanHierarchy,
  normalizePlannerMeta,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type {
  AgentDecision,
  PlannerMeta,
  PlanStep,
} from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { normalizePlanStepSpecs, type PlanStepSpecInput } from '../llm-step-specs';
import { runPlannerTask } from './core';

interface ParsedPlanResponse {
  action?: string;
  reason?: string;
  goals?: any[];
  steps?: PlanStepSpecInput[];
  taskType?: string;
}

const resolveScratchSteps = (args: {
  parsed: ParsedPlanResponse;
  meta: PlannerMeta;
  maxSteps: number;
  maxStepAttempts: number;
}): PlanStep[] => {
  const { parsed, meta, maxSteps, maxStepAttempts } = args;
  const hierarchy = Array.isArray(parsed.goals) ? normalizePlanHierarchy({ goals: parsed.goals }) : null;
  let specs: PlanStepSpecInput[] = [];
  if (hierarchy !== null && hierarchy.goals.length > 0) {
    specs = flattenPlanHierarchy(hierarchy);
  } else if (Array.isArray(parsed.steps)) {
    specs = parsed.steps;
  }
  
  if (specs.length === 0) return [];
  return buildPlanStepsFromSpecs(
    normalizePlanStepSpecs(specs),
    meta,
    true,
    maxStepAttempts
  ).slice(0, maxSteps);
};

export interface BuildPlanArgs {
  prompt: string;
  memory: string[];
  model: string;
  guardModel?: string | null;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  maxSteps: number;
  maxStepAttempts: number;
}

export async function buildPlanWithLLM(args: BuildPlanArgs): Promise<{
  steps: PlanStep[];
  decision: AgentDecision;
  source: string;
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  const { prompt, memory, model, browserContext, maxSteps, maxStepAttempts } = args;
  try {
    const content = await runPlannerTask({
      model,
      systemPrompt: 'You are an agent planner. Output only JSON: {action:\'tool\', reason:\'\', goals:[], steps:[]}.',
      userContent: JSON.stringify({ prompt, memory, browserContext, maxSteps }),
    });
    const parsed = parsePlanJson(content) as ParsedPlanResponse | null;
    if (!parsed) throw new Error('Failed to parse plan JSON.');
    
    const decision: AgentDecision = {
      action: (parsed.action === 'finish' || parsed.action === 'wait_human') ? parsed.action : 'tool',
      reason: parsed.reason ?? 'Starting plan.',
      ...(parsed.action === 'tool' && { toolName: 'playwright' }),
    };
    
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = Array.isArray(parsed.goals) ? normalizePlanHierarchy({ goals: parsed.goals }) : null;
    const steps = resolveScratchSteps({ parsed, meta, maxSteps, maxStepAttempts });
    
    return { steps, decision, source: 'planner-llm', hierarchy, meta };
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'buildPlanWithLLM' });
    return { steps: [], decision: { action: 'finish', reason: 'Error building plan.' }, source: 'error' };
  }
}
