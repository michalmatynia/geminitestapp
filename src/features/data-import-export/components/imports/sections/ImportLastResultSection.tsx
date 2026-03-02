'use client';

import React from 'react';
import type { BaseImportPreflightIssue } from '@/shared/contracts/integrations';
import { useImportExport } from '@/features/data-import-export/context/ImportExportContext';
import { FormSection, Hint } from '@/shared/ui';

export function ImportLastResultSection(): React.JSX.Element | null {
  const { lastResult, activeImportRunId } = useImportExport();

  if (!lastResult) return null;

  return (
    <FormSection title='Last import summary' className='p-4'>
      <p className='mt-1 text-sm text-gray-300'>
        Run {lastResult.runId} is {lastResult.status}.
      </p>
      {lastResult.summaryMessage ? (
        <p className='mt-1 text-xs text-gray-400'>{lastResult.summaryMessage}</p>
      ) : null}
      {(lastResult.preflight?.issues?.length ?? 0) > 0 ? (
        <div className='mt-3 space-y-1 text-xs text-gray-400'>
          {lastResult.preflight?.issues?.map((issue: BaseImportPreflightIssue, index: number) => (
            <p key={`${issue.code}-${index}`}>• {issue.message}</p>
          ))}
        </div>
      ) : null}
      {activeImportRunId ? (
        <Hint className='mt-2 font-mono'>Active run: {activeImportRunId}</Hint>
      ) : null}
    </FormSection>
  );
}
