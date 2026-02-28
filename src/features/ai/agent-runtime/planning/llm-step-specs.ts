type PlanStepSpecInput = {
  title?: string;
  tool?: string;
  expectedObservation?: string | null;
  successCriteria?: string | null;
  phase?: string | null;
  priority?: number | null;
  dependsOn?: number[] | string[] | null;
  goalId?: string | null;
  subgoalId?: string | null;
};

export const normalizePlanStepSpecs = (steps: PlanStepSpecInput[]): PlanStepSpecInput[] =>
  steps.map((step: PlanStepSpecInput) => {
    const { expectedObservation, successCriteria, phase, priority, dependsOn, ...rest } = step;
    return {
      ...rest,
      ...(expectedObservation != null && { expectedObservation }),
      ...(successCriteria != null && { successCriteria }),
      ...(phase != null && { phase }),
      ...(priority != null && { priority }),
      ...(dependsOn != null && { dependsOn }),
    };
  });
