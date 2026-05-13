'use client';

import type React from 'react';

import type { PersonaMemoryRecord } from '@/shared/contracts/persona-memory';
import { Card } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';

import { formatPersonaMemoryDate } from './format-persona-memory';

type PersonaMemoryProvenancePanelProps = {
  record: PersonaMemoryRecord;
};

export function PersonaMemoryProvenancePanel({
  record,
}: PersonaMemoryProvenancePanelProps): React.JSX.Element {
  return (
    <div>
      <Hint size='xxs' uppercase className='mb-2'>
        Provenance
      </Hint>
      <Card
        variant='subtle-compact'
        padding='sm'
        className='space-y-2 border-border/60 bg-black/40 text-xs text-gray-400'
      >
        <div className='flex justify-between border-b border-white/5 pb-1'>
          <span>Record type</span>
          <span className='text-gray-200'>{record.recordType}</span>
        </div>
        <div className='flex justify-between border-b border-white/5 pb-1'>
          <span>Source</span>
          <span className='text-gray-200'>{record.sourceType ?? '-'}</span>
        </div>
        <div className='flex justify-between border-b border-white/5 pb-1'>
          <span>Source label</span>
          <span className='text-gray-200'>{record.sourceLabel ?? '-'}</span>
        </div>
        <div className='flex justify-between border-b border-white/5 pb-1'>
          <span>Original created</span>
          <span className='text-gray-200'>{formatPersonaMemoryDate(record.sourceCreatedAt)}</span>
        </div>
        <div className='flex justify-between border-b border-white/5 pb-1'>
          <span>Captured</span>
          <span className='text-gray-200'>{formatPersonaMemoryDate(record.createdAt)}</span>
        </div>
        <div className='flex justify-between border-b border-white/5 pb-1'>
          <span>Updated</span>
          <span className='text-gray-200'>{formatPersonaMemoryDate(record.updatedAt)}</span>
        </div>
        <div className='flex justify-between border-b border-white/5 pb-1'>
          <span>Session ID</span>
          <span className='font-mono text-gray-200'>{record.sessionId ?? '-'}</span>
        </div>
        <div className='flex justify-between'>
          <span>Memory key</span>
          <span className='font-mono text-gray-200'>{record.memoryKey ?? '-'}</span>
        </div>
      </Card>
    </div>
  );
}
