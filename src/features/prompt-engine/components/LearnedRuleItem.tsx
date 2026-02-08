'use client';

import { Copy } from 'lucide-react';
import React from 'react';

import {
  Button,
  SectionPanel,
  Textarea,
  Tooltip,
} from '@/shared/ui';

import { usePromptEngine, type RuleDraft } from '../context/PromptEngineContext';
import { PromptValidationSeverity } from '../settings';

const formatSeverityLabel = (severity: PromptValidationSeverity): string => {
  if (severity === 'error') return 'Error';
  if (severity === 'warning') return 'Warning';
  return 'Info';
};

type LearnedRuleItemProps = {
  draft: RuleDraft;
};

export function LearnedRuleItem({ draft }: LearnedRuleItemProps): React.JSX.Element {
  const { handleLearnedRuleTextChange, handleRemoveLearnedRule, handleCopy } = usePromptEngine();
  const rule = draft.parsed;

  return (
    <SectionPanel className='space-y-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='text-sm font-medium text-gray-100'>{rule?.title ?? 'Invalid rule'}</div>
        <div className='flex items-center gap-2'>
          <Tooltip content='Copy JSON'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => void handleCopy(draft.text, 'Rule')}
            >
              <Copy className='size-4' />
            </Button>
          </Tooltip>
          <Button type='button' variant='outline' size='sm' onClick={() => handleRemoveLearnedRule(draft.uid)}>
            Remove
          </Button>
        </div>
      </div>
      <Textarea
        className='min-h-[140px] font-mono text-[12px]'
        value={draft.text}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleLearnedRuleTextChange(draft.uid, event.target.value)}
      />
      {draft.error ? (
        <div className='text-xs text-red-300'>{draft.error}</div>
      ) : null}
      {rule ? (
        <div className='text-xs text-gray-400'>
          <div>Severity: {formatSeverityLabel(rule.severity)}</div>
          <div>Enabled: {rule.enabled ? 'Yes' : 'No'}</div>
        </div>
      ) : null}
    </SectionPanel>
  );
}
