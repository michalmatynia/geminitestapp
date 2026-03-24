import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentUpdateInput,
} from '@kangur/platform';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

export type KangurAssignmentManagerView =
  | 'full'
  | 'catalog'
  | 'catalogWithLists'
  | 'tracking'
  | 'metrics';

export type KangurAssignmentManagerProps = {
  basePath: string;
  preloadedCreateAssignment?: (
    input: KangurAssignmentCreateInput
  ) => Promise<KangurAssignmentSnapshot>;
  preloadedAssignments?: KangurAssignmentSnapshot[];
  preloadedAssignmentsError?: string | null;
  preloadedLessons?: KangurLesson[];
  preloadedLoading?: boolean;
  preloadedReassignAssignment?: (id: string) => Promise<KangurAssignmentSnapshot>;
  preloadedUpdateAssignment?: (
    id: string,
    input: KangurAssignmentUpdateInput
  ) => Promise<KangurAssignmentSnapshot>;
  view?: KangurAssignmentManagerView;
};

export type TimeLimitModalContext =
  | {
      mode: 'update';
      assignmentId: string;
    }
  | {
      mode: 'create';
      catalogItemId: string;
    };
