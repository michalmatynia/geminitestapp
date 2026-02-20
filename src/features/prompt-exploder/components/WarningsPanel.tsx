'use client';

import React from 'react';

import { FormSection, Card } from '@/shared/ui';

import { useDocumentState } from '../context/hooks/useDocument';

export function WarningsPanel(): React.JSX.Element {
  const { documentState } = useDocumentState();

  return (
    <FormSection
      title='Warnings'
      description='Quality checks from the exploder runtime.'
      variant='subtle'
      className='p-4'
    >
      {!documentState?.warnings || documentState.warnings.length === 0 ? (
        <div className='text-xs text-gray-500'>No warnings.</div>
      ) : (
        <Card variant='warning' padding='md' className='border-amber-500/20'>
          <ul className='list-disc pl-5 text-xs text-amber-200'>
            {documentState.warnings.map((warning: string) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Card>
      )}
    </FormSection>
  );
}
