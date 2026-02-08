'use client';

import React from 'react';

import { SectionPanel } from '@/shared/ui';

import { RuleItem } from './RuleItem';
import { usePromptEngine } from '../context/PromptEngineContext';

export function RuleList(): React.JSX.Element {
  const { filteredDrafts } = usePromptEngine();

  return (
    <div className='space-y-4'>
      {filteredDrafts.length === 0 ? (
        <SectionPanel>
          <div className='text-sm text-gray-400'>No rules match this filter.</div>
        </SectionPanel>
      ) : null}
      {filteredDrafts.map((draft) => (
        <RuleItem key={draft.uid} draft={draft} />
      ))}
    </div>
  );
}
