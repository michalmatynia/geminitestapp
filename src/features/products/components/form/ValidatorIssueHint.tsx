'use client';

import { ArrowRight } from 'lucide-react';
import { memo } from 'react';

import { useProductValidationActions } from '@/features/products/context/ProductValidationSettingsContext';
import {
  getIssueReplacementPreview,
  type FieldValidatorIssue,
} from '@/features/products/validation-engine/core';
import { Button } from '@/shared/ui/button';
import { Hint } from '@/shared/ui/Hint';

import { cn } from '@/shared/utils/ui-utils';

import {
  useIssueDenyHandler,
  useIssueReplacementFieldName,
  useIssueReplaceHandler,
} from './ValidatorIssueHint.actions';

const hasNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const resolveSnippetMatch = (value: string, index: number, rawMatch: string): string => {
  if (rawMatch.length > 0) return rawMatch;
  const fallbackMatch = value.slice(index, Math.min(value.length, index + 1));
  if (fallbackMatch.length > 0) return fallbackMatch;
  return ' ';
};

const buildIssueSnippet = (
  value: string,
  index: number,
  length: number
): { before: string; match: string; after: string } => {
  const start = Math.max(0, index - 24);
  const end = Math.min(value.length, index + length + 24);
  const rawBefore = value.slice(start, index);
  const rawMatch = value.slice(index, Math.min(value.length, index + length));
  const rawAfter = value.slice(Math.min(value.length, index + length), end);

  return {
    before: `${start > 0 ? '...' : ''}${rawBefore}`,
    match: resolveSnippetMatch(value, index, rawMatch),
    after: `${rawAfter}${end < value.length ? '...' : ''}`,
  };
};

const resolveToneClass = (issue: FieldValidatorIssue): string => {
  if (issue.severity === 'warning') return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  return 'border-red-500/40 bg-red-500/10 text-red-100';
};

const resolveMatchClass = (issue: FieldValidatorIssue): string => {
  if (issue.severity === 'warning') return 'bg-amber-300/30 text-amber-50';
  return 'bg-red-300/30 text-red-50';
};

const resolveReplacementBadgeClass = (issue: FieldValidatorIssue): string => {
  if (issue.replacementScope === 'global') {
    return 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100';
  }
  if (issue.replacementScope !== 'field') {
    return 'border-gray-500/40 bg-gray-500/10 text-gray-200/80';
  }
  if (issue.replacementActive) return 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100';
  return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200/80';
};

const resolveReplacementBadgeText = (issue: FieldValidatorIssue): string => {
  if (issue.replacementScope === 'global') return 'Global replacer';
  if (issue.replacementScope !== 'field') return 'Validation only';
  if (issue.replacementActive) return 'Field replacer';
  return 'Field replacer (other field)';
};

const resolveProposedValue = ({
  issue,
  proposedValueOverride,
  value,
}: {
  issue: FieldValidatorIssue;
  proposedValueOverride?: string | null;
  value: string;
}): string | null => {
  if (proposedValueOverride !== undefined && proposedValueOverride !== null) {
    return proposedValueOverride;
  }
  if (hasNonEmptyString(issue.replacementValue)) {
    return getIssueReplacementPreview(value, issue);
  }
  return null;
};

function ValidatorIssueActions({
  denyLabel,
  issue,
  onDeny,
  onReplace,
}: {
  denyLabel: 'Deny' | 'Mute';
  issue: FieldValidatorIssue;
  onDeny?: (() => void) | undefined;
  onReplace?: (() => void) | undefined;
}): React.JSX.Element | null {
  const canDeny = onDeny !== undefined;
  const canReplace = hasNonEmptyString(issue.replacementValue) && onReplace !== undefined;
  if (canDeny === false && canReplace === false) return null;

  return (
    <div className='ml-auto flex flex-wrap justify-end gap-1'>
      {canDeny ? (
        <Button
          type='button'
          onClick={onDeny}
          className='h-6 rounded border border-red-500/50 bg-red-500/15 px-2 text-[10px] text-red-100 hover:bg-red-500/25'
        >
          {denyLabel}
        </Button>
      ) : null}
      {canReplace ? (
        <Button
          type='button'
          onClick={onReplace}
          className='h-6 rounded border border-emerald-500/50 bg-emerald-500/15 px-2 text-[10px] text-emerald-100 hover:bg-emerald-500/25'
        >
          Replace
        </Button>
      ) : null}
    </div>
  );
}

function ValidatorIssueSnippet({
  matchClass,
  snippet,
}: {
  matchClass: string;
  snippet: { before: string; match: string; after: string };
}): React.JSX.Element {
  return (
    <div className='mt-1 font-mono text-[11px] break-all'>
      <span className='opacity-90'>{snippet.before}</span>
      <mark className={cn('rounded px-0.5', matchClass)}>{snippet.match}</mark>
      <span className='opacity-90'>{snippet.after}</span>
    </div>
  );
}

function ValidatorIssueProposedResult({
  proposedValue,
}: {
  proposedValue: string;
}): React.JSX.Element {
  return (
    <div className='mt-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5'>
      <Hint uppercase size='xxs' variant='info' className='text-emerald-200/90'>
        Proposed Result
      </Hint>
      <p className='mt-1 break-all font-mono text-[11px] text-emerald-100'>{proposedValue}</p>
    </div>
  );
}

export const ValidatorIssueHint = memo((props: {
  issue: FieldValidatorIssue;
  value: string;
  onReplace?: (() => void) | undefined;
  onDeny?: (() => void) | undefined;
  denyLabel?: 'Deny' | 'Mute';
  proposedValueOverride?: string | null;
  hideMatchSnippet?: boolean;
}): React.JSX.Element => {
  const {
    issue,
    value,
    onReplace,
    onDeny,
    denyLabel = 'Deny',
    proposedValueOverride,
    hideMatchSnippet = false,
  } = props;

  const snippet = buildIssueSnippet(value, issue.index, issue.length);
  const toneClass = resolveToneClass(issue);
  const matchClass = resolveMatchClass(issue);
  const replacementBadgeClass = resolveReplacementBadgeClass(issue);
  const replacementBadgeText = resolveReplacementBadgeText(issue);
  const proposedValue = resolveProposedValue({ issue, proposedValueOverride, value });
  const hasProposedChange = Boolean(proposedValue !== null && proposedValue !== value);

  return (
    <div className={cn('mt-2 rounded-md border px-2 py-2 text-xs', toneClass)}>
      <div className='flex items-start gap-2'>
        <ArrowRight className='mt-0.5 size-4 shrink-0 animate-bounce' />
        <span className='min-w-0 flex-1 break-words'>{issue.message}</span>
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-1'>
        <span
          className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px]', replacementBadgeClass)}
        >
          {replacementBadgeText}
        </span>
        <ValidatorIssueActions
          denyLabel={denyLabel}
          issue={issue}
          onDeny={onDeny}
          onReplace={onReplace}
        />
      </div>
      {hideMatchSnippet === false ? (
        <ValidatorIssueSnippet matchClass={matchClass} snippet={snippet} />
      ) : null}
      {hasProposedChange && proposedValue !== null ? (
        <ValidatorIssueProposedResult proposedValue={proposedValue} />
      ) : null}
    </div>
  );
});

type IssueHintRowProps = {
  fieldName: string;
  issue: FieldValidatorIssue;
  fieldValue: string;
};

export const IssueHintRow = memo((
  props: IssueHintRowProps
): React.JSX.Element => {
  const { fieldName, issue, fieldValue } = props;

  const { getDenyActionLabel } = useProductValidationActions();
  const replacementFieldName = useIssueReplacementFieldName(fieldName, issue);
  const onReplace = useIssueReplaceHandler({ fieldName, issue, replacementFieldName });
  const onDeny = useIssueDenyHandler({ fieldName, issue });
  return (
    <ValidatorIssueHint
      issue={issue}
      value={fieldValue}
      onReplace={hasNonEmptyString(issue.replacementValue) ? onReplace : undefined}
      onDeny={onDeny}
      denyLabel={getDenyActionLabel(issue.patternId)}
    />
  );
});
