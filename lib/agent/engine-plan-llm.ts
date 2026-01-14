import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import type {
  AgentDecision,
  PlanStep,
  PlannerAlternative,
  PlannerCritique,
  PlannerMeta,
} from "@/lib/agent/engine-types";
import {
  DEBUG_CHATBOT,
  MAX_PLAN_STEPS,
  MAX_STEP_ATTEMPTS,
  OLLAMA_BASE_URL,
  clampInt,
} from "@/lib/agent/engine-config";
import {
  buildBranchStepsFromAlternatives,
  buildPlan,
  buildPlanStepsFromSpecs,
  decideNextAction,
  flattenPlanHierarchy,
  normalizeDecision,
  normalizePlanHierarchy,
  normalizePlannerMeta,
  normalizeStringList,
  parsePlanJson,
} from "@/lib/agent/engine-plan-utils";

export async function buildPlanWithLLM({
  prompt,
  memory,
  model,
  guardModel,
  previousPlan,
  lastError,
  runId,
  browserContext,
  mode = "plan",
  failedStep,
  maxSteps: maxStepsParam,
  maxStepAttempts: maxStepAttemptsParam,
}: {
  prompt: string;
  memory: string[];
  model: string;
  guardModel?: string;
  previousPlan?: PlanStep[];
  lastError?: string | null;
  runId?: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  mode?: "plan" | "branch";
  failedStep?: {
    id: string;
    title: string;
    expectedObservation?: string | null;
    successCriteria?: string | null;
  } | null;
  maxSteps?: number;
  maxStepAttempts?: number;
}): Promise<{
  steps: PlanStep[];
  decision: AgentDecision;
  source: "llm" | "heuristic";
  branchSteps?: PlanStep[];
  meta?: PlannerMeta;
  hierarchy?: {
    goals: Array<{
      id: string;
      title: string;
      successCriteria?: string | null;
      subgoals: Array<{
        id: string;
        title: string;
        successCriteria?: string | null;
        steps: Array<{
          title: string;
          tool?: "playwright" | "none";
          expectedObservation?: string | null;
          successCriteria?: string | null;
        }>;
      }>;
    }>;
  } | null;
}> {
  const maxSteps = Math.min(Math.max(maxStepsParam ?? MAX_PLAN_STEPS, 1), 20);
  const maxStepAttempts = clampInt(
    maxStepAttemptsParam ?? MAX_STEP_ATTEMPTS,
    1,
    5,
    MAX_STEP_ATTEMPTS
  );
  const repetitionModel =
    typeof guardModel === "string" && guardModel.trim()
      ? guardModel.trim()
      : model;
  const fallbackPlanTitles = buildPlan(prompt, maxSteps);
  const fallbackSteps = fallbackPlanTitles.map((title) => ({
    id: randomUUID(),
    title,
    status: "pending" as const,
    tool: "playwright" as const,
    expectedObservation: null,
    successCriteria: null,
    phase: "act" as const,
    priority: null,
    dependsOn: null,
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));

  try {
    const systemPrompt =
      mode === "branch"
        ? "You are an agent planner. Output only JSON with keys: decision, branchSteps, critique, alternatives, taskType, summary, constraints, successSignals. decision: {action, reason, toolName}. branchSteps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. taskType is 'web_task' or 'extract_info'. summary is a 1-2 sentence plan summary. constraints is an array of key constraints. successSignals is a list of observable success indicators. Provide 1-4 alternate steps to recover from the failed step. tool is 'playwright' or 'none'."
        : `You are an agent planner. Output only JSON with keys: decision, goals, critique, alternatives, taskType, summary, constraints, successSignals. decision: {action, reason, toolName}. goals: array of {title, successCriteria, priority, dependsOn, subgoals:[{title, successCriteria, priority, dependsOn, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. taskType is 'web_task' or 'extract_info'. summary is a 1-2 sentence plan summary. constraints is an array of key constraints. successSignals is a list of observable success indicators. Use 2-4 goals, 1-3 subgoals each, and max ${maxSteps} total steps. tool is 'playwright' or 'none'. If you cannot provide goals, you may include steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              previousPlan,
              lastError,
              browserContext,
              maxSteps,
              mode,
              failedStep,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Planner LLM failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as {
      decision?: Partial<AgentDecision>;
      steps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
        phase?: string;
        priority?: number;
        dependsOn?: number[] | string[];
      }>;
      branchSteps?: Array<{
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
      taskType?: string;
      summary?: string;
      constraints?: string[];
      successSignals?: string[];
    } | null;
    if (!parsed) {
      throw new Error("Planner LLM returned invalid JSON.");
    }
    const meta = normalizePlannerMeta(parsed);
    let hierarchy = mode === "plan" ? normalizePlanHierarchy(parsed) : null;
    if (!hierarchy && mode === "plan" && Array.isArray(parsed.steps)) {
      const expanded = await expandHierarchyFromStepsWithLLM({
        prompt,
        model,
        memory,
        steps: parsed.steps,
        meta,
        runId,
      });
      if (expanded) {
        hierarchy = expanded;
      }
    }
    if (hierarchy) {
      const enriched = await enrichPlanHierarchyWithLLM({
        prompt,
        model,
        memory,
        hierarchy,
        meta,
        runId,
      });
      if (enriched) {
        hierarchy = enriched;
      }
    }
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let steps = buildPlanStepsFromSpecs(
      stepSpecs,
      meta,
      mode === "plan",
      maxStepAttempts
    ).slice(0, maxSteps);
    const dedupeResult = await dedupePlanStepsWithLLM({
      prompt,
      model: repetitionModel,
      memory,
      steps,
      meta,
      runId,
      maxSteps,
      maxStepAttempts,
    });
    if (dedupeResult.length > 0) {
      steps = dedupeResult;
    }
    const initialGuarded = await guardRepetitionWithLLM({
      prompt,
      model: repetitionModel,
      memory,
      currentPlan: steps,
      candidateSteps: steps,
      runId,
      maxSteps,
    });
    if (initialGuarded.length > 0) {
      steps = initialGuarded;
    }
    if (mode === "plan") {
      const evaluation = await evaluatePlanWithLLM({
        prompt,
        model,
        memory,
        steps,
        hierarchy,
        meta,
        runId,
        maxSteps,
        maxStepAttempts,
      });
      if (
        evaluation &&
        evaluation.score < 70 &&
        evaluation.revisedSteps.length
      ) {
        steps = evaluation.revisedSteps;
      }
      const optimization = await optimizePlanWithLLM({
        prompt,
        model: repetitionModel,
        memory,
        steps,
        hierarchy,
        meta,
        runId,
        maxSteps,
        maxStepAttempts,
      });
      if (optimization?.optimizedSteps?.length) {
        steps = optimization.optimizedSteps;
      }
    }
    const branchSpecs = (parsed.branchSteps ?? parsed.steps ?? []).slice(0, 4);
    const branchSteps = branchSpecs.map(
      (step: {
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
      }) => ({
        id: randomUUID(),
        title: step.title?.trim() || "Review the page state.",
        status: "pending" as const,
        tool: step.tool === "none" ? "none" : "playwright",
        expectedObservation: step.expectedObservation?.trim() || null,
        successCriteria: step.successCriteria?.trim() || null,
        attempts: 0,
        maxAttempts: maxStepAttempts,
      })
    );
    const fallbackBranchSteps = buildBranchStepsFromAlternatives(
      meta?.alternatives,
      maxStepAttempts,
      maxSteps
    );
    const decision = normalizeDecision(parsed.decision, steps, prompt, memory);
    return {
      steps: steps.length ? steps : fallbackSteps,
      decision,
      source: "llm",
      meta,
      hierarchy,
      branchSteps: branchSteps.length
        ? branchSteps
        : fallbackBranchSteps.length
          ? fallbackBranchSteps
          : undefined,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Planner fallback", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      steps: fallbackSteps,
      decision: decideNextAction(prompt, memory),
      source: "heuristic",
      meta: null,
    };
  }
}

export async function buildAdaptivePlanReview({
  prompt,
  memory,
  model,
  browserContext,
  currentPlan,
  completedIndex,
  runId,
  maxSteps,
  maxStepAttempts,
  trigger,
  signals,
}: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  currentPlan: PlanStep[];
  completedIndex: number;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
  trigger?: string;
  signals?: Record<string, unknown>;
}): Promise<{
  shouldReplan: boolean;
  reason?: string;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const systemPrompt =
      "You are an agent replanner. Output only JSON with keys: shouldReplan, reason, goals, critique, alternatives, taskType, summary, constraints, successSignals. shouldReplan is boolean. taskType is 'web_task' or 'extract_info'. If shouldReplan is true, include goals (same schema as planner with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. summary is a short plan summary. constraints and successSignals are arrays. The user input includes trigger and signals fields; use them to focus the replan.";
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              trigger,
              signals,
              browserContext,
              completedStepIndex: completedIndex,
              currentPlan: currentPlan.map((step) => ({
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              })),
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Planner review failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as {
      shouldReplan?: boolean;
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
    if (!parsed) {
      throw new Error("Planner review returned invalid JSON.");
    }
    const shouldReplan = Boolean(parsed.shouldReplan);
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let steps = shouldReplan
      ? buildPlanStepsFromSpecs(stepSpecs, meta, true, maxStepAttempts).slice(
          0,
          maxSteps
        )
      : [];
    if (shouldReplan && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    if (shouldReplan && steps.length === 0) {
      return { shouldReplan: false, reason: parsed.reason, steps: [] };
    }
    return {
      shouldReplan,
      reason: parsed.reason,
      steps,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Planner review fallback", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { shouldReplan: false, steps: [] };
  }
}

export async function buildSelfCheckReview({
  prompt,
  memory,
  model,
  browserContext,
  step,
  stepIndex,
  lastError,
  taskType,
  completedCount,
  previousUrl,
  lastContextUrl,
  stagnationCount,
  noContextCount,
  replanCount,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  step: PlanStep;
  stepIndex: number;
  lastError?: string | null;
  taskType?: PlannerMeta["taskType"] | null;
  completedCount?: number;
  previousUrl?: string | null;
  lastContextUrl?: string | null;
  stagnationCount?: number;
  noContextCount?: number;
  replanCount?: number;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{
  action: "continue" | "replan" | "wait_human";
  reason?: string;
  notes?: string;
  questions?: string[];
  evidence?: string[];
  confidence?: number;
  missingInfo?: string[];
  blockers?: string[];
  hypotheses?: string[];
  verificationSteps?: string[];
  toolSwitch?: string;
  abortSignals?: string[];
  finishSignals?: string[];
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const systemPrompt =
      "You are an agent self-checker. Output only JSON with keys: action, reason, notes, questions, evidence, confidence, missingInfo, blockers, hypotheses, verificationSteps, toolSwitch, abortSignals, finishSignals, goals, critique, alternatives, taskType, summary, constraints, successSignals. action is 'continue', 'replan', or 'wait_human'. Provide 5-8 self-questions that test assumptions, evidence quality, tool choice, and completion criteria. evidence is a list of observable facts from the context. confidence is 0-100. If action is 'replan', include goals (planner schema with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. toolSwitch is a short suggestion like 'use search' or 'use playwright'. abortSignals are conditions that should stop the run. finishSignals are conditions that indicate the goal is satisfied. summary is a short plan summary. constraints and successSignals are arrays.";
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              browserContext,
              taskType,
              lastError,
              completedCount,
              previousUrl,
              lastContextUrl,
              stagnationCount,
              noContextCount,
              replanCount,
              step: {
                id: step.id,
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              },
              stepIndex,
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Self-check failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as {
      action?: string;
      reason?: string;
      notes?: string;
      questions?: string[];
      evidence?: string[];
      confidence?: number;
      missingInfo?: string[];
      blockers?: string[];
      hypotheses?: string[];
      verificationSteps?: string[];
      toolSwitch?: string;
      abortSignals?: string[];
      finishSignals?: string[];
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
    if (!parsed) {
      throw new Error("Self-check returned invalid JSON.");
    }
    const action =
      parsed.action === "replan" || parsed.action === "wait_human"
        ? parsed.action
        : "continue";
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let steps =
      action === "replan"
        ? buildPlanStepsFromSpecs(stepSpecs, meta, true, maxStepAttempts).slice(
            0,
            maxSteps
          )
        : [];
    if (action === "replan" && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    return {
      action,
      reason: parsed.reason,
      notes: parsed.notes,
      questions: normalizeStringList(parsed.questions),
      evidence: normalizeStringList(parsed.evidence),
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : undefined,
      missingInfo: normalizeStringList(parsed.missingInfo),
      blockers: normalizeStringList(parsed.blockers),
      hypotheses: normalizeStringList(parsed.hypotheses),
      verificationSteps: normalizeStringList(parsed.verificationSteps),
      toolSwitch:
        typeof parsed.toolSwitch === "string"
          ? parsed.toolSwitch.trim()
          : undefined,
      abortSignals: normalizeStringList(parsed.abortSignals),
      finishSignals: normalizeStringList(parsed.finishSignals),
      steps,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Self-check fallback", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { action: "continue", steps: [] };
  }
}

export async function buildResumePlanReview({
  prompt,
  memory,
  model,
  browserContext,
  currentPlan,
  completedIndex,
  lastError,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  currentPlan: PlanStep[];
  completedIndex: number;
  lastError?: string | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{
  shouldReplan: boolean;
  reason?: string;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
  summary?: string | null;
}> {
  try {
    const systemPrompt =
      "You are an agent resume planner. Output only JSON with keys: shouldReplan, reason, goals, critique, alternatives, taskType, summary, constraints, successSignals. shouldReplan is boolean. taskType is 'web_task' or 'extract_info'. If shouldReplan is true, include goals (same schema as planner with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. summary is a short plan summary. constraints and successSignals are arrays.";
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              browserContext,
              lastError,
              completedStepIndex: completedIndex,
              currentPlan: currentPlan.map((step) => ({
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              })),
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Resume review failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as {
      shouldReplan?: boolean;
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
    if (!parsed) {
      throw new Error("Resume review returned invalid JSON.");
    }
    const shouldReplan = Boolean(parsed.shouldReplan);
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let steps = shouldReplan
      ? buildPlanStepsFromSpecs(stepSpecs, meta, true, maxStepAttempts).slice(
          0,
          maxSteps
        )
      : [];
    if (shouldReplan && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    if (shouldReplan && steps.length === 0) {
      return { shouldReplan: false, reason: parsed.reason, steps: [] };
    }
    return {
      shouldReplan,
      reason: parsed.reason,
      summary: parsed.summary?.trim() || null,
      steps,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Resume planner fallback", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { shouldReplan: false, steps: [] };
  }
}

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
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You evaluate plans. Return only JSON with keys: score (0-100), issues[], revisedGoals, revisedSteps. revisedGoals uses planner schema with goal/subgoal priority and dependsOn; revisedSteps is array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
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
    const content = payload.message?.content?.trim() ?? "";
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
    const score = typeof parsed.score === "number" ? parsed.score : 100;
    const revisedHierarchy = parsed.revisedGoals
      ? normalizePlanHierarchy({ goals: parsed.revisedGoals })
      : null;
    const revisedSpecs =
      revisedHierarchy && revisedHierarchy.goals.length
        ? flattenPlanHierarchy(revisedHierarchy)
        : (parsed.revisedSteps ?? []);
    const revisedSteps = revisedSpecs.length
      ? buildPlanStepsFromSpecs(
          revisedSpecs,
          meta,
          true,
          maxStepAttempts
        ).slice(0, maxSteps)
      : [];
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Plan evaluated.",
          metadata: {
            score,
            issues: parsed.issues ?? [],
            revisedSteps: revisedSteps.map((step) => ({
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
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan evaluation failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
}) {
  if (steps.length === 0) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You verify task completion. Return only JSON with keys: verdict ('pass'|'partial'|'fail'), evidence[], missing[], followUp. Evidence must reference observable facts from the context.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
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
    const content = payload.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as {
      verdict?: "pass" | "partial" | "fail";
      evidence?: string[];
      missing?: string[];
      followUp?: string;
    } | null;
    if (!parsed) return null;
    const verdict =
      parsed.verdict === "pass" || parsed.verdict === "partial"
        ? parsed.verdict
        : "fail";
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: verdict === "pass" ? "info" : "warning",
          message: "Plan verification completed.",
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
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan verification failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are an agent self-improvement reviewer. Return only JSON with keys: summary, mistakes, improvements, guardrails, toolAdjustments, confidence. summary is a 1-2 sentence learning summary. mistakes, improvements, guardrails, toolAdjustments are short bullet strings. confidence is 0-100.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
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
    const content = payload.message?.content?.trim() ?? "";
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
        typeof parsed.confidence === "number" ? parsed.confidence : undefined,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Self-improvement review failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You summarize progress for long-running plans. Return only JSON with keys: summary, keyDecisions[], risks[]. Keep summary under 80 words.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
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
    const content = payload.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as {
      summary?: string;
      keyDecisions?: string[];
      risks?: string[];
    } | null;
    if (!parsed?.summary) return null;
    const summary = parsed.summary.trim();
    const decisions = Array.isArray(parsed.keyDecisions)
      ? parsed.keyDecisions.filter((item) => typeof item === "string")
      : [];
    const risks = Array.isArray(parsed.risks)
      ? parsed.risks.filter((item) => typeof item === "string")
      : [];
    const packed = [
      summary,
      decisions.length ? `Decisions: ${decisions.join(" | ")}` : null,
      risks.length ? `Risks: ${risks.join(" | ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Planner memory summary created.",
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
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Planner summary failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are a mid-run adaptation planner. Return only JSON with keys: shouldAdapt, reason, goals, critique, alternatives, taskType, summary, constraints, successSignals. shouldAdapt is boolean. If shouldAdapt is true, include goals (planner schema with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. summary is short. constraints and successSignals are arrays.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
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
    const content = payload.message?.content?.trim() ?? "";
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
      stepSpecs,
      meta,
      true,
      maxStepAttempts
    ).slice(0, maxSteps);
    if (stepsResult.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        stepsResult = fallbackBranch;
      }
    }
    return {
      shouldAdapt: true,
      reason: parsed.reason,
      steps: stepsResult,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Mid-run adaptation failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { shouldAdapt: false, steps: [] };
  }
}

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
}) {
  if (steps.length < 2) return steps;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You remove redundant plan steps. Return only JSON with keys: steps. steps is array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. Remove duplicates and steps already covered.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
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
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Plan dedupe failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
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
      parsed.steps,
      meta,
      true,
      maxStepAttempts
    ).slice(0, maxSteps);
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Plan dedupe completed.",
          metadata: {
            beforeCount: steps.length,
            afterCount: dedupedSteps.length,
          },
        },
      });
    }
    return dedupedSteps;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan dedupe failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
}) {
  if (candidateSteps.length < 2) return candidateSteps;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You remove unnecessary repetition from plan steps. Return only JSON with keys: steps. steps is an array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. Remove duplicates or redundant steps already covered.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              recentSteps: currentPlan.map((step) => ({
                title: step.title,
                status: step.status,
                phase: step.phase,
              })),
              candidateSteps: candidateSteps.map((step) => ({
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
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Repetition guard failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
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
    const guarded = buildPlanStepsFromSpecs(parsed.steps, null, true).slice(
      0,
      maxSteps
    );
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Repetition guard applied.",
          metadata: {
            beforeCount: candidateSteps.length,
            afterCount: guarded.length,
          },
        },
      });
    }
    return guarded;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Repetition guard failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You generate checkpoint briefs. Return only JSON with keys: summary, nextActions[], risks[]. summary should be 1-2 sentences. nextActions are concrete next steps.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              activeStepId,
              lastError,
              steps: steps.map((step) => ({
                id: step.id,
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
      throw new Error(`Checkpoint brief failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
    const parsed = parsePlanJson(content) as {
      summary?: string;
      nextActions?: string[];
      risks?: string[];
    } | null;
    if (!parsed?.summary) return null;
    const summary = parsed.summary.trim();
    const nextActions = Array.isArray(parsed.nextActions)
      ? parsed.nextActions.filter((item) => typeof item === "string")
      : [];
    const risks = Array.isArray(parsed.risks)
      ? parsed.risks.filter((item) => typeof item === "string")
      : [];
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Checkpoint brief created.",
          metadata: {
            summary,
            nextActions,
            risks,
          },
        },
      });
    }
    return { summary, nextActions, risks };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Checkpoint brief failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
}) {
  if (steps.length < 2) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You optimize action plans. Return only JSON with keys: reason, optimizedGoals, optimizedSteps. optimizedGoals uses planner schema with goal/subgoal priority and dependsOn; optimizedSteps is array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. Keep steps concise, remove redundancy, and preserve constraints.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps: steps.map((step) => ({
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
      throw new Error(`Plan optimization failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
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
    const optimizedSpecs =
      optimizedHierarchy && optimizedHierarchy.goals.length
        ? flattenPlanHierarchy(optimizedHierarchy)
        : (parsed.optimizedSteps ?? []);
    const optimizedSteps = optimizedSpecs.length
      ? buildPlanStepsFromSpecs(
          optimizedSpecs,
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
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan optimization failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
}) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You enrich goal hierarchies for execution. Return only JSON with keys: goals. goals is array of {title, successCriteria, priority, dependsOn, subgoals:[{title, successCriteria, priority, dependsOn, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]}. Keep the same number of goals/subgoals but refine titles and steps. tool is 'playwright' or 'none'.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              hierarchy,
              meta,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Hierarchy enrichment failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
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
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Plan hierarchy enriched.",
          metadata: {
            goalCount: parsed.goals.length,
          },
        },
      });
    }
    return enriched;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan hierarchy enrichment failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
}) {
  if (!steps.length) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You convert flat steps into a goal hierarchy. Return only JSON with keys: goals. goals is array of {title, successCriteria, priority, dependsOn, subgoals:[{title, successCriteria, priority, dependsOn, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]}. Keep 2-4 goals and keep steps unchanged where possible.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              memory,
              steps,
              meta,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Hierarchy expansion failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? "";
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
    if ("agentAuditLog" in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: "info",
          message: "Plan hierarchy expanded.",
          metadata: {
            goalCount: parsed.goals.length,
          },
        },
      });
    }
    return expanded;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][engine] Plan hierarchy expansion failed", {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
