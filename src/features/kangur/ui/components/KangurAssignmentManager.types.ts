'use client';

import type {
  KangurAssignmentCreateInput,
  KangurAssignmentSnapshot,
} from '@kangur/platform';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

export type KangurAssignmentManagerViewMode =
  | 'full'
  | 'catalog'
  | 'catalogWithLists'
  | 'tracking'
  | 'metrics';

export type KangurAssignmentManagerProps = {
  basePath: string;
  preloadedCreateAssignment?: (input: KangurAssignmentCreateInput) => Promise<unknown>;
  preloadedAssignments?: KangurAssignmentSnapshot[];
  preloadedAssignmentsError?: string | null;
  preloadedLessons?: KangurLesson[];
  preloadedLoading?: boolean;
  preloadedReassignAssignment?: (id: string) => Promise<unknown>;
  preloadedUpdateAssignment?: (id: string, input: Partial<KangurAssignmentSnapshot>) => Promise<unknown>;
  view?: KangurAssignmentManagerViewMode;
};

export type TimeLimitModalContext =
  | { mode: 'create'; catalogItemId: string }
  | { mode: 'update'; assignmentId: string };
