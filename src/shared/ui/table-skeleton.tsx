import React from 'react';

import { Skeleton, TableRow, TableCell } from '@/shared/ui/primitives.public';

interface TableSkeletonProps {
  rows?: number;
  columns: number;
  cellClassName?: string;
  rowClassName?: string;
}

export function TableSkeleton(props: TableSkeletonProps): React.JSX.Element {
  const { rows = 5, columns, cellClassName, rowClassName } = props;

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className={rowClassName} aria-hidden='true'>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex} className={cellClassName}>
              <Skeleton className='h-4 w-full' />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
