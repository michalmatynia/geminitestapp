'use client';

import { ArrowRight } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import { useProductValidationActions } from '@/features/products/context/ProductValidationSettingsContext';
import {
  getIssueReplacementPreview,
  type FieldValidatorIssue,
} from '@/features/products/validation-engine/core';
import { ProductFormData } from '@/shared/contracts/products';
import { Button, Hint } from '@/shared/ui';
import { cn } from '@/shared/utils';

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
    match: rawMatch || value.slice(index, Math.min(value.length, index + 1)) || ' ',
    after: `${rawAfter}${end < value.length ? '...' : ''}`,
  };
};

export const ValidatorIssueHint = memo(function ValidatorIssueHint({
  issue,
  value,
  onReplace,
  onDeny,
  denyLabel = 'Deny',
  proposedValueOverride,
  hideMatchSnippet = false,
}: {
  issue: FieldValidatorIssue;
  value: string;
  onReplace?: (() => void) | undefined;
  onDeny?: (() => void) | undefined;
  denyLabel?: 'Deny' | 'Mute';
  proposedValueOverride?: string | null;
  hideMatchSnippet?: boolean;
}): React.JSX.Element {
  const snippet = buildIssueSnippet(value, issue.index, issue.length);
  const toneClass =
    issue.severity === 'warning'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
      : 'border-red-500/40 bg-red-500/10 text-red-100';
  const matchClass =
    issue.severity === 'warning' ? 'bg-amber-300/30 text-amber-50' : 'bg-red-300/30 text-red-50';
  const replacementBadgeClass =
    issue.replacementScope === 'global'
      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100'
      : issue.replacementScope === 'field'
        ? issue.replacementActive
          ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100'
          : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200/80'
        : 'border-gray-500/40 bg-gray-500/10 text-gray-200/80';
  const replacementBadgeText =
    issue.replacementScope === 'global'
      ? 'Global replacer'
      : issue.replacementScope === 'field'
        ? issue.replacementActive
          ? 'Field replacer'
          : 'Field replacer (other field)'
        : 'Validation only';
  const proposedValue =
    proposedValueOverride ??
    (issue.replacementValue ? getIssueReplacementPreview(value, issue) : null);
  const hasProposedChange = Boolean(proposedValue !== null && proposedValue !== value);
  const handleDenyClick = onDeny;
  const handleReplaceClick = onReplace;

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
        {handleDenyClick || (issue.replacementValue && handleReplaceClick) ? (
          <div className='ml-auto flex flex-wrap justify-end gap-1'>
            {handleDenyClick ? (
              <Button
                type='button'
                onClick={handleDenyClick}
                className='h-6 rounded border border-red-500/50 bg-red-500/15 px-2 text-[10px] text-red-100 hover:bg-red-500/25'
              >
                {denyLabel}
              </Button>
            ) : null}
            {issue.replacementValue && handleReplaceClick ? (
              <Button
                type='button'
                onClick={handleReplaceClick}
                className='h-6 rounded border border-emerald-500/50 bg-emerald-500/15 px-2 text-[10px] text-emerald-100 hover:bg-emerald-500/25'
              >
                Replace
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {!hideMatchSnippet ? (
        <div className='mt-1 font-mono text-[11px] break-all'>
          <span className='opacity-90'>{snippet.before}</span>
          <mark className={cn('rounded px-0.5', matchClass)}>{snippet.match}</mark>
          <span className='opacity-90'>{snippet.after}</span>
        </div>
      ) : null}
      {hasProposedChange ? (
        <div className='mt-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5'>
          <Hint uppercase size='xxs' variant='info' className='text-emerald-200/90'>
            Proposed Result
          </Hint>
          <p className='mt-1 break-all font-mono text-[11px] text-emerald-100'>{proposedValue}</p>
        </div>
      ) : null}
    </div>
  );
});

type IssueHintRowProps = {
  fieldName: string;
  issue: FieldValidatorIssue;
  fieldValue: string;
  numericField?: keyof ProductFormData;
};

export const IssueHintRow = memo(function IssueHintRow({
  fieldName,
  issue,
  fieldValue,
  numericField,
}: IssueHintRowProps): React.JSX.Element {
  const { getValues, setValue } = useFormContext<ProductFormData>();
  const { acceptIssue, denyIssue, getDenyActionLabel } = useProductValidationActions();

  const onReplace = useCallback((): void => {
    if (numericField) {
      const raw = getValues(numericField);
      const currentValue =
        typeof raw === 'string'
          ? raw
          : typeof raw === 'number' && Number.isFinite(raw)
            ? String(raw)
            : '';
      const nextValue = getIssueReplacementPreview(currentValue, issue);
      void acceptIssue({
        fieldName,
        patternId: issue.patternId,
        postAcceptBehavior: issue.postAcceptBehavior,
        message: issue.message,
        replacementValue: issue.replacementValue,
      });
      if (nextValue === currentValue) return;
      const numericValue = Number(nextValue.replace(',', '.'));
      if (!Number.isFinite(numericValue)) return;
      setValue(
        numericField,
        Math.max(0, Math.floor(numericValue)) as ProductFormData[typeof numericField],
        { shouldDirty: true, shouldTouch: true }
      );
    } else {
      const currentValue =
        (getValues(fieldName as keyof ProductFormData) as string | undefined) ?? '';
      const nextValue = getIssueReplacementPreview(currentValue, issue);
      void acceptIssue({
        fieldName,
        patternId: issue.patternId,
        postAcceptBehavior: issue.postAcceptBehavior,
        message: issue.message,
        replacementValue: issue.replacementValue,
      });
      if (nextValue !== currentValue) {
        setValue(
          fieldName as keyof ProductFormData,
          nextValue as ProductFormData[keyof ProductFormData],
          { shouldDirty: true, shouldTouch: true }
        );
      }
    }
  }, [acceptIssue, fieldName, getValues, issue, numericField, setValue]);

  const onDeny = useCallback((): void => {
    void denyIssue({
      fieldName,
      patternId: issue.patternId,
      message: issue.message,
      replacementValue: issue.replacementValue,
    });
  }, [denyIssue, fieldName, issue.message, issue.patternId, issue.replacementValue]);
  return (
    <ValidatorIssueHint
      issue={issue}
      value={fieldValue}
      onReplace={issue.replacementValue ? onReplace : undefined}
      onDeny={onDeny}
      denyLabel={getDenyActionLabel(issue.patternId)}
    />
  );
});
