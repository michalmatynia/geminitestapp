'use client';

import { QueryErrorResetBoundary } from '@tanstack/react-query';
import React from 'react';

import { AppErrorBoundary } from './AppErrorBoundary';

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * A specialized Error Boundary for TanStack Query components.
 * Automatically hooks into the query reset boundary and leverages
 * the standard AppErrorBoundary fallback UI and observability.
 */
export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <AppErrorBoundary source='QueryErrorBoundary' onReset={reset}>
          {children}
        </AppErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
