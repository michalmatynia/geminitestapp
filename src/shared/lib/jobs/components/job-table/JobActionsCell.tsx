'use client';

import React from 'react';
import { Eye, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui';

export interface JobActionsCellProps {
  jobId: string;
  status: string;
  onViewDetails: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete?: ((id: string) => void) | undefined;
  isCancelling?: boolean | undefined;
  isDeleting?: boolean | undefined;
}

export type JobActionsCellRuntimeValue = {
  onDelete?: ((id: string) => void) | undefined;
  isDeleting?: ((id: string) => boolean) | undefined;
};

export const JobActionsCellRuntimeContext = React.createContext<JobActionsCellRuntimeValue | null>(
  null
);

export function JobActionsCell({
  jobId,
  status,
  onViewDetails,
  onCancel,
  onDelete,
  isCancelling = false,
  isDeleting,
}: JobActionsCellProps): React.JSX.Element {
  const runtime = React.useContext(JobActionsCellRuntimeContext);
  const resolvedOnDelete = onDelete ?? runtime?.onDelete;
  const resolvedIsDeleting = isDeleting ?? runtime?.isDeleting?.(jobId) ?? false;

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
          loading={isCancelling}
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
