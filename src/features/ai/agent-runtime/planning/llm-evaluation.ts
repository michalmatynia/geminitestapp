import 'server-only';

import {
  OLLAMA_BASE_URL,
} from '@/features/ai/agent-runtime/core/config';
import {
  buildBranchStepsFromAlternatives,
  buildPlanStepsFromSpecs,
  flattenPlanHierarchy,
  normalizePlanHierarchy,
  normalizePlannerMeta,
  normalizeStringList,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type {
  PlanStep,
  PlannerAlternative,
  PlannerCritique,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/features/observability/server';
import prisma from '@/shared/lib/db/prisma';

import { normalizePlanStepSpecs } from './llm-step-specs';

export async function evaluatePlanWithLLM({
  prompt,
  model,
  memory,
  steps,
  hierarchy,
  meta,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
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
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You evaluate plans. Return only JSON with keys: score (0-100), issues[], revisedGoals, revisedSteps. revisedGoals uses planner schema with goal/subgoal priority and dependsOn; revisedSteps is array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step: PlanStep) => ({
                title: step.title,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
                phase: step.phase,
                priority: step.priority,
                dependsOn: step.dependsOn,
              })),
              hierarchy,
              meta,
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Planner evaluation failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? '';
    const parsed = parsePlanJson(content) as {
      score?: number;
      issues?: string[];
      revisedGoals?: Array<{
        title?: string;
        successCriteria?: string;
        subgoals?: Array<{
          title?: string;
          successCriteria?: string;
          steps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
        }>;
      }>;
      revisedSteps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
        phase?: string;
        priority?: number;
        dependsOn?: number[] | string[];
      }>;
    } | null;
    if (!parsed) return null;
    const score = typeof parsed.score === 'number' ? parsed.score : 100;
    const revisedHierarchy = parsed.revisedGoals
      ? normalizePlanHierarchy({ goals: parsed.revisedGoals })
      : null;
    const revisedSpecs =
      revisedHierarchy?.goals.length
        ? flattenPlanHierarchy(revisedHierarchy)
        : (parsed.revisedSteps ?? []);
    const revisedSteps = revisedSpecs.length
      ? buildPlanStepsFromSpecs(
        normalizePlanStepSpecs(revisedSpecs),
        meta,
        true,
        maxStepAttempts
      ).slice(0, maxSteps)
      : [];
    if ('agentAuditLog' in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Plan evaluated.',
          metadata: {
            score,
            issues: parsed.issues ?? [],
            revisedSteps: revisedSteps.map((step: PlanStep) => ({
              title: step.title,
              tool: step.tool,
              phase: step.phase,
            })),
          },
        },
      });
    }
    return { score, revisedSteps };
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Plan evaluation failed', {
      ...(runId && { runId }),
      error,
    });
    return null;
  }
}

export async function verifyPlanWithLLM({
  prompt,
  model,
  memory,
  steps,
  browserContext,
  runId,
}: {
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
  if (steps.length === 0) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You verify task completion. Return only JSON with keys: verdict (\'pass\'|\'partial\'|\'fail\'), evidence[], missing[], followUp. Evidence must reference observable facts from the context.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step: PlanStep) => ({
                title: step.title,
                status: step.status,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
                phase: step.phase,
              })),
              browserContext,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Plan verification failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? '';
    const parsed = parsePlanJson(content) as {
      verdict?: 'pass' | 'partial' | 'fail';
      evidence?: string[];
      missing?: string[];
      followUp?: string;
    } | null;
    if (!parsed) return null;
    const verdict =
      parsed.verdict === 'pass' || parsed.verdict === 'partial'
        ? parsed.verdict
        : 'fail';
    if ('agentAuditLog' in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: verdict === 'pass' ? 'info' : 'warning',
          message: 'Plan verification completed.',
          metadata: {
            verdict,
            evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
            missing: Array.isArray(parsed.missing) ? parsed.missing : [],
            followUp: parsed.followUp ?? null,
          },
        },
      });
    }
    return parsed;
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Plan verification failed', {
      ...(runId && { runId }),
      error,
    });
    return null;
  }
}

export async function buildSelfImprovementReviewWithLLM({
  prompt,
  model,
  memory,
  steps,
  verification,
  taskType,
  lastError,
  browserContext,
  runId,
}: {
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
}): Promise<{
  summary: string;
  mistakes: string[];
  improvements: string[];
  guardrails: string[];
  toolAdjustments: string[];
  confidence: number | undefined;
} | null> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are an agent self-improvement reviewer. Return only JSON with keys: summary, mistakes, improvements, guardrails, toolAdjustments, confidence. summary is a 1-2 sentence learning summary. mistakes, improvements, guardrails, toolAdjustments are short bullet strings. confidence is 0-100.',
          },
          {
            role: 'user',
            content: JSON.stringify({
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
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Self-improvement review failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? '';
    const parsed = parsePlanJson(content) as {
      summary?: string;
      mistakes?: string[];
      improvements?: string[];
      guardrails?: string[];
      toolAdjustments?: string[];
      confidence?: number;
    } | null;
    if (!parsed?.summary) return null;
    return {
      summary: parsed.summary.trim(),
      mistakes: normalizeStringList(parsed.mistakes),
      improvements: normalizeStringList(parsed.improvements),
      guardrails: normalizeStringList(parsed.guardrails),
      toolAdjustments: normalizeStringList(parsed.toolAdjustments),
      confidence:
        typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    };
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Self-improvement review failed', {
      ...(runId && { runId }),
      error,
    });
    return null;
  }
}

export async function summarizePlannerMemoryWithLLM({
  prompt,
  model,
  memory,
  steps,
  browserContext,
  runId,
}: {
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
}): Promise<string | null> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You summarize progress for long-running plans. Return only JSON with keys: summary, keyDecisions[], risks[]. Keep summary under 80 words.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step: PlanStep) => ({
                title: step.title,
                status: step.status,
                phase: step.phase,
              })),
              browserContext,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Planner summary failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? '';
    const parsed = parsePlanJson(content) as {
      summary?: string;
      keyDecisions?: string[];
      risks?: string[];
    } | null;
    if (!parsed?.summary) return null;
    const { summary } = parsed;
    const decisions = Array.isArray(parsed.keyDecisions)
      ? parsed.keyDecisions.filter((item: unknown) => typeof item === 'string')
      : [];
    const risks = Array.isArray(parsed.risks)
      ? parsed.risks.filter((item: unknown) => typeof item === 'string')
      : [];
    const packed = [
      summary,
      decisions.length ? `Decisions: ${decisions.join(' | ')}` : null,
      risks.length ? `Risks: ${risks.join(' | ')}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    if ('agentAuditLog' in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Planner memory summary created.',
          metadata: {
            summary,
            keyDecisions: decisions,
            risks,
          },
        },
      });
    }
    return packed;
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Planner summary failed', {
      ...(runId && { runId }),
      error,
    });
    return null;
  }
}

export async function buildMidRunAdaptationWithLLM({
  prompt,
  model,
  memory,
  steps,
  browserContext,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
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
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{
  shouldAdapt: boolean;
  reason?: string;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are a mid-run adaptation planner. Return only JSON with keys: shouldAdapt, reason, goals, critique, alternatives, taskType, summary, constraints, successSignals. shouldAdapt is boolean. If shouldAdapt is true, include goals (planner schema with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. summary is short. constraints and successSignals are arrays.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step: PlanStep) => ({
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              })),
              browserContext,
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Mid-run adaptation failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? '';
    const parsed = parsePlanJson(content) as {
      shouldAdapt?: boolean;
      reason?: string;
      steps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
        phase?: string;
        priority?: number;
        dependsOn?: number[] | string[];
      }>;
      goals?: Array<{
        title?: string;
        successCriteria?: string;
        subgoals?: Array<{
          title?: string;
          successCriteria?: string;
          steps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
        }>;
      }>;
      critique?: PlannerCritique;
      alternatives?: PlannerAlternative[];
      summary?: string;
      constraints?: string[];
      successSignals?: string[];
      taskType?: string;
    } | null;
    if (!parsed) return { shouldAdapt: false, steps: [] };
    if (!parsed.shouldAdapt) return { shouldAdapt: false, steps: [] };
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let stepsResult = buildPlanStepsFromSpecs(
      normalizePlanStepSpecs(stepSpecs),
      meta,
      true,
      maxStepAttempts
    ).slice(0, maxSteps);
    if (stepsResult.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives ?? undefined,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        stepsResult = fallbackBranch;
      }
    }
    const result: {
      shouldAdapt: boolean;
      reason?: string;
      steps: PlanStep[];
      hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
      meta?: PlannerMeta | null;
    } = {
      shouldAdapt: true,
      steps: stepsResult,
      hierarchy,
      meta,
    };
    if (typeof parsed.reason === 'string') {
      result.reason = parsed.reason;
    }
    return result;
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Mid-run adaptation failed', {
      ...(runId && { runId }),
      error,
    });
    return { shouldAdapt: false, steps: [] };
  }
}
