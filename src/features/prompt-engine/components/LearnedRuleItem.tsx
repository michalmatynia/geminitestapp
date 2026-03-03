'use client';

import React from 'react';

import {
  Button,
  Textarea,
  FormSection,
  CopyButton,
  Alert,
  MetadataItem,
  StatusBadge,
} from '@/shared/ui';

import { usePromptEngine } from '../context/PromptEngineContext';
import { type RuleDraft } from '../context/prompt-engine-context-utils';
import { type PromptValidationSeverity } from '../settings';

const formatSeverityLabel = (severity: PromptValidationSeverity): string => {
  if (severity === 'error') return 'Error';
  if (severity === 'warning') return 'Warning';
  return 'Info';
};

const severityToVariant = (severity: PromptValidationSeverity) => {
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'info';
};

type LearnedRuleItemProps = {
  draft: RuleDraft;
};

export function LearnedRuleItem({ draft }: LearnedRuleItemProps): React.JSX.Element {
  const { handleLearnedRuleTextChange, handleRemoveLearnedRule } = usePromptEngine();
  const rule = draft.parsed;

  return (
    <FormSection
      title={rule?.title ?? 'Invalid rule'}
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex items-center gap-2'>
          <CopyButton value={draft.text} variant='ghost' size='icon' />
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleRemoveLearnedRule(draft.uid)}
          >
            Remove
          </Button>
        </div>
      }
    >
      <div className='space-y-3'>
        <Textarea
          className='min-h-[140px] font-mono text-[12px]'
          value={draft.text}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleLearnedRuleTextChange(draft.uid, event.target.value)
          }
        />
        {draft.error ? (
          <Alert variant='error' className='text-xs'>
            {draft.error}
          </Alert>
        ) : null}
        {rule ? (
          <div className='flex flex-wrap gap-4 items-center pt-1'>
            <MetadataItem label='Severity' variant='minimal'>
              <StatusBadge
                status={formatSeverityLabel(rule.severity)}
                variant={severityToVariant(rule.severity)}
                size='sm'
              />
            </MetadataItem>
            <MetadataItem label='Enabled' value={rule.enabled ? 'Yes' : 'No'} variant='minimal' />
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}
