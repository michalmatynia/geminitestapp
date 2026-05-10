import 'server-only';

import {
  normalizeStringList,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type {
  PlanStep,
} from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { runPlanningEvaluationTask, recordPlanningAudit } from './core';

export interface SummarizePlannerMemoryArgs {
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
}

export async function summarizePlannerMemoryWithLLM(args: SummarizePlannerMemoryArgs): Promise<string | null> {
  const { prompt, model, memory, steps, browserContext, runId } = args;
  try {
    const content = await runPlanningEvaluationTask({
      model,
      systemPrompt:
        'You summarize progress for long-running plans. Return only JSON with keys: summary, keyDecisions[], risks[]. Keep summary under 80 words.',
      userContent: JSON.stringify({
        prompt,
        memory,
        steps: steps.map((step: PlanStep) => ({
          title: step.title,
          status: step.status,
          phase: step.phase,
        })),
        browserContext,
      }),
    });
    const parsed = parsePlanJson(content) as {
      summary?: string;
      keyDecisions?: string[];
      risks?: string[];
    } | null;
    if (!parsed?.summary?.trim()) return null;
    
    const summary = parsed.summary;
    const decisions = normalizeStringList(parsed.keyDecisions);
    const risks = normalizeStringList(parsed.risks);
    
    const packed = [
      summary,
      decisions.length > 0 ? `Decisions: ${decisions.join(' | ')}` : null,
      risks.length > 0 ? `Risks: ${risks.join(' | ')}` : null,
    ]
      .filter((line): line is string => line !== null && line !== '')
      .join('\n');
    
    await recordPlanningAudit(runId, 'info', 'Planner memory summary created.', {
      summary,
      keyDecisions: decisions,
      risks,
    });
    
    return packed;
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'summarizePlannerMemoryWithLLM', runId: runId ?? null });
    void ErrorSystem.logWarning('[chatbot][agent][engine] Planner summary failed', {
      runId: runId ?? undefined,
      error,
    });
    return null;
  }
}

export interface BuildSelfImprovementReviewArgs {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  verification?: {
    verdict?: string;
    evidence?: string[];
    missing?: string[];
  } | null;
  taskType?: string | null;
  lastError?: string | null;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
}

export async function buildSelfImprovementReviewWithLLM(args: BuildSelfImprovementReviewArgs): Promise<{
  summary: string;
  mistakes: string[];
  improvements: string[];
  guardrails: string[];
  toolAdjustments: string[];
  confidence: number | undefined;
} | null> {
  const { prompt, model, memory, steps, verification, taskType, lastError, browserContext, runId } = args;
  try {
    const content = await runPlanningEvaluationTask({
      model,
      systemPrompt:
        'You are an agent self-improvement reviewer. Return only JSON with keys: summary, mistakes, improvements, guardrails, toolAdjustments, confidence. summary is a 1-2 sentence learning summary. mistakes, improvements, guardrails, toolAdjustments are short bullet strings. confidence is 0-100.',
      userContent: JSON.stringify({
        prompt,
        memory,
        steps: steps.map((step: PlanStep) => ({
          title: step.title,
          status: step.status,
          phase: step.phase,
          successCriteria: step.successCriteria,
        })),
        taskType,
        lastError,
        verification,
        browserContext,
      }),
    });
    const parsed = parsePlanJson(content) as {
      summary?: string;
      mistakes?: string[];
      improvements?: string[];
      guardrails?: string[];
      toolAdjustments?: string[];
      confidence?: number;
    } | null;
    if (!parsed?.summary?.trim()) return null;
    return {
      summary: parsed.summary.trim(),
      mistakes: normalizeStringList(parsed.mistakes),
      improvements: normalizeStringList(parsed.improvements),
      guardrails: normalizeStringList(parsed.guardrails),
      toolAdjustments: normalizeStringList(parsed.toolAdjustments),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'buildSelfImprovementReviewWithLLM', runId: runId ?? null });
    void ErrorSystem.logWarning('[chatbot][agent][engine] Self-improvement review failed', {
      runId: runId ?? undefined,
      error,
    });
    return null;
  }
}
