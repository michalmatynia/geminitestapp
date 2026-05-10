import 'server-only';

import {
  buildPlanStepsFromSpecs,
  flattenPlanHierarchy,
  normalizePlanHierarchy,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type {
  PlanStep,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { normalizePlanStepSpecs, type PlanStepSpecInput } from '../llm-step-specs';
import { runPlanningEvaluationTask, recordPlanningAudit } from './core';

interface ParsedPlanEvaluationResponse {
  score?: number;
  issues?: string[];
  revisedGoals?: any[];
  revisedSteps?: PlanStepSpecInput[];
}

const resolveRevisedSteps = (args: {
  parsed: ParsedPlanEvaluationResponse;
  meta: PlannerMeta | null;
  maxSteps: number;
  maxStepAttempts: number;
}): PlanStep[] => {
  const { parsed, meta, maxSteps, maxStepAttempts } = args;
  const hierarchy = Array.isArray(parsed.revisedGoals) ? normalizePlanHierarchy({ goals: parsed.revisedGoals }) : null;
  
  let specs: PlanStepSpecInput[] = [];
  if (hierarchy && hierarchy.goals.length > 0) {
    specs = flattenPlanHierarchy(hierarchy);
  } else if (Array.isArray(parsed.revisedSteps)) {
    specs = parsed.revisedSteps;
  }
  
  if (specs.length === 0) return [];
  return buildPlanStepsFromSpecs(
    normalizePlanStepSpecs(specs),
    meta,
    true,
    maxStepAttempts
  ).slice(0, maxSteps);
};

export async function evaluatePlanWithLLM(args: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  hierarchy: ReturnType<typeof normalizePlanHierarchy> | null;
  meta: PlannerMeta | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{ score: number; revisedSteps: PlanStep[] } | null> {
  const { prompt, model, memory, steps, hierarchy, meta, runId, maxSteps, maxStepAttempts } = args;
  try {
    const content = await runPlanningEvaluationTask({
      model,
      systemPrompt: 'You evaluate plans. Output only JSON: {score:0-100, issues:[], revisedGoals:[], revisedSteps:[]}.',
      userContent: JSON.stringify({
        prompt, memory, steps: steps.map(s => ({ title: s.title, tool: s.tool })), hierarchy, meta, maxSteps,
      }),
    });
    const parsed = parsePlanJson(content) as ParsedPlanEvaluationResponse | null;
    if (!parsed) return null;
    const score = (typeof parsed.score === 'number' && !isNaN(parsed.score)) ? parsed.score : 100;
    const revisedSteps = resolveRevisedSteps({ parsed, meta, maxSteps, maxStepAttempts });
    
    await recordPlanningAudit(runId, 'info', 'Plan evaluated.', {
      score, issues: parsed.issues ?? [], revisedCount: revisedSteps.length,
    });
    return { score, revisedSteps };
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'evaluatePlanWithLLM', runId: runId ?? null });
    return null;
  }
}

export async function verifyPlanWithLLM(args: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
}): Promise<{
  verdict?: 'pass' | 'partial' | 'fail';
  evidence?: string[];
  missing?: string[];
  followUp?: string;
} | null> {
  const { prompt, model, memory, steps, browserContext, runId } = args;
  if (steps.length === 0) return null;
  try {
    const content = await runPlanningEvaluationTask({
      model,
      systemPrompt: 'You verify task completion. Output only JSON: {verdict:\'pass\'|\'partial\'|\'fail\', evidence:[], missing:[], followUp:\'\'}.',
      userContent: JSON.stringify({
        prompt, memory, steps: steps.map(s => ({ title: s.title, status: s.status })), browserContext,
      }),
    });
    const parsed = parsePlanJson(content) as { verdict?: string; evidence?: string[]; missing?: string[]; followUp?: string; } | null;
    if (!parsed) return null;
    const verdict = (parsed.verdict === 'pass' || parsed.verdict === 'partial') ? parsed.verdict : 'fail';
    const auditLevel = verdict === 'pass' ? 'info' : 'warning';
    
    await recordPlanningAudit(runId, auditLevel, 'Plan verification completed.', {
      verdict, 
      evidence: parsed.evidence ?? [], 
      missing: parsed.missing ?? [], 
      followUp: parsed.followUp ?? null,
    });
    return { 
      verdict, 
      evidence: parsed.evidence ?? [], 
      missing: parsed.missing ?? [], 
      followUp: parsed.followUp 
    };
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'verifyPlanWithLLM', runId: runId ?? null });
    return null;
  }
}
