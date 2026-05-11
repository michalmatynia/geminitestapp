import { ChevronDown, ChevronRight, Copy, GripVertical } from 'lucide-react';
import React from 'react';

import { getDocumentationTooltip } from '@/shared/lib/documentation/tooltips';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import type { PromptValidationRule } from '@/shared/lib/prompt-engine/settings';
import { Badge, Button, Tooltip } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';

import { useRuleItemContext } from './context/RuleItemContext';
import { useRuleItemDragState } from './context/RuleListDragContext';
import {
  formatSeverityLabel,
  isImageStudioRuleFromScopes,
  normalizeRuleScopes,
} from './rule-item-utils';
import { usePromptEngineActions } from '../context/PromptEngineContext';

type RuleHeaderRule = Pick<PromptValidationRule, 'enabled' | 'severity' | 'title'>;
type SeverityVariant = 'error' | 'warning' | 'info';

const getSeverityVariant = (severity: RuleHeaderRule['severity'] | undefined): SeverityVariant => {
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'info';
};

const getSeverityLabel = (rule: RuleHeaderRule | null | undefined): string => {
  if (!rule) return 'Invalid';
  return formatSeverityLabel(rule.severity);
};

const getRuleTitle = (rule: RuleHeaderRule | null | undefined): string =>
  rule?.title ?? 'Invalid rule';

const getCollapseButtonCopy = (
  isCollapsed: boolean
): { title: string; ariaLabel: string; icon: React.JSX.Element } => {
  if (isCollapsed) {
    return {
      title: 'Expand pattern details',
      ariaLabel: 'Expand pattern details',
      icon: <ChevronRight className='size-3.5' />,
    };
  }
  return {
    title: 'Collapse pattern details',
    ariaLabel: 'Collapse pattern details',
    icon: <ChevronDown className='size-3.5' />,
  };
};

type RuleItemHeaderProps = {
  isCollapsed: boolean;
  setCollapsed: (val: boolean) => void;
};

type RuleEnabledButtonProps = {
  rule: RuleHeaderRule | null;
  draftUid: string;
  onToggle: (uid: string, enabled: boolean) => void;
};

function RuleEnabledButton({ rule, draftUid, onToggle }: RuleEnabledButtonProps): React.JSX.Element | null {
  if (!rule) return null;
  return (
    <button
      type='button'
      onClick={() => onToggle(draftUid, !rule.enabled)}
      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
      title='Toggle rule'
      aria-pressed={rule.enabled}
    >
      <StatusBadge
        status={rule.enabled ? 'Enabled' : 'Disabled'}
        variant={rule.enabled ? 'active' : 'neutral'}
        size='sm'
        className='font-bold uppercase'
      />
    </button>
  );
}

type RuleSeverityBadgeProps = {
  rule: RuleHeaderRule | null;
  severityVariant: SeverityVariant;
  severityLabel: string;
};

function RuleSeverityBadge({
  rule,
  severityVariant,
  severityLabel,
}: RuleSeverityBadgeProps): React.JSX.Element {
  if (!rule) {
    return (
      <Badge variant='neutral' className='font-bold uppercase'>
        Invalid
      </Badge>
    );
  }
  return (
    <Badge variant={severityVariant} className='font-bold uppercase'>
      {severityLabel}
    </Badge>
  );
}

type DragStateButtonProps = {
  draggableEnabled: boolean;
  draftUid: string;
  onDragStart: () => void;
  onDragEnd: () => void;
};

function DragStateButton({
  draggableEnabled,
  draftUid,
  onDragStart,
  onDragEnd,
}: DragStateButtonProps): React.JSX.Element {
  return (
    <button
      type='button'
      draggable={draggableEnabled}
      onDragStart={(event: React.DragEvent<HTMLButtonElement>): void => {
        if (!draggableEnabled) return;
        const { dataTransfer } = event;
        dataTransfer.effectAllowed = 'move';
        dataTransfer.setData('text/plain', draftUid);
        onDragStart();
      }}
      onDragEnd={() => {
        onDragEnd();
      }}
      className={`rounded border p-1 ${draggableEnabled ? 'cursor-grab border-border/60 bg-card/50 text-slate-300 hover:bg-card/70 active:cursor-grabbing' : 'cursor-not-allowed border-slate-600/70 bg-slate-800/60 text-slate-300 opacity-50'}`}
      title='Drag and drop onto another rule to create/join a sequence group'
      aria-label='Drag and drop onto another rule to create/join a sequence group'
      disabled={!draggableEnabled}
    >
      <GripVertical className='size-3.5' />
    </button>
  );
}

type RuleTitleProps = {
  title: string;
};

function RuleTitle({ title }: RuleTitleProps): React.JSX.Element {
  return <span className='text-sm font-medium text-gray-100'>{title}</span>;
}

type CollapseCopy = {
  title: string;
  ariaLabel: string;
  icon: React.JSX.Element;
};

type RuleItemHeaderActionsProps = {
  copyJsonTooltip: string;
  draftUid: string;
  onCopy: () => void;
  onDuplicate: (uid: string) => void;
  onRemove: (uid: string) => void;
  hasRule: boolean;
};

function RuleItemHeaderActions({
  copyJsonTooltip,
  draftUid,
  onCopy,
  onDuplicate,
  onRemove,
  hasRule,
}: RuleItemHeaderActionsProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <Tooltip content={copyJsonTooltip}>
        <Button type='button' variant='ghost' size='icon' onClick={onCopy} aria-label={copyJsonTooltip} title={copyJsonTooltip}>
          <Copy className='size-4' />
        </Button>
      </Tooltip>
      <Button type='button' variant='outline' size='sm' onClick={() => onDuplicate(draftUid)} disabled={!hasRule}>
        Duplicate
      </Button>
      <Button type='button' variant='outline' size='sm' onClick={() => onRemove(draftUid)}>
        Remove
      </Button>
    </div>
  );
}

type RuleItemHeaderLeftSectionProps = {
  isCollapsed: boolean;
  setCollapsed: (val: boolean) => void;
  collapseCopy: CollapseCopy;
  draggableEnabled: boolean;
  draftUid: string;
  onDragStart: () => void;
  onDragEnd: () => void;
  rule: RuleHeaderRule | null;
  severityVariant: SeverityVariant;
  severityLabel: string;
  isImageStudioRule: boolean;
  ruleTitle: string;
  onToggleRuleEnabled: (uid: string, enabled: boolean) => void;
};

function RuleItemHeaderLeftSection({
  isCollapsed,
  setCollapsed,
  collapseCopy,
  draggableEnabled,
  draftUid,
  onDragStart,
  onDragEnd,
  rule,
  severityVariant,
  severityLabel,
  isImageStudioRule,
  ruleTitle,
  onToggleRuleEnabled,
}: RuleItemHeaderLeftSectionProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <button
        type='button'
        onClick={() => setCollapsed(!isCollapsed)}
        className='rounded border border-border/60 bg-card/50 p-1 text-slate-300 hover:bg-card/70'
        title={collapseCopy.title}
        aria-label={collapseCopy.ariaLabel}
      >
        {collapseCopy.icon}
      </button>
      <DragStateButton
        draggableEnabled={draggableEnabled}
        draftUid={draftUid}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
      <RuleSeverityBadge
        rule={rule}
        severityVariant={severityVariant}
        severityLabel={severityLabel}
      />
      <RuleEnabledButton rule={rule} draftUid={draftUid} onToggle={onToggleRuleEnabled} />
      {isImageStudioRule ? <ImageStudioRuleBadge /> : null}
      <RuleTitle title={ruleTitle} />
    </div>
  );
}

function ImageStudioRuleBadge(): React.JSX.Element {
  return (
    <Badge variant='info' className='border-teal-500/45 bg-teal-500/10 text-teal-200 font-bold uppercase'>
      Image Studio Rule
    </Badge>
  );
}

export function RuleItemHeader({
  isCollapsed,
  setCollapsed,
}: RuleItemHeaderProps): React.JSX.Element {
  const { draft, rule } = useRuleItemContext();
  const {
    draggableEnabled,
    onDragStart: emitDragStart,
    onDragEnd: emitDragEnd,
  } = useRuleItemDragState(draft.uid);
  const { handleToggleRuleEnabled, handleDuplicateRule, handleRemoveRule, handleCopy } =
    usePromptEngineActions();

  const appliesToScopes = normalizeRuleScopes(rule?.appliesToScopes);
  const launchAppliesToScopes = normalizeRuleScopes(rule?.launchAppliesToScopes);
  const isImageStudioRule = isImageStudioRuleFromScopes(rule, appliesToScopes, launchAppliesToScopes);
  const severityVariant = getSeverityVariant(rule?.severity);
  const severityLabel = getSeverityLabel(rule);
  const ruleTitle = getRuleTitle(rule);
  const collapseCopy = getCollapseButtonCopy(isCollapsed);

  const copyJsonTooltip =
    getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.promptEngine, 'rule_item_copy_json') ??
    'Copy JSON';

  return (
    <div className='flex flex-wrap items-start justify-between gap-2'>
      <RuleItemHeaderLeftSection
        isCollapsed={isCollapsed}
        setCollapsed={setCollapsed}
        collapseCopy={collapseCopy}
        draggableEnabled={draggableEnabled}
        draftUid={draft.uid}
        onDragStart={emitDragStart}
        onDragEnd={emitDragEnd}
        rule={rule}
        severityVariant={severityVariant}
        severityLabel={severityLabel}
        isImageStudioRule={isImageStudioRule}
        ruleTitle={ruleTitle}
        onToggleRuleEnabled={handleToggleRuleEnabled}
      />
      <RuleItemHeaderActions
        copyJsonTooltip={copyJsonTooltip}
        draftUid={draft.uid}
        onCopy={() => {
          handleCopy(draft.text, 'Rule').catch(() => undefined);
        }}
        onDuplicate={handleDuplicateRule}
        onRemove={handleRemoveRule}
        hasRule={Boolean(rule)}
      />
    </div>
  );
}
