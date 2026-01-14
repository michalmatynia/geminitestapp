import { randomUUID } from "crypto";
import type {
  AgentDecision,
  PlanStep,
  PlannerAlternative,
  PlannerCritique,
  PlannerMeta,
} from "@/lib/agent/engine-types";
import { MAX_PLAN_STEPS, MAX_STEP_ATTEMPTS } from "@/lib/agent/engine-config";

export function parsePlanJson(content: string): unknown {
  if (!content) return null;
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch ? fencedMatch[1] : content;
  const match = raw.match(/\{[\s\S]*\}$/);
  const jsonText = match ? match[0] : raw;
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return parsed;
  } catch {
    return null;
  }
}

export function normalizePlannerMeta(parsed: {
  critique?: PlannerCritique;
  selfCritique?: PlannerCritique;
  alternatives?: PlannerAlternative[];
  safetyChecks?: string[];
  questions?: string[];
  taskType?: string;
  summary?: string;
  constraints?: string[];
  successSignals?: string[];
}) {
  const critique = normalizeCritique(parsed.critique ?? parsed.selfCritique);
  const safetyChecks = normalizeStringList(parsed.safetyChecks);
  const questions = normalizeStringList(parsed.questions);
  const normalizedSafetyChecks = [
    ...new Set([...(critique?.safetyChecks ?? []), ...(safetyChecks ?? [])]),
  ];
  const normalizedQuestions = [
    ...new Set([...(critique?.questions ?? []), ...(questions ?? [])]),
  ];
  const alternatives = normalizeAlternatives(parsed.alternatives);
  const taskType = normalizeTaskType(parsed.taskType);
  const summary =
    typeof parsed.summary === "string" ? parsed.summary.trim() : null;
  const constraints = normalizeStringList(parsed.constraints);
  const successSignals = normalizeStringList(parsed.successSignals);
  return {
    critique,
    alternatives,
    safetyChecks: normalizedSafetyChecks.length
      ? normalizedSafetyChecks
      : undefined,
    questions: normalizedQuestions.length ? normalizedQuestions : undefined,
    taskType,
    summary: summary || undefined,
    constraints: constraints.length ? constraints : undefined,
    successSignals: successSignals.length ? successSignals : undefined,
  } satisfies PlannerMeta;
}

export function normalizeCritique(value?: PlannerCritique | null) {
  if (!value) return null;
  const assumptions = normalizeStringList(value.assumptions);
  const risks = normalizeStringList(value.risks);
  const unknowns = normalizeStringList(value.unknowns);
  const safetyChecks = normalizeStringList(value.safetyChecks);
  const questions = normalizeStringList(value.questions);
  const hasAny =
    assumptions.length ||
    risks.length ||
    unknowns.length ||
    safetyChecks.length ||
    questions.length;
  if (!hasAny) return null;
  return {
    assumptions: assumptions.length ? assumptions : undefined,
    risks: risks.length ? risks : undefined,
    unknowns: unknowns.length ? unknowns : undefined,
    safetyChecks: safetyChecks.length ? safetyChecks : undefined,
    questions: questions.length ? questions : undefined,
  } satisfies PlannerCritique;
}

export function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeAlternatives(value: unknown) {
  if (!Array.isArray(value)) return null;
  const alternatives = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const typed = entry as PlannerAlternative;
      const title = typeof typed.title === "string" ? typed.title.trim() : "";
      const steps = Array.isArray(typed.steps) ? typed.steps : [];
      if (!title || steps.length === 0) return null;
      return {
        title,
        rationale:
          typeof typed.rationale === "string" ? typed.rationale.trim() : null,
        steps,
      } satisfies PlannerAlternative;
    })
    .filter(Boolean) as PlannerAlternative[];
  return alternatives.length ? alternatives : null;
}

export function normalizeTaskType(value: unknown) {
  if (value === "web_task" || value === "extract_info") return value;
  return undefined;
}

export function buildSafetyCheckSteps(
  meta?: PlannerMeta,
  maxStepAttempts = MAX_STEP_ATTEMPTS
): PlanStep[] {
  const checks = [
    ...(meta?.safetyChecks ?? []),
    ...(meta?.critique?.safetyChecks ?? []),
  ]
    .map((check) => check.trim())
    .filter(Boolean);
  if (checks.length === 0) return [];
  const limited = checks.slice(0, 3);
  return limited.map((check) => ({
    id: randomUUID(),
    title: `Safety check: ${check}`,
    status: "pending" as const,
    tool: "none" as const,
    expectedObservation: null,
    successCriteria: null,
    phase: "observe" as const,
    priority: null,
    dependsOn: null,
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));
}

export function buildVerificationSteps(
  meta?: PlannerMeta,
  maxStepAttempts = MAX_STEP_ATTEMPTS
): PlanStep[] {
  const signals = meta?.successSignals ?? [];
  if (signals.length === 0) return [];
  const limited = signals.slice(0, 3);
  return limited.map((signal) => ({
    id: randomUUID(),
    title: `Verify: ${signal}`,
    status: "pending" as const,
    tool: "none" as const,
    expectedObservation: null,
    successCriteria: null,
    phase: "verify" as const,
    priority: null,
    dependsOn: null,
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));
}

export function buildPlanStepsFromSpecs(
  stepSpecs: Array<{
    title?: string;
    tool?: string;
    expectedObservation?: string;
    successCriteria?: string;
    phase?: string;
    priority?: number;
    dependsOn?: number[] | string[];
    goalId?: string | null;
    subgoalId?: string | null;
  }>,
  meta?: PlannerMeta | null,
  includeSafety = false,
  maxStepAttempts = MAX_STEP_ATTEMPTS
): PlanStep[] {
  const preflightSteps = includeSafety
    ? buildSafetyCheckSteps(meta ?? undefined, maxStepAttempts)
    : [];
  const plannedSteps: PlanStep[] = stepSpecs.map((step, index) => ({
    id: randomUUID(),
    title: step.title?.trim() || "Review the page state.",
    status: "pending" as const,
    tool: step.tool === "none" ? "none" : "playwright",
    expectedObservation: step.expectedObservation?.trim() || null,
    successCriteria: step.successCriteria?.trim() || null,
    goalId: step.goalId ?? null,
    subgoalId: step.subgoalId ?? null,
    phase: normalizePhase(step.phase),
    priority: typeof step.priority === "number" ? step.priority : null,
    dependsOn: normalizeDependencies(step.dependsOn, stepSpecs),
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));
  const verificationSteps = includeSafety
    ? buildVerificationSteps(meta ?? undefined, maxStepAttempts)
    : [];
  return [...preflightSteps, ...plannedSteps, ...verificationSteps];
}

export function buildBranchStepsFromAlternatives(
  alternatives: PlannerAlternative[] | undefined,
  maxStepAttempts: number,
  maxSteps: number
) {
  if (!alternatives?.length) return [];
  const specs = alternatives.flatMap((alt) => {
    if (alt.steps?.length) {
      return alt.steps.map((step) => ({
        ...step,
        phase: step.phase ?? "recover",
      }));
    }
    if (alt.title?.trim()) {
      return [
        {
          title: alt.title.trim(),
          tool: "playwright",
          phase: "recover",
        },
      ];
    }
    return [];
  });
  if (specs.length === 0) return [];
  return buildPlanStepsFromSpecs(specs, null, true, maxStepAttempts).slice(
    0,
    maxSteps
  );
}

export function normalizePhase(value?: string) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "observe") return "observe";
  if (normalized === "act") return "act";
  if (normalized === "verify") return "verify";
  if (normalized === "recover") return "recover";
  return null;
}

export function normalizeDependencies(
  value: number[] | string[] | undefined,
  stepSpecs: Array<{ title?: string }>
) {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (typeof value[0] === "number") {
    return (value as number[])
      .filter(
        (idx) => Number.isInteger(idx) && idx >= 0 && idx < stepSpecs.length
      )
      .map((idx) => `step-${idx}`);
  }
  if (typeof value[0] === "string") {
    const names = value as string[];
    return names
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => {
        const found = stepSpecs.findIndex(
          (spec) => spec.title?.trim().toLowerCase() === name.toLowerCase()
        );
        return found >= 0 ? `step-${found}` : null;
      })
      .filter(Boolean) as string[];
  }
  return null;
}

export function normalizePlanHierarchy(parsed: {
  goals?: Array<{
    title?: string;
    successCriteria?: string;
    priority?: number;
    dependsOn?: number[] | string[];
    subgoals?: Array<{
      title?: string;
      successCriteria?: string;
      priority?: number;
      dependsOn?: number[] | string[];
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
}) {
  if (!Array.isArray(parsed.goals) || parsed.goals.length === 0) {
    return null;
  }
  const goals = parsed.goals.map((goal) => {
    const goalId = randomUUID();
    const subgoals = Array.isArray(goal.subgoals) ? goal.subgoals : [];
    return {
      id: goalId,
      title: goal.title?.trim() || "Primary objective",
      successCriteria: goal.successCriteria?.trim() || null,
      priority: typeof goal.priority === "number" ? goal.priority : null,
      dependsOn: Array.isArray(goal.dependsOn) ? goal.dependsOn : null,
      subgoals: subgoals.map((subgoal) => {
        const subgoalId = randomUUID();
        const steps = Array.isArray(subgoal.steps) ? subgoal.steps : [];
        return {
          id: subgoalId,
          title: subgoal.title?.trim() || "Supporting task",
          successCriteria: subgoal.successCriteria?.trim() || null,
          priority:
            typeof subgoal.priority === "number" ? subgoal.priority : null,
          dependsOn: Array.isArray(subgoal.dependsOn)
            ? subgoal.dependsOn
            : null,
          steps: steps.map((step) => ({
            title: step.title?.trim() || "Review the page state.",
            tool: step.tool === "none" ? "none" : "playwright",
            expectedObservation: step.expectedObservation?.trim() || null,
            successCriteria: step.successCriteria?.trim() || null,
            phase: step.phase ?? null,
            priority: step.priority ?? null,
            dependsOn: step.dependsOn ?? null,
          })),
        };
      }),
    };
  });
  return { goals };
}

export function flattenPlanHierarchy(hierarchy: {
  goals: Array<{
    id: string;
    title: string;
    successCriteria?: string | null;
    priority?: number | null;
    dependsOn?: number[] | string[] | null;
    subgoals: Array<{
      id: string;
      title: string;
      successCriteria?: string | null;
      priority?: number | null;
      dependsOn?: number[] | string[] | null;
      steps: Array<{
        title: string;
        tool?: "playwright" | "none";
        expectedObservation?: string | null;
        successCriteria?: string | null;
        phase?: string | null;
        priority?: number | null;
        dependsOn?: number[] | string[] | null;
      }>;
    }>;
  }>;
}) {
  const steps: Array<{
    title: string;
    tool?: "playwright" | "none";
    expectedObservation?: string | null;
    successCriteria?: string | null;
    phase?: string | null;
    priority?: number | null;
    dependsOn?: number[] | string[] | null;
    goalId?: string | null;
    subgoalId?: string | null;
  }> = [];
  for (const goal of hierarchy.goals) {
    for (const subgoal of goal.subgoals) {
      for (const step of subgoal.steps) {
        const priority =
          typeof step.priority === "number"
            ? step.priority
            : typeof subgoal.priority === "number"
              ? subgoal.priority
              : typeof goal.priority === "number"
                ? goal.priority
                : null;
        steps.push({
          ...step,
          priority,
          goalId: goal.id,
          subgoalId: subgoal.id,
        });
      }
    }
  }
  return steps;
}

export function decideNextAction(
  prompt: string,
  memory: string[]
): AgentDecision {
  const lower = prompt.toLowerCase();
  if (lower.includes("browse") || lower.includes("website")) {
    return {
      action: "tool",
      reason: "Prompt implies browser automation.",
      toolName: "playwright",
    };
  }
  if (
    lower.includes("login") ||
    lower.includes("log in") ||
    lower.includes("sign in") ||
    lower.includes("signin")
  ) {
    return {
      action: "tool",
      reason: "Prompt includes a login flow.",
      toolName: "playwright",
    };
  }

  if (memory.length > 0) {
    return {
      action: "respond",
      reason: "Sufficient context to respond in scaffold.",
    };
  }

  return {
    action: "wait_human",
    reason: "Not enough context; human input required.",
  };
}

export function buildPlan(prompt: string, maxSteps = MAX_PLAN_STEPS): string[] {
  const normalized = prompt.trim();
  if (!normalized) return [];
  const lower = normalized.toLowerCase();
  const steps: string[] = [];

  if (
    lower.includes("login") ||
    lower.includes("log in") ||
    lower.includes("sign in") ||
    lower.includes("signin")
  ) {
    steps.push("Open the target website.");
    steps.push("Locate the sign-in form.");
    steps.push("Fill in the credentials.");
    steps.push("Submit the form and wait for the next page.");
    steps.push("Verify the expected page or account state.");
  } else if (lower.includes("browse") || lower.includes("website")) {
    steps.push("Open the target URL.");
    steps.push("Wait for the page to finish loading.");
    steps.push("Locate the requested content.");
    steps.push("Capture the relevant details.");
  } else {
    const sentences = normalized
      .split(/[.!?]\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      steps.push(sentence);
      if (steps.length >= maxSteps) break;
    }
  }

  return steps.slice(0, maxSteps);
}

export function normalizeDecision(
  decision: Partial<AgentDecision> | undefined,
  steps: PlanStep[],
  prompt: string,
  memory: string[]
): AgentDecision {
  if (decision?.action === "tool") {
    return {
      action: "tool",
      reason: decision.reason ?? "LLM planner selected tool execution.",
      toolName: decision.toolName ?? "playwright",
    };
  }
  if (decision?.action === "respond") {
    return {
      action: "respond",
      reason: decision.reason ?? "LLM planner selected response.",
    };
  }
  if (decision?.action === "wait_human") {
    return {
      action: "wait_human",
      reason: decision.reason ?? "LLM planner requires human input.",
    };
  }
  if (steps.length > 0) {
    return {
      action: "tool",
      reason: "Plan generated; execute tool steps.",
      toolName: "playwright",
    };
  }
  return decideNextAction(prompt, memory);
}

export function shouldEvaluateReplan(
  stepIndex: number,
  steps: PlanStep[],
  replanEverySteps: number
) {
  if (steps.length < 3) return false;
  const nextIndex = stepIndex + 1;
  if (nextIndex >= steps.length) return false;
  return nextIndex % replanEverySteps === 0;
}

export function appendTaskTypeToPrompt(
  prompt: string,
  taskType: PlannerMeta["taskType"] | null
) {
  if (!taskType) return prompt;
  return `${prompt}\n\nTask type: ${taskType}`;
}

export function isExtractionStep(
  step: PlanStep,
  prompt: string,
  taskType: PlannerMeta["taskType"] | null
) {
  if (taskType === "extract_info") return true;
  const combined =
    `${step.title} ${step.expectedObservation ?? ""} ${prompt}`.toLowerCase();
  const mentionsExtract = /(extract|collect|find|list|get)\b/.test(combined);
  const mentionsTarget = /(product|email)/.test(combined);
  return mentionsExtract && mentionsTarget;
}
