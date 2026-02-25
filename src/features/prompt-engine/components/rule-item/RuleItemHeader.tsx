'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Copy, GripVertical } from 'lucide-react';
import {
  Button,
  Tooltip,
  Badge,
  StatusBadge,
} from '@/shared/ui';
import { DOCUMENTATION_MODULE_IDS } from '@/features/documentation';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import { usePromptEngine } from '../../context/PromptEngineContext';
import { useRuleItemContext } from '../context/RuleItemContext';
import { useRuleItemDragState } from '../context/RuleListDragContext';
import { formatSeverityLabel, isImageStudioRuleFromScopes, normalizeRuleScopes } from '../rule-item-utils';

export type RuleItemHeaderProps = {
  isCollapsed: boolean;
  setCollapsed: (val: boolean) => void;
};

export function RuleItemHeader({ isCollapsed, setCollapsed }: RuleItemHeaderProps): React.JSX.Element {
  const { draft, rule } = useRuleItemContext();
  const {
    draggableEnabled,
    onDragStart,
    onDragEnd,
  } = useRuleItemDragState(draft.uid);
  const {
    handleToggleRuleEnabled,
    handleDuplicateRule,
    handleRemoveRule,
    handleCopy,
  } = usePromptEngine();

  const appliesToScopes = normalizeRuleScopes(rule?.appliesToScopes);
  const launchAppliesToScopes = normalizeRuleScopes(rule?.launchAppliesToScopes);
  const isImageStudioRule = isImageStudioRuleFromScopes(
    rule,
    appliesToScopes,
    launchAppliesToScopes
  );

  const copyJsonTooltip = getDocumentationTooltip(
    DOCUMENTATION_MODULE_IDS.promptEngine,
    'rule_item_copy_json'
  ) ?? 'Copy JSON';

  return (
    <div className='flex flex-wrap items-start justify-between gap-2'>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => setCollapsed(!isCollapsed)}
          className='rounded border border-border/60 bg-card/50 p-1 text-slate-300 hover:bg-card/70'
          title={isCollapsed ? 'Expand pattern details' : 'Collapse pattern details'}
          aria-label={isCollapsed ? 'Expand pattern details' : 'Collapse pattern details'}
        >
          {isCollapsed ? <ChevronRight className='size-3.5' /> : <ChevronDown className='size-3.5' />}
        </button>
        <button
          type='button'
          draggable={draggableEnabled}
          onDragStart={(event: React.DragEvent<HTMLButtonElement>): void => {
            if (!draggableEnabled) return;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', draft.uid);
            onDragStart?.();
          }}
          onDragEnd={(): void => {
            onDragEnd?.();
          }}
          className={`rounded border p-1 ${
            draggableEnabled 
              ? 'cursor-grab border-border/60 bg-card/50 text-slate-300 hover:bg-card/70 active:cursor-grabbing' 
              : 'cursor-not-allowed border-slate-600/70 bg-slate-800/60 text-slate-300 opacity-50'
          }`}
          title='Drag and drop onto another rule to create/join a sequence group'
          aria-label='Drag and drop onto another rule to create/join a sequence group'
          disabled={!draggableEnabled}
        >
          <GripVertical className='size-3.5' />
        </button>
        {rule ? (
          <Badge variant={rule.severity === 'error' ? 'error' : rule.severity === 'warning' ? 'warning' : 'info'} className='font-bold uppercase'>
            {formatSeverityLabel(rule.severity)}
          </Badge>
        ) : (
          <Badge variant='neutral' className='font-bold uppercase'>Invalid</Badge>
        )}
        {rule ? (
          <button
            type='button'
            onClick={() => handleToggleRuleEnabled(draft.uid, !rule.enabled)}
          >
            <StatusBadge
              status={rule.enabled ? 'Enabled' : 'Disabled'}
              variant={rule.enabled ? 'active' : 'neutral'}
              size='sm'
              className='font-bold uppercase'
            />
          </button>
        ) : null}
        {isImageStudioRule ? (
          <Badge variant='info' className='border-teal-500/45 bg-teal-500/10 text-teal-200 font-bold uppercase'>
            Image Studio Rule
          </Badge>
        ) : null}
        <span className='text-sm font-medium text-gray-100'>
          {rule?.title ?? 'Invalid rule'}
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <Tooltip content={copyJsonTooltip}>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => void handleCopy(draft.text, 'Rule')}
          >
            <Copy className='size-4' />
          </Button>
        </Tooltip>
        <Button type='button' variant='outline' size='sm' onClick={() => handleDuplicateRule(draft.uid)} disabled={!rule}>
          Duplicate
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={() => handleRemoveRule(draft.uid)}>
          Remove
        </Button>
      </div>
    </div>
  );
}
