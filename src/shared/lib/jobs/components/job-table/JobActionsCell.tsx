'use client';

import { Eye, XCircle, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui';

import { useJobTableActionsRuntime } from '../context/JobTableRuntimeContext';

export interface JobActionsCellProps {
  jobId: string;
  status: string;
}

export function JobActionsCell(props: JobActionsCellProps): React.JSX.Element {
  const { jobId, status } = props;
  const { onViewDetails, onCancel, onDelete, isCancelling, isDeleting } =
    useJobTableActionsRuntime();
  const resolvedOnDelete = onDelete;
  const resolvedIsDeleting = isDeleting?.(jobId) ?? false;

  return (
    <div className='flex justify-end gap-2'>
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-blue-500 hover:text-blue-400'
        onClick={() => onViewDetails(jobId)}
        aria-label='View details'
      >
        <Eye className='h-4 w-4' />
      </Button>
      {(status === 'pending' ||
        status === 'queued' ||
        status === 'queued_relist' ||
        status === 'running') && (
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-yellow-500 hover:text-yellow-400'
          onClick={() => onCancel(jobId)}
          loading={isCancelling(jobId)}
          aria-label='Cancel job'
        >
          <XCircle className='h-4 w-4' />
        </Button>
      )}
      {resolvedOnDelete && (
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-red-500 hover:text-red-400'
          onClick={() => resolvedOnDelete(jobId)}
          loading={resolvedIsDeleting}
          aria-label='Delete job'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      )}
    </div>
  );
}
