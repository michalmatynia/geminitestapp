export type KangurAssignmentManagerView =
  | 'full'
  | 'catalog'
  | 'catalogWithLists'
  | 'tracking'
  | 'metrics';

export type KangurAssignmentManagerProps = {
  basePath: string;
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
