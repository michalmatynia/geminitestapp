export type PlanStepSpecInput = {
  title?: string;
  tool?: string;
  expectedObservation?: string | null | undefined;
  successCriteria?: string | null | undefined;
  phase?: string | null | undefined;
  priority?: number | null | undefined;
  dependsOn?: number[] | string[] | null | undefined;
  goalId?: string | null | undefined;
  subgoalId?: string | null | undefined;
};

export const normalizePlanStepSpecs = (
  steps: PlanStepSpecInput[]
): PlanStepSpecInput[] =>
  steps.map((step: PlanStepSpecInput): PlanStepSpecInput => {
    const { expectedObservation, successCriteria, phase, priority, dependsOn, ...rest } = step;
    const nextDependsOn = Array.isArray(dependsOn) ? dependsOn : undefined;
    return {
      ...rest,
      ...(typeof expectedObservation === 'string' ? { expectedObservation } : {}),
      ...(typeof successCriteria === 'string' ? { successCriteria } : {}),
      ...(typeof phase === 'string' ? { phase } : {}),
      ...(typeof priority === 'number' ? { priority } : {}),
      ...(nextDependsOn ? { dependsOn: nextDependsOn } : {}),
    };
  });
