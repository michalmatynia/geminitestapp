import { randomUUID } from 'crypto';

import type { PlanHierarchy } from '@/shared/contracts/agent-runtime';

import type { PlanStepSpecInput } from './specs';

type ParsedPlanHierarchy = {
  goals?: Array<{
    title?: string;
    successCriteria?: string | null;
    priority?: number | null;
    dependsOn?: number[] | string[] | null;
    subgoals?: Array<{
      title?: string;
      successCriteria?: string | null;
      priority?: number | null;
      dependsOn?: number[] | string[] | null;
      steps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string | null;
        successCriteria?: string | null;
        phase?: string | null;
        priority?: number | null;
        dependsOn?: number[] | string[] | null;
      }>;
    }>;
  }>;
};

export function normalizePlanHierarchy(parsed: ParsedPlanHierarchy): PlanHierarchy | null {
  if (!Array.isArray(parsed.goals) || parsed.goals.length === 0) {
    return null;
  }
  const goals: PlanHierarchy['goals'] = parsed.goals.map((goal) => {
    const goalId = randomUUID();
    const subgoals = Array.isArray(goal.subgoals) ? goal.subgoals : [];
    return {
      id: goalId,
      title: (typeof goal.title === 'string' && goal.title.trim() !== '') ? goal.title.trim() : 'Primary objective',
      successCriteria: (typeof goal.successCriteria === 'string' && goal.successCriteria.trim() !== '') ? goal.successCriteria.trim() : null,
      priority: typeof goal.priority === 'number' ? goal.priority : null,
      dependsOn: Array.isArray(goal.dependsOn) ? goal.dependsOn : null,
      subgoals: subgoals.map((subgoal) => {
        const subgoalId = randomUUID();
        const steps = Array.isArray(subgoal.steps) ? subgoal.steps : [];
        return {
          id: subgoalId,
          title: (typeof subgoal.title === 'string' && subgoal.title.trim() !== '') ? subgoal.title.trim() : 'Supporting task',
          successCriteria: (typeof subgoal.successCriteria === 'string' && subgoal.successCriteria.trim() !== '') ? subgoal.successCriteria.trim() : null,
          priority: typeof subgoal.priority === 'number' ? subgoal.priority : null,
          dependsOn: Array.isArray(subgoal.dependsOn) ? subgoal.dependsOn : null,
          steps: steps.map((step) => ({
            title: (typeof step.title === 'string' && step.title.trim() !== '') ? step.title.trim() : 'Review the page state.',
            tool: step.tool === 'none' ? 'none' : ('playwright' as const),
            expectedObservation: (typeof step.expectedObservation === 'string' && step.expectedObservation.trim() !== '') ? step.expectedObservation.trim() : null,
            successCriteria: (typeof step.successCriteria === 'string' && step.successCriteria.trim() !== '') ? step.successCriteria.trim() : null,
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

export function flattenPlanHierarchy(hierarchy: PlanHierarchy): PlanStepSpecInput[] {
  const steps: PlanStepSpecInput[] = [];

  for (const goal of hierarchy.goals) {
    for (const subgoal of goal.subgoals) {
      steps.push(
        ...subgoal.steps.map((step) => ({
          ...step,
          priority: step.priority ?? subgoal.priority ?? goal.priority ?? null,
          goalId: goal.id,
          subgoalId: subgoal.id,
        }))
      );
    }
  }
  return steps;
}
