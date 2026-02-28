import 'server-only';

import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import {
  buildPlanStepsFromSpecs,
  flattenPlanHierarchy,
  normalizePlanHierarchy,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';
import prisma from '@/shared/lib/db/prisma';

import { normalizePlanStepSpecs } from './llm-step-specs';

const runPlanningPostprocessTask = async (input: {
  model: string;
  systemPrompt: string;
  userContent: string;
  temperature?: number;
}): Promise<string> => {
  const response = await runBrainChatCompletion({
    modelId: input.model,
    temperature: input.temperature ?? 0.2,
    jsonMode: true,
    messages: [
      {
        role: 'system',
        content: input.systemPrompt,
      },
      {
        role: 'user',
        content: input.userContent,
      },
    ],
  });
  return response.text.trim();
};

export async function dedupePlanStepsWithLLM({
  prompt,
  model,
  memory,
  steps,
  meta,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  meta?: PlannerMeta | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<PlanStep[]> {
  if (steps.length < 2) return steps;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt:
        'You remove redundant plan steps. Return only JSON with keys: steps. steps is array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. Remove duplicates and steps already covered.',
      userContent: JSON.stringify({
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
        meta,
        maxSteps,
      }),
    });
    const parsed = parsePlanJson(content) as {
      steps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
        phase?: string;
        priority?: number;
        dependsOn?: number[] | string[];
      }>;
    } | null;
    if (!parsed?.steps?.length) return steps;
    const dedupedSteps = buildPlanStepsFromSpecs(
      normalizePlanStepSpecs(parsed.steps),
      meta,
      true,
      maxStepAttempts
    ).slice(0, maxSteps);
    if ('agentAuditLog' in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Plan dedupe completed.',
          metadata: {
            beforeCount: steps.length,
            afterCount: dedupedSteps.length,
          },
        },
      });
    }
    return dedupedSteps;
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Plan dedupe failed', {
      ...(runId && { runId }),
      error,
    });
    return steps;
  }
}

export async function guardRepetitionWithLLM({
  prompt,
  model,
  memory,
  currentPlan,
  candidateSteps,
  runId,
  maxSteps,
}: {
  prompt: string;
  model: string;
  memory: string[];
  currentPlan: PlanStep[];
  candidateSteps: PlanStep[];
  runId?: string;
  maxSteps: number;
}): Promise<PlanStep[]> {
  if (candidateSteps.length < 2) return candidateSteps;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt:
        'You remove unnecessary repetition from plan steps. Return only JSON with keys: steps. steps is an array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. Remove duplicates or redundant steps already covered.',
      userContent: JSON.stringify({
        prompt,
        memory,
        recentSteps: currentPlan.map((step: PlanStep) => ({
          title: step.title,
          status: step.status,
          phase: step.phase,
        })),
        candidateSteps: candidateSteps.map((step: PlanStep) => ({
          title: step.title,
          tool: step.tool,
          expectedObservation: step.expectedObservation,
          successCriteria: step.successCriteria,
          phase: step.phase,
          priority: step.priority,
          dependsOn: step.dependsOn,
        })),
        maxSteps,
      }),
    });
    const parsed = parsePlanJson(content) as {
      steps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
        phase?: string;
        priority?: number;
        dependsOn?: number[] | string[];
      }>;
    } | null;
    if (!parsed?.steps?.length) return candidateSteps;
    const guarded = buildPlanStepsFromSpecs(normalizePlanStepSpecs(parsed.steps), null, true).slice(
      0,
      maxSteps
    );
    if ('agentAuditLog' in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Repetition guard applied.',
          metadata: {
            beforeCount: candidateSteps.length,
            afterCount: guarded.length,
          },
        },
      });
    }
    return guarded;
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Repetition guard failed', {
      ...(runId && { runId }),
      error,
    });
    return candidateSteps;
  }
}

export async function buildCheckpointBriefWithLLM({
  prompt,
  model,
  memory,
  steps,
  activeStepId,
  lastError,
  browserContext,
  runId,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
}): Promise<{ summary: string; nextActions: string[]; risks: string[] } | null> {
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt:
        'You generate checkpoint briefs. Return only JSON with keys: summary, nextActions[], risks[]. summary should be 1-2 sentences. nextActions are concrete next steps.',
      userContent: JSON.stringify({
        prompt,
        memory,
        activeStepId,
        lastError,
        steps: steps.map((step: PlanStep) => ({
          id: step.id,
          title: step.title,
          status: step.status,
          phase: step.phase,
        })),
        browserContext,
      }),
    });
    const parsed = parsePlanJson(content) as {
      summary?: string;
      nextActions?: string[];
      risks?: string[];
    } | null;
    if (!parsed?.summary) return null;
    const { summary } = parsed;
    const nextActions = Array.isArray(parsed.nextActions)
      ? parsed.nextActions.filter((item: unknown) => typeof item === 'string')
      : [];
    const risks = Array.isArray(parsed.risks)
      ? parsed.risks.filter((item: unknown) => typeof item === 'string')
      : [];
    if ('agentAuditLog' in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Checkpoint brief created.',
          metadata: {
            summary,
            nextActions,
            risks,
          },
        },
      });
    }
    return { summary, nextActions, risks };
  } catch (err) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Checkpoint brief failed', {
      ...(runId && { runId }),
      error: err,
    });
    return null;
  }
}

export async function optimizePlanWithLLM({
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
}): Promise<{
  reason: string | null;
  optimizedSteps: PlanStep[];
} | null> {
  if (steps.length < 2) return null;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt:
        'You optimize action plans. Return only JSON with keys: reason, optimizedGoals, optimizedSteps. optimizedGoals uses planner schema with goal/subgoal priority and dependsOn; optimizedSteps is array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. Keep steps concise, remove redundancy, and preserve constraints.',
      userContent: JSON.stringify({
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
    });
    const parsed = parsePlanJson(content) as {
      reason?: string;
      optimizedGoals?: Array<{
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
      optimizedSteps?: Array<{
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
    const optimizedHierarchy = parsed.optimizedGoals
      ? normalizePlanHierarchy({ goals: parsed.optimizedGoals })
      : null;
    const optimizedSpecs = optimizedHierarchy?.goals.length
      ? flattenPlanHierarchy(optimizedHierarchy)
      : (parsed.optimizedSteps ?? []);
    const optimizedSteps = optimizedSpecs.length
      ? buildPlanStepsFromSpecs(
        normalizePlanStepSpecs(optimizedSpecs),
        meta,
        true,
        maxStepAttempts
      ).slice(0, maxSteps)
      : [];
    return {
      reason: parsed.reason ?? null,
      optimizedSteps,
    };
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Plan optimization failed', {
      ...(runId && { runId }),
      error,
    });
    return null;
  }
}

export async function enrichPlanHierarchyWithLLM({
  prompt,
  model,
  memory,
  hierarchy,
  meta,
  runId,
}: {
  prompt: string;
  model: string;
  memory: string[];
  hierarchy: ReturnType<typeof normalizePlanHierarchy>;
  meta?: PlannerMeta | null;
  runId?: string;
}): Promise<ReturnType<typeof normalizePlanHierarchy> | null> {
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt:
        'You enrich goal hierarchies for execution. Return only JSON with keys: goals. goals is array of {title, successCriteria, priority, dependsOn, subgoals:[{title, successCriteria, priority, dependsOn, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]}. Keep the same number of goals/subgoals but refine titles and steps. tool is \'playwright\' or \'none\'.',
      userContent: JSON.stringify({
        prompt,
        memory,
        hierarchy,
        meta,
      }),
    });
    const parsed = parsePlanJson(content) as {
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
    } | null;
    if (!parsed?.goals?.length) return null;
    const enriched = normalizePlanHierarchy({ goals: parsed.goals });
    if (!enriched) return null;
    if ('agentAuditLog' in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Plan hierarchy enriched.',
          metadata: {
            goalCount: parsed.goals.length,
          },
        },
      });
    }
    return enriched;
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Hierarchy enrichment failed', {
      ...(runId && { runId }),
      error,
    });
    return null;
  }
}

export async function expandHierarchyFromStepsWithLLM({
  prompt,
  model,
  memory,
  steps,
  meta,
  runId,
}: {
  prompt: string;
  model: string;
  memory: string[];
  steps: Array<{
    title?: string;
    tool?: string;
    expectedObservation?: string;
    successCriteria?: string;
    phase?: string;
    priority?: number;
    dependsOn?: number[] | string[];
  }>;
  meta?: PlannerMeta | null;
  runId?: string;
}): Promise<ReturnType<typeof normalizePlanHierarchy> | null> {
  if (!steps.length) return null;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt:
        'You convert flat steps into a goal hierarchy. Return only JSON with keys: goals. goals is array of {title, successCriteria, priority, dependsOn, subgoals:[{title, successCriteria, priority, dependsOn, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]}. Keep 2-4 goals and keep steps unchanged where possible.',
      userContent: JSON.stringify({
        prompt,
        memory,
        steps,
        meta,
      }),
    });
    const parsed = parsePlanJson(content) as {
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
    } | null;
    if (!parsed?.goals?.length) return null;
    const expanded = normalizePlanHierarchy({ goals: parsed.goals });
    if (!expanded) return null;
    if ('agentAuditLog' in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Plan hierarchy expanded.',
          metadata: {
            goalCount: parsed.goals.length,
          },
        },
      });
    }
    return expanded;
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Plan hierarchy expansion failed', {
      runId,
      error,
    });
    return null;
  }
}
