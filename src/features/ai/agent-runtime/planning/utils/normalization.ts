import type {
  PlannerAlternative,
  PlannerCritique,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';

export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item: unknown): item is string => typeof item === 'string')
    .map((item: string) => item.trim())
    .filter(Boolean);
}

export function normalizeCritique(value?: PlannerCritique | null): PlannerCritique | null {
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
    ...(assumptions.length > 0 && { assumptions }),
    ...(risks.length > 0 && { risks }),
    ...(unknowns.length > 0 && { unknowns }),
    ...(safetyChecks.length > 0 && { safetyChecks }),
    ...(questions.length > 0 && { questions }),
  } satisfies PlannerCritique;
}

function uniqStrings(values: string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (!result.includes(value)) {
      result.push(value);
    }
  }
  return result;
}

export function normalizeAlternatives(value: unknown): PlannerAlternative[] | null {
  if (!Array.isArray(value)) return null;
  const alternatives = value
    .map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return null;
      const typed = entry as PlannerAlternative;
      const title = typeof typed.title === 'string' ? typed.title.trim() : '';
      const steps = Array.isArray(typed.steps) ? typed.steps : [];
      if (!title || steps.length === 0) return null;
      return {
        title,
        rationale: typeof typed.rationale === 'string' ? typed.rationale.trim() : null,
        steps,
      } satisfies PlannerAlternative;
    })
    .filter(Boolean) as PlannerAlternative[];
  return alternatives.length ? alternatives : null;
}

export function normalizeTaskType(value: unknown): PlannerMeta['taskType'] | undefined {
  if (value === 'web_task' || value === 'extract_info') return value;
  return undefined;
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
}): PlannerMeta {
  const critique = normalizeCritique(parsed.critique ?? parsed.selfCritique);
  const safetyChecks = normalizeStringList(parsed.safetyChecks);
  const questions = normalizeStringList(parsed.questions);
  const normalizedSafetyChecks = uniqStrings([
    ...(critique?.safetyChecks ?? []),
    ...(safetyChecks ?? []),
  ]);
  const normalizedQuestions = uniqStrings([...(critique?.questions ?? []), ...(questions ?? [])]);
  const alternatives = normalizeAlternatives(parsed.alternatives);
  const taskType = normalizeTaskType(parsed.taskType);
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : null;
  const constraints = normalizeStringList(parsed.constraints);
  const successSignals = normalizeStringList(parsed.successSignals);
  return {
    ...(critique && { critique }),
    ...(alternatives && { alternatives }),
    ...(normalizedSafetyChecks.length > 0 && {
      safetyChecks: normalizedSafetyChecks,
    }),
    ...(normalizedQuestions.length > 0 && { questions: normalizedQuestions }),
    ...(taskType && { taskType }),
    ...(summary && { summary }),
    ...(constraints.length > 0 && { constraints }),
    ...(successSignals.length > 0 && { successSignals }),
  } satisfies PlannerMeta;
}
