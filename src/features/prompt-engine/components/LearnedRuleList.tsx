'use client';

import React from 'react';

import { ClientOnly } from '@/shared/ui';

import { LearnedRuleItem } from './LearnedRuleItem';
import { usePromptEngine } from '../context/PromptEngineContext';

export function LearnedRuleList(): React.JSX.Element {
  const { filteredLearnedDrafts, patternTab, exploderSubTab } = usePromptEngine();
  const tabLabel =
    patternTab === 'core'
      ? 'Core'
      : exploderSubTab === 'image_studio_rules'
        ? 'Image Studio Rules'
        : 'Prompt Exploder Rules';

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <div className='text-xs uppercase text-gray-500'>{tabLabel} Learned Rules</div>
        <div className='mt-1 text-xs text-gray-400'>
          Auto-generated patterns from prompts for the selected list. Review and edit before saving.
        </div>
      </div>

      {filteredLearnedDrafts.length === 0 ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-6'>
          <div className='text-sm text-gray-400'>No learned patterns yet.</div>
        </div>
      ) : null}

      {filteredLearnedDrafts.map((draft) => (
        <LearnedRuleItem key={draft.uid} draft={draft} />
      ))}

      <ClientOnly>
        <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
          <div className='text-[11px] text-gray-500'>Tip</div>
          <div className='text-xs text-gray-400'>
            Use the Image Studio prompt tools to suggest learned patterns automatically.
          </div>
        </div>
      </ClientOnly>
    </div>
  );
}
