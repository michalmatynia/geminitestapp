'use client';

import { Copy, Pencil, Trash2 } from 'lucide-react';
import React from 'react';

import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import type { FolderTreeViewportRenderNodeInput as PatternNodeItemProps } from '@/shared/lib/foldertree/public';
import {
  describeProductValidationSemanticAuditRecord,
  getLatestProductValidationSemanticAuditRecord,
  getProductValidationSemanticAuditRecordKey,
  getProductValidationSemanticAuditHistory,
} from '@/shared/lib/products/utils/validator-semantic-state';
import { StatusBadge } from '@/shared/ui/status-badge';
import { StatusToggle } from '@/shared/ui/status-toggle';
import { cn } from '@/shared/utils/ui-utils';

import { useValidatorPatternTreeContext } from '../ValidatorPatternTreeContext';

const SEMANTIC_BADGE_VARIANTS = {
  none: 'neutral',
  recognized: 'info',
  cleared: 'warning',
  preserved: 'active',
  updated: 'info',
  migrated: 'processing',
} as const;

const SEMANTIC_BADGE_PREFIXES = {
  none: 'AUD',
  recognized: 'SEM',
  cleared: 'GEN',
  preserved: 'OK',
  updated: 'UPD',
  migrated: 'MIG',
} as const;

const actionButtonClassName = (isPending: boolean): string =>
  cn(
    'inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition',
    'hover:bg-gray-700/60',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1',
    isPending && 'pointer-events-none opacity-40'
  );

export function PatternNodeSelectButton({
  isSelected,
  label,
  pattern,
  select,
}: {
  isSelected: boolean;
  label: string;
  pattern: ProductValidationPattern;
  select: PatternNodeItemProps['select'];
}): React.JSX.Element {
  const { onEditPattern } = useValidatorPatternTreeContext();
  const showLocale = pattern.target === 'name' || pattern.target === 'description';
  const localeLabel = pattern.locale ?? 'any';

  return (
    <button
      type='button'
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
        select(event);
        onEditPattern(pattern);
      }}
      aria-label={label}
      aria-pressed={isSelected}
      title={label}
      className='flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
    >
      <span className='min-w-0 flex-1 truncate font-medium text-white transition-transform duration-150 ease-out hover:scale-[1.02] hover:text-sky-100'>
        {pattern.label}
      </span>
      <StatusBadge status={pattern.target} variant='info' size='sm' />
      {showLocale ? <StatusBadge status={localeLabel} variant='processing' size='sm' /> : null}
      <StatusBadge
        status={pattern.severity}
        variant={pattern.severity === 'warning' ? 'warning' : 'error'}
        size='sm'
      />
    </button>
  );
}

export function PatternNodeSemanticBadge({
  pattern,
  select,
}: {
  pattern: ProductValidationPattern;
  select: PatternNodeItemProps['select'];
}): React.JSX.Element | null {
  const { onOpenSemanticHistory } = useValidatorPatternTreeContext();
  const semanticAuditHistory = getProductValidationSemanticAuditHistory(pattern);
  const latestSemanticAudit = getLatestProductValidationSemanticAuditRecord(pattern);
  if (latestSemanticAudit === null) return null;

  const latestSemanticAuditKey = getProductValidationSemanticAuditRecordKey(latestSemanticAudit);
  const title =
    describeProductValidationSemanticAuditRecord(latestSemanticAudit) ?? 'Semantic audit recorded.';

  return (
    <StatusBadge
      status='semantic'
      label={`${SEMANTIC_BADGE_PREFIXES[latestSemanticAudit.transition]} ${semanticAuditHistory.length}`}
      variant={SEMANTIC_BADGE_VARIANTS[latestSemanticAudit.transition]}
      size='sm'
      title={`Semantic history (${semanticAuditHistory.length}): ${title}`}
      className='shrink-0'
      onClick={(): void => {
        select();
        onOpenSemanticHistory(pattern.id, latestSemanticAuditKey);
      }}
    />
  );
}

function PatternNodeActionButton({
  children,
  isDanger = false,
  isPending,
  label,
  onClick,
}: {
  children: React.ReactNode;
  isDanger?: boolean;
  isPending: boolean;
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type='button'
      className={isDanger ? cn(actionButtonClassName(isPending), 'hover:bg-red-500/20 hover:text-red-300') : actionButtonClassName(isPending)}
      onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => event.stopPropagation()}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      disabled={isPending}
    >
      {children}
    </button>
  );
}

export function PatternNodeActions({
  pattern,
}: {
  pattern: ProductValidationPattern;
}): React.JSX.Element {
  const { isPending, onDeletePattern, onDuplicatePattern, onEditPattern, onTogglePattern } =
    useValidatorPatternTreeContext();

  return (
    <span className='ml-1 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
      <span onMouseDownCapture={(event: React.MouseEvent<HTMLSpanElement>): void => event.stopPropagation()} onClickCapture={(event: React.MouseEvent<HTMLSpanElement>): void => event.stopPropagation()}>
        <StatusToggle enabled={pattern.enabled} disabled={isPending} onToggle={(): void => { void onTogglePattern(pattern); }} />
      </span>
      <PatternNodeActionButton isPending={isPending} label='Duplicate pattern' onClick={() => onDuplicatePattern(pattern)}>
        <Copy className='size-3' />
      </PatternNodeActionButton>
      <PatternNodeActionButton isPending={isPending} label='Edit pattern' onClick={() => onEditPattern(pattern)}>
        <Pencil className='size-3' />
      </PatternNodeActionButton>
      <PatternNodeActionButton isDanger isPending={isPending} label='Delete pattern' onClick={() => onDeletePattern(pattern)}>
        <Trash2 className='size-3' />
      </PatternNodeActionButton>
    </span>
  );
}
