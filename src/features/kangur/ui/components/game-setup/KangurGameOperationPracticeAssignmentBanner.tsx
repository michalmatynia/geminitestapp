import React from 'react';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/assignments/KangurPracticeAssignmentBanner';
import type {
  KangurGameOperationSelectorAssignment,
  KangurGameOperationSelectorAssignmentMode,
} from './KangurGameOperationSelectorWidget.types';
import { useKangurGameOperationSelector } from './KangurGameOperationSelectorContext';

export function KangurGameOperationPracticeAssignmentBanner({
  assignment: propsAssignment,
  basePath: propsBasePath,
  mode: propsMode,
}: {
  assignment?: KangurGameOperationSelectorAssignment;
  basePath?: string;
  mode?: KangurGameOperationSelectorAssignmentMode;
}): React.JSX.Element | null {
  const context = useKangurGameOperationSelector();
  const assignment = propsAssignment ?? context?.operationPracticeAssignment ?? null;
  const basePath = propsBasePath ?? context?.basePath;
  const mode = propsMode ?? 'queue';

  if (!assignment || !basePath) {
    return null;
  }

  return (
    <div className='flex w-full justify-center px-4'>
      <KangurPracticeAssignmentBanner assignment={assignment} basePath={basePath} mode={mode} />
    </div>
  );
}
