

import { Skeleton } from '@/shared/ui/skeleton';
import { TableCell, TableRow } from '@/shared/ui/table';

type Props = { rows?: number };

export function StepListTableSkeleton({ rows = 6 }: Props): React.JSX.Element {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className='h-4 w-36' />
          </TableCell>
          <TableCell>
            <Skeleton className='h-5 w-24 rounded-full' />
          </TableCell>
          <TableCell>
            <Skeleton className='h-4 w-48' />
          </TableCell>
          <TableCell>
            <Skeleton className='h-4 w-20' />
          </TableCell>
          <TableCell>
            <div className='flex gap-1'>
              <Skeleton className='h-4 w-12 rounded-full' />
              <Skeleton className='h-4 w-12 rounded-full' />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className='h-7 w-16' />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
