'use client';

import React from 'react';

import { useProductStudioContext } from '@/features/products/context/ProductStudioContext';
import { Button, FormSection, Alert, LoadingState } from '@/shared/ui';

const formatTimestamp = (value: string | null): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export function StudioAuditHistory(): React.JSX.Element {
  const { auditEntries, auditLoading, auditError, refreshAudit } = useProductStudioContext();

  return (
    <FormSection
      title='Run History & Audit'
      description='Route decisions, mode resolution, fallback reasons, and processing timings.'
    >
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          size='xs'
          variant='outline'
          onClick={() => void refreshAudit()}
          disabled={auditLoading}
          loading={auditLoading}
        >
          Refresh Audit
        </Button>
      </div>

      {auditError && (
        <Alert variant='error' className='mt-2 py-2 text-xs'>
          {auditError}
        </Alert>
      )}

      {auditLoading ? (
        <LoadingState message='Loading run audit...' />
      ) : auditEntries.length === 0 ? (
        <p className='mt-2 text-sm text-gray-400'>No run audit entries yet for this image slot.</p>
      ) : (
        <div className='mt-2 space-y-2'>
          {auditEntries.map((entry) => (
            <div
              key={entry.id}
              className='rounded border border-border/60 bg-card/20 p-2 text-xs text-gray-300'
            >
              <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                <span className='text-gray-400'>{formatTimestamp(entry.createdAt)}</span>
                <span
                  className={entry.status === 'completed' ? 'text-emerald-300' : 'text-red-300'}
                >
                  {entry.status.toUpperCase()}
                </span>
                <span>route: {entry.executionRoute}</span>
                <span>
                  mode: {entry.requestedSequenceMode} → {entry.resolvedSequenceMode}
                </span>
              </div>
              <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400'>
                <span>total: {entry.timings.totalMs}ms</span>
                {entry.errorMessage && (
                  <span className='text-red-300'>error: {entry.errorMessage}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
