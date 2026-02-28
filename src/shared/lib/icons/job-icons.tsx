'use client';

import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import React from 'react';

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
      return <XCircle className='size-3' />;
    case 'failed':
    case 'needs_login':
    case 'auth_required':
    case 'error':
      return <XCircle className='size-3' />;
    case 'processing':
    case 'running':
    case 'in_progress':
      return <Loader2 className='size-3 animate-spin' />;
    default:
      return <Clock className='size-3' />;
  }
};
