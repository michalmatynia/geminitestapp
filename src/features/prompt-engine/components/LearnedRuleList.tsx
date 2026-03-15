'use client';

import React from 'react';

import { ClientOnly, CompactEmptyState, Hint, SectionHeader, Card } from '@/shared/ui';

import { LearnedRuleItem } from './LearnedRuleItem';
import { usePromptEngineConfig } from '../context/prompt-engine/PromptEngineConfigContext';
import { usePromptEngineData } from '../context/prompt-engine/PromptEngineDataContext';

export function LearnedRuleList(): React.JSX.Element {
  const { patternTab, exploderSubTab } = usePromptEngineConfig();
  const { filteredLearnedDrafts } = usePromptEngineData();
  const tabLabel =
    patternTab === 'core'
      ? 'Core'
      : exploderSubTab === 'image_studio_rules'
        ? 'Image Studio Rules'
        : exploderSubTab === 'case_resolver_rules'
          ? 'Case Resolver Rules'
          : 'Prompt Exploder Rules';

  return (
    <div className='space-y-4'>
      <Card variant='subtle' padding='md' className='bg-card/40'>
        <SectionHeader
          title={`${tabLabel} Learned Rules`}
          description='Auto-generated patterns from prompts for the selected list. Review and edit before saving.'
          size='xs'
        />
      </Card>

      {filteredLearnedDrafts.length === 0 ? (
        <CompactEmptyState
          title='No learned patterns'
          description='No patterns have been generated for this context yet.'
         />
      ) : null}

      {filteredLearnedDrafts.map((draft) => (
        <LearnedRuleItem key={draft.uid} draft={draft} />
      ))}

      <ClientOnly>
        <Card variant='subtle' padding='md' className='bg-card/40'>
          <Hint uppercase className='mb-1'>
            Tip
          </Hint>
          <Hint>Use the Image Studio prompt tools to suggest learned patterns automatically.</Hint>
        </Card>
      </ClientOnly>
    </div>
  );
}
