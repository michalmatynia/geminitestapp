import React from 'react';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/assignments/KangurPracticeAssignmentBanner';
import type {
  KangurGameOperationSelectorAssignment,
  KangurGameOperationSelectorAssignmentMode,
} from './KangurGameOperationSelectorWidget.types';

export function KangurGameOperationPracticeAssignmentBanner({
  assignment,
  basePath,
  mode,
}: {
  assignment: KangurGameOperationSelectorAssignment;
  basePath: string;
  mode: KangurGameOperationSelectorAssignmentMode;
}): React.JSX.Element | null {
  if (!assignment) {
    return null;
  }

  return (
    <div className='flex w-full justify-center px-4'>
      <KangurPracticeAssignmentBanner assignment={assignment} basePath={basePath} mode={mode} />
    </div>
  );
}
