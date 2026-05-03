import {
  KANGUR_CONTEXT_ROOT_IDS,
  KANGUR_RUNTIME_ENTITY_TYPES,
} from '@/features/kangur/context-registry/refs';
import type {
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type { KangurRegistryBaseData } from '../kangur-registry-types';
import {
  toAssignmentAction,
  formatAssignmentSummary,
} from '../kangur-registry-transformers';
import { loadKangurRegistryBaseData } from './loaders';

export const buildKangurAssignmentContextRuntimeDocument = async (input: {
  learnerId: string;
  assignmentId: string;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument | null> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  const assignment =
    data.evaluatedAssignments.find((entry) => entry.id === input.assignmentId) ?? null;
  if (!assignment) {
    return null;
  }
  const action = toAssignmentAction(assignment, data.snapshot.averageAccuracy);
  return {
    id: `runtime:kangur:assignment:${input.learnerId}:${input.assignmentId}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.assignmentContext,
    title: assignment.title,
    summary: formatAssignmentSummary(assignment, data.snapshot.averageAccuracy),
    status: assignment.progress.status,
    tags: ['kangur', 'assignment', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.assignmentContext],
    timestamps: {
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      finishedAt: assignment.progress.completedAt,
    },
    facts: {
      learnerId: input.learnerId,
      assignmentId: assignment.id,
      title: assignment.title,
      description: assignment.description,
      priority: assignment.priority,
      targetType: assignment.target.type,
      progressSummary: assignment.progress.summary,
      assignmentSummary: formatAssignmentSummary(assignment, data.snapshot.averageAccuracy),
      ...action,
    },
    sections: [
      {
        id: 'assignment_progress',
        kind: 'items',
        title: 'Assignment progress',
        items: [
          {
            status: assignment.progress.status,
            percent: assignment.progress.percent,
            attemptsCompleted: assignment.progress.attemptsCompleted,
            attemptsRequired: assignment.progress.attemptsRequired,
            lastActivityAt: assignment.progress.lastActivityAt,
            completedAt: assignment.progress.completedAt,
          },
        ],
      },
      {
        id: 'assignment_action',
        kind: 'items',
        title: 'Suggested action',
        items: [
          {
            actionLabel: action.actionLabel,
            actionPage: action.actionPage,
            ...(action.actionQuery ? { actionQuery: action.actionQuery } : {}),
          },
        ],
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};
