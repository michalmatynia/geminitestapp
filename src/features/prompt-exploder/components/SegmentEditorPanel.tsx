'use client';

import React from 'react';

import { FormSection, EmptyState } from '@/shared/ui';

import { SegmentDetailEditor } from './segment-editor/SegmentDetailEditor';
import { PromptExploderSegmentsTreeEditor } from './tree/PromptExploderSegmentsTreeEditor';
import { useDocumentState } from '../context/hooks/useDocument';

export function SegmentEditorPanel(): React.JSX.Element {
  const { documentState } = useDocumentState();

  return (
    <FormSection
      title='Segments'
      description='Edit segment content and ordering before reassembly.'
      variant='subtle'
      className='p-4'
    >
      {!documentState?.segments?.length ? (
        <EmptyState
          title='No segments yet'
          description='Run Prompt Exploder to generate editable segments.'
        />
      ) : (
        <div className='mt-3 grid gap-3 lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]'>
          <PromptExploderSegmentsTreeEditor />
          <SegmentDetailEditor />
        </div>
      )}
    </FormSection>
  );
}
