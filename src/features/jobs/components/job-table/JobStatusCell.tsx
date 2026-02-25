'use client';

import React from 'react';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/shared/ui';

export const getStatusIcon = (status: string): React.JSX.Element => {
  switch (status) {
    case 'pending':
    case 'queued':
    case 'queued_relist':
      return <Clock className='size-3' />;
    case 'completed':
    case 'success':
    case 'listed':
      return <CheckCircle className='size-3' />;
    case 'deleted':
    case 'removed':
    case 'failed':
    case 'needs_login':
    case 'auth_required':
    case 'error':
    case 'canceled':
    case 'cancelled':
      return <XCircle className='size-3' />;
    case 'processing':
    case 'running':
    case 'in_progress':
      return <Loader2 className='size-3 animate-spin' />;
    default:
      return <Clock className='size-3' />;
  }
};

export function JobStatusCell({ status, errorMessage }: { status: string; errorMessage?: string | null }): React.JSX.Element {
  return (
    <div className='flex flex-col gap-1'>
      <StatusBadge status={status} icon={getStatusIcon(status)} />
      {errorMessage && (
        <div className='max-w-[200px] truncate text-[10px] text-red-400' title={errorMessage}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}
