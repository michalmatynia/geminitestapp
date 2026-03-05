'use client';

import React from 'react';

import { Card, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useRuleItemDragState } from './context/RuleListDragContext';
import { normalizeRuleScopes } from './rule-item-utils';
import { RuleItemSimilarPatternsSection } from './RuleItemSimilarPatternsSection';
import { usePromptEngineActions } from '../context/prompt-engine/PromptEngineActionsContext';
import { type RuleDraft } from '../context/prompt-engine-context-utils';
import { RuleItemProvider, useRuleItemContext } from './context/RuleItemContext';

import { RuleItemHeader } from './rule-item/RuleItemHeader';
import { RuleItemBasicSettings } from './rule-item/RuleItemBasicSettings';
import { RuleItemExploderSettings } from './rule-item/RuleItemExploderSettings';
import { RuleItemExecutionSettings } from './rule-item/RuleItemExecutionSettings';
import { RuleItemAutofixSettings } from './rule-item/RuleItemAutofixSettings';
import { RuleItemRawEditor } from './rule-item/RuleItemRawEditor';

type RuleItemProps = {
  draft: RuleDraft;
  collapsed?: boolean | undefined;
  onCollapsedChange?: ((collapsed: boolean) => void) | undefined;
};

export function RuleItem(props: RuleItemProps): React.JSX.Element {
  const { draft, collapsed, onCollapsedChange } = props;

  return (
    <RuleItemProvider draft={draft}>
      <RuleItemInner draft={draft} collapsed={collapsed} onCollapsedChange={onCollapsedChange} />
    </RuleItemProvider>
  );
}

function RuleItemInner(props: RuleItemProps): React.JSX.Element {
  const { collapsed, onCollapsedChange } = props;

  const { draft, rule } = useRuleItemContext();
  const { isDragging, isDragTarget } = useRuleItemDragState(draft.uid);
  const { handleRuleTextChange } = usePromptEngineActions();

  const [internalCollapsed, setInternalCollapsed] = React.useState(true);
  const isCollapsed = collapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  const appliesToScopes = normalizeRuleScopes(rule?.appliesToScopes);
  const sequenceValue =
    typeof rule?.sequence === 'number' && Number.isFinite(rule.sequence)
      ? String(Math.max(0, Math.floor(rule.sequence)))
      : '';

  return (
    <Card
      variant='subtle'
      padding='md'
      className={cn(
        'space-y-3 border-border/60 bg-card/40 transition-opacity',
        isDragging ? 'opacity-50' : 'opacity-100',
        isDragTarget ? 'ring-1 ring-cyan-300/55' : '',
        rule?.sequenceGroupId ? 'border-l-2 border-cyan-400/35' : ''
      )}
    >
      <RuleItemHeader isCollapsed={isCollapsed} setCollapsed={setCollapsed} />

      {!isCollapsed ? (
        <>
          {rule ? (
            <div className='space-y-4'>
              <RuleItemBasicSettings />
              <RuleItemExploderSettings />
              <RuleItemExecutionSettings />
              <RuleItemSimilarPatternsSection />
              <RuleItemAutofixSettings />
            </div>
          ) : (
            <div className='space-y-2'>
              <Textarea
                className='min-h-[180px] font-mono text-[12px]'
                value={draft.text}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleRuleTextChange(draft.uid, event.target.value)
                }
              />
              {draft.error ? (
                <div className='text-xs text-red-300'>{draft.error}</div>
              ) : (
                <div className='text-xs text-gray-400'>Fix JSON to enable visual editing.</div>
              )}
            </div>
          )}
          <RuleItemRawEditor />
        </>
      ) : (
        <div className='rounded-md border border-border/40 bg-foreground/5 px-3 py-2 text-[11px] text-gray-400'>
          {rule ? (
            <>
              Sequence: {sequenceValue || '-'} | Kind: {rule.kind}
              {' | '}
              Scopes: {appliesToScopes.length > 0 ? appliesToScopes.join(', ') : 'all'}
            </>
          ) : (
            'Invalid rule JSON. Expand to edit.'
          )}
        </div>
      )}
    </Card>
  );
}
